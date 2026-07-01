import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import HospitalPage from './components/HospitalPage';
import PatientPage from './components/PatientPage';
import ResearcherPage from './components/ResearcherPage';
import AuditorPage from './components/AuditorPage';
import './App.css';

const HOSPITAL_ADDRESS = "0x9F6F0007b21C1f6A9488a6B903F143dB89Dc251f".toLowerCase();
const RESEARCHER_ADDRESS = "0x38251810247D0f278Ad40bc74422a4b1D222f7b6".toLowerCase();
const AUDITOR_ADDRESS = "0x4B37ce2105f3572489d1a3AC40565Ee1f2a4c016".toLowerCase();

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [role, setRole] = useState('');

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return;
    }
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const account = await signer.getAddress();
      const network = await provider.getNetwork();
      
      setProvider(provider);
      setSigner(signer);
      setAccount(account);
      setChainId(network.chainId);
      determineRole(account);
    } catch (err) {
      console.error(err);
      alert('Error connecting wallet: ' + err.message);
    }
  };

  const determineRole = (address) => {
    if (!address) {
      setRole('unknown');
      return;
    }
    
    const addr = address.toLowerCase();
    console.log('Determining role for:', addr);
    
    if (addr === HOSPITAL_ADDRESS) {
      console.log('→ Role: HOSPITAL');
      setRole('hospital');
      return;
    }
    
    if (addr === RESEARCHER_ADDRESS) {
      console.log('→ Role: RESEARCHER');
      setRole('researcher');
      return;
    }
    
    if (addr === AUDITOR_ADDRESS) {
      console.log('→ Role: AUDITOR');
      setRole('auditor');
      return;
    }
    
    const vcKey = `vc_${addr}`;
    const vcData = localStorage.getItem(vcKey);
    
    if (vcData) {
      console.log('→ Role: PATIENT (VC found)');
      setRole('patient');
    } else {
      console.log('→ Role: UNKNOWN (no VC)');
      setRole('unknown');
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount('');
          setSigner(null);
          setRole('');
        } else {
          setAccount(accounts[0]);
          determineRole(accounts[0]);
        }
      });
    }
  }, []);

  const disconnectWallet = () => {
    setAccount('');
    setSigner(null);
    setRole('');
  };

  return (
    <div className="App" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🏥 ZK Health Data Sharing</h1>
      
      {!account ? (
        <button onClick={connectWallet} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Connect MetaMask
        </button>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <p><strong>Connected:</strong> {account}</p>
              <p><strong>Chain ID:</strong> {chainId} {chainId === 11155111 ? '(Sepolia)' : ''}</p>
              <p><strong>Role:</strong> <span style={{ 
                backgroundColor: role === 'hospital' ? '#ffd700' : 
                                role === 'patient' ? '#90EE90' : 
                                role === 'researcher' ? '#87CEEB' :
                                role === 'auditor' ? '#ff9999' : '#ccc',
                padding: '3px 10px',
                borderRadius: '5px',
                fontWeight: 'bold'
              }}>{role.toUpperCase()}</span></p>
            </div>
            <button onClick={disconnectWallet} style={{ padding: '5px 10px' }}>Disconnect</button>
          </div>

          <div style={{ marginTop: '30px' }}>
            {role === 'hospital' && <HospitalPage signer={signer} account={account} />}
            {role === 'patient' && <PatientPage signer={signer} account={account} />}
            {role === 'researcher' && <ResearcherPage signer={signer} account={account} />}
            {role === 'auditor' && <AuditorPage signer={signer} account={account} />}
            {role === 'unknown' && (
              <div style={{ textAlign: 'center', padding: '50px', background: '#f8f9fa', borderRadius: '10px' }}>
                <h3 style={{ color: '#dc3545' }}>⚠️ Unknown Role</h3>
                <p>This account is not recognized as Hospital, Patient, Researcher, or Auditor.</p>
                <p>If you are a patient, please ask the hospital to issue you a Verifiable Credential first.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;