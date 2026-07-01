export const consentManagerABI = [
  "function createConsent(bytes32 dataHash, bytes32 policyHash, string calldata metadataURI) external returns (bytes32)",
  "event ConsentCreated(bytes32 indexed consentId, address indexed patient, bytes32 dataHash, bytes32 policyHash, string metadataURI)"
];