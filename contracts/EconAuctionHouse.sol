pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "./interfaces/IERC721.sol";
import "./interfaces/IERC721TokenReceiver.sol";
import "./interfaces/IERC1155.sol";
import "./interfaces/IERC1155TokenReceiver.sol";
import "./interfaces/IEconNFTERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract EconAuctionHouse is Ownable {

    //Event emitted when an auction is being setup
    event Auction_Initialized(
        uint256 indexed _auctionID,
        uint256 indexed _tokenID,
        uint256 indexed _tokenIndex,
        address _contractAddress,
        bytes4 _tokenKind
    );

    //Event emitted when the start time of an auction changes (due to admin interaction )
    event Auction_StartTimeUpdated(uint256 indexed _auctionID, uint256 _startTime);

    //Event emitted when the end time of an auction changes (be it due to admin interaction or bid at the end)
    event Auction_EndTimeUpdated(uint256 indexed _auctionID, uint256 _endTime);

    //Event emitted when a Bid is placed
    event Auction_BidPlaced(uint256 indexed _auctionID, address indexed _bidder, uint256 _bidAmount);

    //Event emitted when a bid is removed (due to a new bid displacing it)
    event Auction_BidRemoved(uint256 indexed _auctionID, address indexed _bidder, uint256 _bidAmount);

    //Event emitted when incentives are paid (due to a new bid rewarding the _earner bid)
    event Auction_IncentivePaid(uint256 indexed _auctionID, address indexed _earner, uint256 _incentiveAmount);

    event Contract_BiddingAllowed(address indexed _contract, bool _biddingAllowed);

    event Auction_ItemClaimed(uint256 indexed _auctionID);

    struct TokenRepresentation {
        address contractAddress; // The contract address
        uint256 tokenId; // The ID of the token on the contract
        bytes4 tokenKind; // The ERC name of the token implementation bytes4(keccak256("ERC721")) or bytes4(keccak256("ERC1155"))
    }

    struct Auction {
        address owner;
        address highestBidder;
        uint256 highestBid;
        uint256 secondHighestBid;
        uint256 auctionDebt;
        uint256 dueIncentives;
        address contractAddress;
        uint256 startTime;
        uint256 endTime;
        uint256 hammerTimeDuration;
        uint256 bidDecimals;
        uint256 stepMin;
        uint256 incMin;
        uint256 incMax;
        uint256 bidMultiplier;
        bool biddingAllowed;
    }

    struct Collection {
        uint256 startTime;
        uint256 endTime;
        uint256 hammerTimeDuration;
        uint256 bidDecimals;
        uint256 stepMin;
        uint256 incMin; // minimal earned incentives
        uint256 incMax; // maximal earned incentives
        uint256 bidMultiplier; // bid incentive growth multiplier
        bool biddingAllowed; // Allow to start/pause ongoing auctions
    }

    address internal daoTreasury;
    // Contract address storing the ERC20 currency used in auctions
    address internal erc20Currency;

    // tokencontract => collections
    mapping(address => Collection) internal collections; 
    // contractAddress => tokenId => TokenIndex => _auctionId
    mapping(address => mapping(uint256 => mapping(uint256 => uint256))) internal auctionMapping; 
    //_auctionId => auctions
    mapping(uint256 => Auction) internal auctions; 
    //_auctionId => token_primaryKey
    mapping(uint256 => TokenRepresentation) internal tokenMapping; 
    // Contract => TokenID => Amount being auctionned
    mapping(address => mapping(uint256 => uint256)) internal erc1155TokensIndex; 
    //Contract => TokenID => Amount being auctionned
    mapping(address => mapping(uint256 => uint256)) internal erc1155TokensUnderAuction; 

    mapping(uint256 => bool) internal auctionItemClaimed;


    address public econNFT;

    // store the previousOwner to give funds back for a Re-auction
    mapping(uint256 => address) public previousOwnerForReAuction;

    constructor(address _econNFT) Ownable() public {
        econNFT = _econNFT;
    }

    /// @notice Register an auction contract default parameters for a GBM auction. To use to save gas
    /// @param _contract The token contract the auctionned token belong to
    function registerAnAuctionContract(
        address _contract,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _hammerTimeDuration,
        uint256 _bidDecimals,
        uint256 _stepMin,
        uint256 _incMin,
        uint256 _incMax
    ) public onlyOwner {
        collections[_contract].startTime = _startTime;
        collections[_contract].endTime = _endTime;
        collections[_contract].hammerTimeDuration = _hammerTimeDuration;
        collections[_contract].bidDecimals = _bidDecimals;
        collections[_contract].stepMin = _stepMin;
        collections[_contract].incMin = _incMin;
        collections[_contract].incMax = _incMax;
    }

    /// @notice Register an auction token and emit the relevant AuctionInitialized & AuctionStartTimeUpdated events
    /// Throw if the token owner is not the GBM smart contract/supply of auctionned 1155 token is insufficient
    /// @param _tokenContract The token contract the auctionned token belong to
    /// @param _tokenId The token ID of the token being auctionned
    /// @param _tokenKind either bytes4(keccak256("ERC721")) or bytes4(keccak256("ERC1155"))
    /// @param _useInitiator Set to `false` if you want to use the default value registered for the token contract (if wanting to reset to default,
    /// use `true`)
    function registerAnAuctionToken(
        address _tokenContract,
        uint256 _tokenId,
        bytes4 _tokenKind,
        bool _useInitiator
    ) public onlyOwner {
        modifyAnAuctionToken(_tokenContract, _tokenId, _tokenKind, _useInitiator, 0, false);
    }

    /// @notice Register an auction token and emit the relevant AuctionInitialized & AuctionStartTimeUpdated events
    /// Throw if the token owner is not the GBM smart contract/supply of auctionned 1155 token is insufficient
    /// @param _tokenContract The token contract the auctionned token belong to
    /// @param _tokenId The token ID of the token being auctionned
    /// @param _tokenKind either bytes4(keccak256("ERC721")) or bytes4(keccak256("ERC1155"))
    /// @param _useInitiator Set to `false` if you want to use the default value registered for the token contract (if wanting to reset to default,
    /// use `true`)
    /// @param _1155Index Set to 0 if dealing with an ERC-721 or registering new 1155 test. otherwise, set to relevant index you want to reinitialize
    /// @param _rewrite Set to true if you want to rewrite the data of an existing auction, false otherwise
    function modifyAnAuctionToken(
        address _tokenContract,
        uint256 _tokenId,
        bytes4 _tokenKind,
        bool _useInitiator,
        uint256 _1155Index,
        bool _rewrite
    ) internal {
        if (!_rewrite) {
            _1155Index = erc1155TokensIndex[_tokenContract][_tokenId]; //_1155Index was 0 if creating new auctions
            require(auctionMapping[_tokenContract][_tokenId][_1155Index] == 0, "The auction aleady exist for the specified token");
        } else {
            require(auctionMapping[_tokenContract][_tokenId][_1155Index] != 0, "The auction doesn't exist yet for the specified token");
        }

        //Checking the kind of token being registered
        require(
            _tokenKind == bytes4(keccak256("ERC721")) || _tokenKind == bytes4(keccak256("ERC1155")),
            "registerAnAuctionToken: Only ERC1155 and ERC721 tokens are supported"
        );

        //Building the auction object
        TokenRepresentation memory newAuction;
        newAuction.contractAddress = _tokenContract;
        newAuction.tokenId = _tokenId;
        newAuction.tokenKind = _tokenKind;

        uint256 _auctionId;

        if (_tokenKind == bytes4(keccak256("ERC721"))) {
            require(
                msg.sender == Ownable(_tokenContract).owner() || address(this) == IERC721(_tokenContract).ownerOf(_tokenId),
                "registerAnAuctionToken: the specified ERC-721 token cannot be auctioned"
            );

            _auctionId = uint256(keccak256(abi.encodePacked(_tokenContract, _tokenId, _tokenKind)));
            auctionMapping[_tokenContract][_tokenId][0] = _auctionId;
        } else {
            require(
                msg.sender == Ownable(_tokenContract).owner() ||
                    erc1155TokensUnderAuction[_tokenContract][_tokenId] < IERC1155(_tokenContract).balanceOf(address(this), _tokenId),
                "registerAnAuctionToken:  the specified ERC-1155 token cannot be auctionned"
            );

            require(
                _1155Index <= erc1155TokensIndex[_tokenContract][_tokenId],
                "The specified _1155Index have not been reached yet for this token"
            );

            _auctionId = uint256(keccak256(abi.encodePacked(_tokenContract, _tokenId, _tokenKind, _1155Index)));

            if (!_rewrite) {
                erc1155TokensIndex[_tokenContract][_tokenId] = erc1155TokensIndex[_tokenContract][_tokenId] + 1;
                erc1155TokensUnderAuction[_tokenContract][_tokenId] = erc1155TokensUnderAuction[_tokenContract][_tokenId] + 1;
            }

            auctionMapping[_tokenContract][_tokenId][_1155Index] = _auctionId;
        }

        tokenMapping[_auctionId] = newAuction;

        if (_useInitiator) {
            auctions[_auctionId].owner = owner();
            auctions[_auctionId].startTime = collections[_tokenContract].startTime;
            auctions[_auctionId].endTime = collections[_tokenContract].endTime;
            auctions[_auctionId].hammerTimeDuration = collections[_tokenContract].hammerTimeDuration;
            auctions[_auctionId].bidDecimals = collections[_tokenContract].bidDecimals;
            auctions[_auctionId].stepMin = collections[_tokenContract].stepMin;
            auctions[_auctionId].incMin = collections[_tokenContract].incMin;
            auctions[_auctionId].incMax = collections[_tokenContract].incMax;
            auctions[_auctionId].bidMultiplier = collections[_tokenContract].bidMultiplier;
        }

        //Event emitted when an auction is being setup
        emit Auction_Initialized(_auctionId, _tokenId, _1155Index, _tokenContract, _tokenKind);

        //Event emitted when the start time of an auction changes (due to admin interaction )
        emit Auction_StartTimeUpdated(_auctionId, getAuctionStartTime(_auctionId));
    }

    /// @notice Place a GBM bid for a GBM auction
    /// @param _auctionId The auction you want to bid on
    /// @param _bidAmount The amount of the ERC20 token the bid is made of. They should be withdrawable by this contract.
    /// @param _highestBid The current higest bid. Throw if incorrect.
    function bid(
        uint256 _auctionId,
        uint256 _bidAmount,
        uint256 _highestBid
    ) external {
        require(collections[tokenMapping[_auctionId].contractAddress].biddingAllowed, "bid: bidding is currently not allowed");

        require(_bidAmount > 1, "bid: _bidAmount cannot be 0");

        require(_highestBid == auctions[_auctionId].highestBid, "bid: current highest bid does not match the submitted transaction _highestBid");

        //An auction start time of 0 also indicate the auction has not been created at all

        require(getAuctionStartTime(_auctionId) <= block.timestamp && getAuctionStartTime(_auctionId) != 0, "bid: Auction has not started yet");
        require(getAuctionEndTime(_auctionId) >= block.timestamp, "bid: Auction has already ended");

        require(_bidAmount > _highestBid, "bid: _bidAmount must be higher than _highestBid");
        require(
            // (_highestBid * (getAuctionBidDecimals(_auctionId)) + (getAuctionStepMin(_auctionId) / getAuctionBidDecimals(_auctionId))) >= _highestBid,
            // "bid: _bidAmount must meet the minimum bid"

            (_highestBid * (getAuctionBidDecimals(_auctionId) + (getAuctionStepMin(_auctionId)))) / 1000 <= (_bidAmount * getAuctionBidDecimals(_auctionId)),
            "bid: _bidAmount must meet the minimum bid"
        );

        //Transfer the money of the bidder to the GBM smart contract
        IERC20(erc20Currency).transferFrom(msg.sender, address(this), _bidAmount);

        //Extend the duration time of the auction if we are close to the end
        if (getAuctionEndTime(_auctionId) < block.timestamp + getAuctionHammerTimeDuration(_auctionId)) {
            auctions[_auctionId].endTime = block.timestamp + getAuctionHammerTimeDuration(_auctionId);
            emit Auction_EndTimeUpdated(_auctionId, auctions[_auctionId].endTime);
        }

        // Saving incentives for later sending
        uint256 duePay = auctions[_auctionId].dueIncentives;
        address previousHighestBidder = auctions[_auctionId].highestBidder;
        uint256 previousHighestBid = auctions[_auctionId].highestBid;

        // Emitting the event sequence
        if (previousHighestBidder != address(0)) {
            emit Auction_BidRemoved(_auctionId, previousHighestBidder, previousHighestBid);
        }

        if (duePay != 0) {
            auctions[_auctionId].auctionDebt = auctions[_auctionId].auctionDebt + duePay;
            emit Auction_IncentivePaid(_auctionId, previousHighestBidder, duePay);
        }

        emit Auction_BidPlaced(_auctionId, msg.sender, _bidAmount);

        // Calculating incentives for the new bidder
        auctions[_auctionId].dueIncentives = calculateIncentives(_auctionId, _bidAmount);

        //Setting the new bid/bidder as the highest bid/bidder
        auctions[_auctionId].highestBidder = msg.sender;
        auctions[_auctionId].secondHighestBid = auctions[_auctionId].highestBid;
        auctions[_auctionId].highestBid = _bidAmount;

        if ((previousHighestBid + duePay) != 0) {
            //Refunding the previous bid as well as sending the incentives

            //Added to prevent revert
            IERC20(erc20Currency).approve(address(this), (previousHighestBid + duePay));

            IERC20(erc20Currency).transferFrom(address(this), previousHighestBidder, (previousHighestBid + duePay));
        }
    }

    /// @notice Attribute a token to the winner of the auction and distribute the proceeds to the owner of this contract.
    /// throw if bidding is disabled or if the auction is not finished.
    /// @param _auctionId The auctionId of the auction to complete
    function claimForFirstTime(uint256 _auctionId) public {
        require(
            IEconNFTERC721(econNFT).getNumberOfPeriodPassed() == 0, 
            "EconAuctionHouse : Period to claim for the first time has passed"
        );
        address _contractAddress = tokenMapping[_auctionId].contractAddress;
        uint256 _tid = tokenMapping[_auctionId].tokenId;

        require(collections[_contractAddress].biddingAllowed, "claim: Claiming is currently not allowed");
        require(getAuctionEndTime(_auctionId) < block.timestamp, "claim: Auction has not yet ended");
        require(auctionItemClaimed[_auctionId] == false, "claim: Item has already been claimed");

        //Prevents re-entrancy
        auctionItemClaimed[_auctionId] = true;

        uint256 _proceeds;
        uint256 remainingFunds;
        if(auctions[_auctionId].secondHighestBid == 0) {
            _proceeds = auctions[_auctionId].highestBid - auctions[_auctionId].auctionDebt;
        } else {
            _proceeds = auctions[_auctionId].secondHighestBid - auctions[_auctionId].auctionDebt;
            remainingFunds = auctions[_auctionId].highestBid - auctions[_auctionId].secondHighestBid;
        }

        // Added to prevent revert
        IERC20(erc20Currency).approve(address(this), 2**256 - 1);

        IERC20(erc20Currency).transferFrom(address(this), daoTreasury, _proceeds);

        if(remainingFunds > 0) {
            IERC20(erc20Currency).transferFrom(address(this), auctions[_auctionId].highestBidder, remainingFunds);
        }

        if (tokenMapping[_auctionId].tokenKind == bytes4(keccak256("ERC721"))) {
            //0x73ad2146
            IERC721(_contractAddress).safeTransferFrom(address(this), auctions[_auctionId].highestBidder, _tid);
        } else if (tokenMapping[_auctionId].tokenKind == bytes4(keccak256("ERC1155"))) {
            //0x973bb640
            IERC1155(_contractAddress).safeTransferFrom(address(this), auctions[_auctionId].highestBidder, _tid, 1, "");
            erc1155TokensUnderAuction[_contractAddress][_tid] = erc1155TokensUnderAuction[_contractAddress][_tid] - 1;
        }

        emit Auction_ItemClaimed(_auctionId);
    }

    /// @notice Attribute a token to the winner of the auction and distribute the proceeds to the owner of this contract.
    /// throw if bidding is disabled or if the auction is not finished.
    /// @param _auctionId The auctionId of the auction to complete
    function claimAfterReAuctionned(uint256 _auctionId) public {
        require(
            IEconNFTERC721(econNFT).getNumberOfPeriodPassed() >= 1, 
            "EconAuctionHouse: NFT hasn't been re-auctionned yet"
        );
        address _contractAddress = tokenMapping[_auctionId].contractAddress;
        uint256 _tid = tokenMapping[_auctionId].tokenId;

        require(collections[_contractAddress].biddingAllowed, "claim: Claiming is currently not allowed");
        require(getAuctionEndTime(_auctionId) < block.timestamp, "claim: Auction has not yet ended");
        require(auctionItemClaimed[_auctionId] == false, "claim: Item has already been claimed");

        //Prevents re-entrancy
        auctionItemClaimed[_auctionId] = true;

        uint256 _proceeds;
        uint256 remainingFunds;
        if(auctions[_auctionId].secondHighestBid == 0) {
            _proceeds = auctions[_auctionId].highestBid - auctions[_auctionId].auctionDebt;
        } else {
            _proceeds = auctions[_auctionId].secondHighestBid - auctions[_auctionId].auctionDebt;
            remainingFunds = auctions[_auctionId].highestBid - auctions[_auctionId].secondHighestBid;
        }

        //Added to prevent revert
        IERC20(erc20Currency).approve(address(this), 2**256 - 1);

        IERC20(erc20Currency).transferFrom(address(this), previousOwnerForReAuction[_tid], (_proceeds * 7000) / 10000);

        IERC20(erc20Currency).transferFrom(address(this), daoTreasury, (_proceeds * 3000) / 10000);

        if(remainingFunds > 0 ) {
            IERC20(erc20Currency).transferFrom(address(this), auctions[_auctionId].highestBidder, remainingFunds);
        }

        if (tokenMapping[_auctionId].tokenKind == bytes4(keccak256("ERC721"))) {
            //0x73ad2146
            IERC721(_contractAddress).safeTransferFrom(address(this), auctions[_auctionId].highestBidder, _tid);
        } else if (tokenMapping[_auctionId].tokenKind == bytes4(keccak256("ERC1155"))) {
            //0x973bb640
            IERC1155(_contractAddress).safeTransferFrom(address(this), auctions[_auctionId].highestBidder, _tid, 1, "");
            erc1155TokensUnderAuction[_contractAddress][_tid] = erc1155TokensUnderAuction[_contractAddress][_tid] - 1;
        }

        emit Auction_ItemClaimed(_auctionId);
    }

    function takeERC721Back(address _from, uint256 _id) external onlyOwner {
        require(block.timestamp >= IEconNFTERC721(econNFT).getCurrentExpirationTimestamp(), "EconAuctionHouse: Period has not passed yet");
        previousOwnerForReAuction[_id] = _from;
        IERC721(econNFT).safeTransferFrom(_from, address(this), _id);
    }

    function resetAuctionState(uint256 _auctionId, address _nftContract) public onlyOwner {
        registerAnAuctionContract(_nftContract, 0, 0, 0, 0, 0, 0, 0);
        auctions[_auctionId].owner = address(0);
        auctions[_auctionId].highestBidder = address(0);
        auctions[_auctionId].highestBid = 0;
        auctions[_auctionId].auctionDebt = 0;
        auctions[_auctionId].dueIncentives = 0;
        auctions[_auctionId].contractAddress = address(0);
        auctions[_auctionId].startTime = 0;
        auctions[_auctionId].endTime = 0;
        auctions[_auctionId].hammerTimeDuration = 0;
        auctions[_auctionId].bidDecimals = 0;
        auctions[_auctionId].stepMin = 0;
        // multiply by 16
        auctions[_auctionId].incMin = 0;
        // multiply by 16
        auctions[_auctionId].incMax = 0;
        auctions[_auctionId].bidMultiplier = 0;
        auctions[_auctionId].biddingAllowed = false;
        auctionItemClaimed[_auctionId] = false;
        collections[_nftContract].biddingAllowed = false;
    }

    /// @notice Allow/disallow bidding and claiming for a whole token contract address.
    /// @param _contract The token contract the auctionned token belong to
    /// @param _value True if bidding/claiming should be allowed.
    function setBiddingAllowed(address _contract, bool _value) external onlyOwner {
        collections[_contract].biddingAllowed = _value;
        emit Contract_BiddingAllowed(_contract, _value);
    }

    function setErc20Currency(address _currency) external onlyOwner {
        erc20Currency = _currency;
    }

    function setDaoTreasury(address _dao) external onlyOwner {
        daoTreasury = _dao;
    }

    function getErc20Currency() external view returns (address) {
        return erc20Currency;
    }

    function getDaoTreasury() external view returns(address) {
        return daoTreasury;
    }

    function getAuctionInfo(uint256 _auctionId) external view returns (Auction memory auctionInfo_) {
        auctionInfo_ = auctions[_auctionId];
        auctionInfo_.contractAddress = tokenMapping[_auctionId].contractAddress;
        auctionInfo_.biddingAllowed = collections[tokenMapping[_auctionId].contractAddress].biddingAllowed;
    }

    function getAuctionHighestBidder(uint256 _auctionId) external view returns (address) {
        return auctions[_auctionId].highestBidder;
    }

    function getAuctionHighestBid(uint256 _auctionId) external view returns (uint256) {
        return auctions[_auctionId].highestBid;
    }

    function getAuctionDebt(uint256 _auctionId) external view returns (uint256) {
        return auctions[_auctionId].auctionDebt;
    }

    function getAuctionDueIncentives(uint256 _auctionId) external view returns (uint256) {
        return auctions[_auctionId].dueIncentives;
    }

    function getAuctionID(address _contract, uint256 _tokenID) external view returns (uint256) {
        return auctionMapping[_contract][_tokenID][0];
    }

    function getContractFromId(uint256 _auctionId) public view returns(address) {
        return(tokenMapping[_auctionId].contractAddress);
    }

    function getBiddingAllowed(uint256 _auctionId) public view returns(bool) {
        return(collections[tokenMapping[_auctionId].contractAddress].biddingAllowed);
    }

    // function getAuctionID(
    //     address _contract,
    //     uint256 _tokenID,
    //     uint256 _tokenIndex
    // ) external view returns (uint256) {
    //     return s.auctionMapping[_contract][_tokenID][_tokenIndex];
    // }

    function getTokenKind(uint256 _auctionId) external view returns (bytes4) {
        return tokenMapping[_auctionId].tokenKind;
    }

    function getTokenId(uint256 _auctionId) external view returns (uint256) {
        return tokenMapping[_auctionId].tokenId;
    }

    function getContractAddress(uint256 _auctionId) external view returns (address) {
        return tokenMapping[_auctionId].contractAddress;
    }

    function getAuctionStartTime(uint256 _auctionId) public view returns (uint256) {
        if (auctions[_auctionId].startTime != 0) {
            return auctions[_auctionId].startTime;
        } else {
            return collections[tokenMapping[_auctionId].contractAddress].startTime;
        }
    }

    function getAuctionEndTime(uint256 _auctionId) public view returns (uint256) {
        if (auctions[_auctionId].endTime != 0) {
            return auctions[_auctionId].endTime;
        } else {
            return collections[tokenMapping[_auctionId].contractAddress].endTime;
        }
    }

    function getAuctionHammerTimeDuration(uint256 _auctionId) public view returns (uint256) {
        if (auctions[_auctionId].hammerTimeDuration != 0) {
            return auctions[_auctionId].hammerTimeDuration;
        } else {
            return collections[tokenMapping[_auctionId].contractAddress].hammerTimeDuration;
        }
    }

    function getAuctionBidDecimals(uint256 _auctionId) public view returns (uint256) {
        if (auctions[_auctionId].bidDecimals != 0) {
            return auctions[_auctionId].bidDecimals;
        } else {
            return collections[tokenMapping[_auctionId].contractAddress].bidDecimals;
        }
    }

    function getAuctionStepMin(uint256 _auctionId) public view returns (uint256) {
        if (auctions[_auctionId].stepMin != 0) {
            return auctions[_auctionId].stepMin;
        } else {
            return collections[tokenMapping[_auctionId].contractAddress].stepMin;
        }
    }

    function getAuctionIncMin(uint256 _auctionId) public view returns (uint256) {
        if (auctions[_auctionId].incMin != 0) {
            return auctions[_auctionId].incMin;
        } else {
            return collections[tokenMapping[_auctionId].contractAddress].incMin;
        }
    }

    function getAuctionIncMax(uint256 _auctionId) public view returns (uint256) {
        if (auctions[_auctionId].incMax != 0) {
            return auctions[_auctionId].incMax;
        } else {
            return collections[tokenMapping[_auctionId].contractAddress].incMax;
        }
    }

    function getAuctionBidMultiplier(uint256 _auctionId) public view returns (uint256) {
        if (auctions[_auctionId].bidMultiplier != 0) {
            return auctions[_auctionId].bidMultiplier;
        } else {
            return collections[tokenMapping[_auctionId].contractAddress].bidMultiplier;
        }
    }

    function onERC721Received(
        address, /* _operator */
        address, /*  _from */
        uint256, /*  _tokenId */
        bytes calldata /* _data */
    ) external pure returns (bytes4) {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }

    function onERC1155Received(
        address, /* _operator */
        address, /* _from */
        uint256, /* _id */
        uint256, /* _value */
        bytes calldata /* _data */
    ) external pure returns (bytes4) {
        return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));
    }

    function onERC1155BatchReceived(
        address, /* _operator */
        address, /* _from */
        uint256[] calldata, /* _ids */
        uint256[] calldata, /* _values */
        bytes calldata /* _data */
    ) external pure returns (bytes4) {
        return bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"));
    }

    /// @notice Calculating and setting how much payout a bidder will receive if outbid
    /// @dev Only callable internally
    function calculateIncentives(uint256 _auctionId, uint256 _newBidValue) internal view returns (uint256) {
        uint256 bidDecimals = getAuctionBidDecimals(_auctionId);
        uint256 bidIncMax = getAuctionIncMax(_auctionId) / 1000;

        // Init the baseline bid we need to perform against
        uint256 baseBid = (auctions[_auctionId].highestBid * (bidDecimals + (getAuctionStepMin(_auctionId) / 1000))) / bidDecimals;

        // If no bids are present, set a basebid value of 1 to prevent divide by 0 errors
        if (baseBid == 0) {
            baseBid = 1;
        }

        // Ratio of newBid compared to expected minBid
        uint256 decimaledRatio = ((bidDecimals * getAuctionBidMultiplier(_auctionId) * (_newBidValue - baseBid)) / baseBid) +
            (getAuctionIncMin(_auctionId) / 1000) *
            bidDecimals;

        if (decimaledRatio > (bidDecimals * bidIncMax)) {
            decimaledRatio = bidDecimals * bidIncMax;
        }

        // return (_newBidValue * decimaledRatio) / (bidDecimals * bidDecimals);
        return ((_newBidValue * decimaledRatio) / (bidDecimals * bidDecimals));
    }
}