import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { dataAccessV2ABI } from '../contracts/dataAccessV2ABI';
import { antiResaleABI } from '../contracts/antiResaleABI';

import {
  generateRealProof,
  checkEligibility
} from '../utils/proofGenerator';

import { fetchFromIPFS } from '../utils/ipfs';
import { verifyCredential } from '../utils/did';

import {
  getOrCreateResearcherEncryptionIdentity,
  decryptJsonForResearcher,
  isEncryptedMedicalRecord
} from '../utils/encryption';

const DATA_ACCESS_V2 =
  process.env.REACT_APP_DATA_ACCESS_V2;

const ANTI_RESALE =
  process.env.REACT_APP_ANTI_RESALE;

const AUDITOR_ADDRESS =
  process.env.REACT_APP_AUDITOR_ADDRESS;

/*
 * This spelling is preserved because it matches
 * the variable currently used in your project.
 */
const HOSPITAL_ADDRESS =
  process.env.REACT_APP_HOSPTIAL_ADDRESS;

const normalizeAddress = (address) =>
  typeof address === 'string'
    ? address.toLowerCase()
    : '';

const readStoredArray = (key) => {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(key) || '[]'
    );

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.error(
      `Could not read localStorage key "${key}":`,
      error
    );

    return [];
  }
};

const cardStyle = {
  border: '1px solid #ccc',
  padding: '20px',
  borderRadius: '10px',
  marginBottom: '20px',
  background: 'white'
};

const primaryButtonStyle = {
  padding: '10px 20px',
  background: '#667eea',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontWeight: 'bold'
};

