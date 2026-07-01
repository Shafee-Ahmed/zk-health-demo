import { useState } from 'react';
import { parseFHIRBundle } from '../utils/fhirParser';
import { signJWT } from '../utils/did';
import diagnosisMap from '../utils/diagnosisMap';

function FHIRImporter({ hospitalDID, hospitalKeyPair }) {
  const [file, setFile] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [patientAddress, setPatientAddress] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setExtracted(null);
    setMessage('');
  };

  const handleParse = () => {
    if (!file) {
      setMessage('Please select a FHIR JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bundle = JSON.parse(event.target.result);
        const data = parseFHIRBundle(bundle);
        setExtracted(data);
        setMessage('✅ FHIR data extracted successfully');
      } catch (err) {
        setMessage('❌ ' + err.message);
        setExtracted(null);
      }
    };
    reader.readAsText(file);
  };

  const handleIssueVC = async () => {
    if (!extracted) {
      setMessage('No data extracted');
      return;
    }
    if (!patientAddress || !/^0x[a-fA-F0-9]{40}$/.test(patientAddress)) {
      setMessage('Invalid patient Ethereum address');
      return;
    }
    if (!hospitalDID || !hospitalKeyPair) {
      setMessage('Hospital identity not initialized');
      return;
    }

    setLoading(true);
    setMessage('');

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
          age: extracted.age,
          diagnosis: extracted.diagnosis,
          lab: extracted.lab
        }
      };

      const jwtToken = await signJWT(vc, hospitalKeyPair, hospitalDID);
      const key = `vc_${patientAddress.toLowerCase()}`;
      localStorage.setItem(key, jwtToken);

      setMessage(`✅ VC issued to ${patientAddress} from FHIR data`);
      setFile(null);
      setExtracted(null);
      setPatientAddress('');
      document.getElementById('fhir-file-input').value = '';
    } catch (error) {
      console.error('VC issuance error:', error);
      setMessage('❌ Failed to issue VC');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#2c3e50' }}>📄 FHIR Data Import</h3>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
        Import patient data from Synthea FHIR JSON files
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <input
          id="fhir-file-input"
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ flex: 1 }}
        />
        <button
          onClick={handleParse}
          disabled={!file}
          style={{
            padding: '6px 15px',
            background: !file ? '#ccc' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !file ? 'not-allowed' : 'pointer'
          }}
        >
          Parse
        </button>
      </div>

      {extracted && (
        <div style={{ background: '#e6f7ff', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>📊 Extracted Data:</h4>
          <p style={{ margin: '4px 0' }}><strong>Age:</strong> {extracted.age}</p>
          <p style={{ margin: '4px 0' }}><strong>Diagnosis:</strong> {extracted.diagnosis} {diagnosisMap[extracted.diagnosis] ? `(${diagnosisMap[extracted.diagnosis]})` : ''}</p>
          <p style={{ margin: '4px 0' }}><strong>Glucose:</strong> {extracted.lab}</p>
          <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>Patient ID: {extracted.patientId} | Gender: {extracted.gender}</p>
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Patient Ethereum Address:</label>
        <input
          type="text"
          value={patientAddress}
          onChange={(e) => setPatientAddress(e.target.value)}
          placeholder="0x..."
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
        />
      </div>

      <button
        onClick={handleIssueVC}
        disabled={loading || !extracted || !patientAddress}
        style={{
          width: '100%',
          padding: '10px',
          background: loading || !extracted || !patientAddress ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading || !extracted || !patientAddress ? 'not-allowed' : 'pointer',
          fontWeight: 'bold'
        }}
      >
        {loading ? 'Issuing...' : 'Issue VC from FHIR'}
      </button>

      {message && (
        <p style={{ marginTop: '12px', fontSize: '13px', padding: '8px', background: message.includes('✅') ? '#d4edda' : '#f8d7da', borderRadius: '6px' }}>
          {message}
        </p>
      )}
    </div>
  );
}

export default FHIRImporter;