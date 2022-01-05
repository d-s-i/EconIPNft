import { ethers } from "hardhat";
import { getAuctionArgs } from "../test/constants.test";

const registerAuction = async function () {

    const econNFTAddress = "0x93C3a8c5da74255BD0F748f606aeAf3dc7237D7B";
    const USDCAddress = "0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b";
    const auctionHouseAddress = "0xfFece9f215F0Bc247941c8578912da3bc9d8e069";

    const [signer] = await ethers.getSigners();

    console.log("Creating an auction...");

    const USDCFactory = await ethers.getContractFactory("USDC");
    const usdc = await new ethers.Contract(USDCAddress, USDCFactory.interface, signer);

    const auctionArgs = await getAuctionArgs(signer, usdc);
    
    const EconNFTFactory = await ethers.getContractFactory("EconNFT");
    const econNFT = await new ethers.Contract(econNFTAddress, EconNFTFactory.interface, signer);

    const AuctionHouseFactory = await ethers.getContractFactory("EconAuctionHouse");
    const auctionHouse = await new ethers.Contract(auctionHouseAddress, AuctionHouseFactory.interface, signer);

    console.log("Registering an auction contract");

    try {
        await auctionHouse.registerAnAuctionContract(
            econNFT.address,
            ...auctionArgs
        );
    } catch(error) {
        console.log(error);
        console.log("An error occured when registering an auction contract");
    }

    console.log("Registering an auction token");

    try {
        for(let i = 0; i < 20; i++) {
            await auctionHouse.registerAnAuctionToken(econNFT.address, i, ethers.utils.id("ERC1155").slice(0, 10), true);
        }
    } catch(error) {
        console.log(error);
        console.log("An error occured when registering an auction token");
    }
    

    console.log("Done...");

}

registerAuction();