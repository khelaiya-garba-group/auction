import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { uploadToCloudinary, deleteFromCloudinary, getOptimizedImageUrl } from '../services/cloudinary';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { normalizeMobile, formatMobile } from '../utils/phoneUtils';

const getPlayerInitials = (p) => {
  if (!p) return '';
  return ((p.first_name?.charAt(0) || '') + (p.last_name?.charAt(0) || '')).toUpperCase();
};

const AdminPlayersPage = () => {
  const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
  const [searchParams] = useSearchParams();
  const auctionCode = searchParams.get('code') || localStorage.getItem('cap_admin_selected_auction_code');

  const [activeAuction, setActiveAuction] = useState(null);
  const [playersList, setPlayersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const itemsPerPage = 20;
  const navigate = useNavigate();

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formError, setFormError] = useState('');

  const initialFormState = {
    first_name: '', last_name: '', mobile: '', email: '',
    dob: '', area: '', gender: '',
    player_role: '', batting_style: '', bowling_style: '',
    photo: null, aadhar: null,
    is_captain: false,
    is_icon: false,
    is_owner: false
  };
  const [formData, setFormData] = useState(initialFormState);

  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);

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

      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('auction_code', auctionCode)
        .maybeSingle();

      if (auctionError) throw auctionError;
      setActiveAuction(auctionData);

      if (auctionData) {
        const { data: apData, error: apError } = await supabase
          .from('auction_players')
          .select('*')
          .eq('auction_id', auctionData.id);

        if (apError) throw apError;

        // Fetch invitations to determine which players registered via invite link
        const { data: invData } = await supabase
          .from('invitations')
          .select('mobile')
          .eq('auction_id', auctionData.id);

        const invitedMobilesSet = new Set((invData || []).map(i => i.mobile ? i.mobile.trim() : ''));

        if (apData && apData.length > 0) {
          const playerIds = apData.map(ap => ap.player_id);
          const { data: pData, error: pError } = await supabase
            .from('players')
            .select('*')
            .in('id', playerIds);

          if (pError) throw pError;

          const merged = apData.map(ap => {
            const playerDetails = pData.find(p => p.id === ap.player_id) || {};
            const isViaLink = playerDetails.mobile ? invitedMobilesSet.has(playerDetails.mobile.trim()) : false;
            return {
              ...playerDetails,
              auction_player_id: ap.id,
              approval_status: ap.approval_status,
              is_captain: ap.is_captain || false,
              is_icon: ap.is_icon || false,
              is_owner: ap.is_owner || false,
              player_number: ap.player_number ?? null,
              is_via_link: isViaLink
            };
          });

          // Sort by player_number ascending, putting null player_numbers at the end
          setPlayersList(merged.sort((a, b) => {
            const numA = a.player_number != null ? a.player_number : Infinity;
            const numB = b.player_number != null ? b.player_number : Infinity;
            if (numA !== numB) return numA - numB;
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
          }));
        } else {
          setPlayersList([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (auctionPlayerId, newStatus) => {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('auction_players')
        .update({ approval_status: newStatus })
        .eq('id', auctionPlayerId);

      if (error) throw error;
      setPlayersList(prev => prev.map(p => p.auction_player_id === auctionPlayerId ? { ...p, approval_status: newStatus } : p));
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleCaptainStatus = async (auctionPlayerId, currentStatus) => {
    try {
      setActionLoading(true);
      const newCaptainStatus = !currentStatus;

      const updatePayload = { 
        is_captain: newCaptainStatus,
        auction_status: null,
        sold_price: 0
      };
      const playerObj = playersList.find(p => p.auction_player_id === auctionPlayerId);
      if (!newCaptainStatus && !playerObj?.is_icon && !playerObj?.is_owner) {
        updatePayload.team_id = null;
        updatePayload.auction_status = 'pending';
      }

      const { error } = await supabase
        .from('auction_players')
        .update(updatePayload)
        .eq('id', auctionPlayerId);

      if (error) throw error;
      setPlayersList(prev => prev.map(p => p.auction_player_id === auctionPlayerId ? { 
        ...p, 
        is_captain: newCaptainStatus
      } : p));

      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to update captain status');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleOwnerStatus = async (auctionPlayerId, currentStatus) => {
    try {
      setActionLoading(true);
      const newOwnerStatus = !currentStatus;

      const updatePayload = { 
        is_owner: newOwnerStatus,
        auction_status: newOwnerStatus ? 'pending' : null,
        sold_price: 0
      };
      if (newOwnerStatus) {
        updatePayload.is_icon = false;
      }
      const playerObj = playersList.find(p => p.auction_player_id === auctionPlayerId);
      if (!newOwnerStatus && !playerObj?.is_icon && !playerObj?.is_captain) {
        updatePayload.team_id = null;
        updatePayload.previous_bid_team_id = null;
      }

      const { error } = await supabase
        .from('auction_players')
        .update(updatePayload)
        .eq('id', auctionPlayerId);

      if (error) throw error;
      setPlayersList(prev => prev.map(p => p.auction_player_id === auctionPlayerId ? { 
        ...p, 
        is_owner: newOwnerStatus,
        is_icon: newOwnerStatus ? false : p.is_icon
      } : p));

      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to update owner status');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleIconStatus = async (auctionPlayerId, currentStatus) => {
    try {
      setActionLoading(true);
      const newIconStatus = !currentStatus;

      const updatePayload = { 
        is_icon: newIconStatus,
        auction_status: null,
        sold_price: 0
      };
      if (newIconStatus) {
        updatePayload.is_owner = false;
      }
      const playerObj = playersList.find(p => p.auction_player_id === auctionPlayerId);
      if (!newIconStatus && !playerObj?.is_owner && !playerObj?.is_captain) {
        updatePayload.team_id = null;
        updatePayload.auction_status = 'pending';
      }

      const { error } = await supabase
        .from('auction_players')
        .update(updatePayload)
        .eq('id', auctionPlayerId);

      if (error) throw error;
      setPlayersList(prev => prev.map(p => p.auction_player_id === auctionPlayerId ? { 
        ...p, 
        is_icon: newIconStatus,
        is_owner: newIconStatus ? false : p.is_owner
      } : p));

      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to update icon status');
    } finally {
      setActionLoading(false);
    }
  };

  const deletePlayer = async (playerId, auctionPlayerId) => {
    if (!window.confirm("Are you sure you want to permanently delete this player?")) return;

    try {
      setActionLoading(true);
      const playerToDelete = playersList.find(p => p.id === playerId);
      if (playerToDelete) {
        if (playerToDelete.photo_url) await deleteFromCloudinary(playerToDelete.photo_url);
        if (playerToDelete.aadhar_card_url) await deleteFromCloudinary(playerToDelete.aadhar_card_url);
      }

      const { error: apError } = await supabase.from('auction_players').delete().eq('id', auctionPlayerId);
      if (apError) throw apError;

      const { error: pError } = await supabase.from('players').delete().eq('id', playerId);
      if (pError) throw pError;

      // Delete corresponding invitation so same mobile number can be re-invited/registered
      if (playerToDelete && playerToDelete.mobile && activeAuction) {
        await supabase
          .from('invitations')
          .delete()
          .eq('auction_id', activeAuction.id)
          .eq('mobile', playerToDelete.mobile.trim());
      }

      setPlayersList(prev => prev.filter(p => p.auction_player_id !== auctionPlayerId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete player');
    } finally {
      setActionLoading(false);
    }
  };

  // --- FORM LOGIC ---
  const handleEditClick = (p) => {
    setEditingPlayer(p);
    setFormData({
      first_name: p.first_name || '', last_name: p.last_name || '',
      mobile: p.mobile || '', email: p.email || '',
      dob: p.dob || '', area: p.area || '', gender: p.gender || '',
      player_role: p.player_role || '', batting_style: p.batting_style || '', bowling_style: p.bowling_style || '',
      photo: null, aadhar: null,
      is_captain: p.is_captain || false,
      is_icon: p.is_icon || false,
      is_owner: p.is_owner || false
    });
    setFormError('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddNewPlayer = () => {
    setEditingPlayer(null);
    setFormData(initialFormState);
    setFormError('');
    if (fileInputRef1.current) fileInputRef1.current.value = "";
    if (fileInputRef2.current) fileInputRef2.current.value = "";
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingPlayer(null);
    setFormData(initialFormState);
    setFormError('');
  };

  const handleFormChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    if (files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else if (type === 'checkbox') {
      if (name === 'is_icon' && checked) {
        setFormData(prev => ({ ...prev, is_icon: true, is_owner: false }));
      } else if (name === 'is_owner' && checked) {
        setFormData(prev => ({ ...prev, is_owner: true, is_icon: false }));
      } else {
        setFormData(prev => ({ ...prev, [name]: checked }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    try {
      if (!activeAuction) throw new Error("No active auction configuration found.");

      // Check Mobile uniqueness using normalizeMobile
      const inputNorm = normalizeMobile(formData.mobile);
      if (inputNorm) {
        const { data: allPlayers, error: checkError } = await supabase
          .from('players')
          .select('id, mobile, first_name, last_name');

        if (checkError) throw checkError;

        const existingPlayer = (allPlayers || []).find(p => {
          if (editingPlayer && p.id === editingPlayer.id) return false;
          return normalizeMobile(p.mobile) === inputNorm;
        });

        if (existingPlayer) {
          throw new Error(`A player with this mobile number already exists (${existingPlayer.first_name} ${existingPlayer.last_name} - ${existingPlayer.mobile}).`);
        }
      }

      let photo_url = editingPlayer ? editingPlayer.photo_url : null;
      let aadhar_card_url = editingPlayer ? editingPlayer.aadhar_card_url : null;

      if (formData.photo) {
        if (photo_url) await deleteFromCloudinary(photo_url);
        photo_url = await uploadToCloudinary(formData.photo);
      }
      if (formData.aadhar) {
        if (aadhar_card_url) await deleteFromCloudinary(aadhar_card_url);
        aadhar_card_url = await uploadToCloudinary(formData.aadhar);
      }

      const playerPayload = {
        first_name: formData.first_name, last_name: formData.last_name,
        mobile: formData.mobile, email: formData.email,
        dob: formData.dob || null, area: formData.area || null, gender: formData.gender || null,
        photo_url, aadhar_card_url,
        player_role: formData.player_role, batting_style: formData.batting_style, bowling_style: formData.bowling_style
      };

      if (editingPlayer) {
        // UPDATE player record
        const { error: updateError } = await supabase.from('players').update(playerPayload).eq('id', editingPlayer.id);
        if (updateError) throw updateError;

        // UPDATE auction_players specifically for is_captain, is_icon and is_owner
        const apUpdatePayload = {
          is_captain: formData.is_captain || false,
          is_icon: formData.is_icon || false,
          is_owner: formData.is_owner || false
        };
        if (!formData.is_captain && !formData.is_icon && !formData.is_owner) {
          apUpdatePayload.team_id = null;
        }

        const { error: apUpdateError } = await supabase.from('auction_players')
          .update(apUpdatePayload)
          .eq('id', editingPlayer.auction_player_id);
        if (apUpdateError) throw apUpdateError;

        alert(`Player ${formData.first_name} updated successfully!`);
      } else {
        // INSERT new player
        const { data: newPlayerData, error: insertError } = await supabase.from('players').insert([playerPayload]).select().single();
        if (insertError) throw insertError;

        // Generate next player_number for this auction
        const { data: maxData } = await supabase
          .from('auction_players')
          .select('player_number')
          .eq('auction_id', activeAuction.id)
          .order('player_number', { ascending: false })
          .limit(1);
        const nextNumber = (maxData && maxData.length > 0 && maxData[0].player_number != null)
          ? maxData[0].player_number + 1
          : 1;

        const { error: apError } = await supabase.from('auction_players').insert([{
          auction_id: activeAuction.id,
          player_id: newPlayerData.id,
          approval_status: 'approved', // Automatically auto-approve Admins directly adding players
          is_captain: formData.is_captain || false,
          is_icon: formData.is_icon || false,
          is_owner: formData.is_owner || false,
          player_number: nextNumber
        }]);
        if (apError) throw apError;
        alert(`Player ${formData.first_name} added successfully!`);
      }

      setShowForm(false);
      await fetchData(); // Refresh entire list
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to save player details.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cap_admin_auth');
    window.location.reload();
  };

  const backfillPlayerNumbers = async () => {
    if (!activeAuction) return alert('No active auction found.');
    if (!window.confirm('This will reassign player numbers to approved players. Owner players will be numbered first (starting from 1), followed by Icon players, and then all other players, with Female players coming last in each category. Continue?')) return;

    setActionLoading(true);
    try {
      // 1. Get all approved auction_players for this auction
      const { data: allPlayers, error: fetchErr } = await supabase
        .from('auction_players')
        .select('id, player_id, player_number, is_icon, is_owner, created_at')
        .eq('auction_id', activeAuction.id)
        .eq('approval_status', 'approved');

      if (fetchErr) throw fetchErr;
      if (!allPlayers || allPlayers.length === 0) {
        alert('No approved players found to number.');
        return;
      }

      // 2. Fetch player details to get gender
      const playerIds = allPlayers.map(ap => ap.player_id);
      const { data: pData, error: pError } = await supabase
        .from('players')
        .select('id, gender')
        .in('id', playerIds);

      if (pError) throw pError;

      const genderMap = {};
      (pData || []).forEach(p => {
        genderMap[p.id] = p.gender;
      });

      const playersWithGender = allPlayers.map(ap => ({
        ...ap,
        gender: genderMap[ap.player_id] || ''
      }));

      // 3. Separate into owner, icon, and other players
      const ownerPlayers = playersWithGender.filter(p => p.is_owner);
      const iconPlayers = playersWithGender.filter(p => p.is_icon);
      const otherPlayers = playersWithGender.filter(p => !p.is_owner && !p.is_icon);

      // 4. Sort each group: Female comes last, then by existing player_number (if any), then by created_at
      const sortGroup = (group) => {
        group.sort((a, b) => {
          // Female comes last
          const isFemaleA = a.gender === 'Female' ? 1 : 0;
          const isFemaleB = b.gender === 'Female' ? 1 : 0;
          if (isFemaleA !== isFemaleB) return isFemaleA - isFemaleB;

          const numA = a.player_number != null ? a.player_number : Infinity;
          const numB = b.player_number != null ? b.player_number : Infinity;
          if (numA !== numB) return numA - numB;

          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        });
      };

      sortGroup(ownerPlayers);
      sortGroup(iconPlayers);
      sortGroup(otherPlayers);

      // 5. Combine them: owners first, then icons, then others
      const sortedPlayers = [...ownerPlayers, ...iconPlayers, ...otherPlayers];

      // 6. Reset all player_numbers in this auction to null first to avoid unique constraint conflicts
      const { error: resetErr } = await supabase
        .from('auction_players')
        .update({ player_number: null })
        .eq('auction_id', activeAuction.id);

      if (resetErr) throw resetErr;

      // 7. Update each player's number sequentially starting from 1
      for (let i = 0; i < sortedPlayers.length; i++) {
        const p = sortedPlayers[i];
        const newNumber = i + 1;

        const { error: updateErr } = await supabase
          .from('auction_players')
          .update({ player_number: newNumber })
          .eq('id', p.id);
        if (updateErr) throw updateErr;
      }

      alert(`✅ Successfully fixed numbering for all ${sortedPlayers.length} approved player(s)!`);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to fix player numbers: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const duplicateInfoMap = useMemo(() => {
    const mobileGroups = new Map();

    playersList.forEach(p => {
      const normMobile = normalizeMobile(p.mobile);
      if (normMobile) {
        if (!mobileGroups.has(normMobile)) mobileGroups.set(normMobile, []);
        mobileGroups.get(normMobile).push(p);
      }
    });

    const infoMap = new Map();

    mobileGroups.forEach((players, normMobile) => {
      if (players.length > 1) {
        players.forEach(p => {
          infoMap.set(p.auction_player_id, {
            isDuplicate: true,
            reasons: [`Duplicate Mobile (${formatMobile(normMobile)})`],
            groupKey: normMobile
          });
        });
      }
    });

    return infoMap;
  }, [playersList]);

  const filteredList = playersList.filter(p => {
    let matchesTab = false;
    if (activeTab === 'duplicates') {
      matchesTab = duplicateInfoMap.has(p.auction_player_id);
    } else if (activeTab === 'captain') {
      matchesTab = !!p.is_captain;
    } else if (activeTab === 'icon') {
      matchesTab = !!p.is_icon;
    } else if (activeTab === 'owner') {
      matchesTab = !!p.is_owner;
    } else {
      matchesTab = p.approval_status === activeTab;
    }

    const lowSearch = searchTerm.toLowerCase().trim();
    const normSearch = normalizeMobile(searchTerm);

    const matchesSearch = searchTerm === '' ||
      `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(lowSearch) ||
      (p.mobile && p.mobile.includes(searchTerm)) ||
      (normSearch && normalizeMobile(p.mobile).includes(normSearch)) ||
      (p.player_number && p.player_number.toString().includes(searchTerm));

    const matchesGender = genderFilter === 'all' || (p.gender && p.gender.toLowerCase() === genderFilter.toLowerCase());
    const matchesSource = sourceFilter === 'all' || 
      (sourceFilter === 'link' && p.is_via_link) || 
      (sourceFilter === 'no_link' && !p.is_via_link);

    return matchesTab && matchesSearch && matchesGender && matchesSource;
  });

  if (activeTab === 'duplicates') {
    filteredList.sort((a, b) => {
      const keyA = duplicateInfoMap.get(a.auction_player_id)?.groupKey || '';
      const keyB = duplicateInfoMap.get(b.auction_player_id)?.groupKey || '';
      return keyA.localeCompare(keyB);
    });
  }

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + itemsPerPage);

  const pendingCount = playersList.filter(p => p.approval_status === 'pending').length;
  const approvedCount = playersList.filter(p => p.approval_status === 'approved').length;
  const rejectedCount = playersList.filter(p => p.approval_status === 'rejected').length;
  const captainCount = playersList.filter(p => p.is_captain).length;
  const iconCount = playersList.filter(p => p.is_icon).length;
  const ownerCount = playersList.filter(p => p.is_owner).length;
  const duplicateCount = duplicateInfoMap.size;

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader title="Player Management" showLogos={false} />

      <main className="container" style={{ padding: '2rem 1rem', zIndex: 1, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ color: 'var(--text-main)', margin: 0 }}>Active Auction: {activeAuction ? activeAuction.auction_name : 'None'}</h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {!showForm && <button onClick={handleAddNewPlayer} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', background: 'var(--accent-gold)' }}>+ Add Player</button>}
            {!showForm && (
              <button
                onClick={backfillPlayerNumbers}
                disabled={actionLoading}
                className="btn btn-outline"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}
                title="Assign player numbers to all players that don't have one yet"
              >
                🔢 Fix Numbering
              </button>
            )}
            <Link to="/players" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>View Players List</Link>
            <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Admin</Link>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: '#ff4444', borderColor: '#ff4444' }}>Logout</button>
          </div>
        </div>

        {showForm ? (
          <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '800px', margin: '0 auto 3rem' }}>
            <h2 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {editingPlayer ? `Edit Player: ${editingPlayer.first_name}` : 'Add New Player'}
              <button type="button" onClick={cancelForm} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                Cancel
              </button>
            </h2>

            {formError && <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff4444', color: '#ff4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>{formError}</div>}

            <form onSubmit={handleFormSubmit}>
              <h3 style={{ color: 'var(--text-main)', marginBottom: '1rem', fontSize: '1.1rem' }}>Personal Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input required type="text" name="first_name" value={formData.first_name} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input required type="text" name="last_name" value={formData.last_name} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <input required type="tel" name="mobile" value={formData.mobile} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleFormChange} className="form-select">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Area / City</label>
                  <input type="text" name="area" value={formData.area} onChange={handleFormChange} className="form-input" />
                </div>
              </div>

              <h3 style={{ color: 'var(--text-main)', marginBottom: '1rem', fontSize: '1.1rem' }}>Cricket Profile</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Player Role *</label>
                  <select required name="player_role" value={formData.player_role} onChange={handleFormChange} className="form-select">
                    <option value="">Select Role</option>
                    <option value="Batter">Batter</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All Rounder">All Rounder</option>
                    <option value="Wicket Keeper">Wicket Keeper</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Batting Style *</label>
                  <select required name="batting_style" value={formData.batting_style} onChange={handleFormChange} className="form-select">
                    <option value="">Select Style</option>
                    <option value="Right Hand">Right Hand</option>
                    <option value="Left Hand">Left Hand</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bowling Style *</label>
                  <select required name="bowling_style" value={formData.bowling_style} onChange={handleFormChange} className="form-select">
                    <option value="">Select Style</option>
                    <option value="Right Arm Fast">Right Arm Fast</option>
                    <option value="Right Arm Medium">Right Arm Medium</option>
                    <option value="Right Arm Spin">Right Arm Spin</option>
                    <option value="Left Arm Fast">Left Arm Fast</option>
                    <option value="Left Arm Spin">Left Arm Spin</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>

              <h3 style={{ color: 'var(--text-main)', marginBottom: '1rem', fontSize: '1.1rem' }}>Documents</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Player Photo {editingPlayer?.photo_url && '(Uploaded)'}</label>
                  <input type="file" name="photo" accept="image/*" onChange={handleFormChange} className="form-input" ref={fileInputRef1} />
                </div>
                <div className="form-group">
                  {/* <label className="form-label">Aadhar Card {editingPlayer?.aadhar_card_url && '(Uploaded)'}</label>
                  <input type="file" name="aadhar" accept="image/*,application/pdf" onChange={handleFormChange} className="form-input" ref={fileInputRef2} /> */}
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', margin: 0, padding: '0.5rem', background: 'rgba(255,215,0,0.1)', borderRadius: '4px', border: '1px solid var(--accent-gold)' }}>
                    <input type="checkbox" name="is_captain" checked={formData.is_captain} onChange={handleFormChange} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--accent-gold)' }} />
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Mark as Captain Player</span>
                  </label>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', margin: 0, padding: '0.5rem', background: 'rgba(255,215,0,0.1)', borderRadius: '4px', border: '1px solid var(--accent-gold)' }}>
                    <input type="checkbox" name="is_icon" checked={formData.is_icon} onChange={handleFormChange} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--accent-gold)' }} />
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Mark as Icon Player</span>
                  </label>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', margin: 0, padding: '0.5rem', background: 'rgba(57,255,20,0.1)', borderRadius: '4px', border: '1px solid var(--accent-green)' }}>
                    <input type="checkbox" name="is_owner" checked={formData.is_owner} onChange={handleFormChange} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--accent-green)' }} />
                    <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>Mark as Owner Player</span>
                  </label>
                </div>
              </div>

              <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ width: '100%', maxWidth: '300px', margin: '0 auto', display: 'block' }}>
                {actionLoading ? 'Saving...' : (editingPlayer ? 'Update Player' : 'Add Player')}
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                  className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.4rem 1.2rem', fontWeight: 600, fontSize: '0.9rem' }}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => { setActiveTab('approved'); setCurrentPage(1); }}
                  className={`btn ${activeTab === 'approved' ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    padding: '0.4rem 1.2rem', fontWeight: 600, fontSize: '0.9rem',
                    color: activeTab === 'approved' ? '#000' : 'var(--accent-green)',
                    borderColor: 'var(--accent-green)',
                    backgroundColor: activeTab === 'approved' ? 'var(--accent-green)' : 'transparent'
                  }}
                >
                  Approved ({approvedCount})
                </button>
                <button
                  onClick={() => { setActiveTab('rejected'); setCurrentPage(1); }}
                  className={`btn ${activeTab === 'rejected' ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    padding: '0.4rem 1.2rem', fontWeight: 600, fontSize: '0.9rem',
                    color: activeTab === 'rejected' ? '#000' : '#f59e0b',
                    borderColor: '#f59e0b',
                    backgroundColor: activeTab === 'rejected' ? '#f59e0b' : 'transparent'
                  }}
                >
                  Rejected ({rejectedCount})
                </button>
                <button
                  onClick={() => { setActiveTab('captain'); setCurrentPage(1); }}
                  className={`btn ${activeTab === 'captain' ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    padding: '0.4rem 1.2rem', fontWeight: 600, fontSize: '0.9rem',
                    color: activeTab === 'captain' ? '#000' : 'var(--accent-gold)',
                    borderColor: 'var(--accent-gold)',
                    backgroundColor: activeTab === 'captain' ? 'var(--accent-gold)' : 'transparent'
                  }}
                >
                  👑 Captains ({captainCount})
                </button>
                <button
                  onClick={() => { setActiveTab('icon'); setCurrentPage(1); }}
                  className={`btn ${activeTab === 'icon' ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    padding: '0.4rem 1.2rem', fontWeight: 600, fontSize: '0.9rem',
                    color: activeTab === 'icon' ? '#000' : 'var(--accent-gold)',
                    borderColor: 'var(--accent-gold)',
                    backgroundColor: activeTab === 'icon' ? 'var(--accent-gold)' : 'transparent'
                  }}
                >
                  ⭐ Icons ({iconCount})
                </button>
                <button
                  onClick={() => { setActiveTab('owner'); setCurrentPage(1); }}
                  className={`btn ${activeTab === 'owner' ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    padding: '0.4rem 1.2rem', fontWeight: 600, fontSize: '0.9rem',
                    color: activeTab === 'owner' ? '#000' : 'var(--accent-green)',
                    borderColor: 'var(--accent-green)',
                    backgroundColor: activeTab === 'owner' ? 'var(--accent-green)' : 'transparent'
                  }}
                >
                  🏷️ Owners ({ownerCount})
                </button>
                <button
                  onClick={() => { setActiveTab('duplicates'); setCurrentPage(1); }}
                  className={`btn ${activeTab === 'duplicates' ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    padding: '0.4rem 1.2rem', fontWeight: 600, fontSize: '0.9rem',
                    color: activeTab === 'duplicates' ? '#fff' : '#ef4444',
                    borderColor: '#ef4444',
                    backgroundColor: activeTab === 'duplicates' ? '#ef4444' : 'transparent'
                  }}
                >
                  ⚠️ Duplicates ({duplicateCount})
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.8rem', flex: '1', minWidth: '320px', maxWidth: '700px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={sourceFilter}
                  onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
                  className="form-select"
                  style={{ width: 'auto', minWidth: '150px', border: '1px solid var(--glass-border)', fontSize: '0.9rem' }}
                >
                  <option value="all">All Sources</option>
                  <option value="link">🔗 Via Invite Link</option>
                  <option value="no_link">⚠️ Not via Link (Manual/Direct)</option>
                </select>

                <select
                  value={genderFilter}
                  onChange={(e) => { setGenderFilter(e.target.value); setCurrentPage(1); }}
                  className="form-select"
                  style={{ width: 'auto', minWidth: '130px', border: '1px solid var(--glass-border)', fontSize: '0.9rem' }}
                >
                  <option value="all">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>

                <input
                  type="text"
                  placeholder="Search by name, mobile or number..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="form-input"
                  style={{ flex: 1, minWidth: '180px', border: '1px solid var(--glass-border)' }}
                />
              </div>
            </div>

            {paginatedList.length === 0 ? <p className="text-muted text-center" style={{ padding: '2rem' }}>No players found in this category.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', width: '50px' }}>Player No.</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Photo</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Name</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Reg Source</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Role</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Mobile</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Gender</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map(p => {
                      const dupInfo = duplicateInfoMap.get(p.auction_player_id);
                      return (
                      <tr
                        key={p.auction_player_id}
                        onClick={() => navigate(`/player/${p.id}`, { state: { from: '/admin-players' } })}
                        style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                      >
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent-gold)', minWidth: '50px' }}>
                          {p.player_number != null ? `#${p.player_number}` : '-'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {p.photo_url ? (
                            <img src={getOptimizedImageUrl(p.photo_url, 100)} alt="Player" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: '4px' }} />
                          ) : (
                            <div style={{ width: 50, height: 50, borderRadius: '4px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>
                              {getPlayerInitials(p)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 'bold' }}>{p.first_name} {p.last_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.email}</div>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                            {p.is_captain && <span style={{ background: 'var(--accent-gold)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>👑 CAPTAIN</span>}
                            {p.is_icon && <span style={{ background: 'var(--accent-gold)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>ICON</span>}
                            {p.is_owner && <span style={{ background: 'var(--accent-green)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>OWNER</span>}
                            {activeTab === 'duplicates' && (
                              <span style={{
                                background: p.approval_status === 'approved' ? 'rgba(57,255,20,0.15)' : p.approval_status === 'rejected' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.15)',
                                color: p.approval_status === 'approved' ? 'var(--accent-green)' : p.approval_status === 'rejected' ? '#f59e0b' : '#aaa',
                                border: '1px solid currentColor',
                                padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase'
                              }}>
                                {p.approval_status}
                              </span>
                            )}
                            {dupInfo && (
                              <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                ⚠️ {dupInfo.reasons.join(', ')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {p.is_via_link ? (
                            <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-block' }}>
                              🔗 Via Link
                            </span>
                          ) : (
                            <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-block' }}>
                              ⚠️ Not via Link
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>{p.player_role}</td>
                        <td style={{ padding: '1rem' }}>{p.mobile}</td>
                        <td style={{ padding: '1rem' }}>{p.gender || '-'}</td>
                        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button disabled={actionLoading} onClick={(e) => { e.stopPropagation(); handleEditClick(p); }} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Edit</button>

                          <button
                            disabled={actionLoading}
                            onClick={(e) => { e.stopPropagation(); toggleCaptainStatus(p.auction_player_id, p.is_captain); }}
                            className="btn btn-outline"
                            style={{
                              padding: '0.4rem 0.8rem', fontSize: '0.8rem',
                              color: p.is_captain ? 'var(--accent-gold)' : '',
                              borderColor: p.is_captain ? 'var(--accent-gold)' : ''
                            }}
                          >
                            {p.is_captain ? 'Remove Captain' : 'Make Captain'}
                          </button>

                          <button
                            disabled={actionLoading}
                            onClick={(e) => { e.stopPropagation(); toggleIconStatus(p.auction_player_id, p.is_icon); }}
                            className="btn btn-outline"
                            style={{
                              padding: '0.4rem 0.8rem', fontSize: '0.8rem',
                              color: p.is_icon ? 'var(--accent-gold)' : '',
                              borderColor: p.is_icon ? 'var(--accent-gold)' : ''
                            }}
                          >
                            {p.is_icon ? 'Remove Icon' : 'Make Icon'}
                          </button>

                          <button
                            disabled={actionLoading}
                            onClick={(e) => { e.stopPropagation(); toggleOwnerStatus(p.auction_player_id, p.is_owner); }}
                            className="btn btn-outline"
                            style={{
                              padding: '0.4rem 0.8rem', fontSize: '0.8rem',
                              color: p.is_owner ? 'var(--accent-green)' : '',
                              borderColor: p.is_owner ? 'var(--accent-green)' : ''
                            }}
                          >
                            {p.is_owner ? 'Remove Owner' : 'Make Owner'}
                          </button>

                          {p.approval_status !== 'approved' && (
                            <button disabled={actionLoading} onClick={(e) => { e.stopPropagation(); updateStatus(p.auction_player_id, 'approved'); }} className="btn" style={{ background: 'var(--accent-green)', color: '#000', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Approve</button>
                          )}
                          {p.approval_status !== 'rejected' && (
                            <button disabled={actionLoading} onClick={(e) => { e.stopPropagation(); updateStatus(p.auction_player_id, 'rejected'); }} className="btn" style={{ background: '#f59e0b', color: '#000', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Reject</button>
                          )}
                          <button disabled={actionLoading} onClick={(e) => { e.stopPropagation(); deletePlayer(p.id, p.auction_player_id); }} className="btn" style={{ background: '#ef4444', color: '#fff', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Delete</button>
                        </td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', gap: '1rem', alignItems: 'center' }}>
                <button
                  className="btn btn-outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Previous
                </button>
                <div style={{ color: 'var(--text-muted)' }}>
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  className="btn btn-outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPlayersPage;
