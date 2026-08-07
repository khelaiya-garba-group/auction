import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AdminPage = () => {
  const [auctions, setAuctions] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const { data, error } = await supabase
          .from('auctions')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setAuctions(data || []);
        
        // Initial selected code
        const saved = localStorage.getItem('cap_admin_selected_auction_code');
        if (saved && data.some(a => a.auction_code === saved)) {
          setSelectedCode(saved);
        } else if (data && data.length > 0) {
          setSelectedCode(data[0].auction_code);
          localStorage.setItem('cap_admin_selected_auction_code', data[0].auction_code);
        }
      } catch (err) {
        console.error("Error fetching auctions for admin:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuctions();
  }, []);

  const handleSelectAuction = (code) => {
    setSelectedCode(code);
    localStorage.setItem('cap_admin_selected_auction_code', code);
  };

  const handleLogout = () => {
    localStorage.removeItem('cap_admin_auth');
    localStorage.removeItem('cap_admin_selected_auction_code');
    window.location.reload();
  };

  const codeParam = selectedCode ? `?code=${selectedCode}` : '';

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader title="Admin Command Center" subtitle="Master Control Dashboard" showLogos={false} />
      
      <main className="container" style={{ padding: '2rem 1rem 4rem', zIndex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Active Auction Selector Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem 2rem', width: '100%', maxWidth: '1000px', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,215,0,0.2)' }}>
          <div>
            <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Active Management Scope</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Select which tournament dashboard you want to manage.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {loading ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading Auctions...</span>
            ) : auctions.length === 0 ? (
              <span style={{ color: '#ff4444', fontSize: '0.9rem', fontWeight: 'bold' }}>No Tournaments Found! Create one first.</span>
            ) : (
              <select
                value={selectedCode}
                onChange={(e) => handleSelectAuction(e.target.value)}
                style={{
                  padding: '0.6rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: 'var(--accent-gold)',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '2px solid var(--accent-gold)',
                  borderRadius: '6px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {auctions.map(a => (
                  <option key={a.id} value={a.auction_code} style={{ background: '#0a0f1d', color: '#fff' }}>
                    {a.auction_name} ({a.auction_code})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', width: '100%', maxWidth: '1000px', marginBottom: '4rem' }}>
          
          <Link to={`/auction${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>🏆</div>
            <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.5rem' }}>Manage Auctions</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Create and configure backend tournament properties.</p>
          </Link>

          <Link to={`/auction-teams${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>🛡️</div>
            <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.5rem' }}>Auction Teams</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Manage teams and assign Icon players.</p>
          </Link>

          <Link to={`/admin-owners${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid var(--accent-gold)' }}>
            <div style={{ fontSize: '3.5rem' }}>👑</div>
            <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.5rem' }}>Manage Owners</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Create owners, pre-fill player data, & assign multi-team owners.</p>
          </Link>

          <Link to={`/admin-players${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>👥</div>
            <h3 style={{ color: 'var(--accent-green)', margin: 0, fontSize: '1.5rem' }}>Player Approvals</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Approve, reject, or delete submitted registration profiles.</p>
          </Link>

          <Link to={`/admin-invitations${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid rgba(57,255,20,0.2)' }}>
            <div style={{ fontSize: '3.5rem' }}>✉️</div>
            <h3 style={{ color: 'var(--accent-green)', margin: 0, fontSize: '1.5rem' }}>Invitation Hub</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Generate secure player registration invitation links.</p>
          </Link>

          <Link to={`/admin-sponsors${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,215,0,0.2)' }}>
            <div style={{ fontSize: '3.5rem' }}>🤝</div>
            <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.5rem' }}>Manage Sponsors</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Configure tournament sponsors, sequence, logo uploads, and status.</p>
          </Link>

          <Link to={`/players${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>📋</div>
            <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.5rem' }}>Public Players List</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Preview the live public-facing grid of all approved players.</p>
          </Link>

          <Link to={`/draw${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid var(--accent-gold)' }}>
            <div style={{ fontSize: '3.5rem' }}>🎰</div>
            <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.5rem' }}>Random Draw</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Select gender (Male/Female), hold numbers, and generate random player for bidding.</p>
          </Link>

          <Link to={`/live-auction${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>🔥</div>
            <h3 style={{ color: '#ff4444', margin: 0, fontSize: '1.5rem' }}>Live Auction</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Run active bidding sessions and sell players to teams.</p>
          </Link>

          <Link to={`/team-details${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>💰</div>
            <h3 style={{ color: 'var(--accent-green)', margin: 0, fontSize: '1.5rem' }}>Team & Purse</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Track team squads and remaining auction budget.</p>
          </Link>

        </div>

        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '1rem 3rem', fontSize: '1.1rem', borderColor: '#ef4444', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Secure Logout
        </button>
        
        <style>{`
          .render-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .render-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 10px 30px rgba(57, 255, 20, 0.15);
            border-color: rgba(57, 255, 20, 0.4);
          }
        `}</style>
      </main>
    </div>
  );
};

export default AdminPage;
