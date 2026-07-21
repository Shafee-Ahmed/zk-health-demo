import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { consentManagerABI } from '../contracts/consentManagerABI';
import { uploadToIPFS } from '../utils/ipfs';
import { verifyCredential } from '../utils/did';
import { encryptJsonForResearcher } from '../utils/encryption';
import diagnosisMap from '../utils/diagnosisMap';

const CONSENT_MANAGER_ADDRESS =
  process.env.REACT_APP_CONSENT_MANAGER;

const readStoredArray = (key) => {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || '[]'
    );

    return Array.isArray(value)
      ? value
      : [];
  } catch (error) {
    console.error(
      `Could not read localStorage key "${key}":`,
      error
    );

    return [];
  }
};

const normalizeAddress = (address) =>
  typeof address === 'string'
    ? address.toLowerCase()
    : '';

function PatientPage({ signer, account }) {
  const [vcData, setVcData] =
    useState(null);

  const [
    pendingRequests,
    setPendingRequests
  ] = useState([]);

  const [consentId, setConsentId] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [payments, setPayments] =
    useState([]);

  const [balance, setBalance] =
    useState('0');

  /*
   * Load and cryptographically verify
   * the connected patient's VC.
   */
  useEffect(() => {
    let cancelled = false;

    const loadAndVerifyCredential =
      async () => {
        if (!account) {
          setVcData(null);
          setMessage(
            'Please connect a patient wallet.'
          );

          return;
        }

        try {
          setVcData(null);

          setMessage(
            '🔐 Cryptographically verifying credential...'
          );

          const patientAddress =
            normalizeAddress(account);

          const credentialKey =
            `vc_${patientAddress}`;

          const storedCredential =
            localStorage.getItem(
              credentialKey
            );

          if (!storedCredential) {
            if (!cancelled) {
              setMessage(
                'No verifiable credential found. Please ask a hospital to issue one.'
              );
            }

            return;
          }

          const trustedHospitalDID =
            localStorage.getItem(
              'hospital_did'
            );

          if (!trustedHospitalDID) {
            throw new Error(
              'Trusted hospital DID is not registered in this browser'
            );
          }

          const verificationResult =
            await verifyCredential(
              storedCredential,
              account,
              trustedHospitalDID
            );

          if (cancelled) {
            return;
          }

          if (
            !verificationResult.valid
          ) {
            setVcData(null);

            setMessage(
              `❌ Credential verification failed: ${
                verificationResult.error ||
                'Invalid credential signature'
              }`
            );

            return;
          }

          const credentialSubject =
            verificationResult.payload
              ?.credentialSubject ||
            verificationResult.payload
              ?.vc?.credentialSubject;

          if (!credentialSubject) {
            throw new Error(
              'Credential subject is missing from the verified credential'
            );
          }

          setVcData(
            credentialSubject
          );

          const issuer =
            verificationResult.issuer ||
            verificationResult.payload
              ?.iss ||
            'Unknown issuer';

          setMessage(
            `✅ Credential signature verified. Issuer: ${issuer.slice(
              0,
              28
            )}...`
          );
        } catch (error) {
          console.error(
            'Credential verification error:',
            error
          );

          if (!cancelled) {
            setVcData(null);

            setMessage(
              `❌ Credential verification failed: ${
                error.message ||
                'Unknown verification error'
              }`
            );
          }
        }
      };

    loadAndVerifyCredential();

    return () => {
      cancelled = true;
    };
  }, [account]);

  /*
   * Load payments received by this patient.
   */
  useEffect(() => {
    if (!account) {
      setPayments([]);
      return;
    }

    const patientAddress =
      normalizeAddress(account);

    const allPayments =
      readStoredArray('payments');

    const patientPayments =
      allPayments.filter(
        (payment) =>
          normalizeAddress(
            payment?.patientAddress
          ) === patientAddress
      );

    setPayments(
      patientPayments
    );
  }, [account]);

  /*
   * Fetch the wallet balance.
   */
  useEffect(() => {
    let cancelled = false;

    const fetchBalance = async () => {
      if (
        !account ||
        !window.ethereum
      ) {
        if (!cancelled) {
          setBalance('0');
        }

        return;
      }

      try {
        const provider =
          new ethers.providers.Web3Provider(
            window.ethereum
          );

        const currentBalance =
          await provider.getBalance(
            account
          );

        if (!cancelled) {
          setBalance(
            ethers.utils.formatEther(
              currentBalance
            )
          );
        }
      } catch (error) {
        console.error(
          'Could not fetch wallet balance:',
          error
        );
      }
    };

    fetchBalance();

    const interval =
      setInterval(
        fetchBalance,
        10000
      );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [account]);

  /*
   * Check for researcher requests.
   */
  useEffect(() => {
    if (!account) {
      setPendingRequests([]);
      return undefined;
    }

    const patientAddress =
      normalizeAddress(account);

    const checkRequests = () => {
      const requests =
        readStoredArray(
          'pendingRequests'
        );

      const patientRequests =
        requests.filter(
          (request) =>
            normalizeAddress(
              request?.patientAddress
            ) === patientAddress &&
            !request?.responded
        );

      setPendingRequests(
        patientRequests
      );
    };

    checkRequests();

    const interval =
      setInterval(
        checkRequests,
        2000
      );

    return () =>
      clearInterval(interval);
  }, [account]);

  /*
   * Approve request:
   *
   * 1. Build patient record
   * 2. Encrypt record for researcher
   * 3. Upload encrypted envelope to IPFS
   * 4. Create blockchain consent
   */
  const approveRequest = async (
    request
  ) => {
    if (!signer) {
      setMessage(
        '❌ Wallet signer is unavailable. Reconnect MetaMask.'
      );

      return;
    }

    if (!vcData) {
      setMessage(
        '❌ A cryptographically verified credential is required.'
      );

      return;
    }

    if (
      !request?.researcherAddress
    ) {
      setMessage(
        '❌ Researcher address is missing from the request.'
      );

      return;
    }

    setLoading(true);
    setMessage('');

    try {
      if (
        !CONSENT_MANAGER_ADDRESS
      ) {
        throw new Error(
          'REACT_APP_CONSENT_MANAGER is missing from the environment configuration'
        );
      }

      if (!request?.query) {
        throw new Error(
          'The researcher request does not contain query criteria'
        );
      }

      const query =
        request.query;

      const allowedDiagnoses =
        Array.isArray(
          query.allowedDiagnoses
        )
          ? query.allowedDiagnoses
          : [];

      const patientAge =
        Number(vcData.age);

      const patientLab =
        Number(vcData.lab);

      const patientDiagnosis =
        vcData.diagnosis;

      if (
        !Number.isFinite(
          patientAge
        )
      ) {
        throw new Error(
          'The verified credential contains an invalid age'
        );
      }

      if (
        !Number.isFinite(
          patientLab
        )
      ) {
        throw new Error(
          'The verified credential contains an invalid lab value'
        );
      }

      const patientRecord = {
        profile: {
          name: 'Patient',
          age: patientAge,
          gender: 'Unknown',
          bloodType: 'Unknown'
        },

        diagnoses: [
          {
            code:
              patientDiagnosis,
            name:
              diagnosisMap[
                patientDiagnosis
              ] || 'Unknown',
            diagnosedDate:
              new Date()
                .toISOString()
                .split('T')[0],
            status: 'active'
          }
        ],

        labResults: {
          glucose: [
            patientLab,
            patientLab + 5,
            patientLab - 2
          ],

          hba1c: [
            5.2,
            5.4,
            5.3
          ],

          cholesterol: {
            ldl: [
              110,
              108,
              112
            ],
            hdl: [
              48,
              52,
              50
            ],
            total: [
              178,
              180,
              182
            ]
          }
        },

        vitalSigns: {
          bloodPressure: [
            {
              date:
                '2024-01-15',
              systolic: 135,
              diastolic: 85
            },
            {
              date:
                '2024-02-15',
              systolic: 138,
              diastolic: 88
            },
            {
              date:
                '2024-03-15',
              systolic: 132,
              diastolic: 82
            }
          ],

          heartRate: [
            72,
            75,
            70
          ]
        },

        medications: [
          {
            name:
              'Lisinopril',
            dosage: '10mg',
            frequency:
              'Once daily',
            prescribed:
              '2020-03-15'
          }
        ],

        credentialMetadata: {
          patientAddress:
            normalizeAddress(
              account
            ),

          researcherAddress:
            normalizeAddress(
              request
                .researcherAddress
            ),

          verifiedBeforeEncryption:
            true,

          encryptedBeforeIPFS:
            true,

          createdAt:
            new Date()
              .toISOString()
        }
      };

      setMessage(
        '🔐 Encrypting patient data for the requesting researcher...'
      );

      /*
       * Encrypt the complete medical record.
       *
       * The plaintext patientRecord is never
       * sent to IPFS.
       */
      const encryptedEnvelope =
        await encryptJsonForResearcher(
          patientRecord,
          request
            .researcherAddress
        );

      if (
        !encryptedEnvelope
          ?.ciphertext ||
        !encryptedEnvelope
          ?.wrappedKey
      ) {
        throw new Error(
          'Medical-record encryption did not produce a valid encrypted envelope'
        );
      }

      console.log(
        'Encrypted medical-record envelope:',
        encryptedEnvelope
      );

      console.log(
        'Plain patient profile visible in ciphertext:',
        encryptedEnvelope.ciphertext.includes(
          'Patient'
        )
      );

      setMessage(
        '⏳ Uploading encrypted medical record to IPFS...'
      );

      /*
       * Only the encrypted envelope
       * is uploaded to IPFS.
       */
      const ipfsHash =
        await uploadToIPFS(
          encryptedEnvelope
        );

      if (!ipfsHash) {
        throw new Error(
          'IPFS upload did not return a content hash'
        );
      }

      const metadataURI =
        `ipfs://${ipfsHash}`;

      const contract =
        new ethers.Contract(
          CONSENT_MANAGER_ADDRESS,
          consentManagerABI,
          signer
        );

      const dataString = [
        `age:${patientAge}`,
        `diag:${patientDiagnosis}`,
        `lab:${patientLab}`
      ].join(',');

      const dataHash =
        ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(
            dataString
          )
        );

      const policyString = [
        `age:${query.minAge}-${query.maxAge}`,
        `diagnoses:[${allowedDiagnoses.join(
          ','
        )}]`,
        `lab:${query.labMin}-${query.labMax}`
      ].join(',');

      const policyHash =
        ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(
            policyString
          )
        );

      setMessage(
        '⏳ Please confirm encrypted consent creation in MetaMask...'
      );

      const transaction =
        await contract.createConsent(
          dataHash,
          policyHash,
          metadataURI
        );

      setMessage(
        '⏳ Consent transaction submitted. Waiting for confirmation...'
      );

      const receipt =
        await transaction.wait();

      const consentCreatedEvent =
        receipt.events?.find(
          (event) =>
            event?.event ===
            'ConsentCreated'
        );

      if (
        !consentCreatedEvent
      ) {
        throw new Error(
          'Consent transaction succeeded, but the ConsentCreated event was not found'
        );
      }

      const newConsentId =
        consentCreatedEvent.args
          ?.consentId;

      if (!newConsentId) {
        throw new Error(
          'ConsentCreated event did not contain a consent ID'
        );
      }

      setConsentId(
        newConsentId
      );

      const approvals =
        readStoredArray(
          'patientApprovals'
        );

      const approvalAlreadyExists =
        approvals.some(
          (approval) =>
            approval?.consentId ===
              newConsentId &&
            normalizeAddress(
              approval
                ?.researcherAddress
            ) ===
              normalizeAddress(
                request
                  .researcherAddress
              )
        );

      if (
        !approvalAlreadyExists
      ) {
        approvals.push({
          patientAddress:
            account,

          researcherAddress:
            request
              .researcherAddress,

          consentId:
            newConsentId,

          query,

          ipfsHash,

          metadataURI,

          encrypted: true,

          encryptionFormat:
            encryptedEnvelope
              .format,

          contentEncryption:
            encryptedEnvelope
              .contentEncryption,

          keyAgreement:
            encryptedEnvelope
              .keyAgreement,

          keyWrapping:
            encryptedEnvelope
              .keyWrapping,

          recipientAddress:
            encryptedEnvelope
              .recipientAddress,

          timestamp:
            Date.now()
        });

        localStorage.setItem(
          'patientApprovals',
          JSON.stringify(
            approvals
          )
        );
      }

      const existingRequests =
        readStoredArray(
          'pendingRequests'
        );

      const updatedRequests =
        existingRequests.map(
          (storedRequest) =>
            storedRequest?.id ===
            request?.id
              ? {
                  ...storedRequest,
                  responded: true,
                  approved: true,
                  rejected: false,
                  consentId:
                    newConsentId,
                  encrypted: true
                }
              : storedRequest
        );

      localStorage.setItem(
        'pendingRequests',
        JSON.stringify(
          updatedRequests
        )
      );

      setPendingRequests(
        (currentRequests) =>
          currentRequests.filter(
            (currentRequest) =>
              currentRequest?.id !==
              request?.id
          )
      );

      setMessage(
        '✅ Medical record encrypted, uploaded to IPFS, and consent shared with the researcher!'
      );
    } catch (error) {
      console.error(
        'Encrypted consent approval error:',
        error
      );

      const readableError =
        error?.error?.message ||
        error?.data?.message ||
        error?.reason ||
        error?.message ||
        'Unknown consent creation error';

      setMessage(
        `❌ Error: ${readableError}`
      );
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = (
    request
  ) => {
    const existingRequests =
      readStoredArray(
        'pendingRequests'
      );

    const updatedRequests =
      existingRequests.map(
        (storedRequest) =>
          storedRequest?.id ===
          request?.id
            ? {
                ...storedRequest,
                responded: true,
                approved: false,
                rejected: true
              }
            : storedRequest
      );

    localStorage.setItem(
      'pendingRequests',
      JSON.stringify(
        updatedRequests
      )
    );

    setPendingRequests(
      (currentRequests) =>
        currentRequests.filter(
          (currentRequest) =>
            currentRequest?.id !==
            request?.id
        )
    );

    setMessage(
      'Researcher request rejected.'
    );
  };

  const messageStyle = {
    padding: '10px',

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

    borderRadius: '5px',
    marginBottom: '20px'
  };

  return (
    <div
      style={{
        padding: '20px'
      }}
    >
      <h2
        style={{
          color: '#2c3e50',
          borderBottom:
            '2px solid #3498db',
          paddingBottom: '10px'
        }}
      >
        👤 Patient Dashboard
      </h2>

      {vcData ? (
        <div
          style={{
            background:
              'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '20px',
            boxShadow:
              '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          <h3
            style={{
              marginTop: 0
            }}
          >
            ✅ Cryptographically Verified Credential
          </h3>

          <p>
            <strong>
              Age:
            </strong>{' '}
            {vcData.age}
          </p>

          <p>
            <strong>
              Diagnosis:
            </strong>{' '}
            {vcData.diagnosis}{' '}
            (
            {diagnosisMap[
              vcData.diagnosis
            ] || 'Unknown'}
            )
          </p>

          <p>
            <strong>
              Lab Value:
            </strong>{' '}
            {vcData.lab}
          </p>

          <p>
            <small>
              Issued to:{' '}
              {
                vcData
                  .ethereumAddress
              }
            </small>
          </p>

          <p>
            <small>
              Verification:
              Ed25519 signature
              valid
            </small>
          </p>
        </div>
      ) : (
        <div
          style={{
            background:
              '#f8d7da',
            color: '#721c24',
            padding: '20px',
            borderRadius:
              '15px',
            marginBottom:
              '20px'
          }}
        >
          <p>
            No valid,
            cryptographically
            verified credential is
            currently available.
          </p>
        </div>
      )}

      <div
        style={{
          background: 'white',
          borderRadius: '15px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow:
            '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <h3
          style={{
            marginTop: 0,
            color: '#2c3e50'
          }}
        >
          💰 Wallet
        </h3>

        <p>
          <strong>
            Balance:
          </strong>{' '}
          {balance} ETH
        </p>

        <h4>
          Payments Received —
          70% of Each Access
        </h4>

        {payments.length === 0 ? (
          <p>
            No payments yet.
          </p>
        ) : (
          <ul
            style={{
              listStyle:
                'none',
              padding: 0
            }}
          >
            {payments.map(
              (
                payment,
                index
              ) => (
                <li
                  key={`${payment.timestamp}-${index}`}
                  style={{
                    background:
                      '#f8f9fa',
                    marginBottom:
                      '10px',
                    padding:
                      '10px',
                    borderRadius:
                      '8px'
                  }}
                >
                  <strong>
                    {payment.patientAmount ||
                      '0.000007'}{' '}
                    ETH
                  </strong>{' '}
                  received from{' '}
                  {payment.researcherAddress
                    ? `${payment.researcherAddress.slice(
                        0,
                        6
                      )}...${payment.researcherAddress.slice(
                        -4
                      )}`
                    : 'Unknown researcher'}

                  <br />

                  <small>
                    {new Date(
                      payment.timestamp
                    ).toLocaleString()}
                  </small>
                </li>
              )
            )}
          </ul>
        )}
      </div>

      {pendingRequests.length >
        0 && (
        <div
          style={{
            background:
              '#fff3cd',
            border:
              '1px solid #ffc107',
            borderRadius:
              '15px',
            padding: '20px',
            marginBottom:
              '20px'
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: '#856404'
            }}
          >
            📨 Researcher Requests
          </h3>

          {pendingRequests.map(
            (
              request,
              index
            ) => {
              const query =
                request?.query ||
                {};

              const requestedDiagnoses =
                Array.isArray(
                  query
                    .allowedDiagnoses
                )
                  ? query.allowedDiagnoses
                  : [];

              return (
                <div
                  key={
                    request?.id ||
                    index
                  }
                  style={{
                    borderBottom:
                      '1px solid #ffc107',
                    padding:
                      '15px 0'
                  }}
                >
                  <p>
                    <strong>
                      Researcher:
                    </strong>{' '}
                    <code>
                      {
                        request
                          .researcherAddress
                      }
                    </code>
                  </p>

                  <p>
                    <strong>
                      Requesting patients
                      with:
                    </strong>
                  </p>

                  <ul>
                    <li>
                      Age:{' '}
                      {query.minAge ??
                        'N/A'}
                      -
                      {query.maxAge ??
                        'N/A'}
                    </li>

                    <li>
                      Diagnoses:{' '}
                      {requestedDiagnoses.length
                        ? requestedDiagnoses
                            .map(
                              (
                                diagnosis
                              ) =>
                                diagnosisMap[
                                  diagnosis
                                ] ||
                                diagnosis
                            )
                            .join(
                              ', '
                            )
                        : 'None specified'}
                    </li>

                    <li>
                      Lab:{' '}
                      {query.labMin ??
                        'N/A'}
                      -
                      {query.labMax ??
                        'N/A'}
                    </li>
                  </ul>

                  <p>
                    <small>
                      The record will
                      be encrypted
                      specifically for
                      this researcher's
                      encryption key.
                    </small>
                  </p>

                  <div
                    style={{
                      display:
                        'flex',
                      gap: '10px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        approveRequest(
                          request
                        )
                      }
                      disabled={
                        loading ||
                        !vcData
                      }
                      style={{
                        padding:
                          '8px 16px',
                        background:
                          loading ||
                          !vcData
                            ? '#6c757d'
                            : '#28a745',
                        color:
                          'white',
                        border:
                          'none',
                        borderRadius:
                          '5px',
                        cursor:
                          loading ||
                          !vcData
                            ? 'not-allowed'
                            : 'pointer'
                      }}
                    >
                      {loading
                        ? 'Encrypting & Processing...'
                        : 'Approve, Encrypt & Share'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        rejectRequest(
                          request
                        )
                      }
                      disabled={
                        loading
                      }
                      style={{
                        padding:
                          '8px 16px',
                        background:
                          '#dc3545',
                        color:
                          'white',
                        border:
                          'none',
                        borderRadius:
                          '5px',
                        cursor:
                          loading
                            ? 'not-allowed'
                            : 'pointer'
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {consentId && (
        <div
          style={{
            background:
              '#d4edda',
            border:
              '1px solid #c3e6cb',
            borderRadius:
              '15px',
            padding: '20px',
            marginBottom:
              '20px'
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: '#155724'
            }}
          >
            ✅ Encrypted Consent Shared
          </h3>

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
              {consentId}
            </code>
          </p>

          <p>
            <strong>
              Storage:
            </strong>{' '}
            AES-256-GCM encrypted
            envelope on IPFS
          </p>
        </div>
      )}

      {message && (
        <div
          style={
            messageStyle
          }
        >
          {message}
        </div>
      )}
    </div>
  );
}

export default PatientPage;