import { ethers, BigNumber } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import "@nomiclabs/hardhat-etherscan";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deploy } = hre.deployments;
    const chainId = await hre.getChainId();
    const { deployer } = await hre.getNamedAccounts();

    const EXPIRATION_DATE = 1672441200;

    console.log("deploying econ NFT");
    
    if(+chainId === 4 || +chainId === 31337 || +chainId === 80001) {
        const WETH_ADDRESS = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
        
        const accounts = await hre.ethers.getSigners();
        const signer = accounts[0];

        const econNFTContractFactory = await hre.ethers.getContractFactory("EconNFT");
        const econNFTContract = await deploy("EconNFT", { from: deployer, log: true, args: ["0", EXPIRATION_DATE] });

        const econNFT = await new ethers.Contract(econNFTContract.address, econNFTContractFactory.interface, signer)

        console.log(`Congrats! Your EconNFTContract just deployed. You can interact with it at ${econNFTContract.address}`);
        console.log(`You can also verify it on etherscan using \n hh verify --network rinkeby ${econNFTContract.address}`);

        const econAuctionHouseFactory = await hre.ethers.getContractFactory("EconAuctionHouse");

        const econAuctionHouseContractDeployements = await deploy("EconAuctionHouse", { from: deployer, log: true });
        
        const econAuctionHouseContract = new ethers.Contract(
            econAuctionHouseContractDeployements.address, 
            econAuctionHouseFactory.interface, 
            signer
        );

        const initialize_tx = await econAuctionHouseContract.initialize(
            econNFTContract.address,
            WETH_ADDRESS,
            BigNumber.from("0"),
            ethers.utils.parseEther("0.01"),
            BigNumber.from("1"),
            BigNumber.from("86400")
        );

        await initialize_tx.wait(1);

        const minter_tx = await econNFT.setMinter(econAuctionHouseContract.address);

        await minter_tx.wait(1);

        await econAuctionHouseContract.unpause();

        console.log(`Congrats! Your EconAuctionHouseContract just deployed. You can interact with it at ${econAuctionHouseContract.address}`);
        
        try {
            await hre.run("verify:verify", {
                address: econNFT.address,
                constructorArguments: [
                    "0", 
                    EXPIRATION_DATE
                ],
              });

              await hre.run("verify:verify", {
                address: econAuctionHouseContract.address,
                constructorArguments: [],
              });
          } catch(error) {
            console.log(`\n Contract hasn't been verified, you can verify it by typing : hh verify --network rinkeby ${econNFT.address} 0 ${EXPIRATION_DATE}`);
            console.log(`\n Contract hasn't been verified, you can verify it by typing : hh verify --network rinkeby ${econAuctionHouseContract.address}`);
          }
        console.log(`Just to verify deployements, here is the weth address: ${await econAuctionHouseContract.weth()} and here is the duration of an auction: ${await econAuctionHouseContract.duration()}`);
    } else {
        console.log(`Deployement didn"t run through because you are on chain ${chainId}`);
    }
};

export default func;