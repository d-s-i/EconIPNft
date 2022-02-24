import { Contract } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";

export const sendNFT = async function (
    econNFT: Contract,
    econAuctionHouseAddress: string
) {

    const [signer] = await ethers.getSigners();

    console.log("Sarting sending it...");
    
    for(let i = 0; i < 20; i++) {
        const transfer_tx = await econNFT.transferFrom(signer.address, econAuctionHouseAddress, i, { maxPriorityFeePerGas: parseUnits("3", "9"), maxFeePerGas: parseUnits("3", "9"), gasLimit: 100000 });
        await transfer_tx.wait(1);
    }

    const auctionBalances = await econNFT.balanceOf(econAuctionHouseAddress);
    
    console.log(`auction balances are: ${auctionBalances}`);
}