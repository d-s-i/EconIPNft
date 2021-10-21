import { Contract, BigNumber } from "ethers";
import { Address } from "cluster";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import assert from "assert";

let econNFT: Contract;
let econAuctionHouse: Contract;
let weth: Contract;
let acc0: SignerWithAddress, acc1: SignerWithAddress;

type Auction = [
  auctionnedNounsId: BigNumber,
  auctionnedAmount: BigNumber,
  auctionnedStartTime: BigNumber,
  auctionnedEndTime: BigNumber,
  auctionnedBidder: Address,
  auctionnedSettled: Boolean
];

async function endAuction(auctionEndTimestamp: BigNumber, duration: BigNumber) {
  const time = auctionEndTimestamp.add(duration.add(1));
  await ethers.provider.send("evm_setNextBlockTimestamp", [time.toNumber()]);
}

function displayAuction(currentAuction: Auction) {
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

describe("EconNFT", function () {
  it("Deploy the Econ NFT", async function() {
    [acc0, acc1] = await ethers.getSigners();

    const EconNFT = await ethers.getContractFactory("EconNFT");
    const WETH = await ethers.getContractFactory("WETH");
  
    econNFT = await EconNFT.deploy(0);
    weth = await WETH.deploy();

    console.log(`EconNFT address is ${econNFT.address}`);
    console.log(`weth address is ${weth.address}`);

    assert.ok(econNFT.address);
  });
});

describe("EconAuctionHouse", function(){
  it("Deploy the auction house", async function() {
    const EconAuctionHouse = await ethers.getContractFactory("EconAuctionHouse");
    econAuctionHouse = await EconAuctionHouse.deploy();
    await econNFT.setMinter(econAuctionHouse.address);
    console.log(`EconAuctionHouse address is ${econAuctionHouse.address}`);

    assert.ok(econAuctionHouse.address);
  });

  it("Initialize the Auction House", async function(){
    await econAuctionHouse.initialize(
      econNFT.address,
      weth.address,
      BigNumber.from("0"),
      ethers.utils.parseEther("0.01"),
      BigNumber.from("1"),
      BigNumber.from("30")
    );

    assert.equal(await econAuctionHouse.weth(), weth.address);
  });

  it("Unpause the auction house", async function(){
    await econAuctionHouse.unpause();
    let paused = await econAuctionHouse.paused();

    assert.ok(!paused);
  });

  it("first auction", async function(){
    console.log(`Account 0 is ${acc0.address}`);
    console.log(`Account 1 is ${acc1.address}`);
    await econAuctionHouse.createBid(0, { value: ethers.utils.parseEther("0.02"), from: acc0.address });
    const currentAuction = await econAuctionHouse.auction();

    const auctionnedEndTime = currentAuction[3];
    displayAuction(currentAuction);

    assert.equal(currentAuction[4], acc0.address);
    await endAuction(auctionnedEndTime, await econAuctionHouse.duration());
  });

  it("strat a second auction", async function(){
    econAuctionHouse = econAuctionHouse.connect(acc0);
    await econAuctionHouse.settleCurrentAndCreateNewAuction();

    await econAuctionHouse.createBid("1", { value: ethers.utils.parseEther("0.03"), from: acc0.address });

    const currentAuction = await econAuctionHouse.auction();

    const auctionnedNounsId: BigNumber = currentAuction[0];
    const auctionnedEndTime: BigNumber = currentAuction[3];
    const auctionnedBidder: Address = currentAuction[4];

    displayAuction(currentAuction);

    assert.equal(auctionnedNounsId.toString(), "1");

    assert.equal(auctionnedBidder, acc0.address);
    for(let i = 0; i < 100; i++) {
      await endAuction(auctionnedEndTime, await econAuctionHouse.duration());
    }
  });
  it("override the current bidder when someone bid higher", async function(){
    await econAuctionHouse.settleCurrentAndCreateNewAuction();
    const currentAuction = await econAuctionHouse.auction();
    await econAuctionHouse.createBid("2", { value: ethers.utils.parseEther("0.02"), from: acc0.address });

    displayAuction(currentAuction);

    econAuctionHouse = econAuctionHouse.connect(acc1);

    await econAuctionHouse.createBid("2", { value: ethers.utils.parseEther("0.05"), from: acc1.address });
    const currentAuction2 = await econAuctionHouse.auction();
    displayAuction(currentAuction);
    assert.ok(currentAuction[4] !== currentAuction2[4]); 
    assert.equal(acc1.address, currentAuction2[4]);

    for(let i = 0; i < 100; i++) {
      const auctionnedEndTime = currentAuction[3];
      await endAuction(auctionnedEndTime, await econAuctionHouse.duration());
    }
  });
  it("transfer the nft to the highest bidder", async function(){
    await econAuctionHouse.settleCurrentAndCreateNewAuction();
    const owner = await econNFT.ownerOf("2");
    assert.equal(owner, acc1.address);
  });
  it("has tokenURI", async function() {
    const tokenURI0 = await econNFT.tokenURI("0");
    const tokenURI1 = await econNFT.tokenURI("1");
    const tokenURI2 = await econNFT.tokenURI("10");
    console.log(tokenURI0);
    console.log(tokenURI1);
    console.log(tokenURI2);
  });
});
