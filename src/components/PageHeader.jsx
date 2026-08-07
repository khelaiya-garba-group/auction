import React from 'react';
import { Link } from 'react-router-dom';

const PageHeader = ({ title, subtitle, showLogos = true }) => {
  return (
    <header className="page-header container" style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {showLogos && (
        <div className="flex gap-4 items-center" style={{ marginBottom: '1rem' }}>
          {/* Default Logo Placeholder */}
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '1.2rem' }}>
            CAP
          </div>
        </div>
      )}
      <h1 className="text-center" style={{ fontSize: '2.5rem', color: 'var(--accent-gold)', marginBottom: '0.5rem', textShadow: '0 0 10px rgba(255, 215, 0, 0.3)' }}>
        {title}
      </h1>
      {subtitle && <p className="text-muted text-center" style={{ fontSize: '1.1rem' }}>{subtitle}</p>}

      <nav className="flex gap-4" style={{ marginTop: '1.5rem' }}>
        <Link to="/" className="text-muted" style={{ fontSize: '0.9rem' }}>Home</Link>
        {/* <Link to="/players" className="text-muted" style={{ fontSize: '0.9rem' }}>View Players</Link> */}
        <Link to="/register" className="text-muted" style={{ fontSize: '0.9rem' }}>Register</Link>
      </nav>
    </header>
  );
};

export default PageHeader;
