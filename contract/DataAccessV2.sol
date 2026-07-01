// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IZKVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[15] calldata inputs   // fixed-size array of 15
    ) external returns (bool);
}

contract DataAccessV2 {
    address public consentManager;
    address public accessToken;
    address public zkVerifier;

    mapping(bytes32 => bool) public usedProofHashes;
    mapping(address => bool) public authorizedVerifiers;

    event AccessGranted(
        bytes32 indexed consentId,
        address indexed requester,
        uint256 tokenId,
        string proofType
    );
    event ZKProofVerified(bytes32 indexed consentId, bool isValid, string condition);

    constructor(address _consentManager, address _accessToken, address _zkVerifier) {
        consentManager = _consentManager;
        accessToken = _accessToken;
        zkVerifier = _zkVerifier;
        authorizedVerifiers[msg.sender] = true;
    }

    // Request access with ZK proof – now inputs is uint256[15]
    function requestAccessWithZK(
        bytes32 consentId,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[15] calldata inputs,
        string memory tokenURI,
        uint256 validityDuration
    ) external returns (uint256) {
        // Prevent proof replay
        bytes32 proofHash = keccak256(abi.encodePacked(a, b, c, inputs, block.timestamp));
        require(!usedProofHashes[proofHash], "Proof already used");
        usedProofHashes[proofHash] = true;

        // Verify ZK proof
        bool proofValid = IZKVerifier(zkVerifier).verifyProof(a, b, c, inputs);
        require(proofValid, "ZK proof verification failed");

        // Mint access token
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

        // Simple condition description (optional)
        string memory condition = "Multi-condition proof (15 inputs)";

        emit AccessGranted(consentId, msg.sender, tokenId, condition);
        emit ZKProofVerified(consentId, true, condition);

        return tokenId;
    }

    // Legacy function (keep for compatibility if needed)
    function requestDataAccess(
        bytes32 consentId,
        bytes32 proofHash,
        string memory tokenURI,
        uint256 validityDuration
    ) external returns (uint256) {
        require(!usedProofHashes[proofHash], "Proof already used");
        usedProofHashes[proofHash] = true;

        (bool success, bytes memory data) = accessToken.call(
            abi.encodeWithSignature(
                "mintToken(address,bytes32,uint256,string)",
                msg.sender,
                consentId,
                validityDuration,
                tokenURI
            )
        );
        require(success, "Mint failed");

        uint256 tokenId = abi.decode(data, (uint256));
        emit AccessGranted(consentId, msg.sender, tokenId, "Legacy proof");
        return tokenId;
    }

    function useDataWithToken(uint256 tokenId, bytes32 consentId) external {
        (bool checkSuccess, bytes memory checkData) = accessToken.staticcall(
            abi.encodeWithSignature("getTokenDetails(uint256)", tokenId)
        );
        require(checkSuccess, "Token check failed");

        (, , address dataRequester, bool isRevoked, , bool isValid) =
            abi.decode(checkData, (uint256, bytes32, address, bool, uint256, bool));

        require(dataRequester == msg.sender, "Not token owner");
        require(isValid, "Token invalid");
        require(!isRevoked, "Token revoked");

        emit ZKProofVerified(consentId, true, "Token-based access");
    }

    // Helper function (kept for completeness, but not used now)
    function uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function authorizeVerifier(address verifier) external {
        require(authorizedVerifiers[msg.sender], "Not authorized");
        authorizedVerifiers[verifier] = true;
    }

    function isProofUsed(bytes32 proofHash) external view returns (bool) {
        return usedProofHashes[proofHash];
    }
}