import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { Address } from "cluster";
import { Auction, EXPIRATION_DATE } from "./constants.test";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export async function endAuction(auctionEndTimestamp: BigNumber, duration: BigNumber) {
    const time = auctionEndTimestamp.add(duration.add(1));
    await ethers.provider.send("evm_setNextBlockTimestamp", [time.toNumber()]);
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

export async function deployAllBasicContracts(minterAddress: string) {
    const EconNFT = await ethers.getContractFactory("EconNFT");
    const USDC = await ethers.getContractFactory("USDC");
    const WETH = await ethers.getContractFactory("WETH");
  
    const econNFT = await EconNFT.deploy(minterAddress);
    const usdc = await USDC.deploy("USDC", "USDC");
    const weth = await WETH.deploy();

    return [econNFT, usdc, weth];
}

export async function deployAuctionHouse() {
    const EconAuctionHouse = await ethers.getContractFactory("EconAuctionHouse");
    const econAuctionHouse = await EconAuctionHouse.deploy();
    return econAuctionHouse;
}

export async function deployAuctionHouseUSDC() {
    const EconAuctionHouseUSDC = await ethers.getContractFactory("EconAuctionHouseUSDC");
    const econAuctionHouseUSDC = await EconAuctionHouseUSDC.deploy();
    return econAuctionHouseUSDC;
}

export async function bidOnAuctionWithEth (
    _amount: number,
    _econAuctionHouse: Contract, 
    _signer: SignerWithAddress
) {
    const currentContractSigner = _econAuctionHouse.signer;
    const currentAuction = await _econAuctionHouse.auction();
    const auctionnedId = currentAuction[0];

    if((await currentContractSigner.getAddress()).toString() !== _signer.address) {
        _econAuctionHouse = _econAuctionHouse.connect(_signer);
    }

    await _econAuctionHouse.createBid(auctionnedId, { value: ethers.utils.parseEther(_amount.toString()), from: _signer.address });
}

export async function bidOnAuctionWithUSDC(
    _amount: number,
    _econAuctionHouseUSDC: Contract,
    _usdc: Contract,
    _signer: SignerWithAddress
) {

    const currentAuctionContractSigner = _econAuctionHouseUSDC.signer;
    const currentUSDCContractSigner = _usdc.signer;

    if((await currentAuctionContractSigner.getAddress()).toString() !== _signer.address) {
        _econAuctionHouseUSDC = _econAuctionHouseUSDC.connect(_signer);
    }
    if((await currentUSDCContractSigner.getAddress()).toString() !== _signer.address) {
        _usdc = _usdc.connect(_signer);
    }

    const USDCAllowance = await _usdc.allowance(_signer.address, _econAuctionHouseUSDC.address);
    const bidAmount = ethers.utils.parseUnits(_amount.toString(), "6");

    if(USDCAllowance < bidAmount) {
        await _usdc.approve(_econAuctionHouseUSDC.address, BigInt(2**255));
    }

    const currentAuction = await _econAuctionHouseUSDC.auction();
    const auctionnedId = currentAuction[0];

    await _econAuctionHouseUSDC.createBid(auctionnedId, bidAmount);
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