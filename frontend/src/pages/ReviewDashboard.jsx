import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function ReviewDashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Metrics States
  const [metrics, setMetrics] = useState({
    total: 0,
    normalized: 0,
    flagged: 0,
    approved: 0,
    emissions: 0
  });

  const navigate = useNavigate();

  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getRecords({
        status: statusFilter,
        scope: scopeFilter,
        category: categoryFilter,
        search: searchQuery
      });
      setRecords(data.results || data);
      
      // Calculate dashboard metrics based on overall records
      // Realistically we can query these from an API, or compute from retrieved records
      // Since it's a prototype, computing client-side from the tenant's current records list is clean and sufficient
      const allData = await api.getRecords(); // Get all (unfiltered) to compute correct metrics
      const list = allData.results || allData;
      
      const total = list.length;
      const normalized = list.filter(r => r.status === 'NORMALIZED').length;
      const flagged = list.filter(r => r.status === 'FLAGGED').length;
      const approved = list.filter(r => r.status === 'APPROVED').length;
      
      // Calculate approved emissions
      const emissionsSum = list
        .filter(r => r.status === 'APPROVED' && r.co2e_emissions)
        .reduce((sum, r) => sum + parseFloat(r.co2e_emissions), 0);
        
      setMetrics({
        total,
        normalized,
        flagged,
        approved,
        emissions: emissionsSum
      });
    } catch (err) {
      console.error(err);
      setError('Failed to fetch records. Try logging in again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, scopeFilter, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleQuickApprove = async (id, e) => {
    e.stopPropagation(); // Avoid triggering row click navigation
    const comment = prompt("Enter optional verification note:", "Approved via dashboard quick action");
    if (comment === null) return; // User cancelled prompt

    try {
      await api.approveRecord(id, comment);
      fetchRecords();
    } catch (err) {
      alert(err.error || 'Failed to approve record.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-pending">Pending</span>;
      case 'NORMALIZED':
        return <span className="badge badge-normalized">Normalized</span>;
      case 'FLAGGED':
        return <span className="badge badge-flagged">Flagged</span>;
      case 'APPROVED':
        return <span className="badge badge-approved">Approved</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const getScopeBadge = (scope) => {
    return <span className={`badge badge-scope-${scope}`}>Scope {scope}</span>;
  };

  return (
    <div className="animated">
      <div className="mb-40 flex justify-between align-center">
        <div>
          <h1>Review Dashboard</h1>
          <p>Inspect parsed datasets, examine validation flags, and approve immutable records.</p>
        </div>
        <button onClick={fetchRecords} className="btn btn-secondary">
          🔄 Refresh Log
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid-4 mb-40">
        <div className="glass-card">
          <div style={metricTitleStyle}>Total Datapoints</div>
          <div style={metricValueStyle}>{metrics.total}</div>
          <div style={metricSubStyle}>Total records uploaded</div>
        </div>
        <div className="glass-card">
          <div style={metricTitleStyle}>Flagged Items</div>
          <div style={{ ...metricValueStyle, color: 'var(--accent-rose)' }}>{metrics.flagged}</div>
          <div style={metricSubStyle}>Needs review & resolution</div>
        </div>
        <div className="glass-card">
          <div style={metricTitleStyle}>Approved Records</div>
          <div style={{ ...metricValueStyle, color: 'var(--accent-emerald)' }}>{metrics.approved}</div>
          <div style={metricSubStyle}>Locked & audit-complete</div>
        </div>
        <div className="glass-card">
          <div style={metricTitleStyle}>Carbon Ledger Footprint</div>
          <div style={{ ...metricValueStyle, color: 'var(--accent-cyan)' }}>
            {(metrics.emissions / 1000).toFixed(2)} <span style={{ fontSize: '1rem', fontWeight: '500' }}>t CO2e</span>
          </div>
          <div style={metricSubStyle}>Total approved footprint</div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="glass-card mb-20" style={{ padding: '16px 24px' }}>
        <form onSubmit={handleSearchSubmit} style={filterContainerStyle}>
          <div style={filterItemStyle}>
            <label className="form-label" style={filterLabelStyle}>Keyword Search</label>
            <div style={searchWrapperStyle}>
              <input
                type="text"
                className="form-input"
                placeholder="Search vendor, flights, account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '8px 12px' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                🔍
              </button>
            </div>
          </div>

          <div style={filterItemStyle}>
            <label className="form-label" style={filterLabelStyle}>Status</label>
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px' }}
            >
              <option value="">All Statuses</option>
              <option value="NORMALIZED">Normalized (Clean)</option>
              <option value="FLAGGED">Flagged (Issues)</option>
              <option value="APPROVED">Approved (Locked)</option>
            </select>
          </div>

          <div style={filterItemStyle}>
            <label className="form-label" style={filterLabelStyle}>Scope</label>
            <select
              className="form-input"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              style={{ padding: '8px 12px' }}
            >
              <option value="">All Scopes</option>
              <option value="1">Scope 1 - Direct</option>
              <option value="2">Scope 2 - Indirect</option>
              <option value="3">Scope 3 - Value Chain</option>
            </select>
          </div>

          <div style={filterItemStyle}>
            <label className="form-label" style={filterLabelStyle}>Category</label>
            <select
              className="form-input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '8px 12px' }}
            >
              <option value="">All Categories</option>
              <option value="FUEL_COMBUSTION">Fuel Combustion</option>
              <option value="ELECTRICITY">Electricity Usage</option>
              <option value="BUSINESS_TRAVEL">Business Travel</option>
            </select>
          </div>
        </form>
      </div>

      {/* Records Log Table */}
      {error && <div className="error-card">⚠️ {error}</div>}

      {loading ? (
        <div className="glass-card" style={loadingCardStyle}>
          <span>⌛ Loading Records Ledger...</span>
        </div>
      ) : records.length === 0 ? (
        <div className="glass-card" style={emptyCardStyle}>
          <span>📋</span>
          <h4>No Records Found</h4>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            No records matched your filters. Upload fresh files or reset filter choices.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Scope</th>
                <th>Category</th>
                <th>Activity</th>
                <th>Activity Quantity</th>
                <th>Date</th>
                <th>Confidence</th>
                <th>Emissions (kg CO2e)</th>
                <th>Issues</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const issueCount = r.validation_issues?.length || 0;
                return (
                  <tr 
                    key={r.id} 
                    onClick={() => navigate(`/records/${r.id}`)}
                    style={rowStyle}
                  >
                    <td>{getStatusBadge(r.status)}</td>
                    <td>{getScopeBadge(r.scope)}</td>
                    <td style={categoryCellStyle}>{r.category.replace('_', ' ')}</td>
                    <td>{r.activity_type}</td>
                    <td style={{ fontWeight: '600' }}>
                      {parseFloat(r.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })} {r.normalized_unit}
                    </td>
                    <td>{r.date}</td>
                    <td>
                      <div style={confidenceStyle(r.confidence)}>
                        {(parseFloat(r.confidence) * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td style={{ fontWeight: '700', color: r.status === 'APPROVED' ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {r.co2e_emissions 
                        ? parseFloat(r.co2e_emissions).toLocaleString(undefined, { maximumFractionDigits: 1 })
                        : '—'}
                    </td>
                    <td>
                      {issueCount > 0 ? (
                        <span style={issueBadgeStyle}>
                          ⚠️ {issueCount} Flag{issueCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem' }}>✓ Clean</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => navigate(`/records/${r.id}`)} 
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Details
                        </button>
                        {r.status !== 'APPROVED' && (
                          <button 
                            onClick={(e) => handleQuickApprove(r.id, e)} 
                            className="btn btn-success"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Approve
                          </button>
                        )}
                      </div>
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

// Inline styles for review dashboard elements
const metricTitleStyle = {
  fontSize: '0.85rem',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: '600',
  marginBottom: '6px'
};

const metricValueStyle = {
  fontSize: '2rem',
  fontWeight: '700',
  color: 'var(--text-primary)',
  marginBottom: '4px'
};

const metricSubStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)'
};

const filterContainerStyle = {
  display: 'flex',
  gap: '16px',
  flexWrap: 'wrap',
  alignItems: 'center'
};

const filterItemStyle = {
  flex: 1,
  minWidth: '200px'
};

const filterLabelStyle = {
  marginBottom: '4px',
  fontSize: '0.8rem'
};

const searchWrapperStyle = {
  display: 'flex',
  gap: '8px'
};

const loadingCardStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 0',
  color: 'var(--text-secondary)'
};

const emptyCardStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 0',
  opacity: 0.8
};

const rowStyle = {
  cursor: 'pointer',
  transition: 'var(--transition)'
};

const categoryCellStyle = {
  fontSize: '0.8rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)'
};

function confidenceStyle(confidence) {
  const val = parseFloat(confidence);
  let color = 'var(--accent-rose)';
  if (val >= 0.95) color = 'var(--accent-emerald)';
  else if (val >= 0.85) color = 'var(--accent-cyan)';
  else if (val >= 0.7) color = 'var(--accent-amber)';
  return {
    color,
    fontWeight: '600'
  };
}

const issueBadgeStyle = {
  backgroundColor: 'rgba(244,63,94,0.1)',
  border: '1px solid rgba(244,63,94,0.2)',
  color: 'var(--accent-rose)',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '0.8rem',
  fontWeight: '600',
  whiteSpace: 'nowrap'
};
