import { ethers } from "hardhat";

const initializeAuctionHouse = async function () {
    const auctionHouseAddress = "0xfFece9f215F0Bc247941c8578912da3bc9d8e069";
    const usdcAddress = "0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b";
    const daoTreasuryAddress = "0x945A8480d61D85ED755013169dC165574d751D1a";

    const [signer] = await ethers.getSigners();

    console.log("Initializing the auction house...");
    
    const AuctionHouseFactory = await ethers.getContractFactory("EconAuctionHouse");
    const auctionHouse = await new ethers.Contract(auctionHouseAddress, AuctionHouseFactory.interface, signer);

    await auctionHouse.setErc20Currency(usdcAddress);
    const set_dao_tx = await auctionHouse.setDaoTreasury(daoTreasuryAddress);

    await set_dao_tx.wait(1);

    const erc20CurrencyContract = await auctionHouse.getErc20Currency();
    const daoTreasury = await auctionHouse.getDaoTreasury();

    console.log(`Dao treasury address from auction house is ${daoTreasury} (should be ${daoTreasuryAddress})`);
    console.log(`Erc20 currency from the auction hosue is ${erc20CurrencyContract} (should be ${usdcAddress})`);
}

initializeAuctionHouse();