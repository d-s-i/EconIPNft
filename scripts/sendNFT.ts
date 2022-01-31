import { Contract } from "ethers";
import { ethers } from "hardhat";

export const sendNFT = async function (
    econNFT: Contract,
    econAuctionHouseAddress: string
) {

    const [signer] = await ethers.getSigners();

    console.log("Sarting sending it...");
    
    for(let i = 0; i < 20; i++) {
        await econNFT.transferFrom(signer.address, econAuctionHouseAddress, i);
    }

    const auctionBalances = await econNFT.balanceOf(econAuctionHouseAddress);
    
    console.log(`auction balances are: ${auctionBalances}`);
}