function ResearcherPage({ signer, account }) {
  const [minAge, setMinAge] = useState(30);
  const [maxAge, setMaxAge] = useState(70);

  const [
    selectedDiagnoses,
    setSelectedDiagnoses
  ] = useState([1920]);

  const [labMin, setLabMin] = useState(70);
  const [labMax, setLabMax] = useState(120);

  const [
    eligiblePatients,
    setEligiblePatients
  ] = useState([]);

  const [
    pendingRequests,
    setPendingRequests
  ] = useState([]);

  const [
    grantedAccess,
    setGrantedAccess
  ] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [tokenId, setTokenId] =
    useState('');

  const [
    accessedPatientAddress,
    setAccessedPatientAddress
  ] = useState('');

  const [ipfsData, setIpfsData] =
    useState(null);

  const [
    currentIpfsHash,
    setCurrentIpfsHash
  ] = useState('');

  const [
    encryptionIdentityReady,
    setEncryptionIdentityReady
  ] = useState(false);

  const availableDiagnoses = [
    {
      code: 1920,
      name: 'Test Diagnosis'
    },
    {
      code: 16096,
      name: 'Hypertension'
    },
    {
      code: 59621,
      name: 'Chronic Kidney Disease'
    },
    {
      code: 40055,
      name: 'Type 2 Diabetes'
    },
    {
      code: 22429,
      name: 'Asthma'
    },
    {
      code: 10509,
      name: 'Allergic Rhinitis'
    },
    {
      code: 12861,
      name: 'GERD'
    }
  ];

  /*
   * Automatically create or load the researcher's
   * ECDH encryption identity.
   */
  useEffect(() => {
    let cancelled = false;

    const prepareEncryptionIdentity =
      async () => {
        if (!account) {
          setEncryptionIdentityReady(
            false
          );

          return;
        }

        try {
          const identity =
            await getOrCreateResearcherEncryptionIdentity(
              account
            );

          if (!cancelled) {
            setEncryptionIdentityReady(
              Boolean(
                identity?.publicKeyJwk &&
                identity?.privateKeyJwk
              )
            );
          }

          console.log(
            'Researcher encryption identity ready:',
            identity.publicKeyJwk
          );
        } catch (error) {
          console.error(
            'Could not prepare researcher encryption identity:',
            error
          );

          if (!cancelled) {
            setEncryptionIdentityReady(
              false
            );

            setMessage(
              `❌ Encryption identity error: ${error.message}`
            );
          }
        }
      };

    prepareEncryptionIdentity();

    return () => {
      cancelled = true;
    };
  }, [account]);

  /*
   * Load previously saved researcher state.
   */
  useEffect(() => {
    if (!account) {
      setGrantedAccess([]);
      setTokenId('');
      setAccessedPatientAddress('');
      setCurrentIpfsHash('');
      setIpfsData(null);
      return;
    }

    try {
      const researcherAddress =
        normalizeAddress(account);

      const savedGrants =
        localStorage.getItem(
          `researcher_grants_${researcherAddress}`
        );

      if (savedGrants) {
        const parsedGrants =
          JSON.parse(savedGrants);

        if (
          Array.isArray(parsedGrants)
        ) {
          /*
           * Only load grants that point to
           * encrypted IPFS records.
           */
          setGrantedAccess(
            parsedGrants.filter(
              (grant) =>
                grant?.encrypted === true
            )
          );
        }
      }

      const savedToken =
        localStorage.getItem(
          `researcher_token_${researcherAddress}`
        );

      if (savedToken) {
        setTokenId(savedToken);
      }

      const savedPatient =
        localStorage.getItem(
          `researcher_patient_${researcherAddress}`
        );

      if (savedPatient) {
        setAccessedPatientAddress(
          savedPatient
        );
      }

      const savedIpfsHash =
        localStorage.getItem(
          `researcher_ipfs_${researcherAddress}`
        );

      if (savedIpfsHash) {
        setCurrentIpfsHash(
          savedIpfsHash
        );
      }
    } catch (error) {
      console.error(
        'Could not load researcher state:',
        error
      );
    }
  }, [account]);

  useEffect(() => {
    if (!account) {
      return;
    }

    localStorage.setItem(
      `researcher_grants_${normalizeAddress(
        account
      )}`,
      JSON.stringify(grantedAccess)
    );
  }, [grantedAccess, account]);

  useEffect(() => {
    if (!account || !tokenId) {
      return;
    }

    localStorage.setItem(
      `researcher_token_${normalizeAddress(
        account
      )}`,
      tokenId
    );
  }, [tokenId, account]);

  useEffect(() => {
    if (
      !account ||
      !accessedPatientAddress
    ) {
      return;
    }

    localStorage.setItem(
      `researcher_patient_${normalizeAddress(
        account
      )}`,
      accessedPatientAddress
    );
  }, [
    accessedPatientAddress,
    account
  ]);

  useEffect(() => {
    if (
      !account ||
      !currentIpfsHash
    ) {
      return;
    }

    localStorage.setItem(
      `researcher_ipfs_${normalizeAddress(
        account
      )}`,
      currentIpfsHash
    );
  }, [currentIpfsHash, account]);

  /*
   * Automatically check for newly approved,
   * encrypted patient consents.
   */
  useEffect(() => {
    if (!account) {
      return undefined;
    }

    const checkApprovals = () => {
      try {
        const approvals =
          readStoredArray(
            'patientApprovals'
          );

        const researcherAddress =
          normalizeAddress(account);

        const myNewApprovals =
          approvals.filter(
            (approval) =>
              normalizeAddress(
                approval
                  ?.researcherAddress
              ) === researcherAddress &&
              approval?.encrypted === true &&
              !approval?.processed
          );

        if (
          myNewApprovals.length === 0
        ) {
          return;
        }

        setGrantedAccess(
          (previousGrants) => {
            const grantMap =
              new Map(
                previousGrants.map(
                  (grant) => [
                    grant.consentId,
                    grant
                  ]
                )
              );

            myNewApprovals.forEach(
              (approval) => {
                grantMap.set(
                  approval.consentId,
                  approval
                );
              }
            );

            return Array.from(
              grantMap.values()
            );
          }
        );

        const newConsentIds =
          new Set(
            myNewApprovals.map(
              (approval) =>
                approval.consentId
            )
          );

        const updatedApprovals =
          approvals.map(
            (approval) =>
              newConsentIds.has(
                approval.consentId
              )
                ? {
                    ...approval,
                    processed: true
                  }
                : approval
          );

        localStorage.setItem(
          'patientApprovals',
          JSON.stringify(
            updatedApprovals
          )
        );

        setMessage(
          `✅ Received ${myNewApprovals.length} new encrypted patient approval(s).`
        );
      } catch (error) {
        console.error(
          'Could not check encrypted approvals:',
          error
        );
      }
    };

    checkApprovals();

    const interval =
      setInterval(
        checkApprovals,
        2000
      );

    return () =>
      clearInterval(interval);
  }, [account]);

  const handleDiagnosisToggle = (
    code
  ) => {
    if (
      selectedDiagnoses.includes(code)
    ) {
      setSelectedDiagnoses(
        selectedDiagnoses.filter(
          (diagnosis) =>
            diagnosis !== code
        )
      );
    } else {
      setSelectedDiagnoses([
        ...selectedDiagnoses,
        code
      ]);
    }
  };

  /*
   * Load and verify every stored patient VC.
   */
  const loadAllPatients = async () => {
    const trustedHospitalDID =
      localStorage.getItem(
        'hospital_did'
      );

    if (!trustedHospitalDID) {
      throw new Error(
        'Trusted hospital DID is not registered in this browser'
      );
    }

    const credentialEntries = [];

    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {
      const key =
        localStorage.key(index);

      if (
        key &&
        key.startsWith('vc_')
      ) {
        const address =
          key.substring(3);

        const jwt =
          localStorage.getItem(key);

        if (jwt) {
          credentialEntries.push({
            address,
            jwt
          });
        }
      }
    }

    const verificationResults =
      await Promise.all(
        credentialEntries.map(
          async ({
            address,
            jwt
          }) => {
            const result =
              await verifyCredential(
                jwt,
                address,
                trustedHospitalDID
              );

            if (!result.valid) {
              console.warn(
                `Rejected credential for ${address}:`,
                result.error
              );

              return null;
            }

            const credentialSubject =
              result.payload
                ?.credentialSubject ||
              result.payload?.vc
                ?.credentialSubject;

            if (!credentialSubject) {
              return null;
            }

            return {
              address,
              data:
                credentialSubject,
              issuer:
                result.issuer
            };
          }
        )
      );

    return verificationResults.filter(
      Boolean
    );
  };

  const findEligiblePatients =
    async () => {
      setLoading(true);
      setEligiblePatients([]);

      setMessage(
        '🔐 Verifying signed patient credentials before discovery...'
      );

      try {
        const allPatients =
          await loadAllPatients();

        const query = {
          minAge,
          maxAge,
          allowedDiagnoses:
            selectedDiagnoses,
          labMin,
          labMax
        };

        const eligible =
          allPatients
            .filter((patient) =>
              checkEligibility(
                patient.data,
                query
              )
            )
            .map((patient) => ({
              address:
                patient.address
            }));

        setEligiblePatients(
          eligible
        );

        setMessage(
          `✅ Verified ${allPatients.length} signed credential(s). Found ${eligible.length} eligible patient(s).`
        );
      } catch (error) {
        console.error(
          'Patient discovery error:',
          error
        );

        setMessage(
          `❌ Patient discovery failed: ${error.message}`
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * Create a request only after ensuring the
   * researcher encryption key exists.
   */
  const requestPatientAccess =
    async (patientAddress) => {
      if (!account) {
        setMessage(
          '❌ Researcher wallet is not connected.'
        );

        return;
      }

      setLoading(true);

      try {
        await getOrCreateResearcherEncryptionIdentity(
          account
        );

        const request = {
          id: Date.now(),
          patientAddress,
          researcherAddress:
            account,
          query: {
            minAge,
            maxAge,
            allowedDiagnoses:
              selectedDiagnoses,
            labMin,
            labMax
          },
          encryptionRequired:
            true,
          requestedEncryption:
            'AES-256-GCM',
          timestamp:
            Date.now()
        };

        const requests =
          readStoredArray(
            'pendingRequests'
          );

        requests.push(request);

        localStorage.setItem(
          'pendingRequests',
          JSON.stringify(requests)
        );

        setPendingRequests(
          (previousRequests) => [
            ...previousRequests,
            request
          ]
        );

        setMessage(
          `✅ Encrypted access request sent to patient ${patientAddress}`
        );
      } catch (error) {
        console.error(
          'Could not create encrypted access request:',
          error
        );

        setMessage(
          `❌ Request failed: ${error.message}`
        );
      } finally {
        setLoading(false);
      }
    };

  const verifyPatientVC =
    async (patientAddress) => {
      setLoading(true);

      setMessage(
        '🔐 Verifying the patient credential signature...'
      );

      try {
        const key =
          `vc_${normalizeAddress(
            patientAddress
          )}`;

        const jwt =
          localStorage.getItem(key);

        const trustedHospitalDID =
          localStorage.getItem(
            'hospital_did'
          );

        if (!jwt) {
          throw new Error(
            'No verifiable credential found for this patient'
          );
        }

        if (!trustedHospitalDID) {
          throw new Error(
            'Trusted hospital DID is not registered'
          );
        }

        const result =
          await verifyCredential(
            jwt,
            patientAddress,
            trustedHospitalDID
          );

        if (!result.valid) {
          throw new Error(
            result.error ||
            'Invalid credential signature'
          );
        }

        const issuedAt =
          result.payload?.iat
            ? new Date(
                result.payload.iat *
                  1000
              ).toLocaleString()
            : 'Unknown';

        setMessage(
          `✅ Ed25519 signature valid. Issuer: ${result.issuer.slice(
            0,
            28
          )}... Issued: ${issuedAt}`
        );
      } catch (error) {
        console.error(
          'VC verification error:',
          error
        );

        setMessage(
          `❌ Credential verification failed: ${error.message}`
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * Verify VC, generate ZK proof and mint token.
   */
  const accessGrantedData =
    async (grant) => {
      if (!signer) {
        setMessage(
          '❌ No signer found. Reconnect MetaMask.'
        );

        return;
      }

      if (
        grant?.encrypted !== true
      ) {
        setMessage(
          '❌ This approval does not point to an encrypted IPFS record.'
        );

        return;
      }

      if (!grant?.ipfsHash) {
        setMessage(
          '❌ Encrypted approval does not contain an IPFS hash.'
        );

        return;
      }

      setLoading(true);
      setIpfsData(null);

      setMessage(
        '🔐 Verifying credential and generating real ZK proof...'
      );

      try {
        if (!DATA_ACCESS_V2) {
          throw new Error(
            'REACT_APP_DATA_ACCESS_V2 is missing'
          );
        }

        const vcKey =
          `vc_${normalizeAddress(
            grant.patientAddress
          )}`;

        const vcJwt =
          localStorage.getItem(
            vcKey
          );

        if (!vcJwt) {
          throw new Error(
            'Patient verifiable credential was not found'
          );
        }

        const trustedHospitalDID =
          localStorage.getItem(
            'hospital_did'
          );

        if (!trustedHospitalDID) {
          throw new Error(
            'Trusted hospital DID is not registered'
          );
        }

        const verificationResult =
          await verifyCredential(
            vcJwt,
            grant.patientAddress,
            trustedHospitalDID
          );

        if (
          !verificationResult.valid
        ) {
          throw new Error(
            verificationResult.error ||
            'Patient credential signature verification failed'
          );
        }

        const patientData =
          verificationResult.payload
            ?.credentialSubject ||
          verificationResult.payload
            ?.vc?.credentialSubject;

        if (!patientData) {
          throw new Error(
            'Verified credential does not contain patient data'
          );
        }

        if (
          !checkEligibility(
            patientData,
            grant.query
          )
        ) {
          throw new Error(
            'Patient no longer meets the research criteria'
          );
        }

        const proof =
          await generateRealProof(
            patientData,
            grant.query
          );

        setMessage(
          '✅ Proof generated. Submitting it to the blockchain...'
        );

        const contract =
          new ethers.Contract(
            DATA_ACCESS_V2,
            dataAccessV2ABI,
            signer
          );

        const tokenURI =
          grant.metadataURI ||
          `ipfs://${grant.ipfsHash}`;

        const validity = 86400;

        const transaction =
          await contract.requestAccessWithZK(
            grant.consentId,
            proof.a,
            proof.b,
            proof.c,
            proof.inputs,
            tokenURI,
            validity
          );

        setMessage(
          '⏳ Waiting for blockchain confirmation...'
        );

        const receipt =
          await transaction.wait();

        const event =
          receipt.events?.find(
            (receiptEvent) =>
              receiptEvent.event ===
              'AccessGranted'
          );

        if (!event) {
          throw new Error(
            'AccessGranted event was not found'
          );
        }

        const newTokenId =
          event.args.tokenId.toString();

        setTokenId(newTokenId);

        setAccessedPatientAddress(
          grant.patientAddress
        );

        setCurrentIpfsHash(
          grant.ipfsHash
        );

        setMessage(
          `✅ ZK proof verified and access token ${newTokenId} minted.`
        );

        setGrantedAccess(
          (previousGrants) =>
            previousGrants.filter(
              (storedGrant) =>
                storedGrant.consentId !==
                grant.consentId
            )
        );
      } catch (error) {
        console.error(
          'Proof and token error:',
          error
        );

        const readableError =
          error?.error?.message ||
          error?.data?.message ||
          error?.reason ||
          error?.message ||
          'Unknown proof error';

        setMessage(
          `❌ Error: ${readableError}`
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * Use token, send payment, fetch encrypted data,
   * then decrypt it with the connected researcher's
   * private ECDH key.
   */
  const useToken = async () => {
    if (
      !signer ||
      !account ||
      !tokenId ||
      !accessedPatientAddress ||
      !currentIpfsHash
    ) {
      setMessage(
        '❌ Missing signer, token, patient address, or IPFS hash.'
      );

      return;
    }

    setLoading(true);
    setIpfsData(null);

    try {
      if (!ANTI_RESALE) {
        throw new Error(
          'REACT_APP_ANTI_RESALE is missing'
        );
      }

      if (!HOSPITAL_ADDRESS) {
        throw new Error(
          'REACT_APP_HOSPTIAL_ADDRESS is missing'
        );
      }

      if (!AUDITOR_ADDRESS) {
        throw new Error(
          'REACT_APP_AUDITOR_ADDRESS is missing'
        );
      }

      /*
       * Fetch the public encrypted envelope first.
       * No plaintext is available at this stage.
       */
      setMessage(
        '⏳ Fetching the encrypted medical-record envelope from IPFS...'
      );

      const encryptedEnvelope =
        await fetchFromIPFS(
          currentIpfsHash
        );

      if (
        !isEncryptedMedicalRecord(
          encryptedEnvelope
        )
      ) {
        throw new Error(
          'The IPFS payload is not a supported encrypted medical record'
        );
      }

      if (
        normalizeAddress(
          encryptedEnvelope
            .recipientAddress
        ) !==
        normalizeAddress(account)
      ) {
        throw new Error(
          'The encrypted record was created for a different researcher'
        );
      }

      console.log(
        'Encrypted IPFS envelope:',
        encryptedEnvelope
      );

      console.log(
        'Plain patient text visible in IPFS ciphertext:',
        encryptedEnvelope.ciphertext.includes(
          'Patient'
        )
      );

      /*
       * Enforce single-use access token.
       */
      setMessage(
        '⏳ Using the single-use anti-resale token...'
      );

      const contract =
        new ethers.Contract(
          ANTI_RESALE,
          antiResaleABI,
          signer
        );

      const tokenTransaction =
        await contract.useTokenWithAntiResale(
          tokenId
        );

      await tokenTransaction.wait();

      setMessage(
        '✅ Token accepted. Sending three-way payment...'
      );

      const patientAmount =
        ethers.utils.parseEther(
          '0.000007'
        );

      const hospitalAmount =
        ethers.utils.parseEther(
          '0.000002'
        );

      const platformAmount =
        ethers.utils.parseEther(
          '0.000001'
        );

      const patientPayment =
        await signer.sendTransaction({
          to:
            accessedPatientAddress,
          value:
            patientAmount
        });

      await patientPayment.wait();

      const hospitalPayment =
        await signer.sendTransaction({
          to:
            HOSPITAL_ADDRESS,
          value:
            hospitalAmount
        });

      await hospitalPayment.wait();

      const platformPayment =
        await signer.sendTransaction({
          to:
            AUDITOR_ADDRESS,
          value:
            platformAmount
        });

      await platformPayment.wait();

      const paymentRecord = {
        patientAddress:
          accessedPatientAddress,

        hospitalAddress:
          HOSPITAL_ADDRESS,

        researcherAddress:
          account,

        totalAmount:
          '0.00001',

        patientAmount:
          '0.000007',

        hospitalAmount:
          '0.000002',

        platformAmount:
          '0.000001',

        encryptedAccess:
          true,

        ipfsHash:
          currentIpfsHash,

        tokenId,

        timestamp:
          Date.now()
      };

      const payments =
        readStoredArray(
          'payments'
        );

      payments.push(
        paymentRecord
      );

      localStorage.setItem(
        'payments',
        JSON.stringify(payments)
      );

      /*
       * Decrypt only after token use and payment.
       */
      setMessage(
        '🔐 Payment completed. Decrypting the AES-256-GCM medical record...'
      );

      const decryptedData =
        await decryptJsonForResearcher(
          encryptedEnvelope,
          account
        );

      setIpfsData(
        decryptedData
      );

      setMessage(
        '✅ Encrypted IPFS record decrypted successfully. Payment split: 70% Patient, 20% Hospital, 10% Platform.'
      );
    } catch (error) {
      console.error(
        'Encrypted token access error:',
        error
      );

      const readableError =
        error?.error?.message ||
        error?.data?.message ||
        error?.reason ||
        error?.message ||
        'Encrypted access failed';

      setMessage(
        `❌ Error: ${readableError}`
      );
    } finally {
      setLoading(false);
    }
  };

  const checkForApprovals = () => {
    try {
      const approvals =
        readStoredArray(
          'patientApprovals'
        );

      const researcherAddress =
        normalizeAddress(account);

      const encryptedApprovals =
        approvals.filter(
          (approval) =>
            normalizeAddress(
              approval
                ?.researcherAddress
            ) === researcherAddress &&
            approval?.encrypted === true
        );

      setGrantedAccess(
        (previousGrants) => {
          const grantMap =
            new Map(
              previousGrants.map(
                (grant) => [
                  grant.consentId,
                  grant
                ]
              )
            );

          encryptedApprovals.forEach(
            (approval) => {
              grantMap.set(
                approval.consentId,
                approval
              );
            }
          );

          return Array.from(
            grantMap.values()
          );
        }
      );

      setMessage(
        `✅ Found ${encryptedApprovals.length} encrypted patient approval(s).`
      );
    } catch (error) {
      console.error(
        'Approval check error:',
        error
      );

      setMessage(
        `❌ Could not check approvals: ${error.message}`
      );
    }
  };

  const messageStyle = {
    padding: '12px',

    background:
      message.includes('✅')
        ? '#d4edda'
        : message.includes('❌')
          ? '#f8d7da'
          : '#fff3cd',

    border: '1px solid',

    borderColor:
      message.includes('✅')
        ? '#c3e6cb'
        : message.includes('❌')
          ? '#f5c6cb'
          : '#ffeeba',

    borderRadius: '6px',
    marginBottom: '20px'
  };

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}
    >
      <h2
        style={{
          marginBottom: '10px'
        }}
      >
        🔬 Researcher Dashboard
      </h2>

      <div
        style={{
          padding: '10px 14px',
          marginBottom: '20px',
          borderRadius: '6px',
          background:
            encryptionIdentityReady
              ? '#d4edda'
              : '#fff3cd',
          border:
            encryptionIdentityReady
              ? '1px solid #c3e6cb'
              : '1px solid #ffeeba'
        }}
      >
        {encryptionIdentityReady
          ? '🔐 Researcher encryption identity ready — ECDH P-256 / AES-256-GCM'
          : '⏳ Preparing researcher encryption identity...'}
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>
          1. Define Research Criteria
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              '1fr 1fr',
            gap: '20px'
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold'
              }}
            >
              Age Range
            </label>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '15px'
              }}
            >
              <input
                type="number"
                value={minAge}
                onChange={(event) =>
                  setMinAge(
                    Number(
                      event.target.value
                    )
                  )
                }
                style={{
                  width: '90px',
                  padding: '7px'
                }}
              />

              <span>to</span>

              <input
                type="number"
                value={maxAge}
                onChange={(event) =>
                  setMaxAge(
                    Number(
                      event.target.value
                    )
                  )
                }
                style={{
                  width: '90px',
                  padding: '7px'
                }}
              />
            </div>

            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold'
              }}
            >
              Lab Range
            </label>

            <div
              style={{
                display: 'flex',
                gap: '10px'
              }}
            >
              <input
                type="number"
                value={labMin}
                onChange={(event) =>
                  setLabMin(
                    Number(
                      event.target.value
                    )
                  )
                }
                style={{
                  width: '90px',
                  padding: '7px'
                }}
              />

              <span>to</span>

              <input
                type="number"
                value={labMax}
                onChange={(event) =>
                  setLabMax(
                    Number(
                      event.target.value
                    )
                  )
                }
                style={{
                  width: '90px',
                  padding: '7px'
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold'
              }}
            >
              Diagnoses
            </label>

            <div
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
                border:
                  '1px solid #ddd',
                padding: '10px',
                borderRadius: '5px',
                background: '#f9f9f9'
              }}
            >
              {availableDiagnoses.map(
                (diagnosis) => (
                  <label
                    key={
                      diagnosis.code
                    }
                    style={{
                      display: 'block',
                      marginBottom:
                        '7px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDiagnoses.includes(
                        diagnosis.code
                      )}
                      onChange={() =>
                        handleDiagnosisToggle(
                          diagnosis.code
                        )
                      }
                    />{' '}
                    {diagnosis.name}{' '}
                    ({diagnosis.code})
                  </label>
                )
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginTop: '20px'
          }}
        >
          <button
            type="button"
            onClick={
              findEligiblePatients
            }
            disabled={loading}
            style={{
              ...primaryButtonStyle,
              cursor: loading
                ? 'not-allowed'
                : 'pointer',
              opacity: loading
                ? 0.6
                : 1
            }}
          >
            {loading
              ? 'Processing...'
              : 'Find Eligible Patients'}
          </button>

          <button
            type="button"
            onClick={
              checkForApprovals
            }
            disabled={loading}
            style={{
              ...primaryButtonStyle,
              background: '#17a2b8',
              cursor: loading
                ? 'not-allowed'
                : 'pointer'
            }}
          >
            Check Encrypted Approvals
          </button>
        </div>
      </div>

      {eligiblePatients.length >
        0 && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>
            2. Eligible Patients
          </h3>

          <p>
            Only wallet addresses are
            shown. Medical attributes
            remain hidden.
          </p>

          {eligiblePatients.map(
            (patient) => {
              const requestPending =
                pendingRequests.some(
                  (request) =>
                    normalizeAddress(
                      request
                        .patientAddress
                    ) ===
                    normalizeAddress(
                      patient.address
                    )
                );

              return (
                <div
                  key={
                    patient.address
                  }
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems:
                      'center',
                    padding:
                      '12px 0',
                    borderBottom:
                      '1px solid #eee'
                  }}
                >
                  <code>
                    {patient.address}
                  </code>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px'
                    }}
                  >
                    <button
                      type="button"
                      disabled={
                        loading ||
                        requestPending ||
                        !encryptionIdentityReady
                      }
                      onClick={() =>
                        requestPatientAccess(
                          patient.address
                        )
                      }
                      style={{
                        padding:
                          '7px 14px',
                        background:
                          requestPending
                            ? '#999'
                            : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius:
                          '5px',
                        cursor:
                          requestPending
                            ? 'not-allowed'
                            : 'pointer'
                      }}
                    >
                      {requestPending
                        ? 'Request Pending'
                        : 'Request Encrypted Access'}
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        verifyPatientVC(
                          patient.address
                        )
                      }
                      style={{
                        padding:
                          '7px 14px',
                        background:
                          '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius:
                          '5px'
                      }}
                    >
                      Verify VC
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {pendingRequests.length >
        0 && (
        <div
          style={{
            ...cardStyle,
            background: '#fff3cd',
            border:
              '1px solid #ffc107'
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            ⏳ Waiting for Patient Approval
          </h3>

          {pendingRequests.map(
            (request) => (
              <p key={request.id}>
                Encrypted request sent to{' '}
                <code>
                  {
                    request.patientAddress
                  }
                </code>
              </p>
            )
          )}
        </div>
      )}

      {grantedAccess.length >
        0 && (
        <div
          style={{
            ...cardStyle,
            background: '#d4edda',
            border:
              '2px solid #28a745'
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            ✅ Encrypted Patient Approvals
          </h3>

          {grantedAccess.map(
            (grant) => (
              <div
                key={
                  grant.consentId
                }
                style={{
                  background: 'white',
                  padding: '15px',
                  borderRadius:
                    '7px',
                  marginBottom:
                    '12px'
                }}
              >
                <p>
                  <strong>
                    Patient:
                  </strong>{' '}
                  <code>
                    {
                      grant.patientAddress
                    }
                  </code>
                </p>

                <p>
                  <strong>
                    Consent ID:
                  </strong>{' '}
                  <code
                    style={{
                      wordBreak:
                        'break-all'
                    }}
                  >
                    {grant.consentId}
                  </code>
                </p>

                <p>
                  <strong>
                    IPFS hash:
                  </strong>{' '}
                  <code
                    style={{
                      wordBreak:
                        'break-all'
                    }}
                  >
                    {grant.ipfsHash}
                  </code>
                </p>

                <p>
                  <strong>
                    Encryption:
                  </strong>{' '}
                  {grant.contentEncryption ||
                    'AES-256-GCM'}
                </p>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    accessGrantedData(
                      grant
                    )
                  }
                  style={{
                    ...primaryButtonStyle,
                    background: '#28a745'
                  }}
                >
                  {loading
                    ? 'Processing...'
                    : 'Submit Proof & Get Token'}
                </button>
              </div>
            )
          )}
        </div>
      )}

      {tokenId && (
        <div
          style={{
            ...cardStyle,
            background: '#d1ecf1',
            border:
              '2px solid #17a2b8'
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            🎫 Access Token Minted
          </h3>

          <p>
            <strong>
              Token ID:
            </strong>{' '}
            {tokenId}
          </p>

          <p>
            The IPFS record remains
            encrypted until the token is
            used and payment succeeds.
          </p>

          <button
            type="button"
            disabled={loading}
            onClick={useToken}
            style={{
              ...primaryButtonStyle,
              background: '#17a2b8'
            }}
          >
            {loading
              ? 'Processing Encrypted Access...'
              : 'Use Token, Pay & Decrypt Data'}
          </button>
        </div>
      )}

      {ipfsData && (
        <div
          style={{
            ...cardStyle,
            border:
              '2px solid #6f42c1'
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            🔓 Decrypted Medical Record
          </h3>

          <p>
            This plaintext was recovered
            locally using the intended
            researcher’s private
            encryption key.
          </p>

          <pre
            style={{
              whiteSpace:
                'pre-wrap',
              wordBreak:
                'break-word',
              background:
                '#f8f9fa',
              padding: '15px',
              borderRadius:
                '6px',
              maxHeight:
                '500px',
              overflowY:
                'auto'
            }}
          >
            {JSON.stringify(
              ipfsData,
              null,
              2
            )}
          </pre>
        </div>
      )}

      {message && (
        <div style={messageStyle}>
          {message}
        </div>
      )}
    </div>
  );
}

export default ResearcherPage;