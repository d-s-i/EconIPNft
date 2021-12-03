//SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import { EconNFT } from "./EconNFT.sol";

contract Expiration {

    mapping(uint256 => bool) public isExpired;

    EconNFT public econNFT;

    constructor(address _econNFT) public {
        econNFT = EconNFT(_econNFT);
    }

    function expire(uint256 _tokenId) external {
        require(econNFT.seeds[_tokenId], "Query for non existent token");
        if(econNFT[_tokenId].expirationTimestamp < econNFT.currentExpirationTimestamp) {

        }
    }
    
}