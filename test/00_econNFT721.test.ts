import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import assert from "assert";
import { 
    deployEconNft721, 
    deployTokens, 
    displayAddress, 
    mintErc721Tokens,
} from "./helpers.test";
import { assertAddressOk } from "./assertions.test";

let econNFT: Contract;
let weth: Contract;
let usdc: Contract;


let deployer: SignerWithAddress;
let daoTreasury: SignerWithAddress
let minter: SignerWithAddress;
let attacker: SignerWithAddress;

const displayAddresses = false;
const displayAccounts = false;

// before("EconNFT", async function() {

//     [deployer, daoTreasury, minter, attacker] = await ethers.getSigners();

//     displayAccounts && displayAddress("deployer", deployer.address);
//     displayAccounts && displayAddress("daoTreasury", daoTreasury.address);
//     displayAccounts && displayAddress("minter", minter.address);
//     displayAccounts && displayAddress("attacker", attacker.address);

//     econNFT = await deployEconNft721(6);
//     [usdc, weth] = await deployTokens();

//     await econNFT.setMinter(minter.address);

//     await mintErc721Tokens(20, econNFT, minter);

// });

describe("EconNFT", function() {
    
    // it("Deployed the nft correctly", async function() {
    
    //     displayAddresses && displayAddress("EconNFT", econNFT.address);
        
    //     assertAddressOk(econNFT.address);
    // });

    // it("Deployed tokens correctly", async function() {

    //     displayAddresses && displayAddress("weth", weth.address);
    //     displayAddresses && displayAddress("usdc", usdc.address);

    //     assertAddressOk(weth.address);
    //     assertAddressOk(usdc.address);

    // });

    // it("Set Minter correctly", async function() {

    //     const econMinter = await econNFT.minter();

    //     assert.equal(econMinter, minter.address);
    // });

    // it("Mint all 20 tokens", async function() {

    //     const nftBalance = await econNFT.balanceOf(minter.address);

    //     assert.ok(nftBalance.eq(20));
    // });

    // it("Can't mint if isn't the minter", async function() {
    //     try {
    //         await mintErc721Tokens(1, econNFT, attacker);
    //         assert.ok(false);
    //     } catch(error) {
    //         assert.ok(true);
    //     }
    // });
});