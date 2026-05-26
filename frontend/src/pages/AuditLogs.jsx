import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Debounce the query input to update search param after 300ms
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearch(query);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Fetch audit logs whenever search parameter updates
  useEffect(() => {
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

    fetchAuditLogs();
  }, [search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(query);
  };

  return (
    <div className="animated">
      <div className="mb-40">
        <h1>Audit Ledger</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Tenant-wide immutable history of data amendments, state locks, and analyst overrides.</p>
      </div>

      {/* Search filters */}
      <div className="glass-card mb-30" style={{ padding: '16px 20px' }}>
        <form onSubmit={handleSearchSubmit} style={searchFormStyle}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by justification reason, analyst username, or record UUID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ padding: '10px 40px 10px 14px' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={clearSearchButtonStyle}
                title="Clear Search"
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', flexShrink: 0 }}>
            🔍 Query
          </button>
        </form>
      </div>

      {error && <div className="error-card">⚠️ {error}</div>}

      {loading ? (
        <div className="timeline-container" style={{ marginTop: '20px' }}>
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="timeline-node">
              <div className="timeline-card">
                <div className="skeleton" style={{ height: '18px', width: '200px', marginBottom: '8px' }}></div>
                <div className="skeleton" style={{ height: '16px', width: '150px', marginBottom: '12px' }}></div>
                <div className="skeleton" style={{ height: '40px', width: '100%' }}></div>
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>🔍</span>
          {search ? (
            <>
              <h4>No matching audit records</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
                We couldn't find any audit trails matching "{search}". Try checking the spelling or resetting query filters.
              </p>
              <button onClick={() => setQuery('')} className="btn btn-secondary" style={{ marginTop: '16px' }}>
                Reset Search
              </button>
            </>
          ) : (
            <>
              <h4>No audit events recorded yet</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
                Record edits, approvals, or rejections will automatically register in the immutable ledger.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="timeline-container" style={{ marginTop: '10px' }}>
          {logs.map((log) => {
            const fieldsCount = Object.keys(log.old_values).length;
            const isApproval = fieldsCount === 0;

            return (
              <div key={log.id} className="timeline-node">
                <div className="timeline-card">
                  <div style={timelineHeaderStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        👤 {log.changed_by_username}
                      </span>
                      <span className={`badge ${isApproval ? 'badge-approved' : 'badge-normalized'}`} style={{ fontSize: '0.65rem' }}>
                        {isApproval ? 'Approval & Lock' : 'Record Edited'}
                      </span>
                    </div>
                    <span style={timestampStyle}>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>

                  <div style={actionRowStyle}>
                    <span>
                      {isApproval ? (
                        <span>Approved and lock-secured record </span>
                      ) : (
                        <span>Amended data fields on record </span>
                      )}
                      <span 
                        onClick={() => navigate(`/records/${log.record}`)}
                        style={recordLinkStyle}
                        title="View Parent Record details"
                      >
                        {log.record.substring(0, 8)}...
                      </span>
                    </span>
                  </div>

                  {log.reason && (
                    <p style={reasonStyle}>
                      <strong>Justification:</strong> "{log.reason}"
                    </p>
                  )}

                  {!isApproval && (
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
            );
          })}
        </div>
      )}
    </div>
  );
}

// Inline styles
const searchFormStyle = {
  display: 'flex',
  gap: '12px'
};

const clearSearchButtonStyle = {
  position: 'absolute',
  right: '12px',
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  padding: '6px',
  transition: 'var(--transition)'
};

const timelineHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px'
};

const timestampStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)'
};

const actionRowStyle = {
  fontSize: '0.85rem',
  color: 'var(--text-secondary)',
  marginBottom: '8px'
};

const recordLinkStyle = {
  color: 'var(--accent-cyan)',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontWeight: '600'
};

const reasonStyle = {
  fontSize: '0.85rem',
  color: 'var(--text-secondary)',
  fontStyle: 'italic',
  background: 'rgba(0,0,0,0.1)',
  padding: '8px 12px',
  borderRadius: '4px',
  borderLeft: '2px solid var(--border-color)',
  lineHeight: '1.4',
  marginBottom: '6px'
};

const updatesBoxStyle = {
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  padding: '8px 12px',
  fontSize: '0.75rem',
  marginTop: '10px'
};

const fieldUpdateRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '4px 0'
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
