import { Contract, BigNumber } from "ethers";
import { Address } from "cluster";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import assert from "assert";

let econNFT: Contract;
let econAuctionHouse: Contract;
let accounting: Contract;
let weth: Contract;
let usdc: Contract;

let acc0: SignerWithAddress, acc1: SignerWithAddress;

const EXPIRATION_DATE = 1672441200;

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
    const USDC = await ethers.getContractFactory("USDC");
  
    econNFT = await EconNFT.deploy(0, EXPIRATION_DATE);
    weth = await WETH.deploy();
    usdc = await USDC.deploy("USDC", "USDC");

    await usdc.transfer(acc1.address, ethers.utils.parseUnits("50000.0", "6"));

    console.log(`Acc0 balances are: ${await usdc.balanceOf(acc0.address)}`);
    console.log(`Acc1 balances are: ${await usdc.balanceOf(acc1.address)}`);

    console.log(`Acc0 address is: ${acc0.address}`);
    console.log(`Acc1 address is: ${acc1.address}`);

    assert.ok(econNFT.address);
  });
});

describe("EconAuctionHouse", function(){
  it("Deploy the auction house", async function() {
    const EconAuctionHouse = await ethers.getContractFactory("EconAuctionHouse");
    econAuctionHouse = await EconAuctionHouse.deploy();
    await econNFT.setMinter(econAuctionHouse.address);

    console.log(`The Auction House address is : ${econAuctionHouse.address}`);

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
    await econAuctionHouse.createBid(0, { value: ethers.utils.parseEther("0.02"), from: acc0.address });
    const currentAuction = await econAuctionHouse.auction();

    const auctionnedEndTime = currentAuction[3];
    // displayAuction(currentAuction);

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

    // displayAuction(currentAuction);

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

    // displayAuction(currentAuction);

    econAuctionHouse = econAuctionHouse.connect(acc1);

    await econAuctionHouse.createBid("2", { value: ethers.utils.parseEther("0.05"), from: acc1.address });
    const currentAuction2 = await econAuctionHouse.auction();
    // displayAuction(currentAuction);
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

    const currentAuction = await econAuctionHouse.auction();

    for(let i = 0; i < 100; i++) {
      const auctionnedEndTime = currentAuction[3];
      await endAuction(auctionnedEndTime, await econAuctionHouse.duration());
    }
    
    assert.equal(owner, acc1.address);
  });
  it("has tokenURI", async function() {
    const tokenURI0 = await econNFT.tokenURI("0");
    const tokenURI1 = await econNFT.tokenURI("1");
    const tokenURI2 = await econNFT.tokenURI("10");
  });
  it("burn the NFT if there are no bidder", async function(){
    const burn_tx = await econAuctionHouse.settleCurrentAndCreateNewAuction();
    console.log(burn_tx);
  });
});

describe("Accounting", function() {
  it("Deploy the accounting Contract", async function(){
    const Accounting = await ethers.getContractFactory("Accounting");
    accounting = await Accounting.deploy(
      "20", 
      ethers.utils.parseUnits("70.0", "6"), 
      econNFT.address, 
      usdc.address
    );

    assert.ok(accounting.address);
  });
  it("allow buyers to buy an NFT", async function(){
    await usdc.approve(accounting.address, BigInt(2**255));
    await accounting.buyBooks("20");

    const booksBought = await accounting.numberOfBooksBought(acc0.address);

    console.log(`Number of books bought by ${acc0.address}: ${booksBought.toString()}`);
    assert.equal(booksBought.toString(), "20");
  });
  it("set owner correctly", async function(){
    const owner = await accounting.owner();
    assert.equal(owner, acc0.address);
  });
  it("transfers usdc to the owner", async function(){
    usdc = usdc.connect(acc1);
    accounting = accounting.connect(acc1);
    await usdc.approve(accounting.address, BigInt(2**255));

    await accounting.buyBooks("20");

    const ownerBalances0 = await usdc.balanceOf(acc0.address);
    
    console.log(`Owner balances are: ${ethers.utils.formatUnits(ownerBalances0, "6")}`);
    
    assert.equal(ownerBalances0.toString(), ethers.utils.parseUnits("51400", "6").toString());

  });
});