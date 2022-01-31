import { Contract } from "ethers";

export const initializeAuctionHouse = async function (
    econAuctionHouse: Contract,
    usdcAddress: string,
    daoTreasuryAddress: string
) {

    console.log("Initializing the auction house...");
    
    await econAuctionHouse.setErc20Currency(usdcAddress);
    const set_dao_tx = await econAuctionHouse.setDaoTreasury(daoTreasuryAddress);

    await set_dao_tx.wait(1);

    const erc20CurrencyContract = await econAuctionHouse.getErc20Currency();
    const daoTreasury = await econAuctionHouse.getDaoTreasury();

    console.log(`Dao treasury address from auction house is ${daoTreasury} (should be ${daoTreasuryAddress})`);
    console.log(`Erc20 currency from the auction house is ${erc20CurrencyContract} (should be ${usdcAddress})`);
}