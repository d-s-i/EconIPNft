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
    mintErc721Tokens,
    initializeAuctionHouse,
    sendErc721Nft,
    bidOnAuctionWithToken,
    distributeTokens,
    goToExpirationDate,
    getTimestampFromNbOfMonth,
    getHighestBids,
    getHighestBidders,
    resetAuctions,
    getAuctionIds,
    registerAuction,
    bidOnAll20Auctions,
    takeAll20NftBack,
    changeExpirationTimestampOnEconNFT,
    claimAllNftForFirstTime,
    makeAFirstAuctionAndClaim,
    makeAFullReAuction,
    claimAllNFtAfterReAuction,
    registerNewAuction,
    displayBalances
} from "./helpers.test";
import {
    assertBalancesAreCorrect,
    assertAddressOk,
    assertAuctionStateIsDefault,
    assertCantClaimForFirstTime,
    assertCantBid,
    assertAuctionStateIsCorrect,
    assertBidsAreCorrect,
    assertBid2EarnWorks,
    assertBidIsTooLow
} from "./assertions.test";
import { AuctionState, getAuctionArgs } from "./constants.test";

let econNFT: Contract;
let econAuctionHouse: Contract;
let weth: Contract;
let usdc: Contract;

let auctionIds: BigNumber[] = [];

let deployer: SignerWithAddress;
let daoTreasury: SignerWithAddress
let minter: SignerWithAddress;
let attacker: SignerWithAddress;
let buyer: SignerWithAddress;
let buyer2: SignerWithAddress;
let buyer3: SignerWithAddress;

let initialAuctionStartTime: BigNumber;
let initialAuctionEndTime: BigNumber;

let defaultAuctionArgs: AuctionState;

const displayAddresses = false;
const displayAccounts = false;
const displayBalance = false;

