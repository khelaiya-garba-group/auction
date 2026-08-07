import React, { useState, useEffect, useMemo } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { normalizeMobile, formatMobile } from '../utils/phoneUtils';

const AdminInvitationsPage = () => {
  const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
  const [searchParams] = useSearchParams();
  const auctionCode = searchParams.get('code') || localStorage.getItem('cap_admin_selected_auction_code');

  const [activeAuction, setActiveAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState([]);
  const [inviteMobile, setInviteMobile] = useState('');
  const [generating, setGenerating] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const duplicateInfoMap = useMemo(() => {
    const mobileGroups = new Map();

    invitations.forEach(inv => {
      const normMobile = normalizeMobile(inv.mobile);
      if (normMobile) {
        if (!mobileGroups.has(normMobile)) mobileGroups.set(normMobile, []);
        mobileGroups.get(normMobile).push(inv);
      }
    });

    const infoMap = new Map();

    mobileGroups.forEach((invs, normMobile) => {
      if (invs.length > 1) {
        invs.forEach(inv => {
          infoMap.set(inv.id, {
            isDuplicate: true,
            reason: `Duplicate Mobile (${formatMobile(normMobile)})`,
            groupKey: normMobile
          });
        });
      }
    });

    return infoMap;
  }, [invitations]);

  const pendingCount = invitations.filter(inv => inv.status === 'pending').length;
  const usedCount = invitations.filter(inv => inv.status === 'used').length;
  const duplicateCount = duplicateInfoMap.size;

  const filteredInvitations = invitations.filter(inv => {
    const matchesStatus = statusFilter === 'duplicates'
      ? duplicateInfoMap.has(inv.id)
      : (statusFilter === 'all' || inv.status === statusFilter);

    const normQuery = normalizeMobile(searchQuery);
    const matchesSearch = !searchQuery ||
      (inv.mobile && inv.mobile.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (normQuery && normalizeMobile(inv.mobile).includes(normQuery));

    return matchesStatus && matchesSearch;
  });

  if (statusFilter === 'duplicates') {
    filteredInvitations.sort((a, b) => {
      const keyA = duplicateInfoMap.get(a.id)?.groupKey || '';
      const keyB = duplicateInfoMap.get(b.id)?.groupKey || '';
      return keyA.localeCompare(keyB);
    });
  }

  const totalPages = Math.ceil(filteredInvitations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvitations = filteredInvitations.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchAuctionAndInvitations();
  }, [isAuthenticated, auctionCode]);

  const fetchAuctionAndInvitations = async () => {
    try {
      setLoading(true);
      if (!auctionCode) {
        setLoading(false);
        return;
      }

      // Fetch active auction
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('auction_code', auctionCode)
        .maybeSingle();

      if (auctionError) throw auctionError;
      setActiveAuction(auctionData);

      if (auctionData) {
        await fetchInvitations(auctionData.id);
      }
    } catch (err) {
      console.error("Error fetching admin invitations page data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async (auctionId) => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvitations(data || []);
    } catch (err) {
      console.error("Error fetching invitations:", err);
    }
  };

  const handleGenerateInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    
    if (!activeAuction) return setInviteError('No active auction selected.');
    if (!inviteMobile.trim()) return setInviteError('Please enter a mobile number.');
    
    setGenerating(true);
    try {
      // Check if already exists in invitations using normalizeMobile
      const inputNorm = normalizeMobile(inviteMobile);
      const { data: existingInvites } = await supabase
        .from('invitations')
        .select('*')
        .eq('auction_id', activeAuction.id);

      const existingInvite = (existingInvites || []).find(inv => normalizeMobile(inv.mobile) === inputNorm);

      if (existingInvite) {
        throw new Error(`An invitation link for this mobile number (${existingInvite.mobile}) already exists.`);
      }

      // Insert new invitation
      const { error } = await supabase
        .from('invitations')
        .insert([{
          auction_id: activeAuction.id,
          mobile: inviteMobile.trim(),
          status: 'pending'
        }]);

      if (error) throw error;

      setInviteSuccess('Invitation link generated successfully!');
      setInviteMobile('');
      await fetchInvitations(activeAuction.id);
    } catch (err) {
      console.error(err);
      setInviteError(err.message || 'Failed to generate invitation link.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeInvite = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this invitation link? The player won't be able to register using it.")) return;
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', id);
      if (error) throw error;
      
      if (activeAuction) await fetchInvitations(activeAuction.id);
    } catch (err) {
      console.error(err);
      alert('Failed to revoke invitation.');
    }
  };

  const handleCopyLink = (inviteId) => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}#/register?code=${auctionCode}&invite=${inviteId}`;
    navigator.clipboard.writeText(inviteUrl);
    alert('Invitation link copied to clipboard!');
  };

  const getWhatsAppLink = (mobile, inviteId) => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}#/register?code=${auctionCode}&invite=${inviteId}`;
    const message = `Hello, here is your player registration link for ${activeAuction ? activeAuction.auction_name : 'the tournament'}: ${inviteUrl}`;
    const cleanMobile = mobile.replace(/\D/g, '');
    const formattedMobile = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    return `https://wa.me/${formattedMobile}?text=${encodeURIComponent(message)}`;
  };

  if (!isAuthenticated) return <Navigate to="/admin" replace />;
  if (!auctionCode || (!loading && !activeAuction)) return <Navigate to="/admin" replace />;
  if (loading) return <Loader message="LOADING INVITATION HUB..." />;

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader title="Tournament Invitation Hub" subtitle={activeAuction ? `Invitation Links for ${activeAuction.auction_name}` : 'Invitation Hub'} showLogos={false} />

      <main className="container" style={{ padding: '2rem 1rem 4rem', zIndex: 1, position: 'relative' }}>
        
        {/* Navigation & Scope Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ color: 'var(--text-main)', margin: 0 }}>Active Tournament: {activeAuction ? activeAuction.auction_name : 'None'}</h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>← Back to Admin</Link>
          </div>
        </div>

        {/* Form Panel */}
        <div className="glass-panel" style={{ padding: '2rem', width: '100%', marginBottom: '3rem', border: '1px solid rgba(57,255,20,0.2)' }}>
          <h3 style={{ color: 'var(--accent-green)', margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>✉️ Generate New Secure Invite Link</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 2rem 0', fontSize: '0.9rem' }}>
            Create secure, single-use invite tokens linked to player mobile numbers. Standard registration is blocked unless a valid invite token is used.
          </p>

          <form onSubmit={handleGenerateInvite} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <div style={{ flex: '1 1 250px' }}>
              <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 'bold' }}>Player Mobile Number</label>
              <input 
                type="tel" 
                value={inviteMobile}
                onChange={(e) => setInviteMobile(e.target.value)}
                placeholder="e.g. 9876543210"
                className="form-input"
                style={{ width: '100%', padding: '0.6rem 1rem' }}
                required
              />
            </div>
            <button type="submit" disabled={generating} className="btn btn-primary" style={{ height: '46px', background: 'var(--accent-green)', color: '#000', padding: '0 2rem', fontWeight: 'bold' }}>
              {generating ? 'Generating...' : 'Generate Invite Link'}
            </button>
          </form>

          {inviteError && <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff4444', color: '#ff4444', padding: '0.8rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{inviteError}</div>}
          {inviteSuccess && <div style={{ background: 'rgba(57,255,20,0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', padding: '0.8rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{inviteSuccess}</div>}
        </div>

        {/* Invitation list table */}
        <div className="glass-panel" style={{ padding: '2rem', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}
              >
                All ({invitations.length})
              </button>
              <button
                onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
                className={`btn ${statusFilter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600,
                  color: statusFilter === 'pending' ? '#000' : '#38bdf8',
                  borderColor: '#38bdf8',
                  backgroundColor: statusFilter === 'pending' ? '#38bdf8' : 'transparent'
                }}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => { setStatusFilter('used'); setCurrentPage(1); }}
                className={`btn ${statusFilter === 'used' ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600,
                  color: statusFilter === 'used' ? '#000' : 'var(--accent-green)',
                  borderColor: 'var(--accent-green)',
                  backgroundColor: statusFilter === 'used' ? 'var(--accent-green)' : 'transparent'
                }}
              >
                Used ({usedCount})
              </button>
              <button
                onClick={() => { setStatusFilter('duplicates'); setCurrentPage(1); }}
                className={`btn ${statusFilter === 'duplicates' ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600,
                  color: statusFilter === 'duplicates' ? '#fff' : '#ef4444',
                  borderColor: '#ef4444',
                  backgroundColor: statusFilter === 'duplicates' ? '#ef4444' : 'transparent'
                }}
              >
                ⚠️ Duplicates ({duplicateCount})
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '240px', maxWidth: '350px', flex: 1 }}>
              <input 
                type="text"
                placeholder="🔍 Search by mobile..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="form-input"
                style={{ 
                  width: '100%', 
                  padding: '0.5rem 2rem 0.5rem 2.2rem', 
                  fontSize: '0.9rem', 
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  color: '#fff'
                }}
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                  style={{ 
                    position: 'absolute', 
                    right: '10px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--text-muted)', 
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    padding: 0
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {invitations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem 0' }}>No invite links generated for this tournament yet.</p>
            ) : filteredInvitations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem 0' }}>No invites match your filters.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Mobile Number</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Created At</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvitations.map(inv => {
                    const dupInfo = duplicateInfoMap.get(inv.id);
                    return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.1)' }}>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                        <div>{inv.mobile}</div>
                        {dupInfo && (
                          <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-block', marginTop: '0.25rem' }}>
                            ⚠️ {dupInfo.reason}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase',
                          background: inv.status === 'pending' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(57, 255, 20, 0.2)',
                          color: inv.status === 'pending' ? '#38bdf8' : 'var(--accent-green)'
                        }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(inv.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => handleCopyLink(inv.id)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)' }}>
                          Copy Link
                        </button>
                        <a 
                          href={getWhatsAppLink(inv.mobile, inv.id)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-outline" 
                          style={{ 
                            padding: '0.3rem 0.6rem', 
                            fontSize: '0.75rem', 
                            border: '1px solid #25D366', 
                            color: '#25D366',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          WhatsApp Share
                        </a>
                        <button onClick={() => handleRevokeInvite(inv.id)} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredInvitations.length)} of {filteredInvitations.length} invitations
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn btn-outline"
                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem', opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', padding: '0 0.5rem' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn btn-outline"
                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default AdminInvitationsPage;
