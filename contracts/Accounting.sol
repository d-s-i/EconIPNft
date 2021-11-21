//SPDLicensIdentifier: MIT
pragma solidity ^0.8.6;

import "./EconNFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Accounting contract for Economics Design.
/// @notice Helps the company to know who bought how much books and when.
contract Accounting {

    // owner of the contract.
    address public owner;

    uint256 public totalNumberOfBooksSold;
    // Orders must be more than one per order.
    uint256 public booksPerOrder;
    // The price of one book.
    uint256 public bookPrice;

    // Accounting of number of books bought per address.
    mapping(address => uint256) public numberOfBooksBought;

    // The EconNFT contract.
    EconNFT public econNFT;
    // The USDC contract.
    IERC20 public usdc;

    /**
        * @param _booksPerOrder the number of books you want per order (orders will need to be a multiple of this number).
        * @param _bookPrice the number of USDC required to buy one book (/!\ USDC have 6 decimals).
        * @param _econNFTAddress address of the EconNFT token contract.
        * @param _usdcAddress address of the USDC token contract.
    **/ 
    constructor(uint256 _booksPerOrder, uint256 _bookPrice, address _econNFTAddress, address _usdcAddress) public {
        booksPerOrder = _booksPerOrder;
        bookPrice = _bookPrice;
        econNFT = EconNFT(_econNFTAddress);
        usdc = IERC20(_usdcAddress);
        // change this into Economics DEsign address
        owner = msg.sender;
    }

    /// @notice Restrict the function to the owner of the contract and revert otherwise.
    modifier onlyOwner() {
        require(msg.sender == owner, "You are not the owner");
        _;
    }

    /// @notice Function called by the owner of an EconNFT contract to order books to the company.
    /// @dev Payements are handled in USDC.
    function buyBooks(uint256 _numberOfBooks) external {
        require(econNFT.balanceOf(msg.sender) > 0, "You need to hold the property right token to buy and sell those books.");
        require(_numberOfBooks % booksPerOrder == 0, "You can only buy a multiple of 20 books.");

        usdc.transferFrom(msg.sender, owner, _numberOfBooks * bookPrice);

        numberOfBooksBought[msg.sender] += _numberOfBooks;
        totalNumberOfBooksSold += _numberOfBooks;
    }

    /// @notice Set the number of books per order.
    /// @dev Can only be called by the owner of the contract.
    function setBooksPerOrder(uint256 _newBooksPerOrder) external onlyOwner {
        booksPerOrder = _newBooksPerOrder;
    }

    /// @notice Set the price of one book.
    /// @dev Can only be called by the owner of the contract.
    function setBookPrice(uint256 _newBookPrice) external onlyOwner {
        bookPrice = _newBookPrice;
    }

    /// @notice Set the owner of the contract.
    /// @dev Can only be called by the current owner of the contract.
    function setOwner(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}