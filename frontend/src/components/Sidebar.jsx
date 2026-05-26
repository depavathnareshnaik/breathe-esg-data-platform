import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../services/api';

export default function Sidebar({ collapsed = false, setCollapsed }) {
  const navigate = useNavigate();
  const user = auth.getUser();

  const handleLogout = () => {
    auth.clearSession();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div style={collapsed ? logoContainerCollapsedStyle : logoContainerStyle}>
        <div style={logoGlowStyle}></div>
        {!collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={logoTextStyle}>Breathe ESG</span>
            <span style={logoSubTextStyle}>Platform</span>
          </div>
        ) : (
          <span style={{ ...logoTextStyle, fontSize: '1.5rem' }}>B</span>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          style={collapseToggleStyle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav style={navStyle}>
        <NavLink 
          to="/dashboard" 
          style={({ isActive }) => getNavLinkStyle(isActive, collapsed)}
          title="Review Dashboard"
        >
          <span style={{ fontSize: '1.1rem' }}>📊</span>
          {!collapsed && <span style={{ marginLeft: '12px' }}>Review Dashboard</span>}
        </NavLink>
        <NavLink 
          to="/upload" 
          style={({ isActive }) => getNavLinkStyle(isActive, collapsed)}
          title="Ingest Cargo"
        >
          <span style={{ fontSize: '1.1rem' }}>📤</span>
          {!collapsed && <span style={{ marginLeft: '12px' }}>Ingest Cargo</span>}
        </NavLink>
        <NavLink 
          to="/audit" 
          style={({ isActive }) => getNavLinkStyle(isActive, collapsed)}
          title="Audit Ledger"
        >
          <span style={{ fontSize: '1.1rem' }}>📜</span>
          {!collapsed && <span style={{ marginLeft: '12px' }}>Audit Ledger</span>}
        </NavLink>
      </nav>

      <div style={footerStyle}>
        <div style={collapsed ? collapsedProfileCardStyle : profileCardStyle}>
          <div style={avatarStyle}>
            {user.username[0].toUpperCase()}
          </div>
          {!collapsed && (
            <div style={infoStyle}>
              <div style={nameStyle}>{user.username}</div>
              <div style={tenantStyle}>{user.tenant_name}</div>
              <div style={roleBadgeStyle(user.role)}>{user.role}</div>
            </div>
          )}
        </div>
        <button onClick={handleLogout} style={collapsed ? collapsedLogoutButtonStyle : logoutButtonStyle} title="Log Out">
          <span>🚪</span>
          {!collapsed && <span style={{ marginLeft: '8px' }}>Log Out</span>}
        </button>
      </div>
    </aside>
  );
}

// Inline CSS for structures
const logoContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '36px',
  position: 'relative'
};

const logoContainerCollapsedStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '36px',
  position: 'relative'
};

const logoGlowStyle = {
  position: 'absolute',
  top: '-10px',
  left: '-10px',
  width: '60px',
  height: '60px',
  background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0) 70%)',
  pointerEvents: 'none'
};

const logoTextStyle = {
  fontSize: '1.25rem',
  fontWeight: '700',
  letterSpacing: '-0.02em',
  color: 'var(--accent-primary)'
};

const logoSubTextStyle = {
  fontSize: '0.7rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--text-muted)',
  marginTop: '1px'
};

const collapseToggleStyle = {
  backgroundColor: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-secondary)',
  borderRadius: '4px',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.65rem',
  cursor: 'pointer',
  transition: 'var(--transition)'
};

const navStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  flex: 1
};

function getNavLinkStyle(isActive, collapsed) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
    border: isActive ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
    textDecoration: 'none',
    fontWeight: isActive ? '600' : '400',
    fontSize: '0.9rem',
    transition: 'var(--transition)'
  };
}

const footerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  borderTop: '1px solid var(--border-color)',
  paddingTop: '16px'
};

const profileCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  background: 'rgba(255,255,255,0.01)',
  padding: '10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)'
};

const collapsedProfileCardStyle = {
  display: 'flex',
  justifyContent: 'center',
  background: 'transparent',
  padding: '4px 0',
  border: 'none'
};

const avatarStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, #1e1b4b 100%)',
  color: 'var(--accent-primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '600',
  fontSize: '1rem',
  border: '1px solid var(--border-color)',
  flexShrink: 0
};

const infoStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  flex: 1,
  overflow: 'hidden'
};

const nameStyle = {
  fontSize: '0.85rem',
  fontWeight: '600',
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const tenantStyle = {
  fontSize: '0.7rem',
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

function roleBadgeStyle(role) {
  const isAdmin = role === 'ADMIN';
  return {
    display: 'inline-block',
    alignSelf: 'flex-start',
    fontSize: '0.6rem',
    fontWeight: '700',
    padding: '1px 5px',
    borderRadius: '3px',
    backgroundColor: isAdmin ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
    color: isAdmin ? 'var(--accent-rose)' : 'var(--accent-emerald)',
    textTransform: 'uppercase',
    marginTop: '1px'
  };
}

const logoutButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px',
  fontSize: '0.85rem',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  width: '100%',
  fontWeight: '500',
  backgroundColor: 'rgba(255,255,255,0.01)',
  transition: 'var(--transition)'
};

const collapsedLogoutButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px',
  fontSize: '1rem',
  color: 'var(--text-secondary)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  width: '100%',
  backgroundColor: 'transparent',
  transition: 'var(--transition)'
};
