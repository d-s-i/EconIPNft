import { ethers, BigNumber } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import "@nomiclabs/hardhat-etherscan";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy } = hre.deployments;
  const chainId = await hre.getChainId();
  const { deployer } = await hre.getNamedAccounts();

  console.log(`deploying the auction house on ${chainId}`);
  
  if(+chainId === 4) {

    const usdcAddress = "0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b";
    const daoTreasuryAddress = "0x945A8480d61D85ED755013169dC165574d751D1a";
    const econNFTAddress = "0x68FA2958Aa8c8885D71C331FeF5eeED4D4AB13aA";

    const [signer] = await hre.ethers.getSigners();

    const AuctionHouseFactory = await hre.ethers.getContractFactory("EconAuctionHouse");
    const deployResult = await deploy("EconAuctionHouse", { from: deployer, log: true, args: [econNFTAddress], waitConfirmations: 3 });

    const econAuctionHouse = await new ethers.Contract(deployResult.address, AuctionHouseFactory.interface, signer)

    console.log(`Congrats! Your EconNFTContract just deployed. You can interact with it at ${deployResult.address}`);

    console.log("Initializing the auction house");

    try {
      await econAuctionHouse.setErc20Currency(usdcAddress);
    } catch(error) {
      console.log(error);
      console.log("An error occurend when setting the ERC20 currency on the Auction House");
    }
    
    try {
      await econAuctionHouse.setDaoTreasury(daoTreasuryAddress);
    } catch(error) {
      console.log(error);
      console.log("An error occurend when setting the ERC20 currency on the Auction House");
    }

    try {
      await hre.run("verify:verify", {
        address: econAuctionHouse.address,
        constructorArguments: [],
      });

    } catch(error) {
      console.log(`\n Contract hasn't been verified, you can verify it by typing : hh verify --network rinkeby ${econAuctionHouse.address}`);
    }
  }
};

func.tags = ["auctionHouse"];
export default func;