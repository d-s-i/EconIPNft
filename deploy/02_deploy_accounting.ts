import { ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import "@nomiclabs/hardhat-etherscan";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    // console.log("deploying the accounting");

    // const { deploy } = hre.deployments;
    // const { deployer } = await hre.getNamedAccounts();
    // const accounting = await deploy("Accounting", {
    //   from: deployer,
    //   args: [
    //     "20", 
    //     ethers.utils.parseUnits("70.0", "6"), 
    //     "0x7E8435c76a59fb12c3997bC46bD124F4aBb1C09a", 
    //     "0xeb8f08a975ab53e34d8a0330e0d34de942c95926"
    // ],
    //   log: true,
    // });

    // try {
    //   await hre.run("verify:verify", {
    //       address: accounting.address,
    //       constructorArguments: [
    //           "20", 
    //           ethers.utils.parseUnits("70.0", "6"), 
    //           "0x7E8435c76a59fb12c3997bC46bD124F4aBb1C09a", 
    //           "0xeb8f08a975ab53e34d8a0330e0d34de942c95926"
    //       ],
    //     });
    // } catch(error) {
    //   console.log(`\n Contract hasn't been verified, you can verify it by typing : hh verify --network rinkeby ${accounting.address} 20 ${ethers.utils.parseUnits("70.0", "6")} 0x7E8435c76a59fb12c3997bC46bD124F4aBb1C09a 0xeb8f08a975ab53e34d8a0330e0d34de942c95926`);
    // }
    // console.log(`Contract deployed at ${accounting.address}`);
}

export default func;
