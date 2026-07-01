import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { consentManagerABI } from '../contracts/consentManagerABI';
import { uploadToIPFS } from '../utils/ipfs';
import { decodeJWT, hasValidVC } from '../utils/did';
import diagnosisMap from '../utils/diagnosisMap';

const CONSENT_MANAGER_ADDRESS = process.env.REACT_APP_CONSENT_MANAGER;

function PatientPage({ signer, account }) {
  const [vcData, setVcData] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [consentId, setConsentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [payments, setPayments] = useState([]);
  const [balance, setBalance] = useState('0');

  useEffect(() => {
    if (account) {
      const key = `vc_${account.toLowerCase()}`;
      const storedVc = localStorage.getItem(key);
      if (storedVc && hasValidVC(storedVc)) {
        const decoded = decodeJWT(storedVc);
        setVcData(decoded?.credentialSubject);
        setMessage('✅ Verifiable Credential loaded');
      } else {
        setVcData(null);
        setMessage('No verifiable credential found. Please ask a hospital to issue one.');
      }
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      const allPayments = JSON.parse(localStorage.getItem('payments') || '[]');
      const myPayments = allPayments.filter(p => p.patientAddress.toLowerCase() === account.toLowerCase());
      setPayments(myPayments);
    }
  }, [account]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (account && window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const bal = await provider.getBalance(account);
        setBalance(ethers.utils.formatEther(bal));
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [account]);

  useEffect(() => {
    const checkRequests = () => {
      const requests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
      const myRequests = requests.filter(r => 
        r.patientAddress.toLowerCase() === account.toLowerCase() && !r.responded
      );
      setPendingRequests(myRequests);
    };
    checkRequests();
    const interval = setInterval(checkRequests, 2000);
    return () => clearInterval(interval);
  }, [account]);

  const approveRequest = async (request) => {
    if (!signer || !vcData) return;
    setLoading(true);
    setMessage('');
    try {
      const patientRecord = {
        profile: { name: "Patient", age: vcData.age, gender: "Unknown", bloodType: "Unknown" },
        diagnoses: [{ code: vcData.diagnosis, name: diagnosisMap[vcData.diagnosis] || 'Unknown', diagnosedDate: new Date().toISOString().split('T')[0], status: "active" }],
        labResults: { glucose: [vcData.lab, vcData.lab + 5, vcData.lab - 2], hba1c: [5.2, 5.4, 5.3], cholesterol: { ldl: [110, 108, 112], hdl: [48, 52, 50], total: [178, 180, 182] } },
        vitalSigns: { bloodPressure: [{ date: "2024-01-15", systolic: 135, diastolic: 85 }, { date: "2024-02-15", systolic: 138, diastolic: 88 }, { date: "2024-03-15", systolic: 132, diastolic: 82 }], heartRate: [72, 75, 70] },
        medications: [{ name: "Lisinopril", dosage: "10mg", frequency: "Once daily", prescribed: "2020-03-15" }]
      };
      const ipfsHash = await uploadToIPFS(patientRecord);
      const metadataURI = `ipfs://${ipfsHash}`;
      const contract = new ethers.Contract(CONSENT_MANAGER_ADDRESS, consentManagerABI, signer);
      const dataString = `age:${vcData.age},diag:${vcData.diagnosis},lab:${vcData.lab}`;
      const dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(dataString));
      const policyHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`policy:age>=${request.query.minAge},diag in [${request.query.allowedDiagnoses}],lab ${request.query.labMin}-${request.query.labMax}`));
      const tx = await contract.createConsent(dataHash, policyHash, metadataURI);
      setMessage('⏳ Creating consent...');
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'ConsentCreated');
      if (event) {
        const newConsentId = event.args.consentId;
        setConsentId(newConsentId);
        const approvals = JSON.parse(localStorage.getItem('patientApprovals') || '[]');
        const exists = approvals.some(a => a.consentId === newConsentId && a.researcherAddress === request.researcherAddress);
        if (!exists) {
          approvals.push({ patientAddress: account, researcherAddress: request.researcherAddress, consentId: newConsentId, query: request.query, ipfsHash: ipfsHash, timestamp: Date.now() });
          localStorage.setItem('patientApprovals', JSON.stringify(approvals));
        }
        const updatedRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]').map(r => r.id === request.id ? {...r, responded: true} : r);
        localStorage.setItem('pendingRequests', JSON.stringify(updatedRequests));
        setMessage('✅ Consent created and shared with researcher!');
      }
    } catch (err) {
      console.error(err);
      setMessage('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = (request) => {
    const updatedRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]').map(r => r.id === request.id ? {...r, responded: true, rejected: true} : r);
    localStorage.setItem('pendingRequests', JSON.stringify(updatedRequests));
    setPendingRequests(pendingRequests.filter(r => r.id !== request.id));
    setMessage('Request rejected');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>👤 Patient Dashboard</h2>
      
      {vcData ? (
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>✅ Verifiable Credential</h3>
          <p><strong>Age:</strong> {vcData.age}</p>
          <p><strong>Diagnosis:</strong> {vcData.diagnosis} ({diagnosisMap[vcData.diagnosis] || 'unknown'})</p>
          <p><strong>Lab Value:</strong> {vcData.lab}</p>
          <p><small>Issued to: {vcData.ethereumAddress}</small></p>
        </div>
      ) : (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
          <p>No verifiable credential found. Please ask a hospital to issue one.</p>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '15px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>💰 Wallet</h3>
        <p><strong>Balance:</strong> {balance} ETH</p>
        <h4>Payments Received (70% of each access)</h4>
        {payments.length === 0 ? (
          <p>No payments yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {payments.map((p, i) => (
              <li key={i} style={{ background: '#f8f9fa', marginBottom: '10px', padding: '10px', borderRadius: '8px' }}>
                <strong>{p.patientAmount || '0.000007'} ETH</strong> received from {p.researcherAddress?.slice(0, 6)}...{p.researcherAddress?.slice(-4)}<br/>
                <small>{new Date(p.timestamp).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingRequests.length > 0 && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#856404' }}>📨 Researcher Requests</h3>
          {pendingRequests.map((req, index) => (
            <div key={index} style={{ borderBottom: '1px solid #ffc107', padding: '15px 0' }}>
              <p><strong>Researcher:</strong> <code>{req.researcherAddress}</code></p>
              <p><strong>Requesting patients with:</strong></p>
              <ul>
                <li>Age: {req.query.minAge}-{req.query.maxAge}</li>
                <li>Diagnoses: {req.query.allowedDiagnoses.map(d => diagnosisMap[d] || d).join(', ')}</li>
                <li>Lab: {req.query.labMin}-{req.query.labMax}</li>
              </ul>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => approveRequest(req)} disabled={loading} style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Approve & Share Data</button>
                <button onClick={() => rejectRequest(req)} disabled={loading} style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {consentId && (
        <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#155724' }}>✅ Consent Shared!</h3>
          <p><strong>Consent ID:</strong> <code style={{ wordBreak: 'break-all' }}>{consentId}</code></p>
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

export default PatientPage;