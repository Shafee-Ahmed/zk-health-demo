export const dataAccessV2ABI = [
  "function requestAccessWithZK(bytes32 consentId, uint256[2] calldata a, uint256[2][2] calldata b, uint256[2] calldata c, uint256[15] calldata inputs, string memory tokenURI, uint256 validityDuration) external returns (uint256)",
  "event AccessGranted(bytes32 indexed consentId, address indexed requester, uint256 tokenId, string proofType)"
];