# How To Deploy

The `deployEverything.ts` file will deploy the NFT, the Accounting contract and the AuctionHouse and initialize them.
The contracts will not really need specific arguments for deployments. But to create an auction, args can be changed in `/test/constants.test"`, they are the same I used for tests.

To run the `deployEverything` file type  `hh run scripts/deploy/deployEverything.ts --network rinkeby` to deploy on rinkeby.
Once deployed, you will still need to allow bidding by running `hh run scripts/setBiddingAllowed.ts --network rinkeby`.
Once done, you should be able to bid.

In the .env file, here are the declared variables : 

INFURA_RINKEBY_URL
ALCHEMY_RINKEBY_URL
GOERLI_URL
POLYGON_TEST_URL
MNEMONIC
ETH_MAINNET_URL
ETHERSCAN_API_KEY

I think only the ALCHEMY_RINKEBY_URL is used but if an env variable isn't working, check if it's not one of those.

NFT contract : `contracts/EconNFTERC721.sol`
Auction House: `contracts/EconAuctionHouse.sol`
Accounting: `contracts/Accounting.sol`
