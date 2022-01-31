import assert from "assert";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { bidOnAuctionWithToken, bidOnAll20Auctions } from "./helpers.test";
import { AuctionState, BidOnAllAuctionState } from "./constants.test";
import { parseUnits } from "ethers/lib/utils";

export function assertAddressOk(testedAddress: string | undefined) {
    assert.ok(
        typeof(testedAddress) !== "undefined" && 
        testedAddress !== ethers.constants.AddressZero
    );
}

interface BalancesState {
    balance: number | BigNumber | string;
    expectedBalance: number | BigNumber | string;
}

export function assertBalancesAreCorrect(...balancesState: BalancesState[]) {

    balancesState.map(state => {
        assert.equal(state.balance.toString(), state.expectedBalance.toString());
    });

}

export async function assertAuctionStateIsCorrect(auctionId: BigNumber, correctState: AuctionState, econAuctionHouse: Contract) {
    const auctionStartTime = await econAuctionHouse.getAuctionStartTime(auctionId);
    const auctionEndTime = await econAuctionHouse.getAuctionEndTime(auctionId);
    const hammerTimeDuration = await econAuctionHouse.getAuctionHammerTimeDuration(auctionId);
    const bidDecimals = await econAuctionHouse.getAuctionBidDecimals(auctionId);
    const stepMin = await econAuctionHouse.getAuctionStepMin(auctionId);
    const incMax = await econAuctionHouse.getAuctionIncMax(auctionId);
    const incMin = await econAuctionHouse.getAuctionIncMin(auctionId);
    const bidMultiplier = await econAuctionHouse.getAuctionBidMultiplier(auctionId);

    assert.ok(auctionStartTime.eq(correctState.startTime));
    assert.ok(auctionEndTime.eq(correctState.endTime));
    assert.ok(hammerTimeDuration.eq(correctState.hammerTimeDuration));
    assert.ok(bidDecimals.eq(correctState.bidDecimals));
    assert.ok(stepMin.eq(correctState.stepMin));
    assert.ok(incMax.eq(correctState.incMax));
    assert.ok(incMin.eq(correctState.incMin));
    assert.ok(bidMultiplier.eq(correctState.bidMultiplier));
}

export async function assertAuctionStateIsDefault(auctionId: BigNumber, econAuctionHouse: Contract) {
    const auctionInfo = await econAuctionHouse.getAuctionInfo(auctionId);
    const auctionStartTime = await econAuctionHouse.getAuctionStartTime(auctionId);
    const auctionEndTime = await econAuctionHouse.getAuctionEndTime(auctionId);
    const hammerTimeDuration = await econAuctionHouse.getAuctionHammerTimeDuration(auctionId);
    const bidDecimals = await econAuctionHouse.getAuctionBidDecimals(auctionId);
    const stepMin = await econAuctionHouse.getAuctionStepMin(auctionId);
    const incMax = await econAuctionHouse.getAuctionIncMax(auctionId);
    const incMin = await econAuctionHouse.getAuctionIncMin(auctionId);
    const bidMultilier = await econAuctionHouse.getAuctionBidMultiplier(auctionId);

    assert.ok(auctionStartTime.eq(0));
    assert.ok(auctionEndTime.eq(0));
    assert.ok(hammerTimeDuration.eq(0));
    assert.ok(bidDecimals.eq(0));
    assert.ok(stepMin.eq(0));
    assert.ok(incMax.eq(0));
    assert.ok(incMin.eq(0));
    assert.ok(bidMultilier.eq(0));
    
    assert.equal(auctionInfo.owner, ethers.constants.AddressZero);
    assert.equal(auctionInfo.highestBidder, ethers.constants.AddressZero);
    assert.ok(auctionInfo.highestBid.eq(0));
    assert.ok(auctionInfo.secondHighestBid.eq(0));
    assert.ok(auctionInfo.auctionDebt.eq(0));
    assert.ok(auctionInfo.dueIncentives.eq(0));
    assert.ok(auctionInfo.startTime.eq(0));
    assert.ok(auctionInfo.endTime.eq(0));
    assert.ok(auctionInfo.hammerTimeDuration.eq(0));
    assert.ok(auctionInfo.stepMin.eq(0));
    assert.ok(auctionInfo.incMin.eq(0));
    assert.ok(auctionInfo.incMax.eq(0));
    assert.ok(auctionInfo.bidMultiplier.eq(0));
    assert.ok(!auctionInfo.biddingAllowed);
}

