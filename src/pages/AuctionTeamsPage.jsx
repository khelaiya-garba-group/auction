import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { uploadToCloudinary, deleteFromCloudinary, getOptimizedImageUrl } from '../services/cloudinary';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

const getTeamInitials = (name) => {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words.map(w => w.charAt(0)).join('').toUpperCase();
};

const getPlayerInitials = (p) => {
  if (!p) return '';
  return ((p.first_name?.charAt(0) || '') + (p.last_name?.charAt(0) || '')).toUpperCase();
};

const AuctionTeamsPage = () => {
  const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
  const [searchParams] = useSearchParams();
  const auctionCode = searchParams.get('code') || localStorage.getItem('cap_admin_selected_auction_code');

  const [activeAuction, setActiveAuction] = useState(null);
  const [teams, setTeams] = useState([]);
  const [iconPlayers, setIconPlayers] = useState([]);
  const [ownerPlayers, setOwnerPlayers] = useState([]);
  const [moduleTeamOwnersMap, setModuleTeamOwnersMap] = useState({});
  const [allAuctionPlayers, setAllAuctionPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formError, setFormError] = useState('');
  
  const initialFormState = {
    team_name: '',
    logo: null
  };
  const [formData, setFormData] = useState(initialFormState);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [isAuthenticated, auctionCode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (!auctionCode) {
        setLoading(false);
        return;
      }

      // Fetch Active Auction
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('auction_code', auctionCode)
        .maybeSingle();
        
      if (auctionError && auctionError.code !== 'PGRST116') throw auctionError;
      setActiveAuction(auctionData);

      if (auctionData) {
        // Fetch Teams for this auction
        const { data: tData, error: tError } = await supabase
          .from('auction_teams')
          .select('*')
          .eq('auction_id', auctionData.id)
          .order('created_at', { ascending: true });
          
        if (tError) {
           if (tError.code === '42P01') {
               // Table doesn't exist yet! We will handle this in UI
               console.error("auction_teams table does not exist!");
               setFormError("The 'auction_teams' table does not exist in Supabase. Please create it first with fields: id, auction_id, team_name, logo_url, created_at.");
           } else {
               throw tError;
           }
        }
        setTeams(tData || []);

        // Fetch All Approved Players for this auction
        const { data: apData, error: apError } = await supabase
          .from('auction_players')
          .select('*, players(*)')
          .eq('auction_id', auctionData.id)
          .eq('approval_status', 'approved');

        if (apError) throw apError;
        setAllAuctionPlayers(apData || []);
        
        const mappedIcons = (apData || []).filter(ap => ap.is_icon).map(ap => ({
           auction_player_id: ap.id,
           team_id: ap.team_id,
           ...ap.players
        }));
        const mappedOwners = (apData || []).filter(ap => ap.is_owner).map(ap => ({
           auction_player_id: ap.id,
           team_id: ap.owner_team_id || ap.previous_bid_team_id || ap.team_id,
           ...ap.players
        }));
        setIconPlayers(mappedIcons);
        setOwnerPlayers(mappedOwners);

        // Fetch team_owners joined with owners from dedicated owner module
        const { data: toData } = await supabase
          .from('team_owners')
          .select('*, owners(*)')
          .eq('auction_id', auctionData.id);

        const moduleGrouped = {};
        (toData || []).forEach(to => {
          if (!moduleGrouped[to.team_id]) moduleGrouped[to.team_id] = [];
          if (to.owners) moduleGrouped[to.team_id].push(to.owners);
        });
        setModuleTeamOwnersMap(moduleGrouped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  const handleAddNewTeam = () => {
    setEditingTeam(null);
    setFormData(initialFormState);
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditClick = (team) => {
    setEditingTeam(team);
    setFormData({ team_name: team.team_name, logo: null });
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingTeam(null);
    setFormData(initialFormState);
    setFormError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    try {
      if (!activeAuction) throw new Error("No active auction.");
      
      // Enforce number_of_teams limit if adding a new team
      if (!editingTeam && activeAuction.number_of_teams > 0 && teams.length >= activeAuction.number_of_teams) {
          throw new Error(`Cannot add more teams. Maximum number of teams (${activeAuction.number_of_teams}) reached.`);
      }

      let logo_url = editingTeam ? editingTeam.logo_url : null;

      if (formData.logo) {
        if (logo_url) await deleteFromCloudinary(logo_url);
        logo_url = await uploadToCloudinary(formData.logo);
      }

      const payload = {
        auction_id: activeAuction.id,
        team_name: formData.team_name,
        logo_url
      };

      if (editingTeam) {
        const { error: updateError } = await supabase.from('auction_teams').update(payload).eq('id', editingTeam.id);
        if (updateError) throw updateError;
        alert(`Team updated successfully!`);
      } else {
        const { error: insertError } = await supabase.from('auction_teams').insert([payload]);
        if (insertError) throw insertError;
        alert(`Team added successfully!`);
      }

      setShowForm(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to save team.");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteTeam = async (team) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${team.team_name}? Icon and owner players assigned to this team will be unassigned.`)) return;
    
    try {
      setActionLoading(true);
      if (team.logo_url) await deleteFromCloudinary(team.logo_url);
      
      // Unassign players first
      await supabase.from('auction_players').update({ team_id: null }).eq('team_id', team.id);

      const { error } = await supabase.from('auction_teams').delete().eq('id', team.id);
      if (error) throw error;
      
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete team');
    } finally {
      setActionLoading(false);
    }
  };

  const assignCaptain = async (teamId, auctionPlayerId) => {
    try {
      setActionLoading(true);
      const team = teams.find(t => t.id === teamId);
      const targetId = auctionPlayerId ? (isNaN(auctionPlayerId) ? auctionPlayerId : parseInt(auctionPlayerId, 10)) : null;
      let payload = { captain_id: targetId };
      
      // If selected player is currently vice captain, clear vice captain
      if (targetId && team?.vice_captain_id == targetId) {
        payload.vice_captain_id = null;
      }
      
      // Clear previous captain's is_captain flag if any
      if (team?.captain_id && team?.captain_id != targetId) {
        await supabase
          .from('auction_players')
          .update({ is_captain: false })
          .eq('id', team.captain_id);
      }

      // If new captain selected, update auction_players table
      // Captain is retained by assigned team at 0 cost
      if (targetId) {
        await supabase
          .from('auction_players')
          .update({ is_captain: true, team_id: teamId, auction_status: null, sold_price: 0 })
          .eq('id', targetId);
      }

      const { error } = await supabase
        .from('auction_teams')
        .update(payload)
        .eq('id', teamId);
        
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to set Captain.');
    } finally {
      setActionLoading(false);
    }
  };

  const assignViceCaptain = async (teamId, auctionPlayerId) => {
    try {
      setActionLoading(true);
      const team = teams.find(t => t.id === teamId);
      const targetId = auctionPlayerId ? (isNaN(auctionPlayerId) ? auctionPlayerId : parseInt(auctionPlayerId, 10)) : null;
      let payload = { vice_captain_id: targetId };
      
      // If selected player is currently captain, clear captain
      if (targetId && team?.captain_id == targetId) {
        payload.captain_id = null;
      }
      
      const { error } = await supabase
        .from('auction_teams')
        .update(payload)
        .eq('id', teamId);
        
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to set Vice-Captain.');
    } finally {
      setActionLoading(false);
    }
  };

  const clearLeadershipIfRemoved = async (auctionPlayerId) => {
    const matchingTeam = teams.find(t => t.captain_id == auctionPlayerId || t.vice_captain_id == auctionPlayerId);
    if (matchingTeam) {
      const updates = {};
      if (matchingTeam.captain_id == auctionPlayerId) updates.captain_id = null;
      if (matchingTeam.vice_captain_id == auctionPlayerId) updates.vice_captain_id = null;
      await supabase.from('auction_teams').update(updates).eq('id', matchingTeam.id);
    }
  };

  const assignOwnerPlayer = async (auctionPlayerId, teamId) => {
    try {
      setActionLoading(true);
      
      if (!teamId) {
        await clearLeadershipIfRemoved(auctionPlayerId);
      } else if (activeAuction) {
        const teamOwnersCount = ownerPlayers.filter(p => p.team_id == teamId).length;
        const maxOwners = activeAuction.number_of_owner !== null && activeAuction.number_of_owner !== undefined
            ? parseInt(activeAuction.number_of_owner)
            : 999;
            
        if (teamOwnersCount >= maxOwners) {
            alert(`Cannot assign more than ${maxOwners} owner players to this team.`);
            setActionLoading(false);
            return;
        }
      }

      // Owner player belongs to teamId as owner, BUT enters the live auction pool (auction_status: 'pending')
      const updatePayload = {
        is_owner: teamId ? true : false,
        is_icon: false,
        team_id: teamId || null,
        previous_bid_team_id: teamId || null,
        auction_status: teamId ? 'pending' : null,
        sold_price: 0
      };

      let { error } = await supabase
        .from('auction_players')
        .update({ ...updatePayload, owner_team_id: teamId || null })
        .eq('id', auctionPlayerId);

      if (error && error.code === 'PGRST204') {
        const res = await supabase
          .from('auction_players')
          .update(updatePayload)
          .eq('id', auctionPlayerId);
        error = res.error;
      }

      if (error) throw error;
      
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to assign owner player.');
    } finally {
      setActionLoading(false);
    }
  };

  const removeModuleOwner = async (teamId, ownerId) => {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('team_owners')
        .delete()
        .eq('team_id', teamId)
        .eq('owner_id', ownerId);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to remove owner.');
    } finally {
      setActionLoading(false);
    }
  };

  const assignIconPlayer = async (auctionPlayerId, teamId) => {
    try {
      setActionLoading(true);
      
      if (!teamId) {
        await clearLeadershipIfRemoved(auctionPlayerId);
      } else if (activeAuction) {
        const teamIconsCount = iconPlayers.filter(p => p.team_id == teamId).length;
        const maxIcons = activeAuction.number_of_icon !== null && activeAuction.number_of_icon !== undefined
            ? parseInt(activeAuction.number_of_icon)
            : 999;
            
        if (teamIconsCount >= maxIcons) {
            alert(`Cannot assign more than ${maxIcons} icon players to this team.`);
            setActionLoading(false);
            return;
        }
      }

      // Icon player is retained by assigned team at 0 cost and excluded from live auction
      const updatePayload = {
        is_icon: teamId ? true : false,
        is_owner: false,
        team_id: teamId || null,
        auction_status: null,
        sold_price: 0
      };

      const { error } = await supabase
        .from('auction_players')
        .update(updatePayload)
        .eq('id', auctionPlayerId);
        
      if (error) throw error;
      
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to assign icon player.');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('cap_admin_auth');
    window.location.reload();
  };

  if (!isAuthenticated) return <Navigate to="/admin" replace />;
  if (!auctionCode || (!loading && !activeAuction)) return <Navigate to="/admin" replace />;
  if (loading) return <Loader message="LOADING TEAMS..." />;

  // Group Icon & Owner Players by Team
  const iconsByTeam = {};
  const unassignedIcons = [];
  iconPlayers.forEach(p => {
      if (p.team_id) {
          if (!iconsByTeam[p.team_id]) iconsByTeam[p.team_id] = [];
          iconsByTeam[p.team_id].push(p);
      } else {
          unassignedIcons.push(p);
      }
  });

  const ownersByTeam = {};
  const unassignedOwners = [];
  ownerPlayers.forEach(p => {
      if (p.team_id) {
          if (!ownersByTeam[p.team_id]) ownersByTeam[p.team_id] = [];
          ownersByTeam[p.team_id].push(p);
      } else {
          unassignedOwners.push(p);
      }
  });

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader title="Auction Teams Management" showLogos={false} />
      
      <main className="container" style={{ padding: '2rem 1rem', zIndex: 1, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ color: 'var(--text-main)', margin: 0 }}>
                Active Auction: {activeAuction ? activeAuction.auction_name : 'None'}
            </h2>
            {activeAuction && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    Allowed Teams: {activeAuction.number_of_teams !== null && activeAuction.number_of_teams !== undefined ? activeAuction.number_of_teams : 'Unlimited'} | Allowed Icons/Team: {activeAuction.number_of_icon !== null && activeAuction.number_of_icon !== undefined ? activeAuction.number_of_icon : 'Unlimited'} | Allowed Owners/Team: {activeAuction.number_of_owner !== null && activeAuction.number_of_owner !== undefined ? activeAuction.number_of_owner : 'Unlimited'}
                </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {!showForm && <button onClick={handleAddNewTeam} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', background: 'var(--accent-gold)' }}>+ Add Team</button>}
            <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Admin</Link>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: '#ff4444', borderColor: '#ff4444' }}>Logout</button>
          </div>
        </div>

        {formError && !showForm && (
            <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff4444', color: '#ff4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                {formError}
            </div>
        )}

        {showForm ? (
          <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
             <h2 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {editingTeam ? `Edit Team: ${editingTeam.team_name}` : 'Add New Team'}
              <button type="button" onClick={cancelForm} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                Cancel
              </button>
            </h2>

            {formError && <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff4444', color: '#ff4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>{formError}</div>}

            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Team Name *</label>
                  <input required type="text" name="team_name" value={formData.team_name} onChange={handleFormChange} className="form-input" placeholder="e.g. Mumbai Indians" />
                </div>
                <div className="form-group">
                  <label className="form-label">Team Logo {editingTeam?.logo_url && '(Uploaded)'}</label>
                  <input type="file" name="logo" accept="image/*" onChange={handleFormChange} className="form-input" ref={fileInputRef} />
                </div>
              </div>

              <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ width: '100%' }}>
                {actionLoading ? 'Saving...' : (editingTeam ? 'Update Team' : 'Add Team')}
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            {teams.length === 0 ? <p className="text-muted text-center" style={{ padding: '2rem' }}>No teams created yet. Start by adding a team!</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
                {teams.map(team => {
                    const teamIcons = iconsByTeam[team.id] || [];
                    const maxIcons = activeAuction?.number_of_icon !== null && activeAuction?.number_of_icon !== undefined ? parseInt(activeAuction.number_of_icon) : 999;
                    const canAddMoreIcons = teamIcons.length < maxIcons;

                    const modernTeamOwners = moduleTeamOwnersMap[team.id] || [];
                    const legacyTeamOwners = ownersByTeam[team.id] || [];
                    const combinedTeamOwners = modernTeamOwners.length > 0
                        ? modernTeamOwners.map(mo => ({
                            id: mo.id,
                            owner_name: mo.owner_name,
                            photo_url: mo.photo_url,
                            mobile_number: mo.mobile_number,
                            is_module: true
                        }))
                        : legacyTeamOwners.map(p => ({
                            id: p.auction_player_id,
                            owner_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Owner',
                            photo_url: p.photo_url,
                            mobile_number: p.mobile,
                            is_module: false,
                            auction_player_id: p.auction_player_id
                        }));

                    const maxOwners = activeAuction?.number_of_owner !== null && activeAuction?.number_of_owner !== undefined ? parseInt(activeAuction.number_of_owner) : 999;
                    const canAddMoreOwners = combinedTeamOwners.length < maxOwners;
                    
                    return (
                      <div key={team.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '8px', overflow: 'hidden' }}>
                        
                        {/* Team Header */}
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                            {team.logo_url ? (
                                <img src={team.logo_url} alt="Logo" style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: '50%', background: '#fff', border: '2px solid var(--accent-gold)' }} />
                            ) : (
                                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold', border: '2px solid var(--accent-gold)' }}>
                                    {getTeamInitials(team.team_name)}
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 0.2rem 0', color: 'var(--text-main)' }}>{team.team_name}</h3>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Icons: {teamIcons.length}/{maxIcons > 100 ? '∞' : maxIcons} | Owners: {combinedTeamOwners.length}/{maxOwners > 100 ? '∞' : maxOwners}
                                </div>
                            </div>
                            <div>
                                <button disabled={actionLoading} onClick={() => handleEditClick(team)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', marginRight: '0.5rem' }}>Edit</button>
                                <button disabled={actionLoading} onClick={() => deleteTeam(team)} className="btn" style={{ background: '#ef4444', color: '#fff', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}>Delete</button>
                            </div>
                        </div>

                        {/* Team Leadership (Captain & Vice-Captain) */}
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,215,0,0.02)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--accent-gold)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                👑 Team Leadership
                            </h4>
                            
                            {(() => {
                                const teamSquad = allAuctionPlayers.filter(ap => ap.team_id === team.id);
                                const captPlayer = teamSquad.find(ap => ap.id == team.captain_id);
                                const viceCaptPlayer = teamSquad.find(ap => ap.id == team.vice_captain_id);

                                const captCandidates = allAuctionPlayers.filter(ap => (ap.is_captain || team.captain_id == ap.id) && (!ap.team_id || ap.team_id === team.id));
                                return (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                                👑 Captain (C)
                                            </label>
                                            <select
                                                className="form-select"
                                                style={{ width: '100%', fontSize: '0.82rem', padding: '0.4rem' }}
                                                value={team.captain_id || ''}
                                                onChange={(e) => assignCaptain(team.id, e.target.value)}
                                                disabled={actionLoading}
                                            >
                                                <option value="">-- None --</option>
                                                {captCandidates.map(ap => (
                                                    <option key={ap.id} value={ap.id}>
                                                        {ap.players?.first_name} {ap.players?.last_name} ({ap.is_owner ? 'Owner' : ap.is_icon ? 'Icon' : 'Captain'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                                ⭐ Vice-Captain (VC)
                                            </label>
                                            <select
                                                className="form-select"
                                                style={{ width: '100%', fontSize: '0.82rem', padding: '0.4rem' }}
                                                value={team.vice_captain_id || ''}
                                                onChange={(e) => assignViceCaptain(team.id, e.target.value)}
                                                disabled={actionLoading}
                                            >
                                                <option value="">-- None --</option>
                                                {teamSquad.map(ap => (
                                                    <option key={ap.id} value={ap.id}>
                                                        {ap.players?.first_name} {ap.players?.last_name} ({ap.is_owner ? 'Owner' : ap.is_icon ? 'Icon' : 'Member'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Owner Players Section */}
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ margin: 0, color: 'var(--accent-green)', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                                    Assigned Team Owners ({combinedTeamOwners.length})
                                </h4>
                                <Link to={`/admin-owners?code=${auctionCode}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', background: 'rgba(255,215,0,0.15)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}>
                                    + Manage Owners
                                </Link>
                            </div>
                            
                            {combinedTeamOwners.length === 0 ? (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>No team owners assigned yet.</p>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {combinedTeamOwners.map(o => (
                                        <li key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(57,255,20,0.05)', padding: '0.5rem 0.8rem', borderRadius: '4px', border: '1px solid rgba(57,255,20,0.2)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                {o.photo_url ? (
                                                    <img
                                                      src={getOptimizedImageUrl(o.photo_url, 100)}
                                                      alt="Owner"
                                                      onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                                                      style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: '50%', border: '1px solid var(--accent-green)' }}
                                                    />
                                                ) : null}
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(57,255,20,0.2)', display: o.photo_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-green)', border: '1px solid var(--accent-green)' }}>
                                                    {(o.owner_name || 'OW').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff' }}>
                                                        {o.owner_name}
                                                    </span>
                                                    {o.mobile_number && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📞 {o.mobile_number}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => o.is_module ? removeModuleOwner(team.id, o.id) : assignOwnerPlayer(o.auction_player_id, null)} 
                                                className="btn btn-outline" 
                                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderColor: '#ef4444', color: '#ef4444' }}
                                                disabled={actionLoading}
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Assign new owner dropdown */}
                            {canAddMoreOwners && unassignedOwners.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Assign New Owner Player:</label>
                                    <select 
                                        className="form-select" 
                                        style={{ width: '100%', fontSize: '0.9rem' }}
                                        value=""
                                        onChange={(e) => assignOwnerPlayer(e.target.value, team.id)}
                                        disabled={actionLoading}
                                    >
                                        <option value="" disabled>-- Select Unassigned Owner Player --</option>
                                        {unassignedOwners.map(p => (
                                            <option key={p.auction_player_id} value={p.auction_player_id}>
                                                {p.first_name} {p.last_name} ({p.player_role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            {canAddMoreOwners && unassignedOwners.length === 0 && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No unassigned owner players available.</p>
                            )}
                            {!canAddMoreOwners && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>Maximum owner players assigned.</p>
                            )}
                        </div>

                        {/* Icon Players Section */}
                        <div style={{ padding: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--accent-gold)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Assigned Icon Players</h4>
                            
                            {teamIcons.length === 0 ? (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>No icon players assigned yet.</p>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {teamIcons.map(p => (
                                        <li key={p.auction_player_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,215,0,0.05)', padding: '0.5rem 0.8rem', borderRadius: '4px', border: '1px solid rgba(255,215,0,0.2)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                {p.photo_url ? (
                                                    <img src={getOptimizedImageUrl(p.photo_url, 100)} alt="Player" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: '50%' }} />
                                                ) : (
                                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff' }}>
                                                        {getPlayerInitials(p)}
                                                    </div>
                                                )}
                                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                    {p.first_name} {p.last_name}
                                                    {team.captain_id == p.auction_player_id && <span style={{ marginLeft: '0.4rem', color: 'var(--accent-gold)', fontSize: '0.75rem' }}>👑 (C)</span>}
                                                    {team.vice_captain_id == p.auction_player_id && <span style={{ marginLeft: '0.4rem', color: 'var(--accent-green)', fontSize: '0.75rem' }}>⭐ (VC)</span>}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => assignIconPlayer(p.auction_player_id, null)} 
                                                className="btn btn-outline" 
                                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderColor: '#f59e0b', color: '#f59e0b' }}
                                                disabled={actionLoading}
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Assign new icon dropdown */}
                            {canAddMoreIcons && unassignedIcons.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Assign New Icon Player:</label>
                                    <select 
                                        className="form-select" 
                                        style={{ width: '100%', fontSize: '0.9rem' }}
                                        value=""
                                        onChange={(e) => assignIconPlayer(e.target.value, team.id)}
                                        disabled={actionLoading}
                                    >
                                        <option value="" disabled>-- Select Unassigned Icon Player --</option>
                                        {unassignedIcons.map(p => (
                                            <option key={p.auction_player_id} value={p.auction_player_id}>
                                                {p.first_name} {p.last_name} ({p.player_role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            {canAddMoreIcons && unassignedIcons.length === 0 && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No unassigned icon players available.</p>
                            )}
                            {!canAddMoreIcons && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>Maximum icon players assigned.</p>
                            )}
                        </div>
                      </div>
                    );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AuctionTeamsPage;
