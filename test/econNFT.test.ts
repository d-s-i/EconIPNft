import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Address } from "cluster";
import assert from "assert";
import { displayAuction, endAuction, deployAllBasicContracts, deployAuctionHouse, deployAuctionHouseUSDC, bidOnAuctionWithUSDC, bidOnAuctionWithEth, deployAccounting } from "./helpers.test";

let econNFT: Contract;
let econAuctionHouse: Contract;
let accounting: Contract;
let weth: Contract;
let usdc: Contract;

let acc0: SignerWithAddress, acc1: SignerWithAddress, acc2: SignerWithAddress;

describe("EconNFT", function () {
  it("Deploy the Econ NFT", async function() {
    [acc0, acc1, acc2] = await ethers.getSigners();

    [econNFT, weth, usdc] = await deployAllBasicContracts();

    await usdc.transfer(acc1.address, ethers.utils.parseUnits("50000.0", "6"));
    await usdc.transfer(acc2.address, ethers.utils.parseUnits("50000.0", "6"));

    console.log(`Acc2 balances are: ${await usdc.balanceOf(acc2.address)}`);
    console.log(`Acc1 balances are: ${await usdc.balanceOf(acc1.address)}`);

    console.log(`Acc2 address is: ${acc2.address}`);
    console.log(`Acc1 address is: ${acc1.address}`);

    assert.ok(econNFT.address);
  });
});

describe("EconAuctionHouse", function(){
  it("Deploy the auction house", async function() {
    // econAuctionHouse = await deployAuctionHouse();
    econAuctionHouse = await deployAuctionHouseUSDC();
    await econNFT.setMinter(econAuctionHouse.address);

    console.log(`The Auction House address is : ${econAuctionHouse.address}`);

    assert.ok(econAuctionHouse.address);
  });

  it("Initialize the Auction House", async function(){
    // await econAuctionHouse.initialize(
    //   econNFT.address,
    //   usdc.address,
    //   BigNumber.from("0"),
    //   ethers.utils.parseEther("0.01"),
    //   BigNumber.from("1"),
    //   BigNumber.from("30")
    // );

    await econAuctionHouse.initialize(
      econNFT.address,
      usdc.address,
      BigNumber.from("0"),
      ethers.utils.parseUnits("10", "6"),
      BigNumber.from("1"),
      BigNumber.from("30")
    );

    // assert.equal(await econAuctionHouse.weth(), weth.address);
    assert.equal(await econAuctionHouse.usdc(), usdc.address);
  });

  it("Unpause the auction house", async function(){
    await econAuctionHouse.unpause();
    let paused = await econAuctionHouse.paused();

    assert.ok(!paused);
  });

  it("Bid on first auction", async function(){
    // await bidOnAuctionWithEth(0.02, econAuctionHouse, acc2);
    await bidOnAuctionWithUSDC(
      11,
      econAuctionHouse,
      usdc,
      acc2
    );
    const currentAuction = await econAuctionHouse.auction();

    const auctionnedEndTime = currentAuction[3];
    // displayAuction(currentAuction);

    const signerUsdcBalances = await usdc.balanceOf(acc2.address);
    const contractUSDCBalances = await usdc.balanceOf(econAuctionHouse.address);

    assert.equal(currentAuction[4], acc2.address);
    assert.equal(+signerUsdcBalances, 50000000000 - 11000000);
    assert.equal(+contractUSDCBalances, 11000000);

    await endAuction(auctionnedEndTime, await econAuctionHouse.duration());
  });

  it("strat a second auction", async function(){
    await econAuctionHouse.settleCurrentAndCreateNewAuction();

    // await bidOnAuctionWithEth(0.03, econAuctionHouse, acc2);
    await bidOnAuctionWithUSDC(15, econAuctionHouse, usdc, acc2);

    const currentAuction = await econAuctionHouse.auction();

    const auctionnedNounsId: BigNumber = currentAuction[0];
    const auctionnedEndTime: BigNumber = currentAuction[3];
    const auctionnedBidder: Address = currentAuction[4];

    // displayAuction(currentAuction);

    assert.equal(auctionnedNounsId.toString(), "1");
    assert.equal(auctionnedBidder, acc2.address);

    await endAuction(auctionnedEndTime, await econAuctionHouse.duration());
  });

  it("override the current bidder when someone bid higher", async function(){
    await econAuctionHouse.settleCurrentAndCreateNewAuction();

    // await bidOnAuctionWithEth(0.02, econAuctionHouse, acc2);
    await bidOnAuctionWithUSDC(15, econAuctionHouse, usdc, acc2);
    const currentAuction = await econAuctionHouse.auction();
    // await bidOnAuctionWithEth(0.05, econAuctionHouse, acc1);
    await bidOnAuctionWithUSDC(20, econAuctionHouse, usdc, acc1);

    // displayAuction(currentAuction);

    const currentAuction2 = await econAuctionHouse.auction();
    // displayAuction(currentAuction2);
    assert.ok(currentAuction[4] !== currentAuction2[4]); 
    assert.equal(acc1.address, currentAuction2[4]);
    const signerUsdcBalances = await usdc.balanceOf(acc2.address);
    const signerUsdcBalances1 = await usdc.balanceOf(acc1.address);
    const contractUSDCBalances = await usdc.balanceOf(econAuctionHouse.address);

    assert.equal(+signerUsdcBalances1, 50000000000 - 20000000);
    assert.equal(+contractUSDCBalances, 20000000);

    const auctionnedEndTime = currentAuction[3];
    await endAuction(auctionnedEndTime, await econAuctionHouse.duration());
  });

  it("transfer the nft to the highest bidder", async function(){
    await econAuctionHouse.settleCurrentAndCreateNewAuction();
    const owner = await econNFT.ownerOf("2");

    const currentAuction = await econAuctionHouse.auction();

    const auctionnedEndTime = currentAuction[3];
    await endAuction(auctionnedEndTime, await econAuctionHouse.duration());
    
    assert.equal(owner, acc1.address);
  });
  
  it("has tokenURI", async function() {
    const tokenURI0 = await econNFT.tokenURI("0");
  });

  it("burn the NFT if there are no bidder", async function(){
    const currentAuction = await econAuctionHouse.auction();
    const auctionnedNounsId: BigNumber = currentAuction[0];
    const owner = await econNFT.ownerOf(auctionnedNounsId);
    await econAuctionHouse.settleCurrentAndCreateNewAuction();
    try {
      const owner2 = await econNFT.ownerOf(auctionnedNounsId);
      assert.ok(owner !== owner2);
      assert.ok(false);
    } catch (error) {
      assert.ok(true);
    }
  });
});

