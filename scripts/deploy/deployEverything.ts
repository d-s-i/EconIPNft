import hre, { ethers } from "hardhat";
import { parseEther, parseUnits } from "ethers/lib/utils";

import { getTimestampFromNbOfMonth } from "../../test/helpers.test";
import { mintNFT } from "../mintNFT";
import { initializeAuctionHouse } from "../initializeAuctionHouse";
import { registerAuction } from "../registerAuction";
import { initializeERC721NFT } from "../initializeERC721NFT";
import { sendNFT } from "../sendNFT";

const main = async function() {
    const [signer] = await ethers.getSigners();
    console.log("\n About to deploy everything");
    const usdcAddress = "0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b";
    const daoTreasuryAddress = "0x945A8480d61D85ED755013169dC165574d751D1a";
    
    const econNFTArgs = getEconNFTArgs();
    const econNFT = await deployEconNFT(econNFTArgs);
    console.log(`\n EconNFT deployed at: ${econNFT.address}`);
    const econAuctionHouse  = await deployAuctionHouse(econNFT.address);
    console.log(`\n EconAuctionHouse deployed at: ${econAuctionHouse.address}`);
    const accounting = await deployAccounting(econNFT.address, usdcAddress);
    console.log(`\n Accounting deployed at: ${accounting.address}`);

    console.log("\n now initializing the contracts");

    await initializeERC721NFT(econNFT, signer.address);
    await initializeAuctionHouse(econAuctionHouse, usdcAddress, daoTreasuryAddress);

    console.log("\n contracts initialized, now minting NFTs");
    
    await mintNFT(econNFT.address);
    await sendNFT(econNFT, econAuctionHouse.address);
    console.log("\n NFTs sent, now registring auction");
    await registerAuction(econNFT, econAuctionHouse, usdcAddress);
    console.log("\n auction registred, now verifying contracts");
    
    await verifyContract(econAuctionHouse.address, [econNFT.address]);
    await verifyContract(econNFT.address, econNFTArgs);
    const accountingArgs = getAccountingArgs(econNFT.address, usdcAddress);
    await verifyContract(accounting.address, accountingArgs);
    console.log("\n contracts should be verified");

}

const deployEconNFT = async function(args: any[]) {
    const econNFTContractFactory = await ethers.getContractFactory("EconNFTERC721");
    const econNFT = await econNFTContractFactory.deploy(...args, { maxPriorityFeePerGas: parseUnits("3", "9"), maxFeePerGas: parseUnits("3", "9") });
    await econNFT.deployed();

    return econNFT;
}

const deployAuctionHouse = async function(econNFTAddress: string) {
    const AuctionHouseFactory = await ethers.getContractFactory("EconAuctionHouse");
    const econAuctionHouse = await AuctionHouseFactory.deploy(econNFTAddress, { maxPriorityFeePerGas: parseUnits("3", "9"), maxFeePerGas: parseUnits("3", "9") });
    await econAuctionHouse.deployed();

    return econAuctionHouse;
}

const deployAccounting = async function(
    econNFTAddress: string,
    usdcAddress: string
) {

    const args = getAccountingArgs(econNFTAddress, usdcAddress);
    const Accounting = await ethers.getContractFactory("Accounting");
    const accounting = await Accounting.deploy(...args, { maxPriorityFeePerGas: parseUnits("3", "9"), maxFeePerGas: parseUnits("3", "9") });
    await accounting.deployed();

    return accounting;
}

const getAccountingArgs = function(econNFTAddress: string, usdcAddress: string) {
    const booksPerOrder = "20";
    const bookPrice = parseUnits("70.0", "6");
    const args = [
        booksPerOrder, 
        bookPrice, 
        econNFTAddress, 
        usdcAddress
    ];
    return args;
}

const getEconNFTArgs = function() {
    const expirationTimestamp = getTimestampFromNbOfMonth(6);
    const econNFTArgs = [expirationTimestamp];

    return econNFTArgs;
}

const verifyContract = async function(
    contractAddress: string, 
    args: any[]
) {
    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
          });
      } catch(error) {
        console.log(error);
        console.log(`\n Contract hasn't been verified, you can verify it by typing : hh verify --network rinkeby ${contractAddress} ${args}`);
      }
}

main();