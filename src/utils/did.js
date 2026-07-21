import nacl from 'tweetnacl';
import bs58 from 'bs58';
import {
  createJWT,
  verifyJWT,
  EdDSASigner,
  decodeJWT as decodeDidJWT
} from 'did-jwt';
import { Resolver } from 'did-resolver';
import { getResolver } from 'key-did-resolver';

/**
 * Multicodec prefix for an Ed25519 public key:
 * 0xed 0x01
 */
const ED25519_MULTICODEC_PREFIX = new Uint8Array([0xed, 0x01]);

/**
 * Create a DID resolver capable of resolving did:key identifiers.
 */
const resolver = new Resolver(getResolver());

/**
 * Convert Uint8Array to a normal number array.
 * This allows the key material to be saved as JSON.
 */
const toSerializableArray = (value) => Array.from(value);

/**
 * Convert a stored number array back to Uint8Array.
 */
const toUint8Array = (value) => {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (!Array.isArray(value)) {
    throw new Error('Invalid stored key format');
  }

  return new Uint8Array(value);
};

/**
 * Generate a real Ed25519 key pair and corresponding did:key DID.
 */
export const generateDID = async () => {
  const generatedKeyPair = nacl.sign.keyPair();

  const publicKey = generatedKeyPair.publicKey;
  const secretKey = generatedKeyPair.secretKey;

  const prefixedPublicKey = new Uint8Array(
    ED25519_MULTICODEC_PREFIX.length + publicKey.length
  );

  prefixedPublicKey.set(ED25519_MULTICODEC_PREFIX, 0);
  prefixedPublicKey.set(publicKey, ED25519_MULTICODEC_PREFIX.length);

  const fingerprint = `z${bs58.encode(prefixedPublicKey)}`;
  const did = `did:key:${fingerprint}`;
  const verificationMethodId = `${did}#${fingerprint}`;

  const keyPair = {
    type: 'Ed25519VerificationKey2020',
    publicKey: toSerializableArray(publicKey),
    secretKey: toSerializableArray(secretKey),
    verificationMethodId
  };

  const didDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1'
    ],
    id: did,
    verificationMethod: [
      {
        id: verificationMethodId,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase: fingerprint
      }
    ],
    authentication: [verificationMethodId],
    assertionMethod: [verificationMethodId]
  };

  return {
    did,
    keyPair,
    didDocument
  };
};

/**
 * Create a cryptographically signed VC-JWT.
 */
export const signJWT = async (payload, keyPair, did) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Credential payload is required');
  }

  if (!keyPair?.secretKey) {
    throw new Error('Hospital signing key is unavailable');
  }

  if (!did?.startsWith('did:key:')) {
    throw new Error('A valid hospital did:key identifier is required');
  }

  const secretKey = toUint8Array(keyPair.secretKey);

  if (secretKey.length !== 64) {
    throw new Error('Invalid Ed25519 secret key');
  }

  const signer = EdDSASigner(secretKey);

  const issuedAt = Math.floor(Date.now() / 1000);

  return createJWT(
    {
      ...payload,
      iss: did,
      iat: issuedAt,
      nbf: issuedAt
    },
    {
      issuer: did,
      signer
    },
    {
      alg: 'EdDSA',
      typ: 'JWT',
      kid: keyPair.verificationMethodId
    }
  );
};

/**
 * Decode a JWT for display only.
 *
 * Important:
 * Decoding does not prove that the signature is valid.
 * Use verifyCredential() for security decisions.
 */
export const decodeJWT = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const decoded = decodeDidJWT(token);
    return decoded?.payload || null;
  } catch (error) {
    console.error('JWT decoding failed:', error);
    return null;
  }
};

/**
 * Verify the Ed25519 signature and important credential claims.
 */
export const verifyCredential = async (
  token,
  expectedPatientAddress = null,
  expectedIssuer = null
) => {
  try {
    if (!token || typeof token !== 'string') {
      return {
        valid: false,
        error: 'Credential token is missing'
      };
    }

    const verification = await verifyJWT(token, {
      resolver
    });

    const payload = verification.payload;

    if (!payload?.iss?.startsWith('did:key:')) {
      throw new Error('Credential issuer is not a valid did:key identifier');
    }

    if (expectedIssuer && payload.iss !== expectedIssuer) {
      throw new Error('Credential was not issued by the trusted hospital');
    }

    const credentialSubject = payload.credentialSubject;

    if (!credentialSubject) {
      throw new Error('Credential subject is missing');
    }

    if (
      expectedPatientAddress &&
      credentialSubject.ethereumAddress?.toLowerCase() !==
        expectedPatientAddress.toLowerCase()
    ) {
      throw new Error(
        'Credential does not belong to the expected patient address'
      );
    }

    const currentTime = Math.floor(Date.now() / 1000);

    if (payload.nbf && currentTime < payload.nbf) {
      throw new Error('Credential is not active yet');
    }

    if (payload.exp && currentTime >= payload.exp) {
      throw new Error('Credential has expired');
    }

    return {
      valid: true,
      payload,
      issuer: payload.iss,
      signer: verification.signer,
      didResolutionResult: verification.didResolutionResult
    };
  } catch (error) {
    console.error('Credential verification failed:', error);

    return {
      valid: false,
      error: error.message || 'Credential verification failed'
    };
  }
};

/**
 * Compatibility function used by the existing PatientPage.
 *
 * It is now asynchronous because real signature verification
 * requires DID resolution.
 */
export const hasValidVC = async (
  token,
  expectedPatientAddress = null,
  expectedIssuer = null
) => {
  const result = await verifyCredential(
    token,
    expectedPatientAddress,
    expectedIssuer
  );

  return result.valid;
};