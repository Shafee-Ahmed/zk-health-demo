// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DataAccess {
    address public consentManager;
    address public accessToken;
    
    mapping(bytes32 => bool) public usedProofHashes;
    
    event AccessGranted(bytes32 indexed consentId, address indexed requester, uint256 tokenId, string message);
    event DataAccessed(bytes32 indexed consentId, address indexed user, string message);
    
    constructor(address _consentManager, address _accessToken) {
        consentManager = _consentManager;
        accessToken = _accessToken;
    }
    
    function requestDataAccess(
        bytes32 consentId,
        bytes32 proofHash,
        string memory tokenURI,
        uint256 validityDuration
    ) external returns (uint256) {
        require(!usedProofHashes[proofHash], "Proof already used for another request");
        usedProofHashes[proofHash] = true;
        
        // Mint token
        (bool success, bytes memory data) = accessToken.call(
            abi.encodeWithSignature(
                "mintToken(address,bytes32,uint256,string)",
                msg.sender,
                consentId,
                validityDuration,
                tokenURI
            )
        );
        require(success, "Failed to mint access token");
        
        uint256 tokenId = abi.decode(data, (uint256));
        
        emit AccessGranted(consentId, msg.sender, tokenId, "Data access granted with token");
        return tokenId;
    }
    
    function recordAccess(bytes32 consentId, address user) external {
        emit DataAccessed(consentId, user, "Medical data was accessed");
    }
    
    function isProofUsed(bytes32 proofHash) external view returns (bool) {
        return usedProofHashes[proofHash];
    }
}