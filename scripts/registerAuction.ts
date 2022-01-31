import { Contract } from "ethers";
import { ethers } from "hardhat";
import { getAuctionArgs } from "../test/constants.test";

export const registerAuction = async function (
    econNFT: Contract,
    econAuctionHouse: Contract,
    usdcAddress: string
) {

    const [signer] = await ethers.getSigners();

    console.log("Creating an auction...");

    const USDCFactory = await ethers.getContractFactory("USDC");
    const usdc = await new ethers.Contract(usdcAddress, USDCFactory.interface, signer);

    const auctionArgs = await getAuctionArgs(signer.provider!, usdc);
    
    console.log("Registering an auction contract with args: ", auctionArgs);

    try {
        await econAuctionHouse.registerAnAuctionContract(
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
            // const gas = await econAuctionHouse.estimateGas.registerAnAuctionToken(econNFT.address, i, ethers.utils.id("ERC721").slice(0, 10), true);
            // console.log(gas.toString());
            await econAuctionHouse.registerAnAuctionToken(econNFT.address, i, ethers.utils.id("ERC721").slice(0, 10), false, { gasLimit: 500000 });
        }
    } catch(error) {
        console.log(error);
        console.log("An error occured when registering an auction token");
    }
    
    console.log("Done...");

}

const register = async function() {
    const [signer] = await ethers.getSigners();
    const EconAuctionHouse = await ethers.getContractFactory("EconAuctionHouse");
    const econAuctionHouse = new ethers.Contract("0x6b72415d2b81c5c2c18e6dcf65c278338896d433", EconAuctionHouse.interface, signer);
    const EconNFT = await ethers.getContractFactory("EconNFT");
    const econNFT = new ethers.Contract("0xef403712db606B740943d3BB3fEd6de1cbA11042", EconNFT.interface, signer);

    await registerAuction(econNFT, econAuctionHouse, "0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b");
}

register();