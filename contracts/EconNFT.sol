//SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import { ERC1155 } from "./ERC1155.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "base64-sol/base64.sol";

/// @title Economics Design Property Right NFT.
/// @notice Contract used to verify the ownership of the Economics Design book property rights.
contract EconNFT is ERC1155, Ownable {

    address public minter;
    
    constructor(address _minter) ERC1155("https://www.econteric.com/") public {
        minter = _minter;
    }

    modifier onlyMinter() {
        require(msg.sender == minter);
        _;
    }

    function mint(address _to, uint256 _tokenId, uint256 _amount) external onlyMinter {
        _mint(_to, _tokenId, _amount, "");
    }

    // need a way to set tokenURIs for each tokenId

    function setMinter(address _newMinter) public onlyOwner {
        minter = _newMinter;
    }
}