import { ethers } from "hardhat";

export const mintNFT = async function (econNFTAddress: string) {

    const [signer] = await ethers.getSigners();

    console.log("Sarting the mint...");
    
    const EconNFTFactory = await ethers.getContractFactory("EconNFTERC721");
    const econNFT = await new ethers.Contract(econNFTAddress, EconNFTFactory.interface, signer);

    for(let i = 0; i < 20; i++) {
        await econNFT.mint();
        console.log(`Minted ${i + 1} nft so far...`);
    }

    const ownerBalance = await econNFT.balanceOf(signer.address);

    console.log(`owner balances are: ${ownerBalance}`);
}