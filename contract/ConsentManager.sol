// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ConsentManager {
    enum DataType { LAB_RESULT, DIAGNOSIS, MEDICATION, ALLERGY, PROCEDURE }
    enum Status { ACTIVE, REVOKED, EXPIRED }
    
    struct Consent {
        address patient;
        bytes32 dataHash;
        bytes32 policyHash;
        Status status;
        uint256 createdAt;
        uint256 lastAccessed;
        uint256 accessCount;
        string metadataURI;
    }
    
    // Storage
    mapping(bytes32 => Consent) public consents;
    mapping(address => bytes32[]) private _patientConsents;
    mapping(address => bool) public authorizedProviders;
    
    // Events
    event ConsentCreated(
        bytes32 indexed consentId,
        address indexed patient,
        bytes32 dataHash,
        bytes32 policyHash,
        string metadataURI
    );
    
    event ConsentRevoked(bytes32 indexed consentId, address indexed revoker);
    event DataAccessed(bytes32 indexed consentId, address indexed requester, uint256 timestamp);
    
    // Constructor
    constructor() {
        authorizedProviders[msg.sender] = true;
    }
    
    // Create consent (FIXED)
    function createConsent(
        bytes32 dataHash,
        bytes32 policyHash,
        string calldata metadataURI
    ) external returns (bytes32) {
        bytes32 consentId = keccak256(
            abi.encodePacked(msg.sender, dataHash, policyHash, block.timestamp, block.prevrandao)
        );
        
        consents[consentId] = Consent({
            patient: msg.sender,
            dataHash: dataHash,
            policyHash: policyHash,
            status: Status.ACTIVE,
            createdAt: block.timestamp,
            lastAccessed: 0,
            accessCount: 0,
            metadataURI: metadataURI
        });
        
        _patientConsents[msg.sender].push(consentId);
        emit ConsentCreated(consentId, msg.sender, dataHash, policyHash, metadataURI);
        return consentId;
    }
    
    function revokeConsent(bytes32 consentId) external {
        require(consents[consentId].patient == msg.sender, "Not owner");
        consents[consentId].status = Status.REVOKED;
        emit ConsentRevoked(consentId, msg.sender);
    }
    
    function recordAccess(bytes32 consentId, address requester) external {
        require(authorizedProviders[msg.sender], "Not authorized");
        consents[consentId].lastAccessed = block.timestamp;
        consents[consentId].accessCount++;
        emit DataAccessed(consentId, requester, block.timestamp);
    }
    
    function authorizeProvider(address provider) external {
        require(authorizedProviders[msg.sender], "Not authorized");
        authorizedProviders[provider] = true;
    }
    
    // View functions
    function getPatientConsents(address patient) external view returns (bytes32[] memory) {
        return _patientConsents[patient];
    }
}