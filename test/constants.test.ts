import { ethers, BigNumber, Contract } from "ethers";
import { Address } from "cluster";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Provider } from "@ethersproject/abstract-provider";

export const EXPIRATION_DATE = 1672441200;
const ONE_DAY_TIMESTAMP = 86400;

export interface AuctionState {
  startTime: number;
  endTime: number;
  hammerTimeDuration: number;
  bidDecimals: number;
  stepMin: number;
  bidMultiplier: number;
  incMax: number;
  incMin: number;
}

type InitializeAuctionFacet = number[];

export interface ContractState {
  contract: Contract,
  signer: SignerWithAddress
};

export interface BidOnAllAuctionState {
  bidArgs: number,
  contracts: { econAuctionHouse: Contract, econNFT: Contract, token: Contract },
  signerArgs: { deployer: SignerWithAddress, buyer: SignerWithAddress }
}

export async function getAuctionArgs(provider: Provider, _tokenContract: Contract): Promise<InitializeAuctionFacet> {
  const block = await provider.getBlock("latest");
  const startTime = block.timestamp;
  const endTime = startTime + (ONE_DAY_TIMESTAMP * 1);
  const hammerTimeDuration = ONE_DAY_TIMESTAMP / 24;
  const bidDecimals = await _tokenContract.decimals();
  const stepMin = 150;
  const incMin = 1000;
  const incMax = 1000;

  return [startTime, endTime, hammerTimeDuration, bidDecimals, stepMin, incMin, incMax];
}