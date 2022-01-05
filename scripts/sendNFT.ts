import { ethers } from "hardhat";

const sendNFT = async function () {
    const econNFTAddress = "0x93C3a8c5da74255BD0F748f606aeAf3dc7237D7B";
    const auctionHouseAddress = "0xfFece9f215F0Bc247941c8578912da3bc9d8e069";

    const [signer] = await ethers.getSigners();

    console.log("Sarting the mint...");
    
    const EconNFTFactory = await ethers.getContractFactory("EconNFT");
    const econNFT = await new ethers.Contract(econNFTAddress, EconNFTFactory.interface, signer);

    for(let i = 0; i < 20; i++) {
        await econNFT.safeTransferFrom(signer.address, auctionHouseAddress, i, 1, 0x00);
    }

    const auctionBalances = await econNFT.balanceOf(auctionHouseAddress, 19);
    
    console.log(`auction balances are: ^${auctionBalances}`);
}

sendNFT();