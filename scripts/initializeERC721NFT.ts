import { ethers } from "hardhat";

const initializeERC721NFT = async function () {
    const auctionHouseAddress = "0xfFece9f215F0Bc247941c8578912da3bc9d8e069";
    const econNFTAddress = "0xa5EC09c13c12341FE0Eb3Ae714ccc1A6C806df5a";

    const [signer] = await ethers.getSigners();

    console.log("Initializing the auction house...");
    
    const EconNFTFactory = await ethers.getContractFactory("EconAuctionHouse");
    const econNFT = await new ethers.Contract(econNFTAddress, EconNFTFactory.interface, signer);

    const set_tx = await econNFT.setEconAuctionHouse(auctionHouseAddress);

    await set_tx.wait(1);

    console.log("auction house set in the EconNFT");
}

initializeERC721NFT();