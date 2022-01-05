import { ethers } from "hardhat";

const mintNFT = async function () {
    const econNFTAddress = "0x93C3a8c5da74255BD0F748f606aeAf3dc7237D7B";

    const [signer] = await ethers.getSigners();

    console.log("Sarting the mint...");
    
    const EconNFTFactory = await ethers.getContractFactory("EconNFT");
    const econNFT = await new ethers.Contract(econNFTAddress, EconNFTFactory.interface, signer);

    for(let i = 0; i < 20; i++) {
        await econNFT.mint(signer.address, i, 1);
        console.log(`Minted ${i + 1} nft so far...`);
    }

    const ownerBalance = await econNFT.balanceOf(signer.address, 0);

    console.log(`owner balances are: ${ownerBalance}`);
}

mintNFT();