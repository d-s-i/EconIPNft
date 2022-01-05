import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import assert from "assert";
import { 
    endAuction, 
    deployEconNft721, 
    deployTokens, 
    displayAddress, 
    deployAuctionHouse, 
    assertAddressOk,
    mintErc721Tokens,
    initializeAuctionHouse,
    sendErc721Nft,
    bidOnAuctionWithToken,
    distributeUsdc,
    goToExpirationDate,
    getTimestampFromNbOfMonth
} from "./helpers.test";
import { getAuctionArgs } from "./constants.test";

let econNFT: Contract;
let econAuctionHouse: Contract;
let weth: Contract;
let usdc: Contract;

let auctionIds: BigNumber[] = [];
let newAuctionIds: BigNumber[] = [];

let deployer: SignerWithAddress;
let daoTreasury: SignerWithAddress
let minter: SignerWithAddress;
let attacker: SignerWithAddress;
let buyer: SignerWithAddress;

let initialAuctionStartTime: BigNumber;
let initialAuctionEndTime: BigNumber;

const displayAddresses = false;
const displayAccounts = false;

before("AuctionHouse", async function() {

    console.log("Runing the before() fn for the AuctionHouse");

    [deployer, daoTreasury, minter, attacker, buyer] = await ethers.getSigners();

    displayAccounts && displayAddress("deployer", deployer.address);
    displayAccounts && displayAddress("daoTreasury", daoTreasury.address);
    displayAccounts && displayAddress("minter", minter.address);
    displayAccounts && displayAddress("attacker", attacker.address);

    econNFT = await deployEconNft721(6);
    [usdc, weth] = await deployTokens();

    await distributeUsdc([buyer.address], 1000, { usdc, signer: deployer });

    await econNFT.setMinter(minter.address);

    await mintErc721Tokens(20, econNFT, minter);
    econAuctionHouse = await deployAuctionHouse(econNFT.address);

    await initializeAuctionHouse(usdc.address, daoTreasury.address, econAuctionHouse);

    for(let i = 0; i < 20; i++) {
        await sendErc721Nft(
            { contract: econNFT, signer: minter },
            econAuctionHouse.address,
            i
        );
    }

    for(let i = 0; i < 20; i++) {
        await econAuctionHouse.registerAnAuctionToken(econNFT.address, i, ethers.utils.id("ERC721").slice(0, 10), true);
    }

    await econNFT.setAuctionHouse(econAuctionHouse.address);

});

