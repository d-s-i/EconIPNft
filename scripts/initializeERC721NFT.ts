import { Contract } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";

export const initializeERC721NFT = async function (
    econNFT: Contract,
    minterAddress: string
) {

    console.log("Initializing the EconNFT...");

    const set_tx = await econNFT.setMinter(minterAddress, { maxPriorityFeePerGas: parseUnits("3", "9"), maxFeePerGas: parseUnits("3", "9") });

    await set_tx.wait(1);

    console.log("auction house set in the EconNFT");
}