export async function assertCantClaimForFirstTime(auctionIds: BigNumber[], econAuctionHouse: Contract) {
    try {
        for(const i of auctionIds) {
            await econAuctionHouse.claimForFirstTime(i);
        }
        assert.ok(false);
    } catch(error: any) {
        if(error.toString().includes("EconAuctionHouse : Period to claim for the first time has passed")) {
            assert.ok(true);
        } else {
            assert.ok(false);
        }
    }
}

export async function assertCantBid(
    auctionIds: BigNumber[], 
    contracts: { econAuctionHouse: Contract, econNFT: Contract, usdc: Contract },
    signers: { deployer: SignerWithAddress, buyer: SignerWithAddress }
) {
    try {
        for(const i of auctionIds) {
            await bidOnAuctionWithToken(
                { auctionedId: i, humanReadableAmount: 1 },
                { econAuctionHouse: contracts.econAuctionHouse, econNFT: contracts.econNFT, token: contracts.usdc },
                { deployer: signers.deployer, buyer: signers.buyer }
            );
        }
        assert.ok(false);
    } catch(error: any) {
        if(error.toString().includes("Auction has already ended")) {
            assert.ok(true);
        }  else {
            assert.ok(false);
        }
    }
}

export async function assertBidsAreCorrect(
    expectedState: { buyerAddress: string, bidAmount: number }, 
    auctionIds: BigNumber[], 
    econAuctionHouse: Contract
) {
    let highestBidders: string[] = [];
    let highestBids: BigNumber[] = [];
    for(const j of auctionIds) {
        const highestBidder = await econAuctionHouse.getAuctionHighestBidder(j);
        const highestBid = await econAuctionHouse.getAuctionHighestBid(j);

        highestBidders.push(highestBidder);
        highestBids.push(highestBid);
    }

    highestBidders.map(highestBidder => assert.equal(highestBidder, expectedState.buyerAddress));
    highestBids.map(highestBid => assert.ok(highestBid.eq(ethers.utils.parseUnits(expectedState.bidAmount.toString(), "6"))));
}

export async function assertBid2EarnWorks(
    balances: { initialBalances: BigNumber, finalBalances: BigNumber },
    incentivesMin: number,
    bidAmount: number
) {

    // const multiplierMin = (incentivesMin * 16) + 100;
    // const multiplierMax = (incentivesMin * 20) + 100;
    
    // assert.ok(balances.finalBalances.gt(
    //     balances.initialBalances.add(
    //         ethers.utils.parseUnits(BigNumber.from(bidAmount * 20).mul(multiplierMin).div(100).sub(bidAmount * 20).toString(), "6")
    //         )
    //     )
    // );
    // assert.ok(balances.finalBalances.lt(
    //     balances.initialBalances.add(
    //         ethers.utils.parseUnits(BigNumber.from(bidAmount * 20).mul(multiplierMax).div(100).sub(bidAmount * 20).toString(), "6")
    //         )
    //     )
    // );

    assert.ok(balances.finalBalances.eq(
        balances.initialBalances.add(BigNumber.from(bidAmount).mul(incentivesMin).div(1000))
    ));
}

export async function assertBidIsTooLow(
    auctionIds: BigNumber[],
    bidArgs: number,
    contracts: { econAuctionHouse: Contract, econNFT: Contract, usdc: Contract },
    signers: { deployer: SignerWithAddress, buyer: SignerWithAddress }
) {
    try {
        await bidOnAll20Auctions(
            auctionIds,
            {
                bidArgs: bidArgs,
                contracts: { 
                    econAuctionHouse: contracts.econAuctionHouse, 
                    econNFT: contracts.econNFT, 
                    token: contracts.usdc 
                },
                signerArgs: { deployer: signers.deployer, buyer: signers.buyer }
            }
        );
        assert.ok(false);
    } catch(error: any) {
        if(error.toString().includes("_bidAmount must meet the minimum bid")) {
            assert.ok(true);
        } else {
            console.log(error);
            assert.ok(false);
        }
    }
}