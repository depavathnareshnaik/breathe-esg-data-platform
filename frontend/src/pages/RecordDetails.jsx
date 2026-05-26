import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function RecordDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Editable form fields
  const [quantity, setQuantity] = useState('');
  const [sourceUnit, setSourceUnit] = useState('');
  const [date, setDate] = useState('');
  const [confidence, setConfidence] = useState('');
  
  // Audit details
  const [reason, setReason] = useState('');
  const [auditHistory, setAuditHistory] = useState([]);
  
  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadRecordData = async () => {
    setLoading(true);
    setError('');
    try {
      const recData = await api.getRecord(id);
      setRecord(recData);
      
      // Initialize form values
      setQuantity(recData.quantity);
      setSourceUnit(recData.source_unit);
      setDate(recData.date);
      setConfidence(recData.confidence);
      
      // Fetch audits history
      const audits = await api.getRecordAuditHistory(id);
      setAuditHistory(audits);
    } catch (err) {
      console.error(err);
      setError('Failed to load record details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecordData();
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A reason for change is required to modify this record.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await api.updateRecord(id, {
        quantity: parseFloat(quantity),
        source_unit: sourceUnit,
        date: date,
        confidence: parseFloat(confidence)
      }, reason);
      
      setSuccessMsg('Record updated successfully.');
      setReason('');
      loadRecordData(); // reload fresh state
    } catch (err) {
      console.error(err);
      setError(err.reason || err.error || 'Failed to update record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    const note = prompt('Enter optional verification note:', 'Approved after review');
    if (note === null) return;
    
    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await api.approveRecord(id, note);
      setSuccessMsg('Record approved and locked successfully.');
      loadRecordData();
    } catch (err) {
      setError(err.error || 'Failed to approve record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reasonStr = prompt('Enter reason for rejection (required):');
    if (!reasonStr || !reasonStr.trim()) {
      alert('Rejection reason is required.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await api.rejectRecord(id, reasonStr);
      setSuccessMsg('Record rejected. Reverted status to Flagged.');
      loadRecordData();
    } catch (err) {
      setError(err.error || 'Failed to reject record.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card animated" style={{ textAlign: 'center', padding: '60px' }}>
        <span>⌛ Loading record details...</span>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="glass-card animated">
        <h3>Record Not Found</h3>
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary mt-20">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isApproved = record.status === 'APPROVED';

  return (
    <div className="animated">
      <div className="mb-40 flex align-center gap-10">
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
          ← Back
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1>Record Detail Inspector</h1>
            <span className={`badge ${isApproved ? 'badge-approved' : record.status === 'FLAGGED' ? 'badge-flagged' : 'badge-normalized'}`}>
              {record.status}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>UUID: {record.id}</p>
        </div>
      </div>

      {error && <div className="error-card">⚠️ {error}</div>}
      {successMsg && <div style={successBannerStyle}>✓ {successMsg}</div>}

      <div className="grid-2">
        {/* Left Column: Record Information */}
        <div className="glass-card">
          {/* Carbon Metric Highlight Card */}
          <div style={carbonHighlightCardStyle}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Calculated Carbon Footprint
            </span>
            <h2 style={{ fontSize: '1.75rem', color: 'var(--accent-cyan)', margin: '4px 0' }}>
              {record.co2e_emissions 
                ? `${parseFloat(record.co2e_emissions).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg CO2e`
                : 'N/A'}
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Normalized Calculation Unit: <strong>{record.normalized_unit}</strong>
            </span>
          </div>

          <form onSubmit={handleSave}>
            {/* Group 1: Activity Classification */}
            <div style={fieldGroupHeaderStyle}>1. Activity Classification</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Classification Scope</label>
                <input type="text" className="form-input" value={`Scope ${record.scope}`} readOnly style={readOnlyInputStyle} />
              </div>
              <div className="form-group">
                <label className="form-label">Emission Category</label>
                <input type="text" className="form-input" value={record.category.replace('_', ' ')} readOnly style={readOnlyInputStyle} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Activity Type Specifier</label>
              <input type="text" className="form-input" value={record.activity_type} readOnly style={readOnlyInputStyle} />
            </div>

            {/* Group 2: Activity Ingestion details */}
            <div style={fieldGroupHeaderStyle}>2. Activity Ingestion Details</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={isApproved || actionLoading}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Source Unit</label>
                <input
                  type="text"
                  className="form-input"
                  value={sourceUnit}
                  onChange={(e) => setSourceUnit(e.target.value)}
                  disabled={isApproved || actionLoading}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Activity Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isApproved || actionLoading}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confidence Coefficient (0.0 - 1.0)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  className="form-input"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  disabled={isApproved || actionLoading}
                  required
                />
              </div>
            </div>

            {!isApproved && (
              <>
                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label className="form-label" htmlFor="reason-input">Reason for Modification (Mandatory)</label>
                  <textarea
                    id="reason-input"
                    className="form-input"
                    rows="3"
                    placeholder="Describe the revision details for the auditor logs..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={actionLoading}
                    style={{ resize: 'vertical' }}
                    required
                  />
                </div>

                <div style={actionsRowStyle}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading || !reason.trim()}
                  >
                    💾 Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    className="btn btn-success"
                    disabled={actionLoading}
                  >
                    ✓ Approve & Lock
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    className="btn btn-danger"
                    disabled={actionLoading}
                  >
                    ✗ Reject
                  </button>
                </div>
              </>
            )}

            {isApproved && (
              <div style={lockedBannerStyle}>
                🔒 <strong>Immutable Carbon Record</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  This record is approved and locked. Database constraints prevent further modifications to maintain audit ledger integrity.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Validation + Audit Trail */}
        <div style={rightColumnStyle}>
          {/* Validation Issues */}
          <div className="glass-card">
            <h3 className="mb-20">Compliance Validation Flags</h3>
            {record.validation_issues && record.validation_issues.length > 0 ? (
              <div style={issuesListStyle}>
                {record.validation_issues.map((iss) => (
                  <div key={iss.id} style={issueCardStyle(iss.severity)}>
                    <strong>⚠️ {iss.rule_name} ({iss.severity})</strong>
                    <p style={{ fontSize: '0.85rem', marginTop: '2px', opacity: 0.9 }}>{iss.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={cleanIssuesStyle}>
                <span style={{ fontSize: '1.25rem' }}>✓</span>
                <p style={{ color: 'var(--accent-emerald)', fontWeight: '500' }}>Clean. No active validation failures detected.</p>
              </div>
            )}
          </div>

          {/* Audit ledger timeline */}
          <div className="glass-card" style={{ flex: 1 }}>
            <h3 className="mb-20">Audit Trail Ledger</h3>
            {auditHistory.length > 0 ? (
              <div className="timeline-container">
                {auditHistory.map((log) => (
                  <div key={log.id} className="timeline-node">
                    <div className="timeline-card">
                      <div style={timelineHeaderStyle}>
                        <span style={timelineUserStyle}>👤 {log.changed_by_username}</span>
                        <span style={timelineTimeStyle}>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p style={timelineReasonStyle}>
                        <strong>Reason:</strong> "{log.reason}"
                      </p>
                      
                      {/* Render changed fields list */}
                      {Object.keys(log.old_values).length > 0 && (
                        <div style={updatesBoxStyle}>
                          {Object.entries(log.old_values).map(([field, old_val]) => (
                            <div key={field} style={fieldUpdateRowStyle}>
                              <span style={fieldNameStyle}>{field}</span>
                              <span style={fieldDiffStyle}>
                                <span style={deletedValStyle}>{old_val}</span>
                                <span style={{ color: 'var(--text-muted)' }}>→</span>
                                <span style={addedValStyle}>{log.new_values[field]}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={emptyAuditStyle}>
                <p>No audit events recorded yet. Record edits or approvals will spawn ledger entries.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline Styles
const successBannerStyle = {
  backgroundColor: 'rgba(16, 185, 129, 0.08)',
  border: '1px solid rgba(16, 185, 129, 0.2)',
  color: 'var(--accent-emerald)',
  borderRadius: 'var(--radius-sm)',
  padding: '12px 16px',
  fontSize: '0.9rem',
  marginBottom: '20px'
};

const carbonHighlightCardStyle = {
  backgroundColor: 'var(--bg-tertiary)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '16px',
  marginBottom: '24px',
  display: 'flex',
  flexDirection: 'column'
};

const fieldGroupHeaderStyle = {
  fontSize: '0.8rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--accent-primary)',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '6px',
  marginBottom: '16px',
  marginTop: '8px'
};

const readOnlyInputStyle = {
  backgroundColor: 'rgba(255,255,255,0.01)',
  borderColor: 'rgba(255,255,255,0.04)',
  color: 'var(--text-secondary)'
};

const actionsRowStyle = {
  display: 'flex',
  gap: '10px',
  marginTop: '20px',
  flexWrap: 'wrap'
};

const lockedBannerStyle = {
  border: '1px solid rgba(16, 185, 129, 0.2)',
  backgroundColor: 'rgba(16, 185, 129, 0.04)',
  padding: '14px 16px',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--accent-emerald)',
  marginTop: '20px'
};

const rightColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px'
};

const issuesListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

function issueCardStyle(severity) {
  const isError = severity === 'ERROR';
  return {
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    borderLeft: `3px solid ${isError ? 'var(--accent-rose)' : 'var(--accent-amber)'}`,
    backgroundColor: isError ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)',
    color: isError ? '#fca5a5' : '#fde047'
  };
}

const cleanIssuesStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: 'var(--accent-emerald)',
  padding: '8px 0'
};

const timelineHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.8rem',
  marginBottom: '4px'
};

const timelineUserStyle = {
  fontWeight: '600',
  color: 'var(--text-primary)'
};

const timelineTimeStyle = {
  color: 'var(--text-muted)'
};

const timelineReasonStyle = {
  fontSize: '0.85rem',
  color: 'var(--text-secondary)',
  fontStyle: 'italic',
  lineHeight: '1.4'
};

const updatesBoxStyle = {
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  padding: '6px 10px',
  marginTop: '8px',
  fontSize: '0.75rem'
};

const fieldUpdateRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '3px 0'
};

const fieldNameStyle = {
  color: 'var(--text-secondary)',
  fontWeight: '550',
  fontFamily: 'var(--font-mono)'
};

const fieldDiffStyle = {
  display: 'flex',
  gap: '6px',
  alignItems: 'center'
};

const deletedValStyle = {
  color: 'var(--accent-rose)',
  textDecoration: 'line-through'
};

const addedValStyle = {
  color: 'var(--accent-emerald)',
  fontWeight: '600'
};

const emptyAuditStyle = {
  color: 'var(--text-muted)',
  fontSize: '0.85rem',
  textAlign: 'center',
  padding: '24px 0'
};
