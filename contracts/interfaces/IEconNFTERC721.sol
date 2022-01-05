interface IEconNFTERC721 {
    function setCurrentExpirationTimestamp(uint256 _newExpirationTimestamp) external virtual;
    function getNumberOfPeriodPassed() external view virtual returns(uint256);
    function getCurrentExpirationTimestamp() external view virtual returns(uint256);
}