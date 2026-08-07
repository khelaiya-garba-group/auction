import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { uploadToCloudinary, deleteFromCloudinary, getOptimizedImageUrl } from '../services/cloudinary';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { useSearchParams } from 'react-router-dom';

const getInitials = (name) => {
  if (!name) return 'OW';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const AdminOwnersPage = () => {
  const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
  const [searchParams] = useSearchParams();
  const auctionCode = searchParams.get('code') || localStorage.getItem('cap_admin_selected_auction_code');

  const [activeAuction, setActiveAuction] = useState(null);
  const [owners, setOwners] = useState([]);
  const [teams, setTeams] = useState([]);
  const [approvedPlayers, setApprovedPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form & Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef(null);

  const initialFormState = {
    selected_player_id: '',
    owner_name: '',
    mobile_number: '',
    email: '',
    notes: '',
    photo: null,
    photo_url: '',
    selected_team_ids: []
  };

  const [formData, setFormData] = useState(initialFormState);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, auctionCode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setFormError('');

      if (!auctionCode) {
        setLoading(false);
        return;
      }

      // 1. Fetch Active Auction
      const { data: auctionData, error: auctionErr } = await supabase
        .from('auctions')
        .select('*')
        .eq('auction_code', auctionCode)
        .maybeSingle();

      if (auctionErr) throw auctionErr;
      setActiveAuction(auctionData);

      if (auctionData) {
        // 2. Fetch Teams for this auction
        const { data: teamsData, error: teamsErr } = await supabase
          .from('auction_teams')
          .select('*')
          .eq('auction_id', auctionData.id)
          .order('created_at', { ascending: true });

        if (teamsErr && teamsErr.code !== '42P01') throw teamsErr;
        setTeams(teamsData || []);

        // 3. Fetch Approved Players for player pre-fill selection
        const { data: apData, error: apErr } = await supabase
          .from('auction_players')
          .select('*, players(*)')
          .eq('auction_id', auctionData.id)
          .eq('approval_status', 'approved');

        if (apErr) throw apErr;
        setApprovedPlayers(apData || []);

        // 4. Fetch Owners for this auction
        const { data: ownersData, error: ownersErr } = await supabase
          .from('owners')
          .select('*, players(*)')
          .eq('auction_id', auctionData.id)
          .order('created_at', { ascending: false });

        if (ownersErr && ownersErr.code === '42P01') {
          setFormError("The 'owners' database table does not exist yet. Please run the SQL migration script from the Supabase SQL Editor.");
          setOwners([]);
          setLoading(false);
          return;
        } else if (ownersErr) {
          throw ownersErr;
        }

        // 5. Fetch Team Owners Junction data
        const { data: teamOwnersData, error: toErr } = await supabase
          .from('team_owners')
          .select('*')
          .eq('auction_id', auctionData.id);

        if (toErr && toErr.code !== '42P01') throw toErr;

        // Map team associations to owners
        const teamOwnersMap = {};
        (teamOwnersData || []).forEach(to => {
          if (!teamOwnersMap[to.owner_id]) teamOwnersMap[to.owner_id] = [];
          teamOwnersMap[to.owner_id].push(to.team_id);
        });

        const fullOwners = (ownersData || []).map(o => ({
          ...o,
          team_ids: teamOwnersMap[o.id] || []
        }));

        setOwners(fullOwners);
      }
    } catch (err) {
      console.error("Error fetching owners data:", err);
      setFormError(err.message || 'Failed to load owners');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelect = (apId) => {
    if (!apId) {
      setFormData(prev => ({
        ...prev,
        selected_player_id: '',
        player_id: null
      }));
      return;
    }

    const selectedAp = approvedPlayers.find(ap => ap.id == apId || ap.player_id == apId);
    if (selectedAp && selectedAp.players) {
      const p = selectedAp.players;
      setFormData(prev => ({
        ...prev,
        selected_player_id: apId,
        player_id: p.id,
        owner_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        mobile_number: p.mobile || '',
        email: p.email || '',
        photo_url: p.photo_url || ''
      }));
    }
  };

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTeamCheckboxToggle = (teamId) => {
    setFormData(prev => {
      const current = prev.selected_team_ids || [];
      const updated = current.includes(teamId)
        ? current.filter(id => id !== teamId)
        : [...current, teamId];
      return { ...prev, selected_team_ids: updated };
    });
  };

  const handleAddNewOwner = () => {
    setEditingOwner(null);
    setFormData(initialFormState);
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditClick = (owner) => {
    setEditingOwner(owner);
    setFormData({
      selected_player_id: owner.player_id ? owner.player_id.toString() : '',
      player_id: owner.player_id || null,
      owner_name: owner.owner_name || '',
      mobile_number: owner.mobile_number || '',
      email: owner.email || '',
      notes: owner.notes || '',
      photo: null,
      photo_url: owner.photo_url || '',
      selected_team_ids: owner.team_ids || []
    });
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingOwner(null);
    setFormData(initialFormState);
    setFormError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    try {
      if (!activeAuction) throw new Error("No active tournament selected.");
      if (!formData.owner_name.trim()) throw new Error("Owner Name is required.");

      let photo_url = formData.photo_url;

      if (formData.photo) {
        if (editingOwner && editingOwner.photo_url && !editingOwner.player_id) {
          await deleteFromCloudinary(editingOwner.photo_url);
        }
        photo_url = await uploadToCloudinary(formData.photo);
      }

      const ownerPayload = {
        auction_id: activeAuction.id,
        player_id: formData.player_id || null,
        owner_name: formData.owner_name.trim(),
        mobile_number: formData.mobile_number ? formData.mobile_number.trim() : null,
        email: formData.email ? formData.email.trim() : null,
        notes: formData.notes ? formData.notes.trim() : null,
        photo_url: photo_url || null
      };

      let ownerId = editingOwner ? editingOwner.id : null;

      if (editingOwner) {
        const { error: updateErr } = await supabase
          .from('owners')
          .update(ownerPayload)
          .eq('id', editingOwner.id);

        if (updateErr) throw updateErr;
      } else {
        const { data: newOwner, error: insertErr } = await supabase
          .from('owners')
          .insert([ownerPayload])
          .select()
          .single();

        if (insertErr) throw insertErr;
        ownerId = newOwner.id;
      }

      // Update Team Associations in team_owners table
      if (ownerId) {
        // First delete existing team mappings for this owner
        await supabase
          .from('team_owners')
          .delete()
          .eq('owner_id', ownerId);

        // Insert new team mappings
        if (formData.selected_team_ids && formData.selected_team_ids.length > 0) {
          const teamOwnerPayloads = formData.selected_team_ids.map(teamId => ({
            auction_id: activeAuction.id,
            team_id: teamId,
            owner_id: ownerId
          }));

          const { error: toInsertErr } = await supabase
            .from('team_owners')
            .insert(teamOwnerPayloads);

          if (toInsertErr) throw toInsertErr;
        }
      }

      alert(editingOwner ? "Owner updated successfully!" : "Owner added successfully!");
      setShowForm(false);
      await fetchData();
    } catch (err) {
      console.error("Error saving owner:", err);
      setFormError(err.message || "Failed to save owner.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOwner = async (owner) => {
    if (!window.confirm(`Are you sure you want to delete owner "${owner.owner_name}"?`)) return;

    try {
      setActionLoading(true);
      if (owner.photo_url && !owner.player_id) {
        await deleteFromCloudinary(owner.photo_url);
      }

      // Delete team associations first
      await supabase.from('team_owners').delete().eq('owner_id', owner.id);

      const { error } = await supabase.from('owners').delete().eq('id', owner.id);
      if (error) throw error;

      alert("Owner deleted successfully!");
      await fetchData();
    } catch (err) {
      console.error("Error deleting owner:", err);
      alert("Failed to delete owner: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loader text="Loading Owners Module..." />;

  return (
    <div className="flex-col min-h-screen" style={{ color: 'var(--text-main)', background: 'var(--bg-main)' }}>
      <div className="spotlight"></div>
      <PageHeader
        title="Owner Command Center"
        subtitle={activeAuction ? `Managing Owners for ${activeAuction.auction_name}` : 'Owner Management'}
        showLogos={false}
      />

      <main className="container" style={{ padding: '2rem 1.5rem 5rem', zIndex: 1, position: 'relative', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* SQL Error Warning Banner if tables missing */}
        {formError && formError.includes("does not exist") && (
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
            <h4 style={{ color: '#ef4444', margin: '0 0 0.5rem', fontSize: '1.1rem' }}>⚠️ Database Setup Required</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#ffaaaa' }}>{formError}</p>
          </div>
        )}

        {/* Action Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '1.8rem', fontFamily: 'var(--font-heading)' }}>
              TOURNAMENT OWNERS ({owners.length})
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Create owners, pre-fill from registered players, and assign owners to multiple teams.
            </p>
          </div>

          {!showForm && (
            <button
              onClick={handleAddNewOwner}
              className="btn btn-primary"
              style={{
                padding: '0.75rem 1.8rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                background: 'var(--accent-green)',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(57,255,20,0.3)'
              }}
            >
              + ADD NEW OWNER
            </button>
          )}
        </div>

        {/* ADD / EDIT FORM MODAL */}
        {showForm && (
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem', border: '1px solid var(--accent-gold)', borderRadius: '12px', background: 'rgba(10,15,29,0.95)' }}>
            <h3 style={{ margin: '0 0 1.5rem', color: 'var(--accent-gold)', fontSize: '1.4rem' }}>
              {editingOwner ? `Edit Owner: ${editingOwner.owner_name}` : 'Add New Owner'}
            </h3>

            {formError && !formError.includes("does not exist") && (
              <div style={{ padding: '0.8rem', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              {/* Option to prefill from registered player */}
              <div style={{ marginBottom: '1.5rem', background: 'rgba(255,215,0,0.05)', padding: '1.2rem', borderRadius: '8px', border: '1px solid rgba(255,215,0,0.2)', position: 'relative' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: 'var(--accent-gold)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                  💡 Select Registered Player (Optional Pre-fill)
                </label>

                {(() => {
                  const selectedAp = approvedPlayers.find(ap => ap.player_id == formData.player_id || ap.id == formData.selected_player_id);
                  if (selectedAp) {
                    const p = selectedAp.players || {};
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(57,255,20,0.1)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--accent-green)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <span style={{ background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold', fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            #{selectedAp.player_number || 'N/A'}
                          </span>
                          {p.photo_url ? (
                            <img src={getOptimizedImageUrl(p.photo_url, 80)} alt="Player" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--accent-green)' }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(57,255,20,0.2)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                              {getInitials(`${p.first_name || ''} ${p.last_name || ''}`)}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>
                              {p.first_name} {p.last_name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              📞 {p.mobile || 'No mobile'} | {p.player_role || 'Player'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handlePlayerSelect('');
                            setPlayerSearchTerm('');
                          }}
                          className="btn btn-outline"
                          style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}
                        >
                          ✕ Clear Selection
                        </button>
                      </div>
                    );
                  }

                  const term = playerSearchTerm.toLowerCase().trim();
                  const filtered = approvedPlayers.filter(ap => {
                    if (!term) return true;
                    const p = ap.players || {};
                    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
                    const mobile = (p.mobile || '').toLowerCase();
                    const num = (ap.player_number || '').toString();
                    return fullName.includes(term) || mobile.includes(term) || num.includes(term);
                  });

                  return (
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="🔍 Search player by name, player number (#), or mobile..."
                        value={playerSearchTerm}
                        onChange={(e) => {
                          setPlayerSearchTerm(e.target.value);
                          setShowPlayerDropdown(true);
                        }}
                        onFocus={() => setShowPlayerDropdown(true)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          background: 'rgba(0,0,0,0.6)',
                          border: '1px solid rgba(255,215,0,0.4)',
                          color: '#fff',
                          borderRadius: '6px',
                          fontSize: '0.95rem',
                          outline: 'none'
                        }}
                      />

                      {showPlayerDropdown && (
                        <div style={{ marginTop: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '8px', maxHeight: '280px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 10 }}>
                          {filtered.length === 0 ? (
                            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                              No matching players found.
                            </div>
                          ) : (
                            filtered.slice(0, 10).map(ap => {
                              const p = ap.players || {};
                              return (
                                <div
                                  key={ap.id}
                                  onClick={() => {
                                    handlePlayerSelect(p.id || ap.player_id);
                                    setShowPlayerDropdown(false);
                                  }}
                                  style={{
                                    padding: '0.75rem 1rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justify: 'space-between',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,215,0,0.15)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <span style={{ background: 'rgba(255,215,0,0.2)', color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                      #{ap.player_number || 'N/A'}
                                    </span>
                                    {p.photo_url ? (
                                      <img src={getOptimizedImageUrl(p.photo_url, 60)} alt={p.first_name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>
                                        {getInitials(`${p.first_name || ''} ${p.last_name || ''}`)}
                                      </div>
                                    )}
                                    <div>
                                      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>
                                        {p.first_name} {p.last_name}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        📞 {p.mobile || 'No mobile'}
                                      </div>
                                    </div>
                                  </div>

                                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                                    Select →
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing top 10 results. Type a name, number, or mobile to search players.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem', marginBottom: '1.5rem' }}>
                {/* Owner Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#ccc' }}>Owner Full Name *</label>
                  <input
                    type="text"
                    name="owner_name"
                    value={formData.owner_name}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g. Rahul Sharma"
                    style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#ccc' }}>Mobile Number</label>
                  <input
                    type="text"
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleFormChange}
                    placeholder="e.g. 9876543210"
                    style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#ccc' }}>Email Address (Optional)</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="owner@example.com"
                    style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                  />
                </div>

                {/* Photo Upload */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#ccc' }}>Owner Photo</label>
                  <input
                    type="file"
                    name="photo"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFormChange}
                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                  />
                </div>
              </div>

              {/* Photo Preview if existing */}
              {formData.photo_url && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img
                    src={getOptimizedImageUrl(formData.photo_url, 120)}
                    alt="Owner Preview"
                    onError={(e) => { e.target.style.display = 'none'; }}
                    style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Owner Photo</span>
                </div>
              )}

              {/* Team Assignment Checkboxes (Multi-team support) */}
              <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.3)', padding: '1.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: 'var(--accent-green)', marginBottom: '0.8rem', fontSize: '0.95rem' }}>
                  🛡️ Assign to Teams (Select single or multiple teams)
                </label>

                {teams.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', italic: 'true' }}>
                    No teams created for this tournament yet. Create teams in "Auction Teams" first.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.8rem' }}>
                    {teams.map(t => {
                      const isChecked = (formData.selected_team_ids || []).includes(t.id);
                      return (
                        <label
                          key={t.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.6rem 0.8rem',
                            background: isChecked ? 'rgba(57,255,20,0.15)' : 'rgba(255,255,255,0.03)',
                            border: isChecked ? '1px solid var(--accent-green)' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTeamCheckboxToggle(t.id)}
                            style={{ accentColor: 'var(--accent-green)', width: 16, height: 16 }}
                          />
                          {t.logo_url ? (
                            <img
                              src={getOptimizedImageUrl(t.logo_url, 60)}
                              alt={t.team_name}
                              onError={(e) => { e.target.style.display = 'none'; }}
                              style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'contain', background: '#fff' }}
                            />
                          ) : (
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-gold)', color: '#000', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {t.team_name ? t.team_name.slice(0, 2).toUpperCase() : 'TM'}
                            </div>
                          )}
                          <span style={{ fontSize: '0.9rem', color: isChecked ? '#fff' : '#ccc', fontWeight: isChecked ? 'bold' : 'normal' }}>
                            {t.team_name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="btn"
                  disabled={actionLoading}
                  style={{ padding: '0.7rem 1.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#ccc', borderRadius: '6px' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ padding: '0.7rem 2rem', background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '6px' }}
                >
                  {actionLoading ? 'Saving Owner...' : editingOwner ? 'Update Owner' : 'Save Owner'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* OWNERS LIST GRID */}
        {owners.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
            <h3 style={{ color: '#fff', margin: '0 0 0.5rem' }}>No Owners Registered Yet</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Click "+ ADD NEW OWNER" above to register an owner for this tournament.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {owners.map(owner => {
              const assignedTeams = teams.filter(t => (owner.team_ids || []).includes(t.id));

              return (
                <div
                  key={owner.id}
                  className="glass-panel"
                  style={{
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,215,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    gap: '1rem',
                    background: 'rgba(15,23,42,0.8)'
                  }}
                >
                  {/* Top Owner Info */}
                  <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                    {owner.photo_url ? (
                      <img
                        src={getOptimizedImageUrl(owner.photo_url, 150)}
                        alt={owner.owner_name}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                        style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)', boxShadow: '0 0 10px rgba(255,215,0,0.2)' }}
                      />
                    ) : null}
                    <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '2px solid var(--accent-gold)', display: owner.photo_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '1.4rem' }}>
                      {getInitials(owner.owner_name)}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.2rem', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {owner.owner_name}
                      </h3>

                      {owner.player_id && (
                        <span style={{ display: 'inline-block', fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(57,255,20,0.15)', color: 'var(--accent-green)', borderRadius: '12px', border: '1px solid rgba(57,255,20,0.3)', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                          ✓ Player Profile Linked
                        </span>
                      )}

                      {owner.mobile_number && (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          📞 {owner.mobile_number}
                        </p>
                      )}

                      {owner.email && (
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          ✉️ {owner.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Assigned Teams Section */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.8rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-gold)', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Assigned Teams ({assignedTeams.length})
                    </span>

                    {assignedTeams.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No teams assigned yet
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {assignedTeams.map(t => (
                          <div
                            key={t.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.3rem 0.7rem',
                              background: 'rgba(255,215,0,0.1)',
                              border: '1px solid rgba(255,215,0,0.3)',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              color: '#fff'
                            }}
                          >
                            {t.logo_url ? (
                              <img
                                src={getOptimizedImageUrl(t.logo_url, 60)}
                                alt={t.team_name}
                                onError={(e) => { e.target.style.display = 'none'; }}
                                style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'contain', background: '#fff' }}
                              />
                            ) : null}
                            <span>{t.team_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Owner Card Actions */}
                  <div style={{ display: 'flex', gap: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.8rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleEditClick(owner)}
                      className="btn"
                      disabled={actionLoading}
                      style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteOwner(owner)}
                      className="btn"
                      disabled={actionLoading}
                      style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '4px' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminOwnersPage;
