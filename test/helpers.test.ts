import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { Address } from "cluster";
import assert from "assert";
import { Auction, EXPIRATION_DATE, ContractState } from "./constants.test";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export async function endAuction(auctionEndTimestamp: BigNumber, duration: BigNumber) {
    const time = auctionEndTimestamp.add(duration.add(1));
    await ethers.provider.send("evm_setNextBlockTimestamp", [time.toNumber()]);
}

export async function changeBlockTimestamp(newTimestampInSeconds: number) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [newTimestampInSeconds]);
}

export async function goToExpirationDate(nbOfMonthNftExpire: number) {
    const expirationTimestamp = getTimestampFromNbOfMonth(nbOfMonthNftExpire);
    await ethers.provider.send("evm_setNextBlockTimestamp", [expirationTimestamp]);
}

export function displayAddress(contractName: string, contractAddress: string) {
    console.log(`${contractName} address is: ${contractAddress}`);
}

export function assertAddressOk(testedAddress: string | undefined) {
    assert.ok(
        typeof(testedAddress) !== "undefined" && 
        testedAddress !== ethers.constants.AddressZero
    );
}
  
export function displayAuction(currentAuction: Auction) {
    const auctionnedNounsId: BigNumber = currentAuction[0];
    const auctionnedAmount: BigNumber = currentAuction[1];
    const auctionnedStartTime: BigNumber = currentAuction[2];
    const auctionnedEndTime: BigNumber = currentAuction[3];
    const auctionnedBidder: Address = currentAuction[4];
    const auctionnedSettled: Boolean = currentAuction[5];

    console.log(`Auctionned Id: ${auctionnedNounsId.toString()}`);
    console.log(`Auctionned amount: ${auctionnedAmount.toString()}`);
    console.log(`start time: ${auctionnedStartTime.toString()}`);
    console.log(`end time: ${auctionnedEndTime.toString()}`);
    console.log(`Bidder: ${auctionnedBidder.toString()}`);
    console.log(`Is auction settled ? : ${auctionnedSettled.toString()}`);
}

export async function deployAllTokenContracts(minterAddress: string) {
    const EconNFT = await ethers.getContractFactory("EconNFT");
    const USDC = await ethers.getContractFactory("USDC");
    const WETH = await ethers.getContractFactory("WETH");
  
    const econNFT = await EconNFT.deploy(minterAddress);
    const usdc = await USDC.deploy("USDC", "USDC");
    const weth = await WETH.deploy();

    return [econNFT, usdc, weth];
}

export async function distributeUsdc(
    addresses: string[], 
    amountPerAddress: number, 
    usdcContract: { usdc: Contract, signer: SignerWithAddress }
) {
    const usdc = usdcContract.usdc.connect(usdcContract.signer);

    const decimals = await usdc.decimals();
    const amount = ethers.utils.parseUnits(amountPerAddress.toString(), decimals.toString());
    addresses.forEach(async address => {
        await usdc.transfer(address, amount);
    });
}

export function getTimestampFromNbOfMonth(numberOfMonthForExpiration: number) {
    const date = new Date();
    const now = date.getTime();
    const ONE_DAY = 86400;
    const ONE_MONTH = 30 * ONE_DAY;
    const expirationTimestamp = Math.round((now + (numberOfMonthForExpiration * ONE_MONTH)));

    return expirationTimestamp;
}

export async function deployEconNft721(numberOfMonthForExpiration: number) {

    const expirationTimestamp = getTimestampFromNbOfMonth(numberOfMonthForExpiration);

    const EconNFT = await ethers.getContractFactory("EconNFTERC721");
    const econNFT = await EconNFT.deploy(0, expirationTimestamp);

    return econNFT;
}

export async function deployTokens() {
    const Usdc = await ethers.getContractFactory("USDC");
    const Weth = await ethers.getContractFactory("WETH");

    const usdc = await Usdc.deploy("USDC", "USDC");
    const weth = await Weth.deploy();

    return [usdc, weth];
}

export async function deployAuctionHouse(econNFTAddress: string) {
    const EconAuctionHouse = await ethers.getContractFactory("EconAuctionHouse");
    const econAuctionHouse = await EconAuctionHouse.deploy(econNFTAddress);
    return econAuctionHouse;
}

export async function deployAuctionHouseUSDC() {
    const EconAuctionHouseUSDC = await ethers.getContractFactory("EconAuctionHouseUSDC");
    const econAuctionHouseUSDC = await EconAuctionHouseUSDC.deploy();
    return econAuctionHouseUSDC;
}

export async function sendErc721Nft(nftContract: ContractState, receiverAddress: string, tokenId: number) {
    const contract = nftContract.contract.connect(nftContract.signer);
    await contract.transferFrom(nftContract.signer.address, receiverAddress, tokenId);
}

export async function mintErc721Tokens(numberOfNfts: number, _contract: Contract, _signer: SignerWithAddress) {

    const nftContract = _contract.connect(_signer);

    for(let i = 0; i < numberOfNfts; i++) {
        await nftContract.mint();
    }

}

export async function initializeAuctionHouse(usdcAddress: string, daoTreasuryAddress: string, auctionHouse: Contract) {
    await auctionHouse.setErc20Currency(usdcAddress);
    await auctionHouse.setDaoTreasury(daoTreasuryAddress);
}

export async function bidOnAuctionWithToken(
    auctionArgs: { auctionedId: BigNumber, humanReadableAmount: number },
    contracts: { econAuctionHouse: Contract, econNFT: Contract, token: Contract },
    signers: { deployer: SignerWithAddress, buyer: SignerWithAddress }
) {
    const isBiddingAllowed = await contracts.econAuctionHouse.getBiddingAllowed(auctionArgs.auctionedId);
    if(!isBiddingAllowed) {
        let auctionContract = await contracts.econAuctionHouse.connect(signers.deployer);
        await auctionContract.setBiddingAllowed(contracts.econNFT.address, true);
    }

    const allowance = await contracts.token.allowance(signers.buyer.address, contracts.econAuctionHouse.address);
    const tokenDecimals = await contracts.token.decimals();

    const buyAmount = ethers.utils.parseUnits(auctionArgs.humanReadableAmount.toString(), tokenDecimals.toString());
    const tokenContract = contracts.token.connect(signers.buyer);
    if(allowance.mul(tokenDecimals).lt(buyAmount)) {
        await tokenContract.approve(contracts.econAuctionHouse.address, BigInt(2**255));
    }

    const econAuctionHouse = await contracts.econAuctionHouse.connect(signers.buyer);
    const highestBid = await econAuctionHouse.getAuctionHighestBid(auctionArgs.auctionedId);
    await econAuctionHouse.bid(auctionArgs.auctionedId, buyAmount, highestBid);
}

export async function deployAccounting(
    _booksPerOrder: string,
    _bookPrice: string,
    _econNFTAddress: string,
    _usdcAddress: string
) {
    const Accounting = await ethers.getContractFactory("Accounting");
    const accounting = await Accounting.deploy(
        _booksPerOrder, 
        ethers.utils.parseUnits(_bookPrice, "6"), 
        _econNFTAddress, 
        _usdcAddress
    );

    return accounting;
}