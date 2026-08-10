import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

const PageHeader = ({ title, subtitle, showLogos = true, showNav = true, mode = 'auto' }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const auctionCode = searchParams.get('code') || localStorage.getItem('cap_admin_selected_auction_code');

  const getLinkWithCode = (path) => {
    if (!auctionCode) return path;
    return `${path}?code=${encodeURIComponent(auctionCode)}`;
  };

  const adminPaths = [
    '/admin',
    '/live-auction',
    '/auction',
    '/admin-players',
    '/auction-teams',
    '/admin-owners',
    '/admin-sponsors',
    '/admin-invitations',
    '/team-details',
    '/admin-draw',
    '/draw',
    '/players',
    '/player'
  ];

  const isAdminRoute = mode === 'admin' || (mode === 'auto' && adminPaths.some(p => location.pathname === p || location.pathname.startsWith(p)));

  const publicNavItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/team-budget', label: 'Squad Purses', icon: '🛡️' },
    { path: '/all-players', label: 'Players Pool', icon: '👥' },
    { path: '/stats', label: 'Auction Stats', icon: '📊' },
    { path: '/live-auction-projector', label: 'Live Screen', icon: '📺' },
    { path: '/register', label: 'Register', icon: '📝' },
    { path: '/pricing', label: 'Pricing', icon: '💰' }
  ];

  const adminNavItems = [
    { path: '/admin', label: 'Dashboard', icon: '🎛️' },
    { path: '/live-auction', label: 'Live Bidding', icon: '⚡' },
    { path: '/auction', label: 'Setup', icon: '🏆' },
    { path: '/admin-players', label: 'Players Pool', icon: '👥' },
    { path: '/auction-teams', label: 'Teams', icon: '🛡️' },
    { path: '/admin-owners', label: 'Owners', icon: '👑' },
    { path: '/admin-sponsors', label: 'Sponsors', icon: '🌟' },
    { path: '/admin-invitations', label: 'Share Links', icon: '🔗' },
    { path: '/team-details', label: 'Purses', icon: '📊' },
    { path: '/admin-draw', label: 'Draw', icon: '🎲' }
  ];

  const navItems = isAdminRoute ? adminNavItems : publicNavItems;

  return (
    <header className="page-header container" style={{ padding: '1.5rem 1rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {showLogos && (
        <div className="flex gap-4 items-center" style={{ marginBottom: '0.8rem' }}>
          <div style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-green), #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            fontWeight: '900',
            fontSize: '1.1rem',
            boxShadow: '0 0 15px rgba(57,255,20,0.3)'
          }}>
            CAP
          </div>
        </div>
      )}

      {title && (
        <h1 className="text-center" style={{ fontSize: '2.2rem', color: 'var(--accent-gold)', marginBottom: '0.3rem', textShadow: '0 0 10px rgba(255, 215, 0, 0.3)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
          {title}
        </h1>
      )}
      {subtitle && <p className="text-muted text-center" style={{ fontSize: '0.95rem', margin: 0, maxWidth: '600px' }}>{subtitle}</p>}

      {showNav && (
        <nav style={{
          marginTop: '1.2rem',
          display: 'flex',
          gap: '0.35rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          background: isAdminRoute ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.75)',
          padding: '0.4rem 0.6rem',
          borderRadius: '50px',
          border: isAdminRoute ? '1px solid rgba(255, 215, 0, 0.25)' : '1px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(10px)',
          boxShadow: isAdminRoute ? '0 8px 25px rgba(255, 215, 0, 0.15)' : '0 8px 20px rgba(0, 0, 0, 0.4)',
          maxWidth: '100%',
          overflowX: 'auto'
        }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={getLinkWithCode(item.path)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '25px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 'bold' : '600',
                  color: isActive ? '#000' : 'var(--text-main)',
                  background: isActive
                    ? (isAdminRoute ? 'linear-gradient(135deg, var(--accent-gold), #f59e0b)' : 'linear-gradient(135deg, var(--accent-green), #059669)')
                    : 'transparent',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  boxShadow: isActive ? (isAdminRoute ? '0 0 12px rgba(255, 215, 0, 0.4)' : '0 0 12px rgba(57, 255, 20, 0.4)') : 'none'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
};

export default PageHeader;
