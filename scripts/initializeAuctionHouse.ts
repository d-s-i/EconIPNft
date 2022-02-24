import { Contract } from "ethers";
import { parseUnits } from "ethers/lib/utils";

export const initializeAuctionHouse = async function (
    econAuctionHouse: Contract,
    usdcAddress: string,
    daoTreasuryAddress: string
) {

    console.log("\n Initializing the auction house...");
    
    const currency_tx = await econAuctionHouse.setErc20Currency(usdcAddress, { maxPriorityFeePerGas: parseUnits("3", "9"), maxFeePerGas: parseUnits("3", "9") });
    await currency_tx.wait(1);
    const dao_tx = await econAuctionHouse.setDaoTreasury(daoTreasuryAddress, { maxPriorityFeePerGas: parseUnits("3", "9"), maxFeePerGas: parseUnits("3", "9") });
    await dao_tx.wait(1);

    const erc20CurrencyContract = await econAuctionHouse.getErc20Currency();
    const daoTreasury = await econAuctionHouse.getDaoTreasury();

    console.log(`\n Dao treasury address from auction house is ${daoTreasury} (should be ${daoTreasuryAddress})`);
    console.log(`\n Erc20 currency from the auction house is ${erc20CurrencyContract} (should be ${usdcAddress})`);
}