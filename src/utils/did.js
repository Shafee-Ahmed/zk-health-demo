// Simplified mock version – no external dependencies
export const generateDID = async () => {
  return {
    did: `did:key:mock-${Date.now()}`,
    keyPair: { privateKey: 'mock' },
    didDocument: {}
  };
};

export const signJWT = (payload, keyPair, did) => {
  // Mock signature – just encode as JSON and base64
  const header = { alg: 'none', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify({ ...payload, iss: did, iat: Date.now() / 1000 }));
  const signature = 'mock-signature';
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

export const decodeJWT = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
};

export const hasValidVC = (token) => {
  return !!decodeJWT(token);
};