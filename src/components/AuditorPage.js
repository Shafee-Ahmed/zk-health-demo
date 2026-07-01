import { useState, useEffect } from 'react';
import diagnosisMap from '../utils/diagnosisMap';

function AuditorPage({ account }) {
  const [allConsents, setAllConsents] = useState([]);
  const [allAccesses, setAllAccesses] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [platformBalance, setPlatformBalance] = useState('0');
  const [hospitalBalance, setHospitalBalance] = useState('0');
  const [filterType, setFilterType] = useState('all');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    try {
      const approvals = JSON.parse(localStorage.getItem('patientApprovals') || '[]');
      setAllConsents(approvals);
      
      const payments = JSON.parse(localStorage.getItem('payments') || '[]');
      setAllPayments(payments);
      
      const accesses = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('researcher_grants_')) {
          const grants = JSON.parse(localStorage.getItem(key) || '[]');
          accesses.push(...grants.map(g => ({ 
            ...g, 
            researcher: key.replace('researcher_grants_', ''),
            timestamp: g.timestamp || Date.now()
          })));
        }
      }
      setAllAccesses(accesses);
      
      const totalPlatform = payments.reduce((sum, p) => sum + (parseFloat(p.platformAmount) || 0), 0);
      setPlatformBalance(totalPlatform.toFixed(6));
      
      const totalHospital = payments.reduce((sum, p) => sum + (parseFloat(p.hospitalAmount) || 0), 0);
      setHospitalBalance(totalHospital.toFixed(6));
      
      setMessage(`✅ Loaded ${approvals.length} consents, ${payments.length} payments, ${accesses.length} accesses`);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('❌ Error loading data');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const getDisplayData = () => {
    if (filterType === 'consents') return allConsents;
    if (filterType === 'accesses') return allAccesses;
    if (filterType === 'payments') return allPayments;
    return [
      ...allConsents.map(c => ({ ...c, recordType: 'consent' })),
      ...allAccesses.map(a => ({ ...a, recordType: 'access' })),
      ...allPayments.map(p => ({ ...p, recordType: 'payment' }))
    ];
  };

  const displayData = getDisplayData();

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #ff9999', paddingBottom: '10px' }}>📊 Auditor Dashboard</h2>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Auditor: <code>{account}</code></p>
      
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: '#667eea', color: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{allConsents.length}</div>
          <div style={{ fontSize: '12px' }}>Total Consents</div>
        </div>
        <div style={{ background: '#f093fb', color: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{allAccesses.length}</div>
          <div style={{ fontSize: '12px' }}>Data Accesses</div>
        </div>
        <div style={{ background: '#4facfe', color: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{allPayments.length}</div>
          <div style={{ fontSize: '12px' }}>Total Payments</div>
        </div>
      </div>
      
      {/* Fee Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
        <div style={{ background: '#4caf50', color: 'white', padding: '15px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Hospital Fees (20%)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{hospitalBalance} ETH</div>
        </div>
        <div style={{ background: '#ff9800', color: 'white', padding: '15px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Platform Fees (10%)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{platformBalance} ETH</div>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
        {['all', 'consents', 'accesses', 'payments'].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            style={{
              padding: '6px 16px',
              background: filterType === type ? '#667eea' : '#f0f0f0',
              color: filterType === type ? 'white' : '#333',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            {type === 'all' ? 'All' : type === 'consents' ? 'Consents' : type === 'accesses' ? 'Accesses' : 'Payments'}
          </button>
        ))}
      </div>
      
      {/* Audit Log Table */}
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        border: '1px solid #e0e0e0',
        overflowX: 'auto'
      }}>
        {displayData.length === 0 ? (
          <p style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No records found. Complete some transactions to see data here.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Patient</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Researcher</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Details</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((item, idx) => {
                if (item.recordType === 'consent' || (!item.recordType && item.query)) {
                  return (
                    <tr key={`c-${idx}`} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}><span style={{ background: '#4caf50', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '11px' }}>CONSENT</span></td>
                      <td style={{ padding: '10px' }}><code>{item.patientAddress?.slice(0, 8)}...</code></td>
                      <td style={{ padding: '10px' }}><code>{item.researcherAddress?.slice(0, 8)}...</code></td>
                      <td style={{ padding: '10px' }}>Age: {item.query?.minAge}-{item.query?.maxAge}<br/>Diag: {item.query?.allowedDiagnoses?.map(d => diagnosisMap[d] || d).slice(0, 2).join(', ')}</td>
                      <td style={{ padding: '10px' }}>{formatDate(item.timestamp)}</td>
                    </tr>
                  );
                } else if (item.recordType === 'access' || (!item.recordType && item.consentId && !item.patientAmount)) {
                  return (
                    <tr key={`a-${idx}`} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}><span style={{ background: '#2196f3', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '11px' }}>ACCESS</span></td>
                      <td style={{ padding: '10px' }}><code>{item.patientAddress?.slice(0, 8)}...</code></td>
                      <td style={{ padding: '10px' }}><code>{item.researcher?.slice(0, 8)}...</code></td>
                      <td style={{ padding: '10px' }}>Consent: <code>{item.consentId?.slice(0, 12)}...</code></td>
                      <td style={{ padding: '10px' }}>{formatDate(item.timestamp)}</td>
                    </tr>
                  );
                } else {
                  return (
                    <tr key={`p-${idx}`} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}><span style={{ background: '#ff9800', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '11px' }}>PAYMENT</span></td>
                      <td style={{ padding: '10px' }}><code>{item.patientAddress?.slice(0, 8)}...</code></td>
                      <td style={{ padding: '10px' }}><code>{item.researcherAddress?.slice(0, 8)}...</code></td>
                      <td style={{ padding: '10px' }}>
                        <strong>{item.totalAmount || '0.00001'} ETH</strong><br/>
                        Patient: {item.patientAmount || '0.000007'} | Hospital: {item.hospitalAmount || '0.000002'} | Platform: {item.platformAmount || '0.000001'}
                      </td>
                      <td style={{ padding: '10px' }}>{formatDate(item.timestamp)}</td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        )}
      </div>
      
      {message && (
        <div style={{ marginTop: '15px', padding: '10px', background: message.includes('✅') ? '#d4edda' : '#f8d7da', borderRadius: '8px', fontSize: '13px' }}>
          {message}
        </div>
      )}
    </div>
  );
}

export default AuditorPage;