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
        <p style={{ color: 'var(--text-secondary)' }}>Upload corporate data outputs to parse, normalize, and run compliance validation audits.</p>
      </div>

      {/* Guided Step Indicator */}
      <div className="step-indicator">
        <div className="step-item active">
          <div className="step-number">1</div>
          <span>Upload</span>
        </div>
        <div className="step-separator"></div>
        <div className={`step-item ${result ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <span>Normalize</span>
        </div>
        <div className="step-separator"></div>
        <div className={`step-item ${result ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <span>Review</span>
        </div>
        <div className="step-separator"></div>
        <div className="step-item">
          <div className="step-number">4</div>
          <span>Approve</span>
        </div>
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
                      style={{ display: 'none' }}
                    />
                    {type === 'SAP' && 'SAP ERP'}
                    {type === 'UTILITY' && 'Utility Bills'}
                    {type === 'TRAVEL' && 'Business Travel'}
                  </label>
                ))}
              </div>
            </div>

            <div style={formatBoxStyle}>
              <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Expected Columns:</strong>
              <p style={{ fontSize: '0.8rem', marginTop: '4px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>{getFormatDescription()}</p>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
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

            {/* File Selected Badge */}
            {file && (
              <div style={fileBadgeStyle}>
                <span>📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                <button type="button" onClick={() => {
                  setFile(null);
                  document.getElementById('csv-file-input').value = '';
                }} style={removeFileButtonStyle}>✕</button>
              </div>
            )}

            {/* Upload progress */}
            {loading && (
              <div style={progressContainerStyle}>
                <div style={progressBarStyle}>
                  <div style={progressBarFillStyle}></div>
                </div>
                <p style={progressTextStyle}>Ingesting records and executing validation rules...</p>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading || !file}
              style={{ marginTop: '10px' }}
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
              
              {/* Better batch summary cards */}
              <div style={statsSplitStyle}>
                <div style={statBoxStyle('var(--text-secondary)')}>
                  <div style={statNumberStyle}>{result.row_count}</div>
                  <div style={statLabelStyle}>Total Records</div>
                </div>
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
              <p style={{ fontSize: '0.85rem', textAlign: 'center', marginTop: '6px', color: 'var(--text-secondary)' }}>
                Once you select and upload a data export file, the batch metrics profiling will show up here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline Styles
const radioGroupStyle = {
  display: 'flex',
  gap: '10px',
  marginTop: '6px',
  marginBottom: '16px'
};

function radioLabelStyle(isSelected) {
  return {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
    backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-tertiary)',
    cursor: 'pointer',
    fontWeight: isSelected ? '600' : '400',
    fontSize: '0.85rem',
    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
    transition: 'var(--transition)',
    textAlign: 'center'
  };
}

const formatBoxStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.15)',
  border: '1px solid var(--border-color)',
  padding: '12px 14px',
  borderRadius: 'var(--radius-sm)',
  marginBottom: '16px'
};

const fileBadgeStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  backgroundColor: 'var(--bg-tertiary)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.85rem',
  color: 'var(--text-primary)',
  marginBottom: '16px'
};

const removeFileButtonStyle = {
  color: 'var(--accent-rose)',
  fontSize: '0.9rem',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0 4px'
};

const progressContainerStyle = {
  marginBottom: '16px'
};

const progressBarStyle = {
  width: '100%',
  height: '6px',
  backgroundColor: 'var(--bg-tertiary)',
  borderRadius: '3px',
  overflow: 'hidden'
};

const progressBarFillStyle = {
  height: '100%',
  width: '75%',
  backgroundColor: 'var(--accent-primary)',
  animation: 'shimmer 1.5s infinite linear',
  backgroundImage: 'linear-gradient(90deg, var(--accent-primary) 0%, #34d399 50%, var(--accent-primary) 100%)',
  backgroundSize: '200% 100%'
};

const progressTextStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  marginTop: '6px',
  textAlign: 'center'
};

const resultCardStyle = {
  borderColor: 'rgba(16, 185, 129, 0.2)',
  height: '100%'
};

const emptyResultCardStyle = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  borderStyle: 'dashed',
  borderColor: 'var(--border-color)',
  padding: '60px 24px',
  color: 'var(--text-muted)'
};

const statRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  borderBottom: '1px solid var(--border-color)',
  padding: '10px 0',
  fontSize: '0.85rem'
};

const statLabelStyle = {
  color: 'var(--text-secondary)'
};

const statValueStyle = {
  color: 'var(--text-primary)',
  fontWeight: '600'
};

const statsSplitStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '12px',
  marginTop: '20px'
};

function statBoxStyle(borderColor) {
  return {
    padding: '14px 10px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-tertiary)',
    borderTop: `3px solid ${borderColor}`,
    textAlign: 'center',
    borderLeft: '1px solid var(--border-color)',
    borderRight: '1px solid var(--border-color)',
    borderBottom: '1px solid var(--border-color)'
  };
}

const statNumberStyle = {
  fontSize: '1.35rem',
  fontWeight: '700',
  color: 'var(--text-primary)',
  marginBottom: '2px'
};
