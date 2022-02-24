import { ethers } from "hardhat";

const main = async function() {

    const econNFTAddress = "0xf227f968158350e3F0A06a9de29282d8Cc4FB680";
    const econAuctionHouseAddress = "0x2984a55aCd096110C13D2292E54c558343c68696";
    const [signer] = await ethers.getSigners();

    const AuctionHouseFactory = await ethers.getContractFactory("EconAuctionHouse");
    const econAuctionHouse = new ethers.Contract(econAuctionHouseAddress, AuctionHouseFactory.interface, signer);
    
    await econAuctionHouse.setBiddingAllowed(econNFTAddress, true);
}

main();