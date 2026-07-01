// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AccessToken {
    struct TokenInfo {
        uint256 expiryTimestamp;
        bytes32 linkedConsentId;
        address dataRequester;
        bool isRevoked;
        uint256 createdAt;
    }
    
    mapping(uint256 => TokenInfo) public tokenInfo;
    mapping(uint256 => address) public ownerOf;
    mapping(uint256 => string) public tokenURI;
    
    uint256 private _nextTokenId = 1;
    
    event TokenMinted(uint256 indexed tokenId, address indexed to, bytes32 indexed consentId, string message);
    event TokenUsed(uint256 indexed tokenId, address indexed user, string message);
    event TokenRevoked(uint256 indexed tokenId, string message);
    
    function mintToken(
        address to,
        bytes32 consentId,
        uint256 validityDuration,
        string memory _tokenURI
    ) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        uint256 expiryTimestamp = block.timestamp + validityDuration;
        
        ownerOf[tokenId] = to;
        tokenURI[tokenId] = _tokenURI;
        
        tokenInfo[tokenId] = TokenInfo({
            expiryTimestamp: expiryTimestamp,
            linkedConsentId: consentId,
            dataRequester: to,
            isRevoked: false,
            createdAt: block.timestamp
        });
        
        emit TokenMinted(tokenId, to, consentId, "Medical Access Token Minted Successfully");
        return tokenId;
    }
    
    function useToken(uint256 tokenId) external {
        require(ownerOf[tokenId] == msg.sender, "Access Denied: You don't own this token");
        require(isTokenValid(tokenId), "Access Denied: Token expired or revoked");
        
        TokenInfo storage info = tokenInfo[tokenId];
        require(!info.isRevoked, "Access Denied: Token was revoked by provider");
        
        emit TokenUsed(tokenId, msg.sender, "Medical Data Accessed Successfully");
    }
    
    function revokeToken(uint256 tokenId) external {
        tokenInfo[tokenId].isRevoked = true;
        emit TokenRevoked(tokenId, "Token Revoked: Medical access terminated");
    }
    
    function isTokenValid(uint256 tokenId) public view returns (bool) {
        if (ownerOf[tokenId] == address(0)) return false;
        TokenInfo memory info = tokenInfo[tokenId];
        return info.expiryTimestamp > block.timestamp && !info.isRevoked;
    }
    
    function getTokenDetails(uint256 tokenId) external view returns (
        uint256 expiryTimestamp,
        bytes32 linkedConsentId,
        address dataRequester,
        bool isRevoked,
        uint256 createdAt,
        bool isValid
    ) {
        TokenInfo memory info = tokenInfo[tokenId];
        bool exists = ownerOf[tokenId] != address(0);
        bool valid = exists && info.expiryTimestamp > block.timestamp && !info.isRevoked;
        
        return (info.expiryTimestamp, info.linkedConsentId, info.dataRequester, 
                info.isRevoked, info.createdAt, valid);
    }
}