// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AntiResale {
    address public dataAccess;
    address public accessToken;
    
    mapping(uint256 => bool) public tokenUsed;
    mapping(uint256 => uint256) public tokenUseCount;
    mapping(uint256 => address) public tokenBoundTo;
    
    event TokenSingleUseEnforced(uint256 indexed tokenId, address indexed user, string message);
    event ResaleAttemptBlocked(uint256 indexed tokenId, address indexed attemptedBuyer, string message);
    
    constructor(address _dataAccess, address _accessToken) {
        dataAccess = _dataAccess;
        accessToken = _accessToken;
    }
    
   function useTokenWithAntiResale(uint256 tokenId) external {
    require(!tokenUsed[tokenId], "Anti-Resale: Token already used. Cannot reuse.");
    
    // Get token details
    (bool success, bytes memory data) = accessToken.staticcall(
        abi.encodeWithSignature("getTokenDetails(uint256)", tokenId)
    );
    require(success, "Failed to fetch token details");
    
    (, , address dataRequester, bool isRevoked, , bool isValid) = 
        abi.decode(data, (uint256, bytes32, address, bool, uint256, bool));
    
    require(dataRequester == msg.sender, "Anti-Resale: You are not the original data requester");
    require(isValid, "Anti-Resale: Token invalid or expired");
    require(!isRevoked, "Anti-Resale: Token was revoked");
    
    // Mark as used
    tokenUsed[tokenId] = true;
    tokenUseCount[tokenId]++;
    tokenBoundTo[tokenId] = msg.sender;
    
    // Try to use token in AccessToken
    (bool useSuccess, ) = accessToken.call(
        abi.encodeWithSignature("useToken(uint256)", tokenId)
    );
    
    if (useSuccess) {
        emit TokenSingleUseEnforced(tokenId, msg.sender, "Data access granted. Token marked as used.");
    } else {
        emit TokenSingleUseEnforced(tokenId, msg.sender, "Data accessed but token use failed.");
    }
}
    
    function checkResaleAttempt(uint256 tokenId, address newOwner) external view returns (string memory) {
        if (tokenUsed[tokenId]) {
            return "RESALE BLOCKED: Token already used for data access";
        }
        
        if (tokenBoundTo[tokenId] != address(0) && tokenBoundTo[tokenId] != newOwner) {
            return "RESALE BLOCKED: Token bound to original requester";
        }
        
        (bool success, bytes memory data) = accessToken.staticcall(
            abi.encodeWithSignature("getTokenDetails(uint256)", tokenId)
        );
        
        if (!success) return "Token does not exist";
        
        (, , address dataRequester, bool isRevoked, , bool isValid) = 
            abi.decode(data, (uint256, bytes32, address, bool, uint256, bool));
        
        if (!isValid) return "RESALE BLOCKED: Token expired";
        if (isRevoked) return "RESALE BLOCKED: Token revoked";
        if (dataRequester != address(0) && dataRequester != newOwner) {
            return "RESALE BLOCKED: Token assigned to different user";
        }
        
        return "Resale allowed";
    }
    
    function isTokenUsed(uint256 tokenId) external view returns (bool) {
        return tokenUsed[tokenId];
    }
}