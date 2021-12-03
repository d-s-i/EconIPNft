import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Address } from "cluster";
import assert from "assert";
import { displayAuction, endAuction, deployAllBasicContracts, deployAuctionHouse, deployAuctionHouseUSDC, bidOnAuctionWithUSDC, bidOnAuctionWithEth, deployAccounting } from "./helpers.test";
import { EXPIRATION_DATE, getAuctionArgs } from "./constants.test";

let econNFT: Contract;
let econAuctionHouse: Contract;
let accounting: Contract;
let weth: Contract;
let usdc: Contract;

let auctionIds: BigNumber[] = [];

let acc0: SignerWithAddress, acc1: SignerWithAddress, acc2: SignerWithAddress;

describe("Econ NFT", function() {

    it("Deploy EconNFT", async function() {
        [acc0, acc1, acc2] = await ethers.getSigners();

        [econNFT, usdc, weth] = await deployAllBasicContracts(acc0.address);

        assert.ok(econNFT.address !== undefined);
        console.log("econNFT address", econNFT.address);
    });

    it("Mint All NFTs", async function() {

        for(let i = 0; i < 20; i++) {
            await econNFT.mint(acc0.address, i, 1);
        }

        const ownerBalance = await econNFT.balanceOf(acc0.address, 0);
        
        assert.equal(ownerBalance, 1);
    });

    it("Has tokenURI", async function() {
        const tokenURI = await econNFT.uri(0);

        // console.log(tokenURI);
    });
});

describe("Econ Auction House", function() {
    it("Deploy the Auction House", async function() {
        const EconAuctionHouse = await ethers.getContractFactory("EconAuctionHouse");
    
        econAuctionHouse = await EconAuctionHouse.deploy();
        assert.ok(econAuctionHouse.address !== undefined);
    });

    it("Send All NFTs To The Auction Contract", async function() {
        econNFT = econNFT.connect(acc0);
        for(let i = 0; i < 20; i++) {
            await econNFT.safeTransferFrom(acc0.address, econAuctionHouse.address, i, 1, 0x00);
        }

        const auctionBalances = await econNFT.balanceOf(econAuctionHouse.address, 19);
        
        assert.equal(+auctionBalances, 1);
    });

    it("Register An Auction Contract", async function() {
        const auctionArgs = await getAuctionArgs(acc0, usdc);
        await econAuctionHouse.registerAnAuctionContract(
            econNFT.address,
            ...auctionArgs
        );
    });

    it("Register An Auction Token", async function () {
        // console.log(ethers.utils.id("ERC721").slice(0, 8));
        for(let i = 0; i < 20; i++) {
            await econAuctionHouse.registerAnAuctionToken(econNFT.address, i, ethers.utils.id("ERC721").slice(0, 10), true);
        }
    });

    it("Get Aucions IDs" , async function() {
        for(let i = 0; i < 20; i++) {
            let auctionId: BigNumber;
            auctionId = await econAuctionHouse.getAuctionID(econNFT.address, i);
            // console.log("auctionId", auctionId);
            auctionIds.push(auctionId);
        }
    });

    it("Bid", async function() {
        try {
            console.log("is bidding allowed", await econAuctionHouse.getBiddingAllowed(auctionIds[0]));
            await econAuctionHouse.setBiddingAllowed(econNFT.address, true);
            console.log("is bidding allowed", await econAuctionHouse.getBiddingAllowed(auctionIds[0]));
            const auctionInfos = await econAuctionHouse.getAuctionInfo(auctionIds[0]);
            // console.log(auctionInfos);
            await econAuctionHouse.bid(1, 1, 0);
        } catch(error) {
            console.log(error);
        }
    });
});