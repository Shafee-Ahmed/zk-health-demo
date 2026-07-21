/**
 * Hybrid encryption for medical records.
 *
 * Data encryption:
 * - AES-256-GCM
 *
 * Recipient key agreement:
 * - ECDH P-256
 *
 * AES key wrapping:
 * - AES-KW-256
 *
 * The medical record is encrypted with a unique AES key.
 * That AES key is then wrapped for the intended researcher.
 */

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

const RESEARCHER_IDENTITY_PREFIX =
  'researcher_encryption_identity_';

const RESEARCHER_PUBLIC_KEY_PREFIX =
  'researcher_public_key_';

const ENVELOPE_FORMAT =
  'zk-health-encrypted-record';

const ENVELOPE_VERSION = 1;

/**
 * Ensure the browser supports Web Crypto.
 */
const getCrypto = () => {
  if (!window.crypto?.subtle) {
    throw new Error(
      'Web Crypto API is not supported in this browser'
    );
  }

  return window.crypto;
};

/**
 * Normalize an Ethereum address.
 */
const normalizeAddress = (address) => {
  if (
    typeof address !== 'string' ||
    !address.trim()
  ) {
    throw new Error(
      'A valid researcher address is required'
    );
  }

  return address.trim().toLowerCase();
};

/**
 * Convert an ArrayBuffer or Uint8Array to Base64.
 */
const bytesToBase64 = (value) => {
  const bytes =
    value instanceof Uint8Array
      ? value
      : new Uint8Array(value);

  let binary = '';

  const chunkSize = 0x8000;

  for (
    let index = 0;
    index < bytes.length;
    index += chunkSize
  ) {
    const chunk = bytes.subarray(
      index,
      index + chunkSize
    );

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

/**
 * Convert Base64 back to Uint8Array.
 */
const base64ToBytes = (value) => {
  if (
    typeof value !== 'string' ||
    !value
  ) {
    throw new Error(
      'Invalid Base64 value'
    );
  }

  const binary = atob(value);

  const bytes = new Uint8Array(
    binary.length
  );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(index);
  }

  return bytes;
};

/**
 * Generate a researcher encryption key pair.
 *
 * The public key is shared with patients.
 * The private key remains associated with the researcher.
 */
export const generateResearcherEncryptionIdentity =
  async (researcherAddress) => {
    const cryptoApi = getCrypto();

    const normalizedAddress =
      normalizeAddress(researcherAddress);

    const keyPair =
      await cryptoApi.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        ['deriveKey', 'deriveBits']
      );

    const publicKeyJwk =
      await cryptoApi.subtle.exportKey(
        'jwk',
        keyPair.publicKey
      );

    const privateKeyJwk =
      await cryptoApi.subtle.exportKey(
        'jwk',
        keyPair.privateKey
      );

    const identity = {
      researcherAddress:
        normalizedAddress,
      algorithm: 'ECDH-P256',
      publicKeyJwk,
      privateKeyJwk,
      createdAt:
        new Date().toISOString()
    };

    localStorage.setItem(
      `${RESEARCHER_IDENTITY_PREFIX}${normalizedAddress}`,
      JSON.stringify(identity)
    );

    /*
     * Public registry used by the patient
     * when encrypting data for this researcher.
     */
    localStorage.setItem(
      `${RESEARCHER_PUBLIC_KEY_PREFIX}${normalizedAddress}`,
      JSON.stringify({
        researcherAddress:
          normalizedAddress,
        algorithm: 'ECDH-P256',
        publicKeyJwk,
        createdAt:
          identity.createdAt
      })
    );

    return identity;
  };

/**
 * Return the existing researcher encryption identity,
 * or create one when none exists.
 */
