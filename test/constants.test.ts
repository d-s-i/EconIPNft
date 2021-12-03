import { ethers, BigNumber, Contract } from "ethers";
import { Address } from "cluster";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export const EXPIRATION_DATE = 1672441200;
const ONE_DAY_TIMESTAMP = 86400;

export type Auction = [
  auctionnedNounsId: BigNumber,
  auctionnedAmount: BigNumber,
  auctionnedStartTime: BigNumber,
  auctionnedEndTime: BigNumber,
  auctionnedBidder: Address,
  auctionnedSettled: Boolean
];

type InitializeAuctionFacet = number[];

// address _contract,
// uint256 _startTime,
// uint256 _endTime,
// uint256 _hammerTimeDuration,
// uint256 _bidDecimals,
// uint256 _stepMin,
// uint256 _incMin,
// uint256 _incMax

export async function getAuctionArgs(signer: SignerWithAddress, _tokenContract: Contract): Promise<InitializeAuctionFacet> {
  const block = await signer.provider!.getBlock("latest");
  const startTime = block.timestamp;
  const endTime = startTime + (ONE_DAY_TIMESTAMP * 10);
  const hammerTimeDuration = ONE_DAY_TIMESTAMP / 24;
  const bidDecimals = await _tokenContract.decimals();
  const stepMin = 1 * bidDecimals;
  const incMin = 1 * bidDecimals;
  const incMax = 10 * bidDecimals;

  return [startTime, endTime, hammerTimeDuration, bidDecimals, stepMin, incMin, incMax];
}