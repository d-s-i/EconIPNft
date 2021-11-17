import { BigNumber } from "ethers";
import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const AuctionHouse = await ethers.getContractFactory("EconAuctionHouse");
  const auctionHouse = await new ethers.Contract("0x830BD73E4184ceF73443C15111a1DF14e495C706", AuctionHouse.interface, signers[0]);

  const Nouns = await ethers.getContractFactory("EconNFT");
  const nouns = await new ethers.Contract("0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03", Nouns.interface, signers[0]);

  const currentAuction = await auctionHouse.auction();

  async function endAuction(auctionEndTimestamp: BigNumber, duration: BigNumber) {
    const time = auctionEndTimestamp.add(duration.add(1));
    await ethers.provider.send("evm_setNextBlockTimestamp", [time.toNumber()]);
  }
  for(let i = 0; i < 100; i++) {
    const auctionnedEndTime = currentAuction[3];
    await endAuction(auctionnedEndTime, await auctionHouse.duration());
  }
  await auctionHouse.settleCurrentAndCreateNewAuction();

  const currentAuction2 = await auctionHouse.auction();
  for(let i = 0; i < 100; i++) {
    const auctionnedEndTime = currentAuction2[3];
    await endAuction(auctionnedEndTime, await auctionHouse.duration());
  }
  await auctionHouse.settleCurrentAndCreateNewAuction();
  const currentAuction3 = await auctionHouse.auction();

  console.log(currentAuction3[0].toString());
  console.log(`owner of token 107 is ${await nouns.ownerOf("108")}`);

}

main();

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });

