import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getGlobalAuditLogs({ search });
      setLogs(data.results || data);
    } catch (err) {
      console.error(err);
      setError('Failed to load global audit log ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAuditLogs();
  };

  return (
    <div className="animated">
      <div className="mb-40">
        <h1>Audit Ledger</h1>
        <p>Tenant-wide immutable history of data amendments, state locks, and analyst overrides.</p>
      </div>

      {/* Search filters */}
      <div className="glass-card mb-20" style={{ padding: '16px 24px' }}>
        <form onSubmit={handleSearchSubmit} style={searchFormStyle}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by justification reason, analyst username, or record UUID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '10px 16px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
            🔍 Query Ledger
          </button>
        </form>
      </div>

      {error && <div className="error-card">⚠️ {error}</div>}

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
          <span>⌛ Querying secure audit records...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
          <p>No audit trail records found matching filters.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Timestamp</th>
                <th style={{ width: '120px' }}>Analyst</th>
                <th>Record Association</th>
                <th>Changes Logged</th>
                <th>Modification Justification</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const fieldsCount = Object.keys(log.old_values).length;
                return (
                  <tr key={log.id}>
                    <td style={timestampCellStyle}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: '600' }}>
                      👤 {log.changed_by_username}
                    </td>
                    <td>
                      <span 
                        onClick={() => navigate(`/records/${log.record}`)}
                        style={recordLinkStyle}
                      >
                        {log.record.substring(0, 8)}...
                      </span>
                    </td>
                    <td>
                      {fieldsCount > 0 ? (
                        <div style={fieldsGridStyle}>
                          {Object.entries(log.old_values).map(([field, old_val]) => (
                            <div key={field} style={fieldRowStyle}>
                              <code style={codeFieldNameStyle}>{field}</code>
                              <span style={diffValuesStyle}>
                                <span style={deletedStyle}>{old_val}</span>
                                <span>→</span>
                                <span style={addedStyle}>{log.new_values[field]}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={lockLogStyle}>🔒 State Lock / Approval Event</span>
                      )}
                    </td>
                    <td style={reasonCellStyle}>
                      "{log.reason}"
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Inline styles for the audit ledger timeline
const searchFormStyle = {
  display: 'flex',
  gap: '16px'
};

const timestampCellStyle = {
  fontSize: '0.85rem',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)'
};

const recordLinkStyle = {
  color: 'var(--accent-cyan)',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontWeight: '500'
};

const fieldsGridStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: '0.8rem'
};

const fieldRowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  background: 'rgba(0,0,0,0.15)',
  padding: '6px 10px',
  borderRadius: '4px',
  border: '1px solid rgba(255,255,255,0.03)'
};

const codeFieldNameStyle = {
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontWeight: '600'
};

const diffValuesStyle = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center'
};

const deletedStyle = {
  color: 'var(--accent-rose)',
  textDecoration: 'line-through'
};

const addedStyle = {
  color: 'var(--accent-emerald)',
  fontWeight: '600'
};

const lockLogStyle = {
  fontSize: '0.8rem',
  color: 'var(--accent-emerald)',
  fontWeight: '600',
  backgroundColor: 'rgba(16, 185, 129, 0.08)',
  padding: '4px 8px',
  borderRadius: '4px',
  display: 'inline-block'
};

const reasonCellStyle = {
  fontSize: '0.875rem',
  color: 'var(--text-primary)',
  fontStyle: 'italic',
  lineHeight: '1.4'
};
