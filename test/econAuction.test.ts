import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Address } from "cluster";
import assert from "assert";
import { endAuction, deployAllBasicContracts } from "./helpers.test";
import { getAuctionArgs } from "./constants.test";

let econNFT: Contract;
let econAuctionHouse: Contract;
let accounting: Contract;
let weth: Contract;
let usdc: Contract;

let auctionIds: BigNumber[] = [];

let acc0: SignerWithAddress, daoTreasury: SignerWithAddress, acc2: SignerWithAddress;

describe("Econ NFT", function() {

    it("Deploy EconNFT", async function() {
        [acc0, daoTreasury, acc2] = await ethers.getSigners();

        [econNFT, usdc, weth] = await deployAllBasicContracts(acc0.address);

        console.log(`acc0 address is ${acc0.address}`);

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

    it("Set ERC1155Owner for econNFT correctly", async function() {
        const owner = await econNFT.ERC1155Owner();
        assert.equal(owner, acc0.address);
        // await econNFT.setAuctionHouse(econAuctionHouse.address);
    });
});

describe("Econ Auction House", function() {
    it("Deploy the Auction House", async function() {
        const EconAuctionHouse = await ethers.getContractFactory("EconAuctionHouse");
    
        econAuctionHouse = await EconAuctionHouse.deploy();

        await econNFT.setEconAuctionHouse(econAuctionHouse.address);
        assert.ok(econAuctionHouse.address !== undefined);
    });

    it("Initialize the auction house correctly", async function() {
        await econAuctionHouse.setErc20Currency(usdc.address);
        await econAuctionHouse.setDaoTreasury(daoTreasury.address);

        const erc20CurrencyContract = await econAuctionHouse.getErc20Currency();
        const daoTreasuryAddress = await econAuctionHouse.getDaoTreasury();

        assert.equal(erc20CurrencyContract, usdc.address);
        assert.equal(daoTreasuryAddress, daoTreasury.address);
    });

    it("Send All NFTs To The Auction Contract", async function() {
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
            await econAuctionHouse.registerAnAuctionToken(econNFT.address, i, ethers.utils.id("ERC1155").slice(0, 10), true);
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
            await econAuctionHouse.setBiddingAllowed(econNFT.address, true);
            await usdc.approve(econAuctionHouse.address, BigInt(2**255));
            await econAuctionHouse.bid(auctionIds[0], 10, 0);
        } catch(error) {
            console.log(error);
            assert.ok(false);
        }
    });

    it("Claim the NFT", async function() {
        const auctionInfos = await econAuctionHouse.getAuctionInfo(auctionIds[0]);
        console.log(auctionInfos);
        await endAuction(auctionInfos.endTime, auctionInfos.endTime.sub(auctionInfos.startTime));

        const initialAcc0Balance = await econNFT.balanceOf(acc0.address, 0);
        
        await econAuctionHouse.claim(auctionIds[0]);

        const highestBidderBalance = await econNFT.balanceOf(acc0.address, 0);
        assert.equal(initialAcc0Balance.toNumber(), 0);
        assert.equal(highestBidderBalance.toNumber(), 1);
    });

    // it("Gid the nft to acc2", async function() {
    //     try {
    //         await usdc.transfer(acc2.address, ethers.utils.parseUnits("1000", "6"));
    //         econAuctionHouse = econAuctionHouse.connect(acc2);
    //         usdc = usdc.connect(acc2);
    
    //         await usdc.approve(econAuctionHouse.address, BigInt(2**255));
    //         await econAuctionHouse.bid(auctionIds[1], 10, 0);
    
    //         const auctionInfos = await econAuctionHouse.getAuctionInfo(auctionIds[1]);
    //         console.log(auctionInfos);
    //         await endAuction(auctionInfos.endTime, auctionInfos.endTime.sub(auctionInfos.startTime));
    
    //         const initialAcc2Balance = await econNFT.balanceOf(acc2.address, 1);
            
    //         await econAuctionHouse.claim(auctionIds[1]);

    //         const highestBidderBalance = await econNFT.balanceOf(acc2.address, 1);
    //         assert.equal(initialAcc2Balance.toNumber(), 0);
    //         assert.equal(highestBidderBalance.toNumber(), 1);
    //     } catch(error) {
    //         console.log(error);
    //         assert.ok(false);
    //     }
    // });

    it("Transfered the funds to the DAO", async function() {
        const USDCDaoBalances = await usdc.balanceOf(daoTreasury.address);

        assert.equal(+USDCDaoBalances, 10);
    });

    it("Approve the auction House", async function() {
        const isApproved = await econNFT.isApprovedForAll(acc0.address, econAuctionHouse.address);
        assert.equal(isApproved, true);
    });

    it("Take the NFT back", async function() {
        const initialAcc0Balance = await econNFT.balanceOf(acc0.address, 0);

        await econAuctionHouse.takeNFTBack(econNFT.address, acc0.address, 0, 1);

        const Acc0Balance = await econNFT.balanceOf(acc0.address, 0);

        const auctionHouseBalance = await econNFT.balanceOf(econAuctionHouse.address, 0);

        assert.equal(initialAcc0Balance, 1);
        assert.equal(Acc0Balance, 0);
        assert.equal(auctionHouseBalance, 1);
    });
});