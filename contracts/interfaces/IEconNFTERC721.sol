pragma solidity ^0.8.0;

interface IEconNFTERC721 {
    function setCurrentExpirationTimestamp(uint256 _newExpirationTimestamp) external;
    function getNumberOfPeriodPassed() external view returns(uint256);
    function getCurrentExpirationTimestamp() external view returns(uint256);
}