import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { Address } from "cluster";
import { EXPIRATION_DATE, ContractState, getAuctionArgs, BidOnAllAuctionState } from "./constants.test";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Provider } from "@ethersproject/abstract-provider";

export async function endAuction(econAuctionHouse: Contract, auctionId: BigNumber) {
    const endTime = await econAuctionHouse.getAuctionEndTime(auctionId);
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime.add(1).toNumber()]);
    await ethers.provider.send("evm_mine", []);
}

export async function changeBlockTimestamp(newTimestampInSeconds: number) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [newTimestampInSeconds]);
    await ethers.provider.send("evm_mine", []);
}

export async function goToExpirationDate(nbOfMonthNftExpire: number) {
    const expirationTimestamp = getTimestampFromNbOfMonth(nbOfMonthNftExpire);

    const [signer] = await ethers.getSigners();
    const block = await signer.provider!.getBlock("latest");
    if(block.timestamp > expirationTimestamp) return;

    await ethers.provider.send("evm_setNextBlockTimestamp", [expirationTimestamp]);
    await ethers.provider.send("evm_mine", []);
}

export function getTimestampFromNbOfMonth(numberOfMonthForExpiration: number) {
    const date = new Date();
    const now = date.getTime();
    const ONE_DAY = 86400;
    const ONE_MONTH = 30 * ONE_DAY;
    const expirationTimestamp = Math.round((now / 1000) + (numberOfMonthForExpiration * ONE_MONTH));

    return expirationTimestamp;
}

export function displayAddress(contractName: string, contractAddress: string) {
    console.log(`${contractName} address is: ${contractAddress}`);
}
  
// export function displayAuction(currentAuction: Auction) {
//     const auctionnedNounsId: BigNumber = currentAuction[0];
//     const auctionnedAmount: BigNumber = currentAuction[1];
//     const auctionnedStartTime: BigNumber = currentAuction[2];
//     const auctionnedEndTime: BigNumber = currentAuction[3];
//     const auctionnedBidder: Address = currentAuction[4];
//     const auctionnedSettled: Boolean = currentAuction[5];

//     console.log(`Auctionned Id: ${auctionnedNounsId.toString()}`);
//     console.log(`Auctionned amount: ${auctionnedAmount.toString()}`);
//     console.log(`start time: ${auctionnedStartTime.toString()}`);
//     console.log(`end time: ${auctionnedEndTime.toString()}`);
//     console.log(`Bidder: ${auctionnedBidder.toString()}`);
//     console.log(`Is auction settled ? : ${auctionnedSettled.toString()}`);
// }

export async function deployAllTokenContracts(minterAddress: string) {
    const EconNFT = await ethers.getContractFactory("EconNFT");
    const USDC = await ethers.getContractFactory("USDC");
    const WETH = await ethers.getContractFactory("WETH");
  
    const econNFT = await EconNFT.deploy(minterAddress);
    const usdc = await USDC.deploy("USDC", "USDC");
    const weth = await WETH.deploy();

    return [econNFT, usdc, weth];
}

