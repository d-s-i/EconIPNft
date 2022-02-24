import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "hardhat-deploy";
import "@nomiclabs/hardhat-etherscan";
require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

export default {
  solidity: {
    version: "0.8.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    }
  },
  // defaultNetrowk: "hardhat",
  mocha: {
    timeout: 200000
  },
  networks: {
    rinkeby: {
      url: process.env.ALCHEMY_RINKEBY_URL,
      accounts: {
        mnemonic: process.env.MNEMONIC
      },
      saveDeployements: true
    },
    polygonTestnet: {
      url: process.env.POLYGON_TEST_URL,
      accounts: {
        mnemonic: process.env.MNEMONIC
      },
      saveDeployements: true
    },
    goerli: {
      url: process.env.GOERLI_URL,
      accounts: {
        mnemonic: process.env.MNEMONIC
      }
    }
    // hardhat: {
    //   forking: {
    //     url: process.env.ETH_MAINNET_URL
    //   }
    // }
  },
  namedAccounts: {
    deployer: {
      default: 0
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};