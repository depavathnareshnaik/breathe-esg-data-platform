import React, { useState, useEffect } from 'react';
import { api, auth } from '../services/api';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [sourceType, setSourceType] = useState('SAP');
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  
  const user = auth.getUser();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      api.getTenants()
        .then(data => {
          setTenants(data);
          if (data.length > 0) {
            setSelectedTenantId(data[0].id);
          }
        })
        .catch(err => {
          console.error(err);
          setError('Failed to fetch tenants.');
        });
    }
  }, [isAdmin]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file to upload.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const tenantParam = isAdmin ? selectedTenantId : null;
      const res = await api.uploadFile(file, sourceType, tenantParam);
      setResult(res);
      setFile(null);
      // Reset file input element
      document.getElementById('csv-file-input').value = '';
    } catch (err) {
      console.error(err);
      setError(err.error || 'Failed to upload and ingest file. Ensure the structure is correct.');
    } finally {
      setLoading(false);
    }
  };

  // Helper description of the chosen format
  const getFormatDescription = () => {
    switch (sourceType) {
      case 'SAP':
        return 'Requires headers: TransactionID, PostingDate, GLAccount, Description, Quantity, Unit. Represents fuel and ledger procurement entries.';
      case 'UTILITY':
        return 'Requires headers: AccountNumber, BillingPeriodStart, BillingPeriodEnd, Usage_kWh. Represents power bills exports.';
      case 'TRAVEL':
        return 'Requires headers: BookingID, TravelDate, Mode, Distance_miles, HotelNights, SupplierName. Represents flights (miles) and hotel nights (nights).';
      default:
        return '';
    }
  };

  return (
    <div className="animated">
      <div className="mb-40">
        <h1>Ingest Cargo</h1>
        <p>Upload corporate data outputs to parse, normalize, and run compliance validation audits.</p>
      </div>

      <div className="grid-2">
        <div className="glass-card">
          <h3 className="mb-20">New Ingestion Batch</h3>

          {error && <div className="error-card">⚠️ {error}</div>}

          <form onSubmit={handleUpload}>
            {isAdmin ? (
              <div className="form-group">
                <label className="form-label" htmlFor="tenant-select">Target Tenant (Admin Bypass)</label>
                <select
                  id="tenant-select"
                  className="form-input"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  disabled={loading}
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Active Tenant Scoping</label>
                <input
                  type="text"
                  className="form-input"
                  value={user?.tenant_name || ''}
                  readOnly
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Data Output Type</label>
              <div style={radioGroupStyle}>
                {['SAP', 'UTILITY', 'TRAVEL'].map((type) => (
                  <label key={type} style={radioLabelStyle(sourceType === type)}>
                    <input
                      type="radio"
                      name="sourceType"
                      value={type}
                      checked={sourceType === type}
                      onChange={() => {
                        setSourceType(type);
                        setResult(null);
                      }}
                      disabled={loading}
                      style={{ marginRight: '8px' }}
                    />
                    {type === 'SAP' && 'SAP ERP'}
                    {type === 'UTILITY' && 'Utility Bills'}
                    {type === 'TRAVEL' && 'Business Travel'}
                  </label>
                ))}
              </div>
            </div>

            <div style={formatBoxStyle}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Expected Columns:</strong>
              <p style={{ fontSize: '0.8rem', marginTop: '4px', lineHeight: '1.4' }}>{getFormatDescription()}</p>
            </div>

            <div className="form-group" style={{ marginBottom: '30px' }}>
              <label className="form-label" htmlFor="csv-file-input">Select CSV Export</label>
              <input
                type="file"
                id="csv-file-input"
                accept=".csv"
                className="form-input"
                onChange={handleFileChange}
                disabled={loading}
                style={{ padding: '8px 12px' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading || !file}
            >
              {loading ? 'Ingesting Data...' : 'Start Ingest & Normalize'}
            </button>
          </form>
        </div>

        <div>
          {result ? (
            <div className="glass-card animated" style={resultCardStyle}>
              <h3 style={{ color: 'var(--accent-emerald)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✓ Ingestion Completed
              </h3>
              
              <div style={statRowStyle}>
                <span style={statLabelStyle}>File Name:</span>
                <span style={statValueStyle}>{result.file_name}</span>
              </div>
              <div style={statRowStyle}>
                <span style={statLabelStyle}>Source Profile:</span>
                <span style={statValueStyle}>{result.source_type}</span>
              </div>
              <div style={statRowStyle}>
                <span style={statLabelStyle}>Total Records Parsed:</span>
                <span style={statValueStyle}>{result.row_count}</span>
              </div>
              
              <div style={statsSplitStyle}>
                <div style={statBoxStyle('var(--accent-cyan)')}>
                  <div style={statNumberStyle}>{result.normalized_count}</div>
                  <div style={statLabelStyle}>Normalized Clean</div>
                </div>
                <div style={statBoxStyle('var(--accent-rose)')}>
                  <div style={statNumberStyle}>{result.flagged_count}</div>
                  <div style={statLabelStyle}>Flagged with Issues</div>
                </div>
              </div>

              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Data has been loaded into database. Go to the <strong>Review Dashboard</strong> to inspect, resolve flags, and approve records.
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={emptyResultCardStyle}>
              <span style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</span>
              <h4>Batch Report Summary</h4>
              <p style={{ fontSize: '0.85rem', textAlign: 'center', marginTop: '4px' }}>
                Once you select and upload a data export file, the batch metrics profiling will show up here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Styles for custom elements on the Ingestion screen
const radioGroupStyle = {
  display: 'flex',
  gap: '12px',
  marginTop: '8px'
};

function radioLabelStyle(isSelected) {
  return {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: isSelected ? '1px solid var(--border-focus)' : '1px solid var(--border-color)',
    backgroundColor: isSelected ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255, 255, 255, 0.01)',
    cursor: 'pointer',
    fontWeight: isSelected ? '600' : '400',
    fontSize: '0.85rem',
    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
    transition: 'var(--transition)'
  };
}

const formatBoxStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  border: '1px dashed var(--border-color)',
  padding: '12px 16px',
  borderRadius: 'var(--radius-sm)',
  marginBottom: '20px'
};

const resultCardStyle = {
  borderColor: 'rgba(16, 185, 129, 0.3)'
};

const emptyResultCardStyle = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  borderStyle: 'dashed',
  opacity: 0.6
};

const statRowStyle = {
  display: 'flex',
  justifyContent: 'between',
  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  padding: '12px 0',
  fontSize: '0.9rem'
};

const statLabelStyle = {
  color: 'var(--text-secondary)',
  flex: 1
};

const statValueStyle = {
  color: 'var(--text-primary)',
  fontWeight: '600'
};

const statsSplitStyle = {
  display: 'flex',
  gap: '16px',
  marginTop: '24px'
};

function statBoxStyle(color) {
  return {
    flex: 1,
    padding: '16px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderTop: `3px solid ${color}`,
    textAlign: 'center'
  };
}

const statNumberStyle = {
  fontSize: '1.5rem',
  fontWeight: '700',
  color: 'var(--text-primary)',
  marginBottom: '4px'
};
