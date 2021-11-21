import { BigNumber } from "ethers";
import { Address } from "cluster";

export const EXPIRATION_DATE = 1672441200;

export type Auction = [
  auctionnedNounsId: BigNumber,
  auctionnedAmount: BigNumber,
  auctionnedStartTime: BigNumber,
  auctionnedEndTime: BigNumber,
  auctionnedBidder: Address,
  auctionnedSettled: Boolean
];