describe("EconAuctionHouse", async function() {
    it("Should deploy the auction house", async function() {

        displayAddresses && displayAddress("econAuctionHouse", econAuctionHouse.address);

        assertAddressOk(econAuctionHouse.address);
    });

    it("Initialize the auction house correctly", async function() {

        const erc20CurrencyContract = await econAuctionHouse.getErc20Currency();
        const daoTreasuryAddress = await econAuctionHouse.getDaoTreasury();

        assert.equal(erc20CurrencyContract, usdc.address);
        assert.equal(daoTreasuryAddress, daoTreasury.address);
    });

    it("Send All NFTs To The Auction Contract", async function() {

        const auctionBalances = await econNFT.balanceOf(econAuctionHouse.address);

        assert.ok(auctionBalances.eq(20));
        
    });

    it("Register An Auction Contract", async function() {
        const auctionArgs = await getAuctionArgs(deployer, usdc);
        await econAuctionHouse.registerAnAuctionContract(
            econNFT.address,
            ...auctionArgs
        );
    });

    it("Register An Auction Token", async function () {
        console.log("Can't verify if an auction token has been correctly set... But mission should be good");
    });

    it("Get Aucions IDs" , async function() {
        for(let i = 0; i < 20; i++) {
            let auctionId: BigNumber;
            auctionId = await econAuctionHouse.getAuctionID(econNFT.address, i);
            auctionIds.push(auctionId);
        }

        auctionIds.map(auctionId => assert.ok(
            typeof(auctionId) !== "undefined" &&
            auctionId
        ));
    });

    it("Bid", async function() {
        for(const i of auctionIds) {
            await bidOnAuctionWithToken(
                { auctionedId: i, humanReadableAmount: 1 },
                { econAuctionHouse, econNFT, token: usdc },
                { deployer, buyer }
            );
        }

        let highestBidders: string[] = [];
        let highestBids: BigNumber[] = [];
        for(const j of auctionIds) {
            const highestBidder = await econAuctionHouse.getAuctionHighestBidder(j);
            const highestBid = await econAuctionHouse.getAuctionHighestBid(j);

            highestBidders.push(highestBidder);
            highestBids.push(highestBid);
        }

        highestBidders.map(highestBidder => assert.equal(highestBidder, buyer.address));
        highestBids.map(highestBid => assert.ok(highestBid.eq(ethers.utils.parseUnits("1", "6"))));

    });

    it("Claim the NFT", async function() {
        initialAuctionStartTime = await econAuctionHouse.getAuctionStartTime(auctionIds[0]);
        initialAuctionEndTime = await econAuctionHouse.getAuctionEndTime(auctionIds[0]);
        await endAuction(initialAuctionEndTime, initialAuctionEndTime.sub(initialAuctionStartTime));

        const initialBuyerBalance = await econNFT.balanceOf(buyer.address);
        
        for(const i of auctionIds) {
            await econAuctionHouse.claimForFirstTime(i);
        }

        const finalBuyerBalance = await econNFT.balanceOf(buyer.address);
        assert.equal(initialBuyerBalance.toNumber(), 0);
        assert.equal(finalBuyerBalance.toNumber(), 20);

        const auctionBalances = await econNFT.balanceOf(econAuctionHouse.address);
        assert.ok(auctionBalances.isZero());
    });

    it("Transfered the funds to the DAO", async function() {
        const USDCDaoBalances = await usdc.balanceOf(daoTreasury.address);

        assert.ok(USDCDaoBalances.eq(ethers.utils.parseUnits("20", "6")));
    });

    it("Create New Auctions", async function() {

        await goToExpirationDate(7);

        auctionIds.map(async auctionId => {
            await econAuctionHouse.resetAuctionState(auctionId);
        });
        const auctionArgs = await getAuctionArgs(deployer, usdc);
        await econAuctionHouse.registerAnAuctionContract(
            econNFT.address,
            ...auctionArgs
        );

        const auctionStartTime = await econAuctionHouse.getAuctionStartTime(auctionIds[0]);
        const auctionEndTime = await econAuctionHouse.getAuctionEndTime(auctionIds[0]);

        assert.ok(initialAuctionEndTime.lt(auctionEndTime));
        assert.ok(initialAuctionStartTime.lt(auctionStartTime));

    });

    it("Take All Nft Back", async function() {

        for(let i = 0; i < 20; i++) {
            const owner = await econNFT.ownerOf(i);
            await econAuctionHouse.takeERC721Back(econNFT.address, owner, i);
        }
        
        const auctionBalances = await econNFT.balanceOf(econAuctionHouse.address);
        
        assert.ok(auctionBalances.eq(20));
    });

    it("Change timestamp for NFT", async function() {
        const newExpirationTimestamp = getTimestampFromNbOfMonth(6);
        await econNFT.setCurrentExpirationTimestamp(newExpirationTimestamp);
    });

    it("Bid", async function() {
        for(const i of auctionIds) {
            await bidOnAuctionWithToken(
                { auctionedId: i, humanReadableAmount: 1 },
                { econAuctionHouse, econNFT, token: usdc },
                { deployer, buyer }
            );
        }

        let highestBidders: string[] = [];
        let highestBids: BigNumber[] = [];
        for(const j of auctionIds) {
            const highestBidder = await econAuctionHouse.getAuctionHighestBidder(j);
            const highestBid = await econAuctionHouse.getAuctionHighestBid(j);

            highestBidders.push(highestBidder);
            highestBids.push(highestBid);
        }

        highestBidders.map(highestBidder => assert.equal(highestBidder, buyer.address));
        highestBids.map(highestBid => assert.ok(highestBid.eq(ethers.utils.parseUnits("1", "6"))));

    });

    it("Can't claim nft with `claimFirstTime` when it has been re-auctionned again", async function() {
        initialAuctionStartTime = await econAuctionHouse.getAuctionStartTime(auctionIds[0]);
        initialAuctionEndTime = await econAuctionHouse.getAuctionEndTime(auctionIds[0]);
        await endAuction(initialAuctionEndTime, initialAuctionEndTime.sub(initialAuctionStartTime));

        const initialBuyerBalance = await econNFT.balanceOf(buyer.address);
        
        try {
            for(const i of auctionIds) {
                await econAuctionHouse.claimForFirstTime(i);
            }
            assert.ok(false);
        } catch(error) {
            assert.ok(true);
        }

        const finalBuyerBalance = await econNFT.balanceOf(buyer.address);
        assert.equal(initialBuyerBalance.toNumber(), 0);
        assert.equal(finalBuyerBalance.toNumber(), 0);

        const auctionBalances = await econNFT.balanceOf(econAuctionHouse.address);
        assert.ok(auctionBalances.eq(20));
    });

    it("Claim the NFT with the right `claimAfterReAuctionned` function", async function() {
        initialAuctionStartTime = await econAuctionHouse.getAuctionStartTime(auctionIds[0]);
        initialAuctionEndTime = await econAuctionHouse.getAuctionEndTime(auctionIds[0]);

        const initialBuyerBalance = await econNFT.balanceOf(buyer.address);
        
        for(const i of auctionIds) {
            await econAuctionHouse.claimAfterReAuctionned(i);
        }

        const finalBuyerBalance = await econNFT.balanceOf(buyer.address);
        assert.equal(initialBuyerBalance.toNumber(), 0);
        assert.equal(finalBuyerBalance.toNumber(), 20);

        const auctionBalances = await econNFT.balanceOf(econAuctionHouse.address);
        assert.ok(auctionBalances.isZero());
    });

    it("Give funds to the right wallets", async function() {
        
    });

});

