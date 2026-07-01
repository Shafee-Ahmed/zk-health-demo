export const accessTokenABI = [
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function getTokenDetails(uint256 tokenId) external view returns (uint256 expiryTimestamp, bytes32 linkedConsentId, address dataRequester, bool isRevoked, uint256 createdAt, bool isValid)"
];