export const getOrCreateResearcherEncryptionIdentity =
  async (researcherAddress) => {
    const normalizedAddress =
      normalizeAddress(researcherAddress);

    const storageKey =
      `${RESEARCHER_IDENTITY_PREFIX}${normalizedAddress}`;

    const storedIdentity =
      localStorage.getItem(storageKey);

    if (storedIdentity) {
      try {
        const parsed =
          JSON.parse(storedIdentity);

        if (
          parsed.publicKeyJwk &&
          parsed.privateKeyJwk
        ) {
          return parsed;
        }
      } catch (error) {
        console.warn(
          'Stored encryption identity is invalid. Generating a new one.',
          error
        );
      }
    }

    return generateResearcherEncryptionIdentity(
      normalizedAddress
    );
  };

/**
 * Get only the researcher's public encryption key.
 */
export const getResearcherPublicEncryptionKey = (
  researcherAddress
) => {
  const normalizedAddress =
    normalizeAddress(researcherAddress);

  const storedPublicKey =
    localStorage.getItem(
      `${RESEARCHER_PUBLIC_KEY_PREFIX}${normalizedAddress}`
    );

  if (!storedPublicKey) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(storedPublicKey);

    if (!parsed.publicKeyJwk) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(
      'Could not read researcher public key:',
      error
    );

    return null;
  }
};

/**
 * Import an ECDH public key.
 */
const importEcdhPublicKey = async (
  publicKeyJwk
) => {
  const cryptoApi = getCrypto();

  return cryptoApi.subtle.importKey(
    'jwk',
    publicKeyJwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    false,
    []
  );
};

/**
 * Import an ECDH private key.
 */
const importEcdhPrivateKey = async (
  privateKeyJwk
) => {
  const cryptoApi = getCrypto();

  return cryptoApi.subtle.importKey(
    'jwk',
    privateKeyJwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    false,
    ['deriveKey']
  );
};

/**
 * Encrypt a JSON medical record for one researcher.
 */
export const encryptJsonForResearcher =
  async (
    data,
    researcherAddress
  ) => {
    const cryptoApi = getCrypto();

    const normalizedAddress =
      normalizeAddress(researcherAddress);

    const researcherPublicRecord =
      getResearcherPublicEncryptionKey(
        normalizedAddress
      );

    if (!researcherPublicRecord) {
      throw new Error(
        'Researcher encryption public key is not registered'
      );
    }

    const recipientPublicKey =
      await importEcdhPublicKey(
        researcherPublicRecord.publicKeyJwk
      );

    /*
     * Generate a unique AES-256 key
     * for this individual medical record.
     */
    const dataEncryptionKey =
      await cryptoApi.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

    /*
     * Generate an ephemeral ECDH key pair.
     * A new pair is used for every encrypted record.
     */
    const ephemeralKeyPair =
      await cryptoApi.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        ['deriveKey', 'deriveBits']
      );

    /*
     * Derive an AES-KW wrapping key using:
     * ephemeral private key + researcher public key.
     */
    const wrappingKey =
      await cryptoApi.subtle.deriveKey(
        {
          name: 'ECDH',
          public: recipientPublicKey
        },
        ephemeralKeyPair.privateKey,
        {
          name: 'AES-KW',
          length: 256
        },
        false,
        ['wrapKey']
      );

    /*
     * Wrap the unique medical-record AES key.
     */
    const wrappedDataKey =
      await cryptoApi.subtle.wrapKey(
        'raw',
        dataEncryptionKey,
        wrappingKey,
        'AES-KW'
      );

    const iv =
      cryptoApi.getRandomValues(
        new Uint8Array(12)
      );

    const aadObject = {
      format: ENVELOPE_FORMAT,
      version: ENVELOPE_VERSION,
      recipientAddress:
        normalizedAddress
    };

    const aadBytes =
      TEXT_ENCODER.encode(
        JSON.stringify(aadObject)
      );

    const plaintext =
      TEXT_ENCODER.encode(
        JSON.stringify(data)
      );

    /*
     * AES-GCM encrypts the medical record and
     * automatically includes an authentication tag.
     */
    const ciphertext =
      await cryptoApi.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
          additionalData: aadBytes,
          tagLength: 128
        },
        dataEncryptionKey,
        plaintext
      );

    const ephemeralPublicKeyJwk =
      await cryptoApi.subtle.exportKey(
        'jwk',
        ephemeralKeyPair.publicKey
      );

    return {
      format: ENVELOPE_FORMAT,
      version: ENVELOPE_VERSION,

      contentEncryption:
        'AES-256-GCM',

      authenticationTagLength: 128,

      keyAgreement:
        'ECDH-P256',

      keyWrapping:
        'AES-KW-256',

      recipientAddress:
        normalizedAddress,

      iv: bytesToBase64(iv),

      aad: bytesToBase64(aadBytes),

      ciphertext:
        bytesToBase64(ciphertext),

      wrappedKey:
        bytesToBase64(wrappedDataKey),

      ephemeralPublicKey:
        ephemeralPublicKeyJwk,

      createdAt:
        new Date().toISOString()
    };
  };

