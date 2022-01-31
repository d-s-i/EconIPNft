import { Contract } from "ethers";
import { ethers } from "hardhat";

export const initializeERC721NFT = async function (
    econNFT: Contract,
    minterAddress: string
) {

    console.log("Initializing the auction house...");
    
    const set_tx = await econNFT.setMinter(minterAddress);

    await set_tx.wait(1);

    console.log("auction house set in the EconNFT");
}