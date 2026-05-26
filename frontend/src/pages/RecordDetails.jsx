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
      const updated = await api.updateRecord(id, {
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
        <span>⌛ Loading record detail profiles...</span>
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
            <h1>Record Details</h1>
            <span className={`badge ${isApproved ? 'badge-approved' : 'badge-pending'}`}>
              {record.status}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem' }}>UUID: {record.id}</p>
        </div>
      </div>

      {error && <div className="error-card">⚠️ {error}</div>}
      {successMsg && <div style={successBannerStyle}>✓ {successMsg}</div>}

      <div className="grid-2">
        {/* Left Column: Form details */}
        <div className="glass-card">
          <h3 className="mb-20">Data Configuration</h3>
          
          <form onSubmit={handleSave}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Scope</label>
                <input type="text" className="form-input" value={`Scope ${record.scope}`} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input type="text" className="form-input" value={record.category} readOnly />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Activity Type</label>
              <input type="text" className="form-input" value={record.activity_type} readOnly />
            </div>

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
                <label className="form-label">Date</label>
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
                <label className="form-label">Confidence Profile</label>
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

            <div style={calculationsBoxStyle}>
              <div style={calcRowStyle}>
                <span>Calculated Footprint:</span>
                <strong style={{ color: 'var(--accent-cyan)' }}>
                  {record.co2e_emissions 
                    ? `${parseFloat(record.co2e_emissions).toLocaleString(undefined, { maximumFractionDigits: 4 })} kg CO2e`
                    : 'N/A'}
                </strong>
              </div>
              <div style={calcRowStyle}>
                <span>Normalization Unit:</span>
                <span>{record.normalized_unit}</span>
              </div>
            </div>

            {!isApproved && (
              <>
                <div className="form-group" style={{ marginTop: '24px' }}>
                  <label className="form-label" htmlFor="reason-input">Reason for Modification (Required)</label>
                  <textarea
                    id="reason-input"
                    className="form-input"
                    rows="3"
                    placeholder="Provide details about why this record is being updated..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={actionLoading}
                    style={{ resize: 'vertical' }}
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
                🔒 <strong>Immutable Record</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  This record is approved and locked. Database constraints prevent further modifications to maintain audit logs validity.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Validation issues & Audits history */}
        <div style={rightColumnStyle}>
          {/* Validation issues card */}
          <div className="glass-card">
            <h3 className="mb-20">Compliance Validation Flags</h3>
            {record.validation_issues && record.validation_issues.length > 0 ? (
              <div style={issuesListStyle}>
                {record.validation_issues.map((iss) => (
                  <div key={iss.id} style={issueCardStyle(iss.severity)}>
                    <strong>{iss.rule_name} ({iss.severity})</strong>
                    <p style={{ fontSize: '0.85rem', marginTop: '2px', opacity: 0.9 }}>{iss.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={cleanIssuesStyle}>
                <span>✓</span>
                <p>Clean. No active validation failures detected.</p>
              </div>
            )}
          </div>

          {/* Audit trail card */}
          <div className="glass-card" style={{ flex: 1 }}>
            <h3 className="mb-20">Audit Trail Ledger</h3>
            {auditHistory.length > 0 ? (
              <div style={timelineStyle}>
                {auditHistory.map((log) => (
                  <div key={log.id} style={timelineItemStyle}>
                    <div style={timelineHeaderStyle}>
                      <span style={timelineUserStyle}>{log.changed_by_username}</span>
                      <span style={timelineTimeStyle}>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p style={timelineReasonStyle}>
                      <strong>Reason:</strong> "{log.reason}"
                    </p>
                    
                    {/* Render specific field updates details */}
                    {Object.keys(log.old_values).length > 0 && (
                      <div style={updatesBoxStyle}>
                        {Object.entries(log.old_values).map(([field, old_val]) => (
                          <div key={field} style={fieldUpdateRowStyle}>
                            <span style={fieldNameStyle}>{field}:</span>
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

// Inline styles for record detail form and timeline logs
const successBannerStyle = {
  backgroundColor: 'rgba(16, 185, 129, 0.08)',
  border: '1px solid rgba(16, 185, 129, 0.2)',
  color: '#a7f3d0',
  borderRadius: 'var(--radius-sm)',
  padding: '16px',
  fontSize: '0.95rem',
  marginBottom: '20px'
};

const calculationsBoxStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '16px',
  marginTop: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const calcRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.9rem',
  color: 'var(--text-secondary)'
};

const actionsRowStyle = {
  display: 'flex',
  gap: '12px',
  marginTop: '24px',
  flexWrap: 'wrap'
};

const lockedBannerStyle = {
  border: '1px solid rgba(16, 185, 129, 0.3)',
  backgroundColor: 'rgba(16, 185, 129, 0.04)',
  padding: '16px',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--accent-emerald)',
  marginTop: '24px'
};

const rightColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px'
};

const issuesListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

function issueCardStyle(severity) {
  const isError = severity === 'ERROR';
  return {
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    borderLeft: `4px solid ${isError ? 'var(--accent-rose)' : 'var(--accent-amber)'}`,
    backgroundColor: isError ? 'rgba(244, 63, 94, 0.04)' : 'rgba(245, 158, 11, 0.04)',
    color: isError ? '#fecdd3' : '#fef3c7'
  };
}

const cleanIssuesStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: 'var(--accent-emerald)',
  padding: '12px 0'
};

const timelineStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  position: 'relative',
  paddingLeft: '16px',
  borderLeft: '1px solid var(--border-color)'
};

const timelineItemStyle = {
  position: 'relative'
};

const timelineHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.85rem',
  marginBottom: '4px'
};

const timelineUserStyle = {
  fontWeight: '600',
  color: 'var(--accent-cyan)'
};

const timelineTimeStyle = {
  color: 'var(--text-muted)'
};

const timelineReasonStyle = {
  fontSize: '0.875rem',
  color: 'var(--text-secondary)',
  fontStyle: 'italic',
  lineHeight: '1.4'
};

const updatesBoxStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.15)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  padding: '8px 12px',
  marginTop: '8px',
  fontSize: '0.8rem'
};

const fieldUpdateRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '4px 0'
};

const fieldNameStyle = {
  color: 'var(--text-secondary)',
  fontWeight: '500'
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
  fontSize: '0.9rem',
  textAlign: 'center',
  padding: '20px 0'
};