/**
 * Decrypt an encrypted medical record using
 * the intended researcher's private key.
 */
export const decryptJsonForResearcher =
  async (
    encryptedEnvelope,
    researcherAddress
  ) => {
    const cryptoApi = getCrypto();

    const normalizedAddress =
      normalizeAddress(researcherAddress);

    if (
      !encryptedEnvelope ||
      encryptedEnvelope.format !==
        ENVELOPE_FORMAT ||
      encryptedEnvelope.version !==
        ENVELOPE_VERSION
    ) {
      throw new Error(
        'Unsupported encrypted medical-record format'
      );
    }

    if (
      normalizeAddress(
        encryptedEnvelope.recipientAddress
      ) !== normalizedAddress
    ) {
      throw new Error(
        'This encrypted record was not created for the connected researcher'
      );
    }

    const identityStorageKey =
      `${RESEARCHER_IDENTITY_PREFIX}${normalizedAddress}`;

    const storedIdentity =
      localStorage.getItem(
        identityStorageKey
      );

    if (!storedIdentity) {
      throw new Error(
        'Researcher private encryption key is unavailable'
      );
    }

    const identity =
      JSON.parse(storedIdentity);

    if (!identity.privateKeyJwk) {
      throw new Error(
        'Researcher private encryption key is missing'
      );
    }

    const recipientPrivateKey =
      await importEcdhPrivateKey(
        identity.privateKeyJwk
      );

    const ephemeralPublicKey =
      await importEcdhPublicKey(
        encryptedEnvelope.ephemeralPublicKey
      );

    /*
     * Recreate the same AES-KW key using:
     * researcher private key + ephemeral public key.
     */
    const unwrappingKey =
      await cryptoApi.subtle.deriveKey(
        {
          name: 'ECDH',
          public: ephemeralPublicKey
        },
        recipientPrivateKey,
        {
          name: 'AES-KW',
          length: 256
        },
        false,
        ['unwrapKey']
      );

    const dataEncryptionKey =
      await cryptoApi.subtle.unwrapKey(
        'raw',
        base64ToBytes(
          encryptedEnvelope.wrappedKey
        ),
        unwrappingKey,
        'AES-KW',
        {
          name: 'AES-GCM',
          length: 256
        },
        false,
        ['decrypt']
      );

    const plaintext =
      await cryptoApi.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: base64ToBytes(
            encryptedEnvelope.iv
          ),
          additionalData:
            base64ToBytes(
              encryptedEnvelope.aad
            ),
          tagLength: 128
        },
        dataEncryptionKey,
        base64ToBytes(
          encryptedEnvelope.ciphertext
        )
      );

    return JSON.parse(
      TEXT_DECODER.decode(plaintext)
    );
  };

/**
 * Determine whether an IPFS payload is encrypted.
 */
export const isEncryptedMedicalRecord = (
  payload
) =>
  Boolean(
    payload &&
      payload.format ===
        ENVELOPE_FORMAT &&
      payload.version ===
        ENVELOPE_VERSION &&
      payload.ciphertext &&
      payload.wrappedKey
  );