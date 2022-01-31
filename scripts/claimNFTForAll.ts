import { ethers } from "hardhat";

const main = async function() {
    const econNFTAddress = "0xef403712db606B740943d3BB3fEd6de1cbA11042";
    const auctionHouseAddress = "0x6B72415D2B81C5c2C18e6DCf65c278338896d433";

    const [signer] = await ethers.getSigners();
    const EconAuctionHouse = await ethers.getContractFactory("EconAuctionHouse");
    const econAuctionHouse = new ethers.Contract(auctionHouseAddress, EconAuctionHouse.interface, signer);

    try {
        for(let i = 0; i < 20; i++) {
            const auctionId = await econAuctionHouse.getAuctionID(econNFTAddress, i);
            await econAuctionHouse.claimForFirstTime(auctionId);
        }
    } catch(error) {
        console.log(error);
    }
}

main();