export async function distributeTokens(
    addresses: string[], 
    amountPerAddress: number, 
    tokenContract: { token: Contract, signer: SignerWithAddress }
) {
    const token = tokenContract.token.connect(tokenContract.signer);

    const decimals = await token.decimals();
    const amount = ethers.utils.parseUnits(amountPerAddress.toString(), decimals.toString());
    addresses.forEach(async address => {
        await token.transfer(address, amount);
    });
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

export async function getHighestBids(auctionIds: BigNumber[], econAuctionHouse: Contract) {
    let highestBids: BigNumber[] = [];
    for(const j of auctionIds) {
        const highestBid = await econAuctionHouse.getAuctionHighestBid(j);

        highestBids.push(highestBid);
    }
    return highestBids;
}

export async function getHighestBidders(auctionIds: BigNumber[], econAuctionHouse: Contract) {
    let highestBidders: string[] = [];
    for(const j of auctionIds) {
        const highestBidder = await econAuctionHouse.getAuctionHighestBidder(j);
        highestBidders.push(highestBidder);
    }

    return highestBidders;
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

export async function resetAuctions(auctionIds: BigNumber[], nftContractAddress: string, econAuctionHouse: Contract) {
    auctionIds.map(async auctionId => {
        await econAuctionHouse.resetAuctionState(auctionId, nftContractAddress);
    });
}

export async function getAuctionIds(econNFTAddress: string, econAuctionHouse:Contract) {
    let auctionIds: BigNumber[] = [];
    for(let i = 0; i < 20; i++) {
        let auctionId: BigNumber;
        auctionId = await econAuctionHouse.getAuctionID(econNFTAddress, i);
        auctionIds.push(auctionId);
    }

    return auctionIds;
}

export async function registerAuction(
    getAuctionArgsArgs:  { provider: Provider, token: Contract },
    econNFTAddress: string,
    econAuctionHouse: Contract
) {
    const auctionArgs = await getAuctionArgs(getAuctionArgsArgs.provider, getAuctionArgsArgs.token);
    await econAuctionHouse.registerAnAuctionContract(
        econNFTAddress,
        ...auctionArgs
    );

    return {
        startTime: auctionArgs[0],
        endTime: auctionArgs[1],
        hammerTimeDuration: auctionArgs[2],
        bidDecimals: auctionArgs[3],
        stepMin: auctionArgs[4],
        incMin: auctionArgs[5],
        incMax: auctionArgs[6],
        bidMultiplier: 0,
    };
}



export async function bidOnAll20Auctions(
    auctionIds: BigNumber[],
    bidOnAuctionArgs: BidOnAllAuctionState
) {
    for(const i of auctionIds) {
        await bidOnAuctionWithToken(
            { auctionedId: i, humanReadableAmount: bidOnAuctionArgs.bidArgs},
            bidOnAuctionArgs.contracts,
            bidOnAuctionArgs.signerArgs
        );
    }
}

export async function takeAll20NftBack(econNFT: Contract, econAuctionHouse: Contract) {
    for(let i = 0; i < 20; i++) {
        const owner = await econNFT.ownerOf(i);
        await econAuctionHouse.takeERC721Back(owner, i);
    }
}

export async function changeExpirationTimestampOnEconNFT(nbOfMonthForNewTimestamp: number, econNFT: Contract) {
    const newExpirationTimestamp = getTimestampFromNbOfMonth(nbOfMonthForNewTimestamp);
    await econNFT.setCurrentExpirationTimestamp(newExpirationTimestamp);
}

export async function claimAllNftForFirstTime(auctionIds: BigNumber[], econAuctionHouse: Contract) {
    for(const i of auctionIds) {
        await econAuctionHouse.claimForFirstTime(i);
    }
}

export async function makeAFirstAuctionAndClaim(
    contracts: { econAuctionHouse: Contract, econNFT: Contract, token: Contract },
    signers: { buyer: SignerWithAddress, deployer: SignerWithAddress },
    auctionArgs: { auctionIds: BigNumber[], bidAmount: number }
) {
    const signer = signers.buyer;
    const bidAmount = auctionArgs.bidAmount;
    
    await bidOnAll20Auctions(
        auctionArgs.auctionIds, 
        {
            bidArgs: bidAmount,
            contracts: { econAuctionHouse: contracts.econAuctionHouse, econNFT: contracts.econNFT, token: contracts.token },
            signerArgs: { deployer: signers.deployer, buyer: signer }
        }
    );

    await endAuction(contracts.econAuctionHouse, auctionArgs.auctionIds[0]);

    await claimAllNftForFirstTime(auctionArgs.auctionIds, contracts.econAuctionHouse);
}

export async function makeAFullReAuction(
    contracts: { econAuctionHouse: Contract, econNFT: Contract, token: Contract },
    signers: { buyer: SignerWithAddress, deployer: SignerWithAddress },
    auctionArgs: { auctionIds: BigNumber[], bidAmount: number }
) {
    const signer = signers.buyer;
    const bidAmount = auctionArgs.bidAmount;
    
    await bidOnAll20Auctions(
        auctionArgs.auctionIds, 
        {
            bidArgs: bidAmount,
            contracts: { econAuctionHouse: contracts.econAuctionHouse, econNFT: contracts.econNFT, token: contracts.token },
            signerArgs: { deployer: signers.deployer, buyer: signer }
        }
    );

    await endAuction(contracts.econAuctionHouse, auctionArgs.auctionIds[0]);

    await claimAllNftForFirstTime(auctionArgs.auctionIds, contracts.econAuctionHouse);
}

export async function claimAllNFtAfterReAuction(auctionIds: BigNumber[], econAuctionHouse: Contract) {
    for(const i of auctionIds) {
        await econAuctionHouse.claimAfterReAuctionned(i);
    }
}

export async function registerNewAuction(
    provider: Provider,
    contracts: { econAuctionHouse: Contract, econNFT: Contract, token: Contract }
) {
    const auctionArgs = await getAuctionArgs(provider, contracts.token);
    await contracts.econAuctionHouse.registerAnAuctionContract(
        contracts.econNFT.address,
        ...auctionArgs
    );

    return {
        startTime: auctionArgs[0],
        endTime: auctionArgs[1],
        hammerTimeDuration: auctionArgs[2],
        bidDecimals: auctionArgs[3],
        stepMin: auctionArgs[4],
        incMin: auctionArgs[5],
        incMax: auctionArgs[6],
        bidMultiplier: 0,
    };
}

export async function displayBalances(accounts: object[]) {
    console.log("\n");
    accounts.map(account => {
        for (const [key, value] of Object.entries(account)) {
            console.log(`${key}: ${ethers.utils.formatUnits(value.toString(), "6")}`);
          }
    });
}