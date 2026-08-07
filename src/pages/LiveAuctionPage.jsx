import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { getOptimizedImageUrl } from '../services/cloudinary';

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

const LiveAuctionPage = () => {
    const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
    const [searchParams] = useSearchParams();
    const auctionCode = searchParams.get('code') || localStorage.getItem('cap_admin_selected_auction_code');

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('bidding'); // 'bidding' or 'sold'

    const [activeAuction, setActiveAuction] = useState(null);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [activePlayer, setActivePlayer] = useState(null);

    // Search and Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');

    // Direct Custom Bidding States
    const [customBid, setCustomBid] = useState('');
    const [customBidTeam, setCustomBidTeam] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        fetchData();

        // Real-time subscription for bidding updates
        const subscription = supabase
            .channel('auction_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_players' }, payload => {
                const { eventType, new: updatedPlayer, old: oldPlayer } = payload;
                if (
                    eventType === 'UPDATE' &&
                    updatedPlayer &&
                    updatedPlayer.auction_status === 'active' &&
                    oldPlayer &&
                    oldPlayer.auction_status === 'active'
                ) {
                    // Update active player's bid details locally without fetching all players
                    setActivePlayer(prev => {
                        if (prev && prev.id === updatedPlayer.id) {
                            return {
                                ...prev,
                                current_bid_price: updatedPlayer.current_bid_price,
                                current_bid_team_id: updatedPlayer.current_bid_team_id,
                                previous_bid_price: updatedPlayer.previous_bid_price,
                                previous_bid_team_id: updatedPlayer.previous_bid_team_id
                            };
                        }
                        return prev;
                    });
                    // Also update in main players list
                    setPlayers(prevPlayers => {
                        return prevPlayers.map(p => {
                            if (p.id === updatedPlayer.id) {
                                return {
                                    ...p,
                                    current_bid_price: updatedPlayer.current_bid_price,
                                    current_bid_team_id: updatedPlayer.current_bid_team_id,
                                    previous_bid_price: updatedPlayer.previous_bid_price,
                                    previous_bid_team_id: updatedPlayer.previous_bid_team_id
                                };
                            }
                            return p;
                        });
                    });
                } else {
                    fetchData(); // Sync lists for other changes (status, team assignment, etc.)
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [isAuthenticated, auctionCode]);

    const fetchData = async () => {
        try {
            if (!auctionCode) {
                setLoading(false);
                return;
            }

            // Fetch Active Auction by Code
            const { data: auctionData, error: auctionError } = await supabase
                .from('auctions')
                .select('*')
                .eq('auction_code', auctionCode)
                .maybeSingle();

            if (auctionError && auctionError.code !== 'PGRST116') throw auctionError;
            setActiveAuction(auctionData);

            if (auctionData) {
                // Fetch Teams
                const { data: tData } = await supabase.from('auction_teams').select('*').eq('auction_id', auctionData.id);
                setTeams(tData || []);

                // Fetch All Auction Players (to find active and sold)
                const { data: apData } = await supabase
                    .from('auction_players')
                    .select('*, players(*)')
                    .eq('auction_id', auctionData.id)
                    .eq('approval_status', 'approved');

                // Sort by player_number ascending, putting null player_numbers at the end
                const sortedPlayers = (apData || []).sort((a, b) => {
                    const numA = a.player_number != null ? a.player_number : Infinity;
                    const numB = b.player_number != null ? b.player_number : Infinity;
                    if (numA !== numB) return numA - numB;
                    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
                });
                setPlayers(sortedPlayers);

                // Find currently active player
                const currentActive = sortedPlayers?.find(p => p.auction_status === 'active');
                setActivePlayer(currentActive || null);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    const startAuctionForPlayer = async (auctionPlayerId) => {
        try {
            setActionLoading(true);

            // Check if any other player is active
            if (activePlayer) {
                alert("Another player is already active. Please finish that auction first.");
                return;
            }

            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'active',
                    current_bid_price: activeAuction.base_price,
                    current_bid_team_id: null
                })
                .eq('id', auctionPlayerId);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            alert("Failed to start auction");
        } finally {
            setActionLoading(false);
        }
    };

    const placeBid = async (teamId) => {
        if (!activePlayer || actionLoading) return;

        try {
            setActionLoading(true);

            // Calculate next bid
            const basePrice = activeAuction.base_price || 0;
            const currentBid = activePlayer.current_bid_price || 0;
            let nextBid = 0;

            if (!activePlayer.current_bid_team_id) {
                nextBid = basePrice;
            } else {
                nextBid = currentBid + basePrice;
            }

            // Check max players & team budget
            const maxPlayers = activeAuction?.max_players || 11;
            const targetTeam = teams.find(t => t.id === teamId);
            const teamPlayers = players.filter(p => p.team_id === teamId);
            const spent = teamPlayers.reduce((acc, p) => acc + (p.sold_price || 0), 0);

            const isAlreadyInTeam = activePlayer.team_id === teamId;
            if (!isAlreadyInTeam && teamPlayers.length >= maxPlayers) {
                alert(`Cannot place bid! ${targetTeam?.team_name || 'Team'} has already reached the maximum squad limit of ${maxPlayers} players.`);
                return;
            }

            if (spent + nextBid > activeAuction.max_budget) {
                alert(`Insufficient budget! ${targetTeam?.team_name || 'Team'} has only ${activeAuction.max_budget - spent} remaining.`);
                return;
            }

            const { error } = await supabase
                .from('auction_players')
                .update({
                    current_bid_price: nextBid,
                    current_bid_team_id: teamId,
                    previous_bid_price: activePlayer.current_bid_price || 0,
                    previous_bid_team_id: activePlayer.current_bid_team_id || null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            
            // Update activePlayer and players array locally for immediate reactivity
            setActivePlayer(prev => ({
                ...prev,
                current_bid_price: nextBid,
                current_bid_team_id: teamId,
                previous_bid_price: prev.current_bid_price || 0,
                previous_bid_team_id: prev.current_bid_team_id || null
            }));
            setPlayers(prevPlayers => prevPlayers.map(p => {
                if (p.id === activePlayer.id) {
                    return {
                        ...p,
                        current_bid_price: nextBid,
                        current_bid_team_id: teamId,
                        previous_bid_price: activePlayer.current_bid_price || 0,
                        previous_bid_team_id: activePlayer.current_bid_team_id || null
                    };
                }
                return p;
            }));
        } catch (err) {
            alert("Failed to place bid");
        } finally {
            setActionLoading(false);
        }
    };

    const placeCustomBid = async (e) => {
        if (e) e.preventDefault();
        if (!activePlayer || actionLoading) return;
        if (!customBid || !customBidTeam) {
            alert("Please enter a bid amount and select a team.");
            return;
        }

        const bidAmount = parseInt(customBid, 10);
        if (isNaN(bidAmount)) {
            alert("Please enter a valid number for bid amount.");
            return;
        }

        if (bidAmount < 0) {
            alert("Bid amount must be a positive number.");
            return;
        }

        // Check max players & team budget
        const maxPlayers = activeAuction?.max_players || 11;
        const teamId = customBidTeam;
        const targetTeam = teams.find(t => String(t.id) === String(teamId));
        if (!targetTeam) {
            alert("Selected team was not found.");
            return;
        }

        const teamPlayers = players.filter(p => String(p.team_id) === String(targetTeam.id));
        const spent = teamPlayers.reduce((acc, p) => acc + (p.sold_price || 0), 0);

        const isAlreadyInTeam = activePlayer.team_id === targetTeam.id;
        if (!isAlreadyInTeam && teamPlayers.length >= maxPlayers) {
            alert(`Cannot place bid! ${targetTeam.team_name} has already reached the maximum squad limit of ${maxPlayers} players.`);
            return;
        }

        if (spent + bidAmount > activeAuction.max_budget) {
            alert(`Insufficient budget! ${targetTeam.team_name} has only ${activeAuction.max_budget - spent} remaining.`);
            return;
        }

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    current_bid_price: bidAmount,
                    current_bid_team_id: targetTeam.id,
                    previous_bid_price: activePlayer.current_bid_price || 0,
                    previous_bid_team_id: activePlayer.current_bid_team_id || null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;

            // Update activePlayer and players array locally for immediate reactivity
            setActivePlayer(prev => ({
                ...prev,
                current_bid_price: bidAmount,
                current_bid_team_id: targetTeam.id,
                previous_bid_price: prev.current_bid_price || 0,
                previous_bid_team_id: prev.current_bid_team_id || null
            }));
            setPlayers(prevPlayers => prevPlayers.map(p => {
                if (p.id === activePlayer.id) {
                    return {
                        ...p,
                        current_bid_price: bidAmount,
                        current_bid_team_id: targetTeam.id,
                        previous_bid_price: activePlayer.current_bid_price || 0,
                        previous_bid_team_id: activePlayer.current_bid_team_id || null
                    };
                }
                return p;
            }));

            // Reset form
            setCustomBid('');
            setCustomBidTeam('');
        } catch (err) {
            alert("Failed to place custom bid");
        } finally {
            setActionLoading(false);
        }
    };

    const undoLastBid = async () => {
        if (!activePlayer || actionLoading || !activePlayer.current_bid_team_id) return;
        if (!window.confirm("Undo the last bid?")) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    current_bid_price: activePlayer.previous_bid_price || 0,
                    current_bid_team_id: activePlayer.previous_bid_team_id || null,
                    previous_bid_price: 0,
                    previous_bid_team_id: null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            
            // Update activePlayer and players array locally for immediate reactivity
            setActivePlayer(prev => ({
                ...prev,
                current_bid_price: prev.previous_bid_price || 0,
                current_bid_team_id: prev.previous_bid_team_id || null,
                previous_bid_price: 0,
                previous_bid_team_id: null
            }));
            setPlayers(prevPlayers => prevPlayers.map(p => {
                if (p.id === activePlayer.id) {
                    return {
                        ...p,
                        current_bid_price: activePlayer.previous_bid_price || 0,
                        current_bid_team_id: activePlayer.previous_bid_team_id || null,
                        previous_bid_price: 0,
                        previous_bid_team_id: null
                    };
                }
                return p;
            }));
        } catch (err) {
            console.error(err);
            alert("Failed to undo bid.");
        } finally {
            setActionLoading(false);
        }
    };

    const cancelActiveAuction = async () => {
        if (!activePlayer || actionLoading) return;
        if (!window.confirm(`Stop auction for ${activePlayer.players.first_name} and return them to pending list?`)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'pending',
                    team_id: null,
                    sold_price: 0,
                    current_bid_price: 0,
                    current_bid_team_id: null,
                    previous_bid_price: 0,
                    previous_bid_team_id: null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to cancel auction.");
        } finally {
            setActionLoading(false);
        }
    };

    const finalizeSold = async () => {
        if (!activePlayer || !activePlayer.current_bid_team_id) return;

        const maxPlayers = activeAuction?.max_players || 11;
        const targetTeam = teams.find(t => String(t.id) === String(activePlayer.current_bid_team_id));
        const teamPlayers = players.filter(p => String(p.team_id) === String(activePlayer.current_bid_team_id));

        const isAlreadyInTeam = activePlayer.team_id === activePlayer.current_bid_team_id;
        if (!isAlreadyInTeam && teamPlayers.length >= maxPlayers) {
            alert(`Cannot sell player! ${targetTeam?.team_name || 'Team'} has already reached the maximum squad limit of ${maxPlayers} players.`);
            return;
        }

        if (!window.confirm(`Mark ${activePlayer.players.first_name} as SOLD for ₹${activePlayer.current_bid_price}?`)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'sold',
                    team_id: activePlayer.current_bid_team_id,
                    sold_price: activePlayer.current_bid_price
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            alert("Failed to finalize auction");
        } finally {
            setActionLoading(false);
        }
    };

    const markUnsold = async () => {
        if (!activePlayer) return;
        if (!window.confirm(`Mark ${activePlayer.players.first_name} as UNSOLD?`)) return;

        try {
            setActionLoading(true);
            const ownerTeam = activePlayer.owner_team_id || activePlayer.previous_bid_team_id;
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'unsold',
                    team_id: activePlayer.is_owner ? ownerTeam : null,
                    sold_price: 0,
                    current_bid_price: 0,
                    current_bid_team_id: null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            alert("Failed to mark as unsold");
        } finally {
            setActionLoading(false);
        }
    };

    const revertPlayer = async (player) => {
        if (!window.confirm(`Are you sure you want to REVERT ${player.players.first_name} to pending status? This will unassign them from their team and refund the ₹${player.sold_price?.toLocaleString()}.`)) return;

        try {
            setActionLoading(true);
            const ownerTeam = player.owner_team_id || player.previous_bid_team_id;
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'pending',
                    team_id: player.is_owner ? ownerTeam : null,
                    sold_price: 0,
                    current_bid_price: 0,
                    current_bid_team_id: null
                })
                .eq('id', player.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to revert player.");
        } finally {
            setActionLoading(false);
        }
    };

    const restartPlayer = async (player) => {
        if (!window.confirm(`Restart auction for ${player.players.first_name}? This will move them back to the pending list.`)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'pending',
                    team_id: null,
                    sold_price: 0,
                    current_bid_price: 0,
                    current_bid_team_id: null
                })
                .eq('id', player.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to restart player.");
        } finally {
            setActionLoading(false);
        }
    };

    const restartAllUnsold = async () => {
        const unsoldOnes = players.filter(p => p.auction_status === 'unsold');
        if (unsoldOnes.length === 0) return;
        if (!window.confirm(`Are you sure you want to RESTART ALL ${unsoldOnes.length} unsold players and move them back to the pending list?`)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'pending',
                    team_id: null,
                    sold_price: 0,
                    current_bid_price: 0,
                    current_bid_team_id: null
                })
                .in('id', unsoldOnes.map(p => p.id));

            if (error) throw error;
            await fetchData();
            alert("All unsold players moved back to pending.");
        } catch (err) {
            console.error(err);
            alert("Failed to restart all unsold players.");
        } finally {
            setActionLoading(false);
        }
    };

    if (!isAuthenticated) return <Navigate to="/admin" replace />;
    if (!auctionCode || (!loading && !activeAuction)) return <Navigate to="/admin" replace />;
    if (loading) return <Loader message="OPENING AUCTION STADIUM..." />;

    const pendingPlayers = players.filter(p => {
        const matchesStatus = !['sold', 'unsold', 'active'].includes(p.auction_status) && !p.is_icon && !p.is_captain;
        const lowSearch = searchTerm.toLowerCase();
        const matchesSearch = (p.players.first_name + ' ' + p.players.last_name).toLowerCase().includes(lowSearch) || 
                              (p.player_number && p.player_number.toString().includes(searchTerm));
        const matchesRole = roleFilter === 'ALL' || p.players.player_role === roleFilter;
        return matchesStatus && matchesSearch && matchesRole;
    });
    const soldPlayers = players.filter(p => p.auction_status === 'sold' && !p.is_icon && !p.is_captain);
    const unsoldPlayers = players.filter(p => p.auction_status === 'unsold');

    // Get unique roles for filter
    const roles = ['ALL', ...new Set(players.map(p => p.players.player_role).filter(Boolean))];
    const winningTeam = activePlayer?.current_bid_team_id ? teams.find(t => t.id === activePlayer.current_bid_team_id) : null;

    return (
        <div className="flex-col min-h-screen">
            <div className="spotlight"></div>
            <PageHeader title="Live Auction Control" showLogos={false} />

            <main className="container" style={{ padding: '2rem 1rem', zIndex: 1, position: 'relative' }}>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <button
                        onClick={() => setActiveTab('bidding')}
                        className={`btn ${activeTab === 'bidding' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.6rem 1.5rem', background: activeTab === 'bidding' ? 'var(--accent-gold)' : 'transparent' }}
                    >
                        LIVE BIDDING
                    </button>
                    <button
                        onClick={() => setActiveTab('sold')}
                        className={`btn ${activeTab === 'sold' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.6rem 1.5rem', background: activeTab === 'sold' ? 'var(--accent-gold)' : 'transparent' }}
                    >
                        SOLD PLAYERS ({soldPlayers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('unsold')}
                        className={`btn ${activeTab === 'unsold' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.6rem 1.5rem', background: activeTab === 'unsold' ? 'var(--accent-gold)' : 'transparent' }}
                    >
                        UNSOLD ({unsoldPlayers.length})
                    </button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <Link to={`/draw?code=${auctionCode}`} className="btn" style={{ padding: '0.6rem 1rem', background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🎰 Random Draw</Link>
                        <Link to="/team-details" className="btn btn-outline" style={{ padding: '0.6rem 1rem' }}>Team Squad & Purse</Link>
                        <Link to="/admin" className="btn btn-outline" style={{ padding: '0.6rem 1rem' }}>Back to Admin</Link>
                    </div>
                </div>

                {activeTab === 'bidding' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>

                        {/* Center Stage: Active Bidding */}
                        <div className="glass-panel" style={{ padding: '2.5rem', minHeight: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            {!activePlayer ? (
                                <div style={{ color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏏</div>
                                    <h3>No Active Auction</h3>
                                    <p>Select a player from the "Pending Players" list on the right to start bidding.</p>
                                </div>
                            ) : (
                                <div style={{ width: '100%' }}>
                                    <div className="badge badge-success" style={{ marginBottom: '2rem', fontSize: '1rem', padding: '0.5rem 1.5rem', borderRadius: '50px', background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold' }}>LIVE BIDDING</div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3rem', marginBottom: '3rem' }}>
                                        <div style={{ position: 'relative' }}>
                                            {activePlayer.players.photo_url ? (
                                                <img
                                                    src={getOptimizedImageUrl(activePlayer.players.photo_url, 500)}
                                                    alt="Player"
                                                    style={{ width: 180, height: 220, objectFit: 'cover', borderRadius: '15px', border: '4px solid var(--accent-gold)', boxShadow: '0 0 30px rgba(255,215,0,0.3)' }}
                                                />
                                            ) : (
                                                <div style={{ width: 180, height: 220, borderRadius: '15px', border: '4px solid var(--accent-gold)', background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(0,0,0,0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-gold)', boxShadow: '0 0 30px rgba(255,215,0,0.3)' }}>
                                                    {getPlayerInitials(activePlayer.players)}
                                                </div>
                                            )}
                                            <div style={{ position: 'absolute', bottom: -15, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-gold)', color: '#000', padding: '0.3rem 1rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                {activePlayer.players.player_role}
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'left' }}>
                                            <h1 style={{ fontSize: '3rem', margin: 0, color: 'var(--text-main)' }}>
                                                {activePlayer.player_number && <span style={{ color: 'var(--accent-gold)', marginRight: '1rem' }}>#{activePlayer.player_number}</span>}
                                                {activePlayer.players.first_name} {activePlayer.players.last_name}
                                            </h1>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>State: {activePlayer.players.state} | Base Price: ₹{(activeAuction.base_price || 0).toLocaleString('en-IN')}</p>

                                            <div style={{ marginTop: '2rem', background: 'rgba(255,215,0,0.1)', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--accent-gold)', overflow: 'hidden' }}>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '2px' }}>Current Highest Bid</div>
                                                {(() => {
                                                    const bidVal = activePlayer.current_bid_price || activeAuction.base_price || 0;
                                                    const bidStr = `₹ ${bidVal.toLocaleString('en-IN')}`;
                                                    const len = bidStr.length;
                                                    const fontSz = len > 16 ? '1.8rem' : len > 12 ? '2.4rem' : len > 9 ? '2.9rem' : '3.5rem';
                                                    return (
                                                        <div style={{ 
                                                            fontSize: fontSz, 
                                                            fontWeight: 'bold', 
                                                            color: 'var(--text-main)', 
                                                            whiteSpace: 'nowrap', 
                                                            overflow: 'hidden', 
                                                            textOverflow: 'ellipsis',
                                                            lineHeight: 1.2 
                                                        }}>
                                                            {bidStr}
                                                        </div>
                                                    );
                                                })()}
                                                <div style={{ fontSize: '1.1rem', color: winningTeam ? 'var(--accent-green)' : '#ff4444' }}>
                                                    {winningTeam ? `By: ${winningTeam.team_name}` : 'No Bids Yet'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bidding Controls */}
                                    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                                        {/* Custom Direct Bid Form */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem', textAlign: 'left' }}>
                                            <h4 style={{ color: 'var(--accent-gold)', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                ⚡ DIRECT CUSTOM BID
                                            </h4>
                                            <form onSubmit={placeCustomBid} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
                                                <div style={{ flex: '1 1 200px' }}>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Bid Amount (₹)</label>
                                                    <input 
                                                        type="number" 
                                                        placeholder="e.g. 50000" 
                                                        value={customBid}
                                                        onChange={e => setCustomBid(e.target.value)}
                                                        className="form-input" 
                                                        style={{ width: '100%', padding: '0.6rem' }}
                                                        min="0"
                                                        required
                                                    />
                                                </div>
                                                <div style={{ flex: '1 1 200px' }}>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Select Bidding Team</label>
                                                    <select 
                                                        value={customBidTeam}
                                                        onChange={e => setCustomBidTeam(e.target.value)}
                                                        className="form-select"
                                                        style={{ width: '100%', padding: '0.6rem' }}
                                                        required
                                                    >
                                                        <option value="">-- Choose Team --</option>
                                                        {teams.map(team => (
                                                            <option key={team.id} value={team.id}>{team.team_name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button 
                                                    type="submit" 
                                                    disabled={actionLoading || !customBid || !customBidTeam}
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.6rem 2rem', height: 'fit-content', background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold' }}
                                                >
                                                    Apply Custom Bid
                                                </button>
                                            </form>
                                        </div>

                                        <h4 style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>PLACE BID FOR:</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                            {teams.map(team => {
                                                 const maxPlayers = activeAuction?.max_players || 11;
                                                 const squadCount = players.filter(p => p.team_id === team.id).length;
                                                 const isFull = squadCount >= maxPlayers;
                                                 const isCurrentBidder = team.id === activePlayer.current_bid_team_id;

                                                 return (
                                                     <button
                                                         key={team.id}
                                                         onClick={() => placeBid(team.id)}
                                                         disabled={actionLoading || (isFull && !isCurrentBidder)}
                                                         className="btn btn-outline"
                                                         style={{
                                                             display: 'flex',
                                                             flexDirection: 'column',
                                                             alignItems: 'center',
                                                             gap: '0.4rem',
                                                             padding: '0.8rem',
                                                             position: 'relative',
                                                             borderColor: isCurrentBidder ? 'var(--accent-gold)' : isFull ? '#ef4444' : 'var(--border-color)',
                                                             background: isCurrentBidder ? 'rgba(255,215,0,0.15)' : isFull ? 'rgba(239,68,68,0.1)' : 'transparent',
                                                             opacity: isFull && !isCurrentBidder ? 0.6 : 1,
                                                             cursor: isFull && !isCurrentBidder ? 'not-allowed' : 'pointer'
                                                         }}
                                                     >
                                                         {team.logo_url ? (
                                                             <img src={team.logo_url} alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                                                         ) : (
                                                             <div style={{ width: 36, height: 36, borderRadius: '4px', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                                 {getTeamInitials(team.team_name)}
                                                             </div>
                                                         )}
                                                         <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{team.team_name}</span>
                                                         <span style={{
                                                             fontSize: '0.7rem',
                                                             fontWeight: 'bold',
                                                             padding: '0.15rem 0.4rem',
                                                             borderRadius: '4px',
                                                             background: isFull ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)',
                                                             color: isFull ? '#ef4444' : 'var(--text-muted)'
                                                         }}>
                                                             {isFull ? `FULL (${squadCount}/${maxPlayers})` : `Squad: ${squadCount}/${maxPlayers}`}
                                                         </span>
                                                     </button>
                                                 );
                                             })}
                                        </div>

                                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '3rem', justifyContent: 'center' }}>
                                            <button
                                                onClick={undoLastBid}
                                                disabled={actionLoading || !activePlayer.current_bid_team_id}
                                                className="btn btn-outline"
                                                style={{ padding: '1rem 2rem', color: '#f59e0b', borderColor: '#f59e0b', fontSize: '1.1rem' }}
                                            >
                                                ↩️ UNDO BID
                                            </button>
                                            <button
                                                onClick={finalizeSold}
                                                disabled={actionLoading || !activePlayer.current_bid_team_id}
                                                className="btn btn-primary"
                                                style={{ padding: '1rem 3rem', background: '#10b981', borderColor: '#10b981', fontSize: '1.1rem' }}
                                            >
                                                🔨 SOLD
                                            </button>
                                            <button
                                                onClick={markUnsold}
                                                disabled={actionLoading}
                                                className="btn"
                                                style={{ padding: '1rem 2rem', background: '#ef4444', color: '#fff', fontSize: '1.1rem' }}
                                            >
                                                ❌ UNSOLD
                                            </button>
                                            <button
                                                onClick={cancelActiveAuction}
                                                disabled={actionLoading}
                                                className="btn btn-outline"
                                                style={{ padding: '1rem 2rem', color: '#94a3b8', borderColor: '#94a3b8', fontSize: '1.1rem' }}
                                            >
                                                ⏹️ CANCEL
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar: Pending Players */}
                        <div className="glass-panel" style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
                            <h3 style={{ color: 'var(--accent-gold)', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>PENDING PLAYERS ({pendingPlayers.length})</h3>
                            
                            {/* Search and Filters */}
                            <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <input 
                                    type="text" 
                                    placeholder="Search name or number..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.9rem' }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ROLE:</span>
                                    <select 
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value)}
                                        style={{ flex: 1, padding: '0.4rem', background: '#1a1a1a', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                                    >
                                        {roles.map(role => <option key={role} value={role}>{role}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {pendingPlayers.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No players found.</p>
                                ) : (
                                    pendingPlayers.map(p => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px' }}>
                                            {p.players.photo_url ? (
                                                <img src={getOptimizedImageUrl(p.players.photo_url, 100)} alt="P" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
                                                    {getPlayerInitials(p.players)}
                                                </div>
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                    {p.player_number && <span style={{ color: 'var(--accent-gold)', marginRight: '0.5rem' }}>#{p.player_number}</span>}
                                                    {p.players.first_name} {p.players.last_name}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.players.player_role}</div>
                                            </div>
                                            <button
                                                onClick={() => startAuctionForPlayer(p.id)}
                                                disabled={actionLoading || activePlayer}
                                                className="btn btn-outline"
                                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                                            >
                                                Start
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'sold' ? (
                    /* Tab 2: Sold Players List */
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>SOLD PLAYERS REGISTRY</h3>
                        {soldPlayers.length === 0 ? (
                            <p className="text-muted text-center" style={{ padding: '3rem' }}>No players sold yet.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--accent-gold)' }}>
                                            <th style={{ padding: '1rem', width: '80px' }}>No.</th>
                                            <th style={{ padding: '1rem' }}>Player</th>
                                            <th style={{ padding: '1rem' }}>Role</th>
                                            <th style={{ padding: '1rem' }}>Sold To Team</th>
                                            <th style={{ padding: '1rem', textAlign: 'right' }}>Sold Price</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {soldPlayers.map(p => {
                                            const team = teams.find(t => t.id === p.team_id);
                                            return (
                                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>#{p.player_number || '-'}</td>
                                                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        {p.players.photo_url ? (
                                                            <img src={getOptimizedImageUrl(p.players.photo_url, 100)} alt="P" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
                                                                {getPlayerInitials(p.players)}
                                                            </div>
                                                        )}
                                                        <div>{p.players.first_name} {p.players.last_name}</div>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>{p.players.player_role}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {team?.logo_url ? (
                                                                <img src={team.logo_url} alt="L" style={{ width: 25, height: 25, objectFit: 'contain' }} />
                                                            ) : team ? (
                                                                <div style={{ width: 25, height: 25, borderRadius: '4px', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>
                                                                    {getTeamInitials(team.team_name)}
                                                                </div>
                                                            ) : null}
                                                            {team?.team_name || 'Unknown Team'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-gold)' }}>₹ {p.sold_price?.toLocaleString()}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => revertPlayer(p)}
                                                            disabled={actionLoading}
                                                            className="btn btn-outline"
                                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#ff4444', borderColor: '#ff4444' }}
                                                        >
                                                            Revert
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Tab 3: Unsold Players List */
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ color: 'var(--accent-gold)', margin: 0 }}>UNSOLD PLAYERS LIST</h3>
                            {unsoldPlayers.length > 0 && (
                                <button 
                                    onClick={restartAllUnsold}
                                    disabled={actionLoading}
                                    className="btn"
                                    style={{ background: '#3b82f6', color: '#fff', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                >
                                    🔄 RESTART ALL ({unsoldPlayers.length})
                                </button>
                            )}
                        </div>
                        {unsoldPlayers.length === 0 ? (
                            <p className="text-muted text-center" style={{ padding: '3rem' }}>No unsold players available.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--accent-gold)' }}>
                                            <th style={{ padding: '1rem', width: '80px' }}>No.</th>
                                            <th style={{ padding: '1rem' }}>Player</th>
                                            <th style={{ padding: '1rem' }}>Role</th>
                                            <th style={{ padding: '1rem' }}>State</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {unsoldPlayers.map(p => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                                                <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>#{p.player_number || '-'}</td>
                                                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    {p.players.photo_url ? (
                                                        <img src={getOptimizedImageUrl(p.players.photo_url, 100)} alt="P" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
                                                            {getPlayerInitials(p.players)}
                                                        </div>
                                                    )}
                                                    <div>{p.players.first_name} {p.players.last_name}</div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>{p.players.player_role}</td>
                                                <td style={{ padding: '1rem' }}>{p.players.state}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => restartPlayer(p)}
                                                        disabled={actionLoading}
                                                        className="btn btn-outline"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#3b82f6', borderColor: '#3b82f6' }}
                                                    >
                                                        Revert
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default LiveAuctionPage;
