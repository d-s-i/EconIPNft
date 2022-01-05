//SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import { ERC721 } from "./ERC721.sol";
import "./interfaces/IEconNFTERC721.sol";
import "base64-sol/base64.sol";

/// @title Economics Design Property Right NFT.
/// @notice Contract used to verify the ownership of the Economics Design book property rights.
contract EconNFTERC721 is ERC721, IEconNFTERC721 {

    // expiration timestamp of the NFT, date after the owner won't be able to buy books anymore. 
    struct Seed {
        uint256 expirationTimestamp;
    }

    // Minter of the EconNFT. 
    address public minter;  

    // Id currently auctionned.
    uint256 private _currentEconNFTId;

    bool public isMinterLocked;

    // Contain information about the NFT that are set when its first minted.
    mapping(uint256 => Seed) public seeds;

    // Expiration timestamp currently associated with each EconNFT.
    uint256 public currentExpirationTimestamp;

    // Number of epoch passed, used for the auctionHouse
    uint256 public numberOfPeriodPassed;

    // Constant used to translate a timestamp into a date for tokenURI().
    uint constant SECONDS_PER_DAY = 24 * 60 * 60;
    // Constant used to translate a timestamp into a date for tokenURI() as timestamps start from 01/01/1970.
    int constant OFFSET19700101 = 2440588;

    // Variables used to make the JPEG image.
    uint256 public maxNumberOfPath;
    uint256 public maxNumberOfPathCommands;
    uint256 public size;
    string[] public pathCommands;
    string[] public colors;

    /// @param _totalSupply maximum number of NFT that is going to be minted.
    /// @param _expirationTimestamp the date where the EconNFT will expire (timestamp in seconds).
    /// @dev Variables used to make the JPEG are set in order to construct an SVG later on. 
    constructor(uint256 _totalSupply, uint256 _expirationTimestamp) ERC721("Econteric IP", "ECIP") public {
        isMinterLocked = false;
        _currentEconNFTId = 0;
        numberOfPeriodPassed = 0;
        currentExpirationTimestamp = _expirationTimestamp;

        maxNumberOfPath = 10;
        maxNumberOfPathCommands = 5;
        size = 500;
        pathCommands = ["M", "L"];
        colors = ["red", "blue", "green", "yellow", "black", "white"];
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
        uint256 randomNumber = block.timestamp / block.number;
        string memory svg = generateSVG(randomNumber);
        string memory imageURI = svgToImageURI(svg);
        string memory json = Base64.encode(bytes(abi.encodePacked(
            '{ "name": "Economics Design Book", ', 
            '"description": "Economics and Math of Token Engineering and DeFi"', 
            ', "expirationDate": "',
            uint2str(day),
            '/',
            uint2str(month),
            '/',
            uint2str(year),
            '", "image": "',
            imageURI,
            '" }'
        )));

        string memory data = string(abi.encodePacked('data:application/json;base64,', json));
        return data;
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

    /// @notice Generate a full SVG component.
    /// @param _randomNumber is a random number used to construct the SVG (the more random the better).
    /// @return finalSvg the full SVG component readable by a browser.
    /// @dev The random number is used to print random lines and random colors on the final SVG.
    function generateSVG(uint256 _randomNumber) public view returns(string memory finalSvg) {
        uint256 numberOfPath = (_randomNumber % maxNumberOfPath) + 1;
        finalSvg = string(abi.encodePacked('<svg xmlns="http://www.w3.org/2000/svg" height="', uint2str(size), '" width="', uint2str(size), '">'));
        for(uint i = 0; i < numberOfPath; i++) {
            uint256 newRNG = uint256(keccak256(abi.encode(_randomNumber, i)));
            string memory pathSvg = generatePath(newRNG);
            finalSvg = string(abi.encodePacked(finalSvg, pathSvg));
        }
        finalSvg = string(abi.encodePacked(finalSvg, "</svg>"));
    }

    /// @notice Generate different paths that creates the SVG lines.
    /// @param _randomNumber is a random number from the `generatePath()` function.
    /// @return pathSvg a string containing all SVG instructions.
    /// @dev Function called by the `generateSVG()` function.
    function generatePath(uint256 _randomNumber) public view returns(string memory pathSvg) {
        uint256 numberOfPathCommands = (_randomNumber % maxNumberOfPathCommands) + 1;
        pathSvg = '<path d="';
        for(uint i = 0; i < numberOfPathCommands; i++) {
            uint256 newRNG = uint256(keccak256(abi.encode(_randomNumber, size + i)));
            string memory pathCommand = generatePathCommand(newRNG);
            pathSvg = string(abi.encodePacked(pathSvg, pathCommand));
        }
        string memory color = colors[_randomNumber % colors.length];
        pathSvg = string(abi.encodePacked(pathSvg, '" fill="transparent" stroke="', color, '"/>'));
    }

    /// @notice Generate the paths to create the SVG.
    /// @param _randomNumber is a random number from the `generatePath()` function.
    /// @return pathCommand a string containing the paths to create the SVG.
    /// @dev Called by the `generatePath()` function.
    function generatePathCommand(uint256 _randomNumber) public view returns(string memory pathCommand) {
        pathCommand = pathCommands[_randomNumber % pathCommands.length];
        uint256 parameterOne = uint256(keccak256(abi.encode(_randomNumber, size * 2))) % size;
        uint256 parameterTwo = uint256(keccak256(abi.encode(_randomNumber, size * 2 + 1))) % size;
        pathCommand = string(abi.encodePacked(pathCommand, " ", uint2str(parameterOne), " ", uint2str(parameterTwo), " "));
    }

    /// @notice Takes a SVG and encode it while still keeping it readable by a browser.
    /// @param _svg is the SVG component.
    /// @return imageURI a string readable by the browser which will display the SVG.
    function svgToImageURI(string memory _svg) public pure returns(string memory) {
        string memory baseURL = "data:image/svg+xml;base64,";
        string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(_svg))));
        string memory imageURI = string(abi.encodePacked(baseURL, svgBase64Encoded));
        return imageURI;
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