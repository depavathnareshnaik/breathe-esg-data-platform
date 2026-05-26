import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../services/api';

export default function Sidebar() {
  const navigate = useNavigate();
  const user = auth.getUser();

  const handleLogout = () => {
    auth.clearSession();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <aside className="sidebar">
      <div style={logoContainerStyle}>
        <div style={logoGlowStyle}></div>
        <span style={logoTextStyle}>Breathe ESG</span>
        <span style={logoSubTextStyle}>Platform</span>
      </div>

      <nav style={navStyle}>
        <NavLink 
          to="/dashboard" 
          style={({ isActive }) => getNavLinkStyle(isActive)}
        >
          📊 Review Dashboard
        </NavLink>
        <NavLink 
          to="/upload" 
          style={({ isActive }) => getNavLinkStyle(isActive)}
        >
          📤 Ingest Cargo
        </NavLink>
        <NavLink 
          to="/audit" 
          style={({ isActive }) => getNavLinkStyle(isActive)}
        >
          📜 Audit ledger
        </NavLink>
      </nav>

      <div style={footerStyle}>
        <div style={profileCardStyle}>
          <div style={avatarStyle}>
            {user.username[0].toUpperCase()}
          </div>
          <div style={infoStyle}>
            <div style={nameStyle}>{user.username}</div>
            <div style={tenantStyle}>{user.tenant_name}</div>
            <div style={roleBadgeStyle(user.role)}>{user.role}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={logoutButtonStyle}>
          🚪 Log Out
        </button>
      </div>
    </aside>
  );
}


const logoContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  marginBottom: '40px',
  position: 'relative'
};

const logoGlowStyle = {
  position: 'absolute',
  top: '-10px',
  left: '-10px',
  width: '60px',
  height: '60px',
  background: 'radial-gradient(circle, rgba(0,242,254,0.15) 0%, rgba(0,0,0,0) 70%)',
  pointerEvents: 'none'
};

const logoTextStyle = {
  fontSize: '1.4rem',
  fontWeight: '700',
  letterSpacing: '-0.02em',
  background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};

const logoSubTextStyle = {
  fontSize: '0.75rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--text-muted)',
  marginTop: '2px'
};

const navStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  flex: 1
};

function getNavLinkStyle(isActive) {
  return {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
    border: isActive ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
    textDecoration: 'none',
    fontWeight: isActive ? '600' : '400',
    fontSize: '0.95rem',
    transition: 'var(--transition)'
  };
}

const footerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  borderTop: '1px solid var(--border-color)',
  paddingTop: '20px'
};

const profileCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: 'rgba(255,255,255,0.02)',
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)'
};

const avatarStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--accent-blue) 0%, #312e81 100%)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '600',
  fontSize: '1.1rem',
  border: '1px solid rgba(255,255,255,0.1)'
};

const infoStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  flex: 1,
  overflow: 'hidden'
};

const nameStyle = {
  fontSize: '0.9rem',
  fontWeight: '600',
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const tenantStyle = {
  fontSize: '0.75rem',
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
    fontSize: '0.65rem',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: isAdmin ? 'rgba(244,63,94,0.15)' : 'rgba(0,242,254,0.15)',
    color: isAdmin ? 'var(--accent-rose)' : 'var(--accent-cyan)',
    textTransform: 'uppercase',
    marginTop: '2px'
  };
}

const logoutButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '10px',
  fontSize: '0.9rem',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  width: '100%',
  fontWeight: '500',
  backgroundColor: 'rgba(255,255,255,0.01)',
  transition: 'var(--transition)'
};
