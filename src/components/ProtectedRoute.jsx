import React, { useState, useEffect } from 'react';
import PageHeader from './PageHeader';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const authFlag = localStorage.getItem('cap_admin_auth');
    if (authFlag === 'true') {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'auction5454' || password === 'malang@2026') {
      setIsAuthenticated(true);
      localStorage.setItem('cap_admin_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Incorrect password');
    }
  };

  if (isChecking) return null;

  if (!isAuthenticated) {
    return (
      <div className="flex-col min-h-screen">
        <PageHeader title="Access Restricted" showLogos={false} />
        <main className="container flex-col items-center justify-center p-4" style={{ flex: 1 }}>
          <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)', letterSpacing: '1px' }}>ENTER ACCESS PASSWORD</h3>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input"
                placeholder="Password"
                required
              />
              {loginError && <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0' }}>{loginError}</p>}
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Unlock Site</button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