describe("Accounting", function() {
  it("Deploy the accounting Contract", async function(){
    accounting = await deployAccounting(
      "20",
      "70",
      econNFT.address,
      usdc.address
    );

    accounting = accounting.connect(acc2);

    assert.ok(accounting.address);
  });
  it("allow buyers to buy an NFT", async function() {
    usdc = usdc.connect(acc2);
    await usdc.approve(accounting.address, BigInt(2**255));
    await accounting.buyBooks("20");

    const booksBought = await accounting.numberOfBooksBought(acc2.address);

    console.log(`Number of books bought by ${acc2.address}: ${booksBought.toString()}`);
    assert.equal(booksBought.toString(), "20");
  });
  // it("set owner correctly", async function(){
  //   const owner = await accounting.owner();
  //   assert.equal(owner, acc2.address);
  // });
  // it("transfers usdc to the owner", async function(){
  //   usdc = usdc.connect(acc1);
  //   accounting = accounting.connect(acc1);
  //   await usdc.approve(accounting.address, BigInt(2**255));

  //   await accounting.buyBooks("20");

  //   const ownerBalances0 = await usdc.balanceOf(acc2.address);
    
  //   console.log(`Owner balances are: ${ethers.utils.formatUnits(ownerBalances0, "6")}`);
    
  //   assert.equal(ownerBalances0.toString(), ethers.utils.parseUnits("51400", "6").toString());

  // });
});