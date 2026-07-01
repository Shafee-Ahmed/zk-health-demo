// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockZKVerifier {
    
    event ProofVerified(address indexed prover, bool result, string condition);
    
    // Simple mock verification
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata inputs
    ) external returns (bool) {
        require(inputs.length > 0, "No proof inputs provided");
        
        bool result = false;
        string memory condition = "";
        
        // Mock conditions based on inputs
        if (inputs.length == 2) {
            // Age check: inputs[0] = age, inputs[1] = threshold
            result = inputs[0] > inputs[1];
            condition = string(abi.encodePacked(
                "Age ", 
                uintToString(inputs[0]), 
                " > ", 
                uintToString(inputs[1])
            ));
        } 
        else if (inputs.length == 3) {
            // Lab result check: inputs[0] = glucose, inputs[1] = min, inputs[2] = max
            result = (inputs[0] >= inputs[1] && inputs[0] <= inputs[2]);
            condition = string(abi.encodePacked(
                "Glucose ", 
                uintToString(inputs[0]), 
                " between ", 
                uintToString(inputs[1]), 
                "-", 
                uintToString(inputs[2])
            ));
        }
        else {
            // Default: proof is valid if first input > 0
            result = inputs[0] > 0;
            condition = "Basic proof check";
        }
        
        emit ProofVerified(msg.sender, result, condition);
        return result;
    }
    
    // Generate mock proof data for testing
    function generateAgeProof(uint256 age, uint256 minAge) external pure returns (
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory inputs
    ) {
        // Mock proof components (not real cryptography)
        a = [uint256(12345), uint256(67890)];
        b = [[uint256(111213), uint256(141516)], [uint256(171819), uint256(202122)]];
        c = [uint256(232425), uint256(262728)];
        
        inputs = new uint256[](2);
        inputs[0] = age;        // Patient's age
        inputs[1] = minAge;     // Required minimum age
        
        return (a, b, c, inputs);
    }
    
    function generateLabResultProof(
        uint256 glucoseLevel,
        uint256 minNormal,
        uint256 maxNormal
    ) external pure returns (
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory inputs
    ) {
        a = [uint256(33333), uint256(44444)];
        b = [[uint256(55555), uint256(66666)], [uint256(77777), uint256(88888)]];
        c = [uint256(99999), uint256(101010)];
        
        inputs = new uint256[](3);
        inputs[0] = glucoseLevel;
        inputs[1] = minNormal;
        inputs[2] = maxNormal;
        
        return (a, b, c, inputs);
    }
    
    // Helper function to convert uint to string
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
    
    // Simple test function
    function testVerification() external returns (bool) {
        uint256[2] memory a = [uint256(1), uint256(2)];
        uint256[2][2] memory b = [[uint256(3), uint256(4)], [uint256(5), uint256(6)]];
        uint256[2] memory c = [uint256(7), uint256(8)];
        uint256[] memory inputs = new uint256[](1);
        inputs[0] = 42;
        
        return this.verifyProof(a, b, c, inputs);
    }
}