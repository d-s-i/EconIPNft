//SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import { ERC721 } from "./ERC721.sol";
import "./interfaces/IEconNFTERC721.sol";
import "base64-sol/base64.sol";

/// @title Economics Design Property Right NFT.
/// @notice Contract used to verify the ownership of the Economics Design book property rights.
contract EconNFTERC721 is ERC721, IEconNFTERC721 {

    /// @dev expiration timestamp of the NFT, date after the owner won't be able to buy books anymore. 
    struct Seed {
        uint256 expirationTimestamp;
    }

    /// @dev Minter of the EconNFT. 
    address public minter;  

    /// @dev Last Id minted.
    uint256 private _currentEconNFTId;

    bool public isMinterLocked;

    /// @dev Contain information about the NFT that are set when its first minted.
    mapping(uint256 => Seed) public seeds;

    /// @dev Expiration timestamp currently associated with each EconNFT.
    uint256 public currentExpirationTimestamp;

    /// @dev Number of epoch passed, used for the auctionHouse
    uint256 public numberOfPeriodPassed;

    /// @dev Constant used to translate a timestamp into a date for tokenURI().
    uint constant SECONDS_PER_DAY = 24 * 60 * 60;
    /// @dev Constant used to translate a timestamp into a date for tokenURI() as timestamps start from 01/01/1970.
    int constant OFFSET19700101 = 2440588;

    /// @param _expirationTimestamp the date where the EconNFT will expire (timestamp in seconds).
    /// @dev Variables used to make the JPEG are set in order to construct an SVG later on. 
    constructor(uint256 _expirationTimestamp) ERC721("ED Book DR", "EDBR") {
        isMinterLocked = false;
        _currentEconNFTId = 0;
        numberOfPeriodPassed = 0;
        currentExpirationTimestamp = _expirationTimestamp;
    }

    /// @notice Restrict a function only when minter is not locked (i.e. isMinterLocked == false).
    modifier whenMinterNotLocked() {
        require(!isMinterLocked, "EconNFT: Minter is locked");
        _;
    }

    /// @notice Restrict a function to be called only by the minter address.
    modifier onlyMinter() {
        require(msg.sender == minter, "EconNFT: Sender is not the minter");
        _;
    }

    /// @notice Mint a new NFT.
    /// @return Return the id of the minted NFT.
    /// @dev Create a new NFT and send it to the minter.
    function mint() public onlyMinter returns (uint256) {
        return _mintTo(minter, _currentEconNFTId++);
    }

    /// @notice Call the ERC721 `_burn()` function which burn an NFT and sends it to the address(0).
    /// @param econNFTId the id of the NFT you want to burn.
    function burn(uint256 econNFTId) public onlyMinter {
        _burn(econNFTId);
    }

    /// @notice Mint an property right NFT.
    /// @param to the address to send to the minted NFT.
    /// @param econNFTId the id of the NFT to mint.
    function _mintTo(address to, uint256 econNFTId) internal returns (uint256) {
        seeds[econNFTId] = Seed({
            expirationTimestamp: currentExpirationTimestamp
        });
        _mint(to, econNFTId);

        return econNFTId;
    }

    /// @notice Contain all the informations needed for read this NFT informations.
    /// @param tokenId the id of the token you would like to read information from.
    /// @return data a 64 based encoded string containing a json object with all the informations.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        uint256 year;
        uint256 month;
        uint256 day;
        (year, month, day) = timestampToDate(seeds[tokenId].expirationTimestamp); 
        string memory imageURI = string(abi.encodePacked(_baseURI(), uint2str(tokenId), '.png"'));
        string memory json = string(abi.encodePacked(
            '{ ',
            '"name": "Economics Design Book", ', 
            '"description": "Economics and Math of Token Engineering and DeFi", ', 
            '"image": "',
            imageURI,
            ', "expirationDate": "',
            uint2str(day),
            '/',
            uint2str(month),
            '/',
            uint2str(year),
            '" }'
        ));

        return json;
    }

    /// @notice Transform a uint type into a string type. Used to encode tokenURI().
    /// @param _i the uint to encode into string.
    /// @return _uintAsString the same number but in a string format.
    /// @dev Function taken from https://github.com/provable-things/ethereum-api/blob/master/provableAPI_0.6.sol
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    /// @notice Takes a timestamp in seconds and convert it into a human readable date.
    /// @param timestamp the timestamp you want to convert.
    /// @return year the year from your timestamp.
    /// @return month the month from your timestamp (between 1 and 12).
    /// @return day the day from your timestamp (between 1 and 31).
    function timestampToDate(uint timestamp) internal pure returns (uint year, uint month, uint day) {
        (year, month, day) = _daysToDate(timestamp / SECONDS_PER_DAY);
    }

    /// @notice Calculate year/month/day from the number of days _days since 1970/01/01.
    /// @param _days the number of day between the timestamp you can to convert into a date and 01/01/1970.
    /// @return year the year from your timestamp.
    /// @return month the month from your timestamp (between 1 and 12).
    /// @return day the day from your timestamp (between 1 and 31).
    /// @dev Function taken from https://etherscan.io/address/0x78f96b2d5f717fa9ad416957b79d825cc4cce69d#code.
    function _daysToDate(uint _days) internal pure returns (uint year, uint month, uint day) {
        int __days = int(_days);

        int L = __days + 68569 + OFFSET19700101;
        int N = 4 * L / 146097;
        L = L - (146097 * N + 3) / 4;
        int _year = 4000 * (L + 1) / 1461001;
        L = L - 1461 * _year / 4 + 31;
        int _month = 80 * L / 2447;
        int _day = L - 2447 * _month / 80;
        L = _month / 11;
        _month = _month + 2 - 12 * L;
        _year = 100 * (N - 49) + _year + L;

        year = uint(_year);
        month = uint(_month);
        day = uint(_day);
    }

    /// @notice Change the minter address.
    /// @param _minter The new minter address.
    function setMinter(address _minter) external onlyOwner whenMinterNotLocked {
        minter = _minter;
    }

    /// @notice Lock the minter from calling certain functions.
    function lockMinter() external onlyOwner whenMinterNotLocked {
        isMinterLocked = true;
    }

    /// @notice Change the expiration timestamp of the future NFTs about to get minted.
    /// @param _newExpirationTimestamp the new timestamp.
    function setCurrentExpirationTimestamp(uint256 _newExpirationTimestamp) external override onlyOwner {
        currentExpirationTimestamp = _newExpirationTimestamp;
        numberOfPeriodPassed++;
    }

    /// @notice Used mainly for the auction house.
    function getNumberOfPeriodPassed() public view override returns(uint256) {
        return numberOfPeriodPassed;
    }

    /// @notice Used mainly for the auction house.
    function getCurrentExpirationTimestamp() public view override returns(uint256) {
        return currentExpirationTimestamp;
    }
}