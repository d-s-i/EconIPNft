// import econAuctionHouse from "../deployments/rinkeby/EconAuctionHouse.json";

import { ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import "@nomiclabs/hardhat-etherscan";

import { getTimestampFromNbOfMonth } from "../test/helpers.test";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deploy } = hre.deployments;
    const chainId = await hre.getChainId();
    const { deployer } = await hre.getNamedAccounts();

    console.log(`deploying econ NFT on chain ${chainId}`);
    
    if(+chainId === 4) {
        
        const [signer] = await hre.ethers.getSigners();

        const expirationTimestamp = getTimestampFromNbOfMonth(6);
        const args = [0, expirationTimestamp];

        const econNFTContractFactory = await hre.ethers.getContractFactory("EconNFTERC721");
        const deployResult = await deploy("EconNFTERC721", { from: deployer, log: true, args: args, waitConfirmations: 3 });

        const econNFT = new ethers.Contract(deployResult.address, econNFTContractFactory.interface, signer)

        console.log(`Congrats! Your EconNFTContract just deployed. You can interact with it at ${deployResult.address}`);

        // try {
        //     await econNFT.setEconAuctionHouse(econAuctionHouse.address);
        // } catch(error) {
        //     console.log(error);
        //     console.log("An error occured when setting the auction house address on the NFT");
        // }

        try {
          await hre.run("verify:verify", {
              address: econNFT.address,
              constructorArguments: args,
            });
        } catch(error) {
          console.log(error);
          console.log(`\n Contract hasn't been verified, you can verify it by typing : hh verify --network rinkeby ${econNFT.address} ${args}`);
        }
    }
};

func.tags = ['econNFT'];
export default func;
