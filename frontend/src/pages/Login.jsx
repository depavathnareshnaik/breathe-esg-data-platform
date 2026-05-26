import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, auth } from '../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // If already authenticated, skip login
    if (auth.isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await api.login(username, password);
      auth.setSession(response.token, response.user);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.non_field_errors?.[0] || err.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={decorBlurLeft}></div>
      <div style={decorBlurRight}></div>

      <div className="glass-card animated" style={loginCardStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Breathe ESG</h2>
          <p style={subtitleStyle}>Ingestion & Analyst Audit Terminal</p>
        </div>

        {error && (
          <div className="error-card" style={{ fontSize: '0.85rem', padding: '12px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. analyst_aerohi"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ padding: '12px' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={credentialsHintStyle}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Demo Profiles: <strong>analyst_aerohi</strong> / <strong>admin_aerohi</strong> / <strong>analyst_alpha</strong>
            <br />
            Credential Password: <code>Password123!</code>
          </p>
        </div>
      </div>
    </div>
  );
}

// Inline styles for login-specific layout positioning
const containerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  width: '100vw',
  backgroundColor: 'var(--bg-primary)',
  position: 'relative',
  overflow: 'hidden',
  padding: '20px'
};

const loginCardStyle = {
  width: '100%',
  maxWidth: '420px',
  padding: '40px 32px',
  zIndex: 10
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '32px'
};

const titleStyle = {
  fontSize: '2rem',
  fontWeight: '700',
  letterSpacing: '-0.02em',
  background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};

const subtitleStyle = {
  fontSize: '0.85rem',
  color: 'var(--text-secondary)',
  marginTop: '4px',
  fontWeight: '500'
};

const credentialsHintStyle = {
  marginTop: '28px',
  paddingTop: '20px',
  borderTop: '1px solid var(--border-color)',
  textAlign: 'center',
  lineHeight: '1.6'
};

const decorBlurLeft = {
  position: 'absolute',
  top: '20%',
  left: '10%',
  width: '350px',
  height: '350px',
  background: 'radial-gradient(circle, rgba(0, 242, 254, 0.08) 0%, rgba(0,0,0,0) 70%)',
  pointerEvents: 'none'
};

const decorBlurRight = {
  position: 'absolute',
  bottom: '15%',
  right: '15%',
  width: '400px',
  height: '400px',
  background: 'radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, rgba(0,0,0,0) 70%)',
  pointerEvents: 'none'
};
