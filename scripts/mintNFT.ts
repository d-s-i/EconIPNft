import { ethers } from "hardhat";
import { parseUnits } from "ethers/lib/utils";

export const mintNFT = async function (econNFTAddress: string) {

    const [signer] = await ethers.getSigners();

    console.log("Sarting the mint...");
    
    const EconNFTFactory = await ethers.getContractFactory("EconNFTERC721");
    const econNFT = await new ethers.Contract(econNFTAddress, EconNFTFactory.interface, signer);

    for(let i = 0; i < 20; i++) {
        const mint_tx = await econNFT.mint({ maxPriorityFeePerGas: parseUnits("3", "9"), maxFeePerGas: parseUnits("3", "9") });
        await mint_tx.wait(1);
        console.log(`Minted ${i + 1} nft so far...`);
    }

    const ownerBalance = await econNFT.balanceOf(signer.address);

    console.log(`owner balances are: ${ownerBalance}`);
}