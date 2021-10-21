//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "base64-sol/base64.sol";

contract EconNFT is ERC721, Ownable {

    struct Seed {
        uint256 expirationDate;
        uint256 numberOfBooks;
    }

    address public minter;

    uint256 public totalSupply;

    uint256 private _currentEconNFTId;

    bool public isMinterLocked;

    mapping(uint256 => Seed) public seeds;

    uint256 public currentExpirationDate;

    // Mapping from token ID to owner address
    mapping(uint256 => address) private _owners;

    // Mapping owner address to token count
    mapping(address => uint256) private _balances;

    uint constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint constant SECONDS_PER_HOUR = 60 * 60;
    uint constant SECONDS_PER_MINUTE = 60;
    int constant OFFSET19700101 = 2440588;

    uint constant DOW_MON = 1;
    uint constant DOW_TUE = 2;
    uint constant DOW_WED = 3;
    uint constant DOW_THU = 4;
    uint constant DOW_FRI = 5;
    uint constant DOW_SAT = 6;
    uint constant DOW_SUN = 7;

    // art variables
    uint256 public maxNumberOfPath;
    uint256 public maxNumberOfPathCommands;
    uint256 public size;
    string[] public pathCommands;
    string[] public colors;

    constructor(uint256 _totalSupply) ERC721("Econteric IP", "ECIP") Ownable() public {
        totalSupply = _totalSupply;
        isMinterLocked = false;
        _currentEconNFTId = 0;
        currentExpirationDate = 1640991600;

        maxNumberOfPath = 10;
        maxNumberOfPathCommands = 5;
        size = 500;
        pathCommands = ["M", "L"];
        colors = ["red", "blue", "green", "yellow", "black", "white"];
    }

    modifier whenMinterNotLocked() {
        require(!isMinterLocked, "Minter is locked");
        _;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "Sender is not the minter");
        _;
    }

    function mint() public onlyMinter returns (uint256) {
        return _mintTo(minter, _currentEconNFTId++);
    }

        /**
     * @notice Burn a nft.
     */
    function burn(uint256 econNFTId) public onlyMinter {
        _burn(econNFTId);
    }

    // function tokenURI(uint256 tokenId) public view override returns (string memory) {
    //     require(_exists(tokenId), "NounsToken: URI query for nonexistent token");
    //     return descriptor.tokenURI(tokenId, seeds[tokenId]);
    // }

    function setMinter(address _minter) external onlyOwner whenMinterNotLocked {
        minter = _minter;
    }

    function lockMinter() external onlyOwner whenMinterNotLocked {
        isMinterLocked = true;
    }

    function setCurrentExpirationDate(uint256 _newExpirationDate) external onlyOwner {
        currentExpirationDate = _newExpirationDate;
    }

    /**
     * @notice Mint a Noun with `econNFTId` to the provided `to` address.
     */
    function _mintTo(address to, uint256 econNFTId) internal returns (uint256) {
        // need to generate seed ?
        seeds[econNFTId] = Seed({
            expirationDate: currentExpirationDate,
            numberOfBooks: 20
        });
        _mint(to, econNFTId);

        return econNFTId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        uint256 year;
        uint256 month;
        uint256 day;
        (year, month, day) = timestampToDate(seeds[tokenId].expirationDate); 
        uint256 randomNumber = block.timestamp / block.number;
        string memory svg = generateSVG(randomNumber);
        string memory imageURI = svgToImageURI(svg);
        string memory json = Base64.encode(bytes(abi.encodePacked(
            '{"name": "Econteric Book", ', 
            '"description": "Economics and Math of Token Engineering and DeFi", ', 
            '"numberOfBooks": "', 
            uint2str(seeds[tokenId].numberOfBooks),
            '", "expirationDate": "',
            uint2str(day),
            '/',
            uint2str(month),
            '/',
            uint2str(year),
            '", "image": "',
            imageURI,
            '"}'
        )));

        string memory data = string(abi.encodePacked('data:application/json;base64,', json));
        return data;
    }

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

    function timestampToDate(uint timestamp) internal pure returns (uint year, uint month, uint day) {
        (year, month, day) = _daysToDate(timestamp / SECONDS_PER_DAY);
    }

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

    function generatePathCommand(uint256 _randomNumber) public view returns(string memory pathCommand) {
        pathCommand = pathCommands[_randomNumber % pathCommands.length];
        uint256 parameterOne = uint256(keccak256(abi.encode(_randomNumber, size * 2))) % size;
        uint256 parameterTwo = uint256(keccak256(abi.encode(_randomNumber, size * 2 + 1))) % size;
        pathCommand = string(abi.encodePacked(pathCommand, " ", uint2str(parameterOne), " ", uint2str(parameterTwo), " "));
    }

    function svgToImageURI(string memory _svg) public pure returns(string memory) {
        string memory baseURL = "data:image/svg+xml;base64,";
        string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(_svg))));
        string memory imageURI = string(abi.encodePacked(baseURL, svgBase64Encoded));
        return imageURI;
    }

    // need to track personal score

    // righ to purchase the book at a discount (has expiration)

    // buy via website only if you have the nft => function from another contract ?

    // receiving bonus (% of all ebook sold)

    // count how much someone bought per quarter

    // buying price => auction
}