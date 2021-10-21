//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IEconNFT is IERC721 {
    function mint() external returns (uint256);

    function burn(uint256 econNFTId) external returns (uint256);
}