beforeEach("AuctionHouse", async function() {

    [deployer, daoTreasury, minter, attacker, buyer, buyer2, buyer3] = await ethers.getSigners();

    displayAccounts && displayAddress("deployer", deployer.address);
    displayAccounts && displayAddress("daoTreasury", daoTreasury.address);
    displayAccounts && displayAddress("minter", minter.address);
    displayAccounts && displayAddress("attacker", attacker.address);

    econNFT = await deployEconNft721(6);
    [usdc, weth] = await deployTokens();

    await distributeTokens([buyer.address, buyer2.address, buyer3.address], 30000, { token: usdc, signer: deployer });

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

    auctionIds = await getAuctionIds(econNFT.address, econAuctionHouse);

    defaultAuctionArgs = await registerNewAuction(
        deployer.provider!,
        { econAuctionHouse, econNFT, token: usdc }
    );

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

    it("Get Aucions IDs" , async function() {
        auctionIds.map(auctionId => assert.ok(
            typeof(auctionId) !== "undefined" &&
            auctionId
        ));
    });

    it("Register An Auction Contract", async function() {

        await assertAuctionStateIsCorrect(
            auctionIds[0],
            defaultAuctionArgs,
            econAuctionHouse
        );

    });

    it("Register An Auction Token", async function () {
        const contractCurrency = await econAuctionHouse.getErc20Currency();

        assert.equal(usdc.address, contractCurrency);
    });

    it("Bid", async function() {

        const signer = buyer;
        const bidAmount = 1;
        
        await bidOnAll20Auctions(
            auctionIds, 
            {
                bidArgs: bidAmount,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: signer }
            }
        );

        await assertBidsAreCorrect(
            { buyerAddress: signer.address, bidAmount },
            auctionIds,
            econAuctionHouse
        );
    });

    it("Claim the NFT", async function() {

        const signer = buyer;
        const buyAmount = 1;
        
        await bidOnAll20Auctions(
            auctionIds, 
            {
                bidArgs: buyAmount,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: signer }
            }
        );
        
        initialAuctionStartTime = await econAuctionHouse.getAuctionStartTime(auctionIds[0]);
        initialAuctionEndTime = await econAuctionHouse.getAuctionEndTime(auctionIds[0]);
        await endAuction(econAuctionHouse, auctionIds[0]);

        const initialBuyerBalance = await econNFT.balanceOf(buyer.address);
        
        await claimAllNftForFirstTime(auctionIds, econAuctionHouse);

        const finalBuyerBalance = await econNFT.balanceOf(buyer.address);
        assert.equal(initialBuyerBalance.toNumber(), 0);
        assert.equal(finalBuyerBalance.toNumber(), 20);

        const auctionBalances = await econNFT.balanceOf(econAuctionHouse.address);
        assert.ok(auctionBalances.isZero());
    });

    it("Transfered the funds to the DAO", async function() {

        const signer = buyer;
        const bidAmount = 1;
        
        await bidOnAll20Auctions(
            auctionIds, 
            {
                bidArgs: bidAmount,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: signer }
            }
        );

        await endAuction(econAuctionHouse, auctionIds[0]);

        for(const i of auctionIds) {
            await econAuctionHouse.claimForFirstTime(i);
        }

        const USDCDaoBalances = await usdc.balanceOf(daoTreasury.address);

        assert.ok(USDCDaoBalances.eq(ethers.utils.parseUnits("20", "6")));
    });

    it("Reset Auction", async function() {

        await goToExpirationDate(7);

        await resetAuctions(auctionIds, econNFT.address, econAuctionHouse);

        for(const auctionId of auctionIds) {
            await assertAuctionStateIsDefault(auctionId, econAuctionHouse);
        }
    });
    
    it("Create New Auctions", async function() {

        await goToExpirationDate(7);

        await resetAuctions(auctionIds, econNFT.address, econAuctionHouse);

        const auctionArgs = await registerNewAuction(
            deployer.provider!,
            { econAuctionHouse, econNFT, token: usdc }
        );

        const auctionStartTime = await econAuctionHouse.getAuctionStartTime(auctionIds[0]);
        const auctionEndTime = await econAuctionHouse.getAuctionEndTime(auctionIds[0]);

        assert.ok(initialAuctionStartTime.lt(auctionStartTime) && auctionStartTime.eq(auctionArgs.startTime));
        assert.ok(initialAuctionEndTime.lt(auctionEndTime) && auctionEndTime.eq(auctionArgs.endTime));

    });

    it("Take All Nft Back", async function() {

        await goToExpirationDate(7);

        await resetAuctions(auctionIds, econNFT.address, econAuctionHouse);

        await registerNewAuction(
            deployer.provider!,
            { econAuctionHouse, econNFT, token: usdc }
        );

        await takeAll20NftBack(econNFT, econAuctionHouse);
        
        const auctionBalances = await econNFT.balanceOf(econAuctionHouse.address);
        
        assert.ok(auctionBalances.eq(20));
    });

    it("Change timestamp for NFT", async function() {
        const newExpirationTimestamp = getTimestampFromNbOfMonth(6);
        await econNFT.setCurrentExpirationTimestamp(newExpirationTimestamp);

        const newTimestampFromContract = await econNFT.getCurrentExpirationTimestamp();

        assert.equal(newTimestampFromContract, newExpirationTimestamp);
    });

    it("Bid with the same wallet as the previous owner for a second auction", async function() {

        const signer = buyer;
        const bidAmount = 1;
        
        await bidOnAll20Auctions(
            auctionIds, 
            {
                bidArgs: bidAmount,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: signer }
            }
        );

        await endAuction(econAuctionHouse, auctionIds[0]);

        await claimAllNftForFirstTime(auctionIds, econAuctionHouse);

        await goToExpirationDate(7);

        await changeExpirationTimestampOnEconNFT(6, econNFT);

        await resetAuctions(auctionIds, econNFT.address, econAuctionHouse);

        await registerNewAuction(
            deployer.provider!,
            { econAuctionHouse, econNFT, token: usdc }
        );

        await takeAll20NftBack(econNFT, econAuctionHouse);

        await bidOnAll20Auctions(
            auctionIds, 
            {
                bidArgs: bidAmount,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: signer }
            }
        );

        await assertBidsAreCorrect(
            { buyerAddress: signer.address, bidAmount },
            auctionIds,
            econAuctionHouse
        );

    });

    it("End a Re-Auction After The Buyer Has Re-Bid On It", async function() {

        const signer = buyer;
        const bidAmount = 1;
        
        await bidOnAll20Auctions(
            auctionIds, 
            {
                bidArgs: bidAmount,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: signer }
            }
        );

        await endAuction(econAuctionHouse, auctionIds[0]);

        await claimAllNftForFirstTime(auctionIds, econAuctionHouse);

        await goToExpirationDate(7);

        await resetAuctions(auctionIds, econNFT.address, econAuctionHouse);

        await registerNewAuction(
            deployer.provider!,
            { econAuctionHouse, econNFT, token: usdc }
        );

        await changeExpirationTimestampOnEconNFT(6, econNFT);

        await takeAll20NftBack(econNFT, econAuctionHouse);

        await bidOnAll20Auctions(
            auctionIds, 
            {
                bidArgs: bidAmount,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: signer }
            }
        );

        await endAuction(econAuctionHouse, auctionIds[0]);

        await assertCantBid(
            auctionIds,
            { econAuctionHouse, econNFT, usdc },
            { deployer, buyer }
        );
    });

    it("Can't claim nft with `claimFirstTime` when it has been re-auctionned again", async function() {

        const signer = buyer;
        const bidAmount = 1;
        
        await bidOnAll20Auctions(
            auctionIds, 
            {
                bidArgs: bidAmount,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: signer }
            }
        );

        await endAuction(econAuctionHouse, auctionIds[0]);

        await claimAllNftForFirstTime(auctionIds, econAuctionHouse);

        await goToExpirationDate(7);

        await resetAuctions(auctionIds, econNFT.address, econAuctionHouse);

        await registerNewAuction(
            deployer.provider!,
            { econAuctionHouse, econNFT, token: usdc }
        );

        await changeExpirationTimestampOnEconNFT(6, econNFT);

        await takeAll20NftBack(econNFT, econAuctionHouse);

        await bidOnAll20Auctions(
            auctionIds, 
            {
                bidArgs: bidAmount,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: signer }
            }
        );

        await endAuction(econAuctionHouse, auctionIds[0]);

        const initialBuyerBalance = await econNFT.balanceOf(buyer.address);
        
        await assertCantClaimForFirstTime(auctionIds, econAuctionHouse);

        const finalBuyerBalance = await econNFT.balanceOf(buyer.address);
        const auctionBalances = await econNFT.balanceOf(econAuctionHouse.address);

        assertBalancesAreCorrect(
            { balance: initialBuyerBalance, expectedBalance: 0 },
            { balance: finalBuyerBalance, expectedBalance: 0 },
            { balance: auctionBalances, expectedBalance: 20 },
        )
    });

    it("Claim the NFT with the right `claimAfterReAuctionned` function", async function() {

        const signer = buyer;
        const bidAmount = 1;
        
        await makeAFirstAuctionAndClaim(
            { econAuctionHouse, econNFT, token: usdc },
            { deployer, buyer: signer },
            { auctionIds, bidAmount }
        );

        await goToExpirationDate(7);

        await resetAuctions(auctionIds, econNFT.address, econAuctionHouse);

        await registerNewAuction(
            deployer.provider!,
            { econAuctionHouse, econNFT, token: usdc }
        );

        await changeExpirationTimestampOnEconNFT(6, econNFT);

        await takeAll20NftBack(econNFT, econAuctionHouse);

        await bidOnAll20Auctions(
            auctionIds, 
            {
                bidArgs: bidAmount,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: signer }
            }
        );
        
        await endAuction(econAuctionHouse, auctionIds[0]);
        
        const initialBuyerBalance = await econNFT.balanceOf(buyer.address);

        await claimAllNFtAfterReAuction(auctionIds, econAuctionHouse);

        const finalBuyerBalance = await econNFT.balanceOf(buyer.address);
        const auctionBalances = await econNFT.balanceOf(econAuctionHouse.address);
 
        assertBalancesAreCorrect(
            { balance: initialBuyerBalance, expectedBalance: 0 },
            { balance: finalBuyerBalance, expectedBalance: 20 },
            { balance: auctionBalances, expectedBalance: 0 },
        );
    });

    it("Give funds to the right wallets", async function() {
        const signer = buyer;
        const bidAmount = 1;

        const initialUsdcDaoBalance = await usdc.balanceOf(daoTreasury.address);
        const initialUsdcBuyerBalance = await usdc.balanceOf(buyer.address);
        const initialUsdcAuctionHouseBalance = await usdc.balanceOf(econAuctionHouse.address);

        displayBalance && displayBalances([{
            initialUsdcDaoBalance,
            initialUsdcBuyerBalance,
            initialUsdcAuctionHouseBalance
        }]);
        
        await makeAFirstAuctionAndClaim(
            { econAuctionHouse, econNFT, token: usdc },
            { deployer, buyer: signer },
            { auctionIds, bidAmount }
        );

        const finalUsdcDaoBalance = await usdc.balanceOf(daoTreasury.address);
        const finalUsdcBuyerBalance = await usdc.balanceOf(buyer.address);
        const finalUsdcAuctionHouseBalance = await usdc.balanceOf(econAuctionHouse.address);

        displayBalance && displayBalances([{
            finalUsdcDaoBalance,
            finalUsdcBuyerBalance,
            finalUsdcAuctionHouseBalance
        }]);

        assertBalancesAreCorrect(
            { balance: initialUsdcDaoBalance, expectedBalance: 0 },
            { balance: initialUsdcBuyerBalance, expectedBalance: ethers.utils.parseUnits("30000", "6") },
            { balance: initialUsdcAuctionHouseBalance, expectedBalance: 0 },
        );

        assertBalancesAreCorrect(
            { balance: finalUsdcDaoBalance, expectedBalance: ethers.utils.parseUnits(`${bidAmount * 20}`, "6") },
            { 
                balance: finalUsdcBuyerBalance, 
                expectedBalance: initialUsdcBuyerBalance.sub(ethers.utils.parseUnits(`${bidAmount * 20}`, "6")) 
            },
            { balance: finalUsdcAuctionHouseBalance, expectedBalance: 0 },
        );

    });

    it("Bid to Earn works for First Auction", async function() {
        const signer = buyer;
        const bidAmount = 1;

        const initialUsdcDaoBalance = await usdc.balanceOf(daoTreasury.address);
        const initialUsdcBuyerBalance = await usdc.balanceOf(buyer.address);
        const initialUsdcAuctionHouseBalance = await usdc.balanceOf(econAuctionHouse.address);
        const initialUsdcBuy2Balance = await usdc.balanceOf(buyer2.address);

        displayBalance && displayBalances([{
            initialUsdcDaoBalance,
            initialUsdcBuyerBalance,
            initialUsdcAuctionHouseBalance,
            initialUsdcBuy2Balance
        }]);

        await bidOnAll20Auctions(
            auctionIds,
            {
                bidArgs: bidAmount,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: signer }
            }
        );
        
        const intermediaryUsdcDaoBalance = await usdc.balanceOf(daoTreasury.address);
        const intermediaryUsdcBuyerBalance = await usdc.balanceOf(buyer.address);
        const intermediaryUsdcAuctionHouseBalance = await usdc.balanceOf(econAuctionHouse.address);
        const intermediaryUsdcBuyer2Balance = await usdc.balanceOf(buyer2.address);

        displayBalance && displayBalances([{
            intermediaryUsdcDaoBalance,
            intermediaryUsdcBuyerBalance,
            intermediaryUsdcAuctionHouseBalance,
            intermediaryUsdcBuyer2Balance
        }]);

        await bidOnAll20Auctions(
            auctionIds,
            {
                bidArgs: bidAmount * 2,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: buyer2 }
            }
        );

        const rightBeforeEndingAuctionUsdcDaoBalance = await usdc.balanceOf(daoTreasury.address);
        const rightBeforeEndingAuctionUsdcBuyerBalance = await usdc.balanceOf(buyer.address);
        const rightBeforeEndingAuctionUsdcAuctionHouseBalance = await usdc.balanceOf(econAuctionHouse.address);
        const rightBeforeEndingAuctionUsdcBuyer2Balance = await usdc.balanceOf(buyer2.address);

        displayBalance && displayBalances([{
            rightBeforeEndingAuctionUsdcDaoBalance,
            rightBeforeEndingAuctionUsdcBuyerBalance,
            rightBeforeEndingAuctionUsdcAuctionHouseBalance,
            rightBeforeEndingAuctionUsdcBuyer2Balance
        }]);

        await endAuction(econAuctionHouse, auctionIds[0]);

        await claimAllNftForFirstTime(auctionIds, econAuctionHouse);

        const finalUsdcDaoBalance = await usdc.balanceOf(daoTreasury.address);
        const finalUsdcBuyerBalance = await usdc.balanceOf(buyer.address);
        const finalUsdcAuctionHouseBalance = await usdc.balanceOf(econAuctionHouse.address);
        const finalUsdcBuyer2Balance = await usdc.balanceOf(buyer2.address);

        displayBalance && displayBalances([{
            finalUsdcDaoBalance,
            finalUsdcBuyerBalance,
            finalUsdcAuctionHouseBalance,
            finalUsdcBuyer2Balance
        }]);

        const incentivesMin = await econAuctionHouse.getAuctionIncMin(auctionIds[0]);
        
        await assertBid2EarnWorks(
            { initialBalances: initialUsdcBuyerBalance, finalBalances: rightBeforeEndingAuctionUsdcBuyerBalance },
            incentivesMin,
            bidAmount
        );

    });

    it("Have to bid at least more than 17%", async function() {
        const signer = buyer;
        const bidAmount = 1;

        await bidOnAll20Auctions(
            auctionIds,
            {
                bidArgs: bidAmount,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: signer }
            }
        );

        await assertBidIsTooLow(
            auctionIds,
            bidAmount * 1.16,
            { econAuctionHouse, econNFT, usdc },
            { deployer, buyer: buyer2 }
        );

        await bidOnAll20Auctions(
            auctionIds,
            {
                bidArgs: bidAmount * 1.17,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: buyer2 }
            }
        );

        await assertBidsAreCorrect(
            { buyerAddress: buyer2.address, bidAmount: bidAmount * 1.17 },
            auctionIds,
            econAuctionHouse
        );

    });

    it("Bid to Earn Works", async function() {
        const signer = buyer;
        const bidAmount = 1;

        const initialUsdcDaoBalance = await usdc.balanceOf(daoTreasury.address);
        const initialUsdcBuyerBalance = await usdc.balanceOf(buyer.address);
        const initialUsdcAuctionHouseBalance = await usdc.balanceOf(econAuctionHouse.address);
        const initialUsdcBuy2Balance = await usdc.balanceOf(buyer2.address);

        displayBalance && displayBalances([{
            initialUsdcDaoBalance,
            initialUsdcBuyerBalance,
            initialUsdcAuctionHouseBalance,
            initialUsdcBuy2Balance
        }]);
        
        await makeAFirstAuctionAndClaim(
            { econAuctionHouse, econNFT, token: usdc },
            { deployer, buyer: signer },
            { auctionIds, bidAmount }
        );

        const afterFirstAuctionUsdcDaoBalance = await usdc.balanceOf(daoTreasury.address);
        const afterFirstAuctionUsdcBuyerBalance = await usdc.balanceOf(buyer.address);
        const afterFirstAuctionUsdcAuctionHouseBalance = await usdc.balanceOf(econAuctionHouse.address);
        const afterFirstAuctionUsdcBuyer2Balance = await usdc.balanceOf(buyer2.address);

        displayBalance && displayBalances([{
            afterFirstAuctionUsdcDaoBalance,
            afterFirstAuctionUsdcBuyerBalance,
            afterFirstAuctionUsdcAuctionHouseBalance,
            afterFirstAuctionUsdcBuyer2Balance
        }]);

        await goToExpirationDate(7);

        await resetAuctions(auctionIds, econNFT.address, econAuctionHouse);

        await registerNewAuction(
            deployer.provider!,
            { econAuctionHouse, econNFT, token: usdc }
        );

        await changeExpirationTimestampOnEconNFT(6, econNFT);

        await takeAll20NftBack(econNFT, econAuctionHouse);

        await bidOnAll20Auctions(
            auctionIds,
            {
                bidArgs: bidAmount,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: signer }
            }
        );

        const intermediaryUsdcDaoBalance = await usdc.balanceOf(daoTreasury.address);
        const intermediaryUsdcBuyerBalance = await usdc.balanceOf(buyer.address);
        const intermediaryUsdcAuctionHouseBalance = await usdc.balanceOf(econAuctionHouse.address);
        const intermediaryUsdcBuyer2Balance = await usdc.balanceOf(buyer2.address);

        displayBalance && displayBalances([{
            intermediaryUsdcDaoBalance,
            intermediaryUsdcBuyerBalance,
            intermediaryUsdcAuctionHouseBalance,
            intermediaryUsdcBuyer2Balance
        }]);

        await bidOnAll20Auctions(
            auctionIds,
            {
                bidArgs: bidAmount + 1,
                contracts: { econAuctionHouse, econNFT, token: usdc },
                signerArgs: { deployer, buyer: buyer2 }
            }
        );

        const rightBeforeEndingAuctionUsdcDaoBalance = await usdc.balanceOf(daoTreasury.address);
        const rightBeforeEndingAuctionUsdcBuyerBalance = await usdc.balanceOf(buyer.address);
        const rightBeforeEndingAuctionUsdcAuctionHouseBalance = await usdc.balanceOf(econAuctionHouse.address);
        const rightBeforeEndingAuctionUsdcBuyer2Balance = await usdc.balanceOf(buyer2.address);

        displayBalance && displayBalances([{
            rightBeforeEndingAuctionUsdcDaoBalance,
            rightBeforeEndingAuctionUsdcBuyerBalance,
            rightBeforeEndingAuctionUsdcAuctionHouseBalance,
            rightBeforeEndingAuctionUsdcBuyer2Balance
        }]);

        await endAuction(econAuctionHouse, auctionIds[0]);

        await claimAllNFtAfterReAuction(auctionIds, econAuctionHouse);

        const finalUsdcDaoBalance = await usdc.balanceOf(daoTreasury.address);
        const finalUsdcBuyerBalance = await usdc.balanceOf(buyer.address);
        const finalUsdcAuctionHouseBalance = await usdc.balanceOf(econAuctionHouse.address);
        const finalUsdcBuyer2Balance = await usdc.balanceOf(buyer2.address);

        displayBalance && displayBalances([{
            finalUsdcDaoBalance,
            finalUsdcBuyerBalance,
            finalUsdcAuctionHouseBalance,
            finalUsdcBuyer2Balance
        }]);

    });

});

