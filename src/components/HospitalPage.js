import { useState, useEffect } from 'react';
import { generateDID, signJWT } from '../utils/did';
import diagnosisMap from '../utils/diagnosisMap';
import FHIRImporter from './FHIRImporter';

function HospitalPage({ account }) {
  // Manual form state
  const [patientAddress, setPatientAddress] = useState('');
  const [age, setAge] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [lab, setLab] = useState('');
  const [message, setMessage] = useState('');
  const [hospitalEarnings, setHospitalEarnings] = useState('0');

  // DID state
  const [hospitalDID, setHospitalDID] = useState(null);
  const [hospitalKeyPair, setHospitalKeyPair] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Load hospital earnings from payments
  useEffect(() => {
    const loadEarnings = () => {
      const payments = JSON.parse(localStorage.getItem('payments') || '[]');
      const totalHospitalEarnings = payments.reduce((sum, p) => sum + (parseFloat(p.hospitalAmount) || 0), 0);
      setHospitalEarnings(totalHospitalEarnings.toFixed(6));
    };
    loadEarnings();
    const interval = setInterval(loadEarnings, 5000);
    return () => clearInterval(interval);
  }, []);

  // Generate hospital DID
  useEffect(() => {
    const initDID = async () => {
      try {
        const storedDID = localStorage.getItem('hospital_did');
        const storedKeyPair = localStorage.getItem('hospital_keypair');
        
        if (storedDID && storedKeyPair) {
          setHospitalDID(storedDID);
          setHospitalKeyPair(JSON.parse(storedKeyPair));
        } else {
          const { did, keyPair } = await generateDID();
          setHospitalDID(did);
          setHospitalKeyPair(keyPair);
          localStorage.setItem('hospital_did', did);
          localStorage.setItem('hospital_keypair', JSON.stringify(keyPair));
        }
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize hospital DID:', error);
        setMessage('❌ Failed to initialize identity system');
      }
    };
    initDID();
  }, []);

  const issueManualVC = async () => {
    if (!patientAddress || !age || !diagnosis || !lab) {
      setMessage('Please fill all fields');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(patientAddress)) {
      setMessage('Invalid Ethereum address');
      return;
    }

    if (!initialized) {
      setMessage('Identity system not initialized');
      return;
    }

    try {
      const vc = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: `urn:uuid:${Date.now()}`,
        type: ['VerifiableCredential', 'HealthDataCredential'],
        issuer: hospitalDID,
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: `did:key:patient-${patientAddress.slice(0, 8)}`,
          ethereumAddress: patientAddress.toLowerCase(),
          age: parseInt(age),
          diagnosis: parseInt(diagnosis),
          lab: parseInt(lab)
        }
      };

      const jwtToken = await signJWT(vc, hospitalKeyPair, hospitalDID);
      const key = `vc_${patientAddress.toLowerCase()}`;
      localStorage.setItem(key, jwtToken);
      
      setMessage(`✅ Verifiable Credential issued to ${patientAddress}`);
      setPatientAddress('');
      setAge('');
      setDiagnosis('');
      setLab('');
    } catch (error) {
      console.error('Failed to issue VC:', error);
      setMessage('❌ Failed to issue credential');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #ffd700', paddingBottom: '10px' }}>🏥 Hospital Dashboard</h2>
      
      {/* Earnings Card */}
      <div style={{ 
        background: 'linear-gradient(135deg, #ffd700 0%, #ffb347 100%)', 
        color: '#2c3e50', 
        padding: '15px 20px', 
        borderRadius: '15px', 
        marginBottom: '25px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: 0 }}>💰 Hospital Earnings</h3>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>20% of each data access payment</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '28px', fontWeight: 'bold' }}>{hospitalEarnings}</span>
          <span style={{ fontSize: '14px' }}> ETH</span>
        </div>
      </div>
      
      {/* DID Info (compact) */}
      {initialized && (
        <div style={{ background: '#f0f0f0', padding: '8px 12px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px' }}>
          <span>🔑 Hospital DID: </span>
          <code>{hospitalDID?.slice(0, 20)}...</code>
        </div>
      )}

      {/* Two-column layout for forms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Left Column: Manual VC Issuance */}
        <div style={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: '15px', 
          padding: '20px', 
          background: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ marginTop: 0, color: '#2c3e50' }}>📝 Manual Credential Issuance</h3>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Patient Address:</label>
            <input
              type="text"
              value={patientAddress}
              onChange={(e) => setPatientAddress(e.target.value)}
              placeholder="0x..."
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Age:</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Diagnosis Code:</label>
            <input
              type="number"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
            <span style={{ fontSize: '12px', color: '#666' }}> {diagnosisMap[diagnosis] ? `(${diagnosisMap[diagnosis]})` : ''}</span>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Lab Value (Glucose):</label>
            <input
              type="number"
              value={lab}
              onChange={(e) => setLab(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>
          
          <button 
            onClick={issueManualVC} 
            disabled={!initialized}
            style={{ 
              width: '100%',
              padding: '10px',
              background: !initialized ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !initialized ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {initialized ? 'Issue Verifiable Credential' : 'Initializing...'}
          </button>
        </div>
        
        {/* Right Column: FHIR Importer */}
        <div style={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: '15px', 
          padding: '20px', 
          background: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <FHIRImporter hospitalDID={hospitalDID} hospitalKeyPair={hospitalKeyPair} />
        </div>
      </div>
      
      {message && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          background: message.includes('✅') ? '#d4edda' : '#f8d7da', 
          border: '1px solid',
          borderColor: message.includes('✅') ? '#c3e6cb' : '#f5c6cb',
          borderRadius: '8px'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

export default HospitalPage;