import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { dataAccessV2ABI } from '../contracts/dataAccessV2ABI';
import { antiResaleABI } from '../contracts/antiResaleABI';
import { generateRealProof, checkEligibility } from '../utils/proofGenerator';
import { fetchFromIPFS } from '../utils/ipfs';
import { decodeJWT } from '../utils/did';

const DATA_ACCESS_V2 = process.env.REACT_APP_DATA_ACCESS_V2;
const ANTI_RESALE = process.env.REACT_APP_ANTI_RESALE;
const AUDITOR_ADDRESS = process.env.REACT_APP_AUDITOR_ADDRESS;
const HOSPITAL_ADDRESS = process.env.REACT_APP_HOSPTIAL_ADDRESS;

function ResearcherPage({ signer, account }) {
  const [minAge, setMinAge] = useState(30);
  const [maxAge, setMaxAge] = useState(70);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState([16096]);
  const [labMin, setLabMin] = useState(70);
  const [labMax, setLabMax] = useState(120);
  
  const [eligiblePatients, setEligiblePatients] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [grantedAccess, setGrantedAccess] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [accessedPatientAddress, setAccessedPatientAddress] = useState('');
  const [ipfsData, setIpfsData] = useState(null);
  const [currentIpfsHash, setCurrentIpfsHash] = useState('');
  
  const availableDiagnoses = [
    { code: 16096, name: 'Hypertension' },
    { code: 59621, name: 'Chronic Kidney Disease' },
    { code: 40055, name: 'Type 2 Diabetes' },
    { code: 22429, name: 'Asthma' },
    { code: 10509, name: 'Allergic Rhinitis' },
    { code: 12861, name: 'GERD' },
  ];

  useEffect(() => {
    if (account) {
      const savedGrants = localStorage.getItem(`researcher_grants_${account.toLowerCase()}`);
      if (savedGrants) setGrantedAccess(JSON.parse(savedGrants));
      const savedToken = localStorage.getItem(`researcher_token_${account.toLowerCase()}`);
      if (savedToken) setTokenId(savedToken);
      const savedPatient = localStorage.getItem(`researcher_patient_${account.toLowerCase()}`);
      if (savedPatient) setAccessedPatientAddress(savedPatient);
      const savedIpfsHash = localStorage.getItem(`researcher_ipfs_${account.toLowerCase()}`);
      if (savedIpfsHash) setCurrentIpfsHash(savedIpfsHash);
    }
  }, [account]);

  useEffect(() => {
    if (account && grantedAccess.length > 0) {
      localStorage.setItem(`researcher_grants_${account.toLowerCase()}`, JSON.stringify(grantedAccess));
    }
  }, [grantedAccess, account]);

  useEffect(() => {
    if (account && tokenId) {
      localStorage.setItem(`researcher_token_${account.toLowerCase()}`, tokenId);
    }
  }, [tokenId, account]);

  useEffect(() => {
    if (account && accessedPatientAddress) {
      localStorage.setItem(`researcher_patient_${account.toLowerCase()}`, accessedPatientAddress);
    }
  }, [accessedPatientAddress, account]);

  useEffect(() => {
    if (account && currentIpfsHash) {
      localStorage.setItem(`researcher_ipfs_${account.toLowerCase()}`, currentIpfsHash);
    }
  }, [currentIpfsHash, account]);

  useEffect(() => {
    const checkApprovals = () => {
      const approvals = JSON.parse(localStorage.getItem('patientApprovals') || '[]');
      const myApprovals = approvals.filter(a => 
        a.researcherAddress.toLowerCase() === account?.toLowerCase() && !a.processed
      );
      if (myApprovals.length > 0) {
        setGrantedAccess(prev => {
          const existingMap = new Map(prev.map(g => [g.consentId, g]));
          myApprovals.forEach(approval => existingMap.set(approval.consentId, approval));
          const uniqueGrants = Array.from(existingMap.values());
          if (uniqueGrants.length !== prev.length) {
            const updatedApprovals = approvals.map(a => 
              a.researcherAddress.toLowerCase() === account?.toLowerCase() ? {...a, processed: true} : a
            );
            localStorage.setItem('patientApprovals', JSON.stringify(updatedApprovals));
          }
          return uniqueGrants;
        });
      }
    };
    const interval = setInterval(checkApprovals, 2000);
    return () => clearInterval(interval);
  }, [account]);

  const handleDiagnosisToggle = (code) => {
    if (selectedDiagnoses.includes(code)) {
      setSelectedDiagnoses(selectedDiagnoses.filter(d => d !== code));
    } else {
      setSelectedDiagnoses([...selectedDiagnoses, code]);
    }
  };

  const loadAllPatients = () => {
    const patients = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vc_')) {
        const address = key.substring(3);
        const jwt = localStorage.getItem(key);
        const decoded = decodeJWT(jwt);
        if (decoded && decoded.credentialSubject) {
          patients.push({ address, data: decoded.credentialSubject });
        }
      }
    }
    return patients;
  };

  const findEligiblePatients = () => {
    const allPatients = loadAllPatients();
    const query = { minAge, maxAge, allowedDiagnoses: selectedDiagnoses, labMin, labMax };
    const eligible = allPatients.filter(patient => checkEligibility(patient.data, query))
      .map(p => ({ address: p.address }));
    setEligiblePatients(eligible);
    setMessage(`Found ${eligible.length} eligible patients`);
  };

  const requestPatientAccess = (patientAddress) => {
    const request = {
      id: Date.now(),
      patientAddress,
      researcherAddress: account,
      query: { minAge, maxAge, allowedDiagnoses: selectedDiagnoses, labMin, labMax },
      timestamp: Date.now()
    };
    const requests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
    requests.push(request);
    localStorage.setItem('pendingRequests', JSON.stringify(requests));
    setPendingRequests([...pendingRequests, request]);
    setMessage(`Request sent to patient ${patientAddress}`);
  };

  const verifyPatientVC = (patientAddress) => {
    const key = `vc_${patientAddress.toLowerCase()}`;
    const jwt = localStorage.getItem(key);
    if (!jwt) {
      setMessage('No verifiable credential found for this patient');
      return;
    }
    const decoded = decodeJWT(jwt);
    if (decoded) {
      setMessage(`✅ Valid VC from issuer: ${decoded.issuer?.slice(0, 20)}... issued at ${new Date(decoded.iat * 1000).toLocaleString()}`);
    } else {
      setMessage('❌ Invalid verifiable credential');
    }
  };

  const accessGrantedData = async (grant) => {
    if (!signer) {
      setMessage('No signer found. Please reconnect wallet.');
      return;
    }
    setLoading(true);
    setMessage('🔐 Generating real ZK proof... (this may take 10-20 seconds)');
    try {
      const vcKey = `vc_${grant.patientAddress.toLowerCase()}`;
      const vcJwt = localStorage.getItem(vcKey);
      if (!vcJwt) {
        setMessage('❌ Patient verifiable credential not found');
        setLoading(false);
        return;
      }
      const decoded = decodeJWT(vcJwt);
      const patientData = decoded?.credentialSubject;
      if (!patientData) {
        setMessage('❌ Invalid credential data');
        setLoading(false);
        return;
      }
      if (!checkEligibility(patientData, grant.query)) {
        setMessage('❌ Patient no longer meets criteria');
        setLoading(false);
        return;
      }
      const proof = await generateRealProof(patientData, grant.query);
      setMessage('✅ Proof generated! Submitting to blockchain...');
      const contract = new ethers.Contract(DATA_ACCESS_V2, dataAccessV2ABI, signer);
      const tokenURI = 'ipfs://researcher-request';
      const validity = 86400;
      const tx = await contract.requestAccessWithZK(
        grant.consentId, proof.a, proof.b, proof.c, proof.inputs, tokenURI, validity
      );
      setMessage('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'AccessGranted');
      if (event) {
        const newTokenId = event.args.tokenId.toString();
        setTokenId(newTokenId);
        setAccessedPatientAddress(grant.patientAddress);
        setCurrentIpfsHash(grant.ipfsHash || '');
        setMessage(`✅ Access granted! Token ID: ${newTokenId}`);
        setGrantedAccess(prev => prev.filter(g => g.consentId !== grant.consentId));
      } else {
        setMessage('⚠️ Access granted but token ID not found');
      }
    } catch (err) {
      console.error('Full error:', err);
      setMessage('❌ Error: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const useToken = async () => {
    if (!signer || !tokenId || !accessedPatientAddress) {
      setMessage('Missing token or patient address');
      return;
    }

    setLoading(true);
    setMessage('⏳ Using token, sending 3-way payment (Patient + Hospital + Platform), and fetching data...');

    try {
      const contract = new ethers.Contract(ANTI_RESALE, antiResaleABI, signer);
      const txUse = await contract.useTokenWithAntiResale(tokenId);
      await txUse.wait();
      setMessage('✅ Token used! Now sending 3-way payment...');

      const totalAmount = ethers.utils.parseEther('0.00001');
      const patientAmount = ethers.utils.parseEther('0.000007');
      const hospitalAmount = ethers.utils.parseEther('0.000002');
      const platformAmount = ethers.utils.parseEther('0.000001');

      const txPayPatient = await signer.sendTransaction({ to: accessedPatientAddress, value: patientAmount });
      await txPayPatient.wait();
      setMessage('✅ Patient received 0.000007 ETH (70%)');

      const txPayHospital = await signer.sendTransaction({ to: HOSPITAL_ADDRESS, value: hospitalAmount });
      await txPayHospital.wait();
      setMessage('✅ Hospital received 0.000002 ETH (20%)');

      const txPayPlatform = await signer.sendTransaction({ to: AUDITOR_ADDRESS, value: platformAmount });
      await txPayPlatform.wait();
      setMessage('✅ Platform received 0.000001 ETH (10%)');

      const paymentRecord = {
        patientAddress: accessedPatientAddress,
        hospitalAddress: HOSPITAL_ADDRESS,
        researcherAddress: account,
        totalAmount: '0.00001',
        patientAmount: '0.000007',
        hospitalAmount: '0.000002',
        platformAmount: '0.000001',
        timestamp: Date.now()
      };
      const payments = JSON.parse(localStorage.getItem('payments') || '[]');
      payments.push(paymentRecord);
      localStorage.setItem('payments', JSON.stringify(payments));

      setMessage('✅ All payments sent! Now fetching data from IPFS...');

      if (currentIpfsHash) {
        const data = await fetchFromIPFS(currentIpfsHash);
        setIpfsData(data);
        setMessage('✅ Data accessed! 3-way payment sent: 70% Patient, 20% Hospital, 10% Platform');
      } else {
        setMessage('✅ Payments sent, but no IPFS hash available.');
      }
    } catch (err) {
      console.error('Error in useToken:', err);
      setMessage('❌ Error: ' + (err.message || 'Operation failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px' }}>🔬 Researcher Dashboard</h2>
      
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '10px', marginBottom: '20px', background: 'white' }}>
        <h3 style={{ marginTop: 0 }}>1. Define Your Research Criteria</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Age Range:</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="number" value={minAge} onChange={(e) => setMinAge(parseInt(e.target.value))} style={{ width: '80px', padding: '5px' }} />
                <span>-</span>
                <input type="number" value={maxAge} onChange={(e) => setMaxAge(parseInt(e.target.value))} style={{ width: '80px', padding: '5px' }} />
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Lab Range:</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="number" value={labMin} onChange={(e) => setLabMin(parseInt(e.target.value))} style={{ width: '80px', padding: '5px' }} />
                <span>-</span>
                <input type="number" value={labMax} onChange={(e) => setLabMax(parseInt(e.target.value))} style={{ width: '80px', padding: '5px' }} />
              </div>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Diagnoses:</label>
            <div style={{ maxHeight: '150px', overflowY: 'scroll', border: '1px solid #ddd', padding: '10px', borderRadius: '5px', background: '#f9f9f9' }}>
              {availableDiagnoses.map(d => (
                <div key={d.code} style={{ marginBottom: '5px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="checkbox" checked={selectedDiagnoses.includes(d.code)} onChange={() => handleDiagnosisToggle(d.code)} />
                    {d.name} ({d.code})
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={findEligiblePatients} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            Find Eligible Patients
          </button>
          <button onClick={() => {
            const approvals = JSON.parse(localStorage.getItem('patientApprovals') || '[]');
            const myApprovals = approvals.filter(a => a.researcherAddress.toLowerCase() === account?.toLowerCase());
            setGrantedAccess(prev => {
              const existingMap = new Map(prev.map(g => [g.consentId, g]));
              myApprovals.forEach(approval => existingMap.set(approval.consentId, approval));
              return Array.from(existingMap.values());
            });
          }} style={{ padding: '10px 20px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            🔄 Check for Patient Approvals
          </button>
        </div>
      </div>

      {eligiblePatients.length > 0 && (
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '10px', marginBottom: '20px', background: 'white' }}>
          <h3 style={{ marginTop: 0 }}>2. Eligible Patients (No private data shown)</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>These patients match your criteria. Request access to see their consent.</p>
          {eligiblePatients.map((patient, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
              <code style={{ background: '#f4f4f4', padding: '5px', borderRadius: '3px' }}>{patient.address}</code>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => requestPatientAccess(patient.address)} disabled={pendingRequests.some(r => r.patientAddress === patient.address)} style={{ padding: '5px 15px', background: pendingRequests.some(r => r.patientAddress === patient.address) ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: pendingRequests.some(r => r.patientAddress === patient.address) ? 'not-allowed' : 'pointer' }}>
                  {pendingRequests.some(r => r.patientAddress === patient.address) ? 'Request Pending' : 'Request Access'}
                </button>
                <button onClick={() => verifyPatientVC(patient.address)} style={{ padding: '5px 10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                  Verify VC
                </button>
              </div>
            </div>
          ))}
          <p style={{ marginTop: '10px', color: '#667eea', fontWeight: 'bold' }}>Found {eligiblePatients.length} eligible patients</p>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div style={{ border: '1px solid #ffc107', padding: '20px', borderRadius: '10px', marginBottom: '20px', background: '#fff3cd' }}>
          <h3 style={{ marginTop: 0, color: '#856404' }}>⏳ Waiting for Patient Approval</h3>
          {pendingRequests.map((req, index) => (
            <div key={index} style={{ marginBottom: '10px' }}>
              <p><strong>Patient:</strong> <code>{req.patientAddress}</code></p>
              <p><em>Waiting for them to approve...</em></p>
            </div>
          ))}
        </div>
      )}

      {grantedAccess.length > 0 && (
        <div style={{ border: '2px solid #28a745', padding: '20px', borderRadius: '10px', marginBottom: '20px', background: '#d4edda' }}>
          <h3 style={{ marginTop: 0, color: '#155724' }}>✅ Patient Approved! Access Granted</h3>
          {grantedAccess.map((grant, index) => (
            <div key={index} style={{ marginBottom: '15px', padding: '15px', background: 'white', borderRadius: '5px', border: '1px solid #28a745' }}>
              <p><strong>Patient:</strong> <code>{grant.patientAddress}</code></p>
              <p><strong>Consent ID:</strong> <code style={{ wordBreak: 'break-all' }}>{grant.consentId}</code></p>
              <p><strong>IPFS Hash:</strong> <code>{grant.ipfsHash}</code></p>
              <button onClick={() => accessGrantedData(grant)} disabled={loading} style={{ padding: '10px 20px', background: loading ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {loading ? '⏳ Generating Proof...' : 'Submit Proof & Get Token'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tokenId && (
        <div style={{ border: '2px solid #17a2b8', padding: '20px', borderRadius: '10px', marginBottom: '20px', background: '#d1ecf1' }}>
          <h3 style={{ marginTop: 0, color: '#0c5460' }}>🎫 Token Minted: {tokenId}</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={useToken} disabled={loading} style={{ padding: '10px 20px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              {loading ? '⏳ Processing...' : 'Access Data (70% Patient, 20% Hospital, 10% Platform)'}
            </button>
          </div>
          {ipfsData && (
            <div style={{ marginTop: '15px', background: '#fff', padding: '15px', borderRadius: '5px', maxHeight: '400px', overflowY: 'scroll' }}>
              <h4>IPFS Data:</h4>
              <pre>{JSON.stringify(ipfsData, null, 2)}</pre>
            </div>
          )}
          <p style={{ marginTop: '10px', color: '#155724' }}>✅ Data accessed successfully! Token is now used.</p>
        </div>
      )}

      {message && (
        <div style={{ padding: '10px', background: message.includes('✅') ? '#d4edda' : message.includes('❌') ? '#f8d7da' : '#fff3cd', border: '1px solid', borderColor: message.includes('✅') ? '#c3e6cb' : message.includes('❌') ? '#f5c6cb' : '#ffeeba', borderRadius: '5px', marginBottom: '20px' }}>
          {message}
        </div>
      )}
    </div>
  );
}

export default ResearcherPage;