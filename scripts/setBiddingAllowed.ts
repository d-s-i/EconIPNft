import { ethers } from "hardhat";

const main = async function() {

    const econNFTAddress = "";
    const econAuctionHouseAddress = "";
    const [signer] = await ethers.getSigners();

    const AuctionHouseFactory = await ethers.getContractFactory("EconAuctionHouse");
    const econAuctionHouse = new ethers.Contract(econAuctionHouseAddress, AuctionHouseFactory.interface, signer);
    
    await econAuctionHouse.setBiddingAllowed(econNFTAddress, true);
}

main();