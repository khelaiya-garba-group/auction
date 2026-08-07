import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { LayoutGrid, List } from 'lucide-react';
import { generateSingleTeamPDF } from '../services/pdfGenerator';

const getTeamInitials = (name) => {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words.map(w => w.charAt(0)).join('').toUpperCase();
};

const isTeamOwner = (p, teamId) => {
    if (!p.is_owner) return false;
    if (p.owner_team_id) return p.owner_team_id === teamId;
    if (p.previous_bid_team_id) return p.previous_bid_team_id === teamId;
    return p.team_id === teamId && !p.sold_price && p.auction_status !== 'sold';
};

const TeamBudgetPage = () => {
    const [searchParams] = useSearchParams();
    const auctionCodeParam = searchParams.get('code');
    const [allAuctions, setAllAuctions] = useState([]);
    const [activeAuction, setActiveAuction] = useState(null);
    const [teams, setTeams] = useState([]);
    const [allPlayers, setAllPlayers] = useState([]);
    const [teamOwnersMap, setTeamOwnersMap] = useState({});
    const [squads, setSquads] = useState({});
    const [loading, setLoading] = useState(true);
    const [expandedTeams, setExpandedTeams] = useState({});
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    // Fetch all auctions for selection
    useEffect(() => {
        const fetchAllAuctions = async () => {
            try {
                const { data, error } = await supabase
                    .from('auctions')
                    .select('id, auction_name, auction_code, status, venue')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setAllAuctions(data || []);
            } catch (err) {
                console.error("Error fetching all auctions:", err);
            }
        };
        fetchAllAuctions();
    }, []);

    // Fetch active auction data, teams, and players
    const fetchAuctionData = async () => {
        if (!auctionCodeParam) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data: auctionData, error: auctionError } = await supabase
                .from('auctions')
                .select('*')
                .eq('auction_code', auctionCodeParam)
                .maybeSingle();

            if (auctionError) throw auctionError;
            setActiveAuction(auctionData);

            if (auctionData) {
                // Fetch all teams
                const { data: tData, error: tError } = await supabase
                    .from('auction_teams')
                    .select('*')
                    .eq('auction_id', auctionData.id)
                    .order('team_name', { ascending: true });

                if (tError) throw tError;
                setTeams(tData || []);

                // Fetch all auction players
                const { data: apData, error: apError } = await supabase
                    .from('auction_players')
                    .select('*, players(*)')
                    .eq('auction_id', auctionData.id);

                if (apError) throw apError;
                setAllPlayers(apData || []);

                // Fetch team_owners joined with owners from dedicated owner module
                const { data: toData } = await supabase
                    .from('team_owners')
                    .select('*, owners(*)')
                    .eq('auction_id', auctionData.id);

                const moduleOwnersGrouped = {};
                (toData || []).forEach(to => {
                    if (!moduleOwnersGrouped[to.team_id]) moduleOwnersGrouped[to.team_id] = [];
                    if (to.owners) moduleOwnersGrouped[to.team_id].push(to.owners);
                });
                setTeamOwnersMap(moduleOwnersGrouped);

                const grouped = {};
                (tData || []).forEach(team => {
                    grouped[team.id] = (apData || []).filter(p => p.team_id === team.id);
                });
                setSquads(grouped);
            }
        } catch (err) {
            console.error("Error fetching budget data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuctionData();
    }, [auctionCodeParam]);

    const toggleSquad = (teamId) => {
        setExpandedTeams(prev => ({
            ...prev,
            [teamId]: !prev[teamId]
        }));
    };

    const handleShareWhatsApp = (team) => {
        const squad = squads[team.id] || [];
        const moduleOwners = teamOwnersMap[team.id] || [];
        const spent = squad.reduce((acc, p) => acc + (p.sold_price || 0), 0);
        const maxBudget = activeAuction?.max_budget || 0;
        const remaining = maxBudget - spent;
        const maxPlayers = activeAuction?.max_players || 11;

        const isCaptOrVc = (p) => p.is_captain || p.id == team.captain_id || p.id == team.vice_captain_id;
        const captains = squad.filter(p => isCaptOrVc(p) && !p.is_icon);
        const icons = squad.filter(p => p.is_icon && !isCaptOrVc(p));
        const purchased = squad.filter(p => !p.is_icon && !isCaptOrVc(p) && (p.sold_price > 0 || p.auction_status === 'sold'));

        // Legacy player owners
        const legacyOwners = allPlayers.filter(p => isTeamOwner(p, team.id));

        let msg = `🏏 *${team.team_name.toUpperCase()} - SQUAD & CONTACTS*\n`;
        if (activeAuction?.auction_name) {
            msg += `🏆 Event: *${activeAuction.auction_name}*\n`;
        }
        msg += `💰 Spent: ₹${spent.toLocaleString('en-IN')} | Remaining: ₹${remaining.toLocaleString('en-IN')}\n`;
        msg += `👥 Squad Size: ${squad.length} / ${maxPlayers}\n\n`;

        // 1. Owners
        msg += `👑 *OWNERS & CONTACTS*:\n`;
        if (moduleOwners.length > 0) {
            moduleOwners.forEach(o => {
                msg += `• ${o.owner_name}${o.mobile_number ? ` - 📞 ${o.mobile_number}` : ''}\n`;
            });
        } else if (legacyOwners.length > 0) {
            legacyOwners.forEach(p => {
                const name = `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.trim();
                const mob = p.players?.mobile;
                msg += `• ${name}${mob ? ` - 📞 ${mob}` : ''}\n`;
            });
        } else {
            msg += `• None\n`;
        }
        msg += `\n`;

        // 2. Captain / VC
        if (captains.length > 0) {
            msg += `👑 *CAPTAIN / VC*:\n`;
            captains.forEach(p => {
                const name = `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.trim();
                const mob = p.players?.mobile;
                const role = p.players?.player_role || 'Captain';
                msg += `• ${name}${mob ? ` - 📞 ${mob}` : ''} (${role})\n`;
            });
            msg += `\n`;
        }

        // 3. Icons
        if (icons.length > 0) {
            msg += `⭐ *ICONS*:\n`;
            icons.forEach(p => {
                const name = `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.trim();
                const mob = p.players?.mobile;
                const role = p.players?.player_role || 'Icon';
                msg += `• ${name}${mob ? ` - 📞 ${mob}` : ''} (${role})\n`;
            });
            msg += `\n`;
        }

        // 4. Purchased Squad
        if (purchased.length > 0) {
            msg += `🏏 *PURCHASED SQUAD (${purchased.length})*:\n`;
            purchased.forEach((p, idx) => {
                const name = `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.trim();
                const mob = p.players?.mobile;
                const role = p.players?.player_role || 'Player';
                const price = p.sold_price ? ` - ₹${p.sold_price.toLocaleString('en-IN')}` : '';
                msg += `${idx + 1}. ${name}${mob ? ` - 📞 ${mob}` : ''} (${role})${price}\n`;
            });
        }

        const encoded = encodeURIComponent(msg);
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    };

    const handleDownloadPDF = async (team) => {
        const squad = squads[team.id] || [];
        await generateSingleTeamPDF(activeAuction, team, squad);
    };

    const isMobile = window.innerWidth < 768;

    if (loading) return <Loader message="CALCULATING TEAM PURSES..." />;

    return (
        <div className="flex-col min-h-screen">
            <div className="spotlight"></div>
            <PageHeader title="Team Purse & Budgets" subtitle={activeAuction ? `Financial Summary for ${activeAuction.auction_name}` : 'Tournaments Purse Overview'} showLogos={false} />

            <main className="container-fluid" style={{ flex: 1, padding: isMobile ? '1rem' : '2rem 3rem 4rem', zIndex: 1, position: 'relative', width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
                
                {/* Back button/selector header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    {activeAuction ? (
                        <Link to={`/teams?code=${activeAuction.auction_code}`} className="btn btn-outline" style={{ fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            ← View Squad Grid
                        </Link>
                    ) : (
                        <Link to="/" className="btn btn-outline" style={{ fontSize: '0.9rem' }}>
                            ← Return Home
                        </Link>
                    )}

                    {activeAuction && (
                        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem', borderRadius: '8px' }}>
                            <button
                                onClick={() => setViewMode('grid')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none',
                                    background: viewMode === 'grid' ? 'var(--accent-gold)' : 'transparent',
                                    color: viewMode === 'grid' ? '#000' : 'var(--text-main)',
                                    cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s'
                                }}
                            >
                                <LayoutGrid size={16} /> Grid View
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none',
                                    background: viewMode === 'list' ? 'var(--accent-gold)' : 'transparent',
                                    color: viewMode === 'list' ? '#000' : 'var(--text-main)',
                                    cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s'
                                }}
                            >
                                <List size={16} /> List View
                            </button>
                        </div>
                    )}
                </div>

                {!activeAuction ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>Select Tournament to View Budgets</h3>
                            <p className="text-muted" style={{ marginBottom: 0 }}>Please select a tournament below to see all team financials and purse standings.</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', width: '100%' }}>
                            {allAuctions.length === 0 ? (
                                <div className="glass-panel" style={{ padding: '3rem', gridColumn: '1 / -1', textAlign: 'center' }}>
                                    <p className="text-muted" style={{ margin: 0 }}>No tournaments found.</p>
                                </div>
                            ) : (
                                allAuctions.map(a => (
                                    <Link key={a.id} to={`/team-budget?code=${a.auction_code}`} className="glass-panel render-card" style={{ padding: '2rem 1.5rem', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--glass-border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ 
                                                padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase',
                                                background: a.status === 'running' ? 'rgba(239, 68, 68, 0.15)' : a.status === 'registration_open' ? 'rgba(57, 255, 20, 0.15)' : 'rgba(255,255,255,0.06)',
                                                color: a.status === 'running' ? '#f87171' : a.status === 'registration_open' ? 'var(--accent-green)' : 'var(--text-muted)'
                                            }}>
                                                {a.status === 'running' ? '🔴 Live' : a.status === 'registration_open' ? '🟢 Open' : '⚪ Ended'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{a.auction_code}</span>
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{a.auction_name}</h3>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {a.venue ? `📍 ${a.venue}` : ''}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '0.85rem', alignItems: 'center', gap: '0.25rem' }}>
                                            View Budgets →
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Overall tournament budget card */}
                        <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', border: '1px solid rgba(255,215,0,0.2)' }}>
                            <div>
                                <h2 style={{ color: '#fff', margin: 0, fontSize: '1.5rem', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>{activeAuction.auction_name}</h2>
                                <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>Overview of all team budgets, spend analysis, and purse remaining.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Teams</span>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>{teams.length}</span>
                                </div>
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Max Budget</span>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>₹{(activeAuction.max_budget || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Grid View rendering */}
                        {viewMode === 'grid' ? (
                            <div className="teams-grid">
                                {teams.map(team => {
                                    const squad = squads[team.id] || [];
                                    const spent = squad.reduce((acc, p) => acc + (p.sold_price || 0), 0);
                                    const maxBudget = activeAuction.max_budget || 0;
                                    const remaining = maxBudget - spent;
                                    const percentSpent = maxBudget > 0 ? Math.min((spent / maxBudget) * 100, 100) : 0;
                                    
                                    const modernTeamOwners = (teamOwnersMap[team.id] || []).map(mo => ({
                                        id: `mod_${mo.id}`,
                                        name: mo.owner_name,
                                        role: 'Owner',
                                        bought_by: null
                                    }));
                                    const legacyTeamOwners = allPlayers.filter(p => isTeamOwner(p, team.id)).map(p => {
                                        const playingTeam = p.team_id && p.team_id !== team.id ? teams.find(t => t.id === p.team_id) : null;
                                        return {
                                            id: p.id,
                                            name: `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.trim() || 'Owner',
                                            role: p.players?.player_role || 'Owner',
                                            bought_by: playingTeam ? playingTeam.team_name : null
                                        };
                                    });
                                    const owners = modernTeamOwners.length > 0 ? modernTeamOwners : legacyTeamOwners;

                                    const isCaptOrVc = (p) => p.is_captain || p.id == team.captain_id || p.id == team.vice_captain_id;
                                    const captains = squad.filter(p => isCaptOrVc(p) && !p.is_icon);
                                    const icons = squad.filter(p => p.is_icon && !isCaptOrVc(p));
                                    const auctioned = squad.filter(p => !p.is_icon && !isCaptOrVc(p) && (p.sold_price > 0 || p.auction_status === 'sold'));
                                    const playingSquad = squad.filter(p => !p.is_owner || p.is_captain || p.is_icon || p.id == team.captain_id || p.id == team.vice_captain_id || (p.sold_price > 0 || p.auction_status === 'sold'));
                                    const isExpanded = !!expandedTeams[team.id];

                                    return (
                                        <div key={team.id} className="glass-panel hover-grow" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', border: '1px solid var(--glass-border)', borderRadius: '12px', background: 'rgba(10,15,29,0.5)' }}>
                                            {/* Team Name + Logo */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                                {team.logo_url ? (
                                                    <img src={team.logo_url} alt="Logo" style={{ width: 60, height: 60, borderRadius: '8px', background: '#fff', padding: '4px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                ) : (
                                                    <div style={{ width: 60, height: 60, borderRadius: '8px', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        {getTeamInitials(team.team_name)}
                                                    </div>
                                                )}
                                                <div style={{ overflow: 'hidden' }}>
                                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent-gold)', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {team.team_name}
                                                    </h3>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        Squad Size: {playingSquad.length} / {activeAuction.max_players || 11}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Financial Progress Bar */}
                                            <div style={{ marginBottom: '1.2rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>Purse Spent: {percentSpent.toFixed(0)}%</span>
                                                    <span style={{ color: '#fff', fontWeight: 'bold' }}>Remaining: {((100 - percentSpent)).toFixed(0)}%</span>
                                                </div>
                                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${percentSpent}%`, height: '100%', background: percentSpent > 85 ? '#ef4444' : percentSpent > 60 ? '#f59e0b' : 'var(--accent-green)', borderRadius: '10px', transition: 'width 0.5s ease' }}></div>
                                                </div>
                                            </div>

                                            {/* Stats Row */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem', background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '8px' }}>
                                                <div>
                                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Spent</span>
                                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>₹{spent.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div>
                                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remaining</span>
                                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>₹{remaining.toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>

                                            {/* Badges of player types */}
                                            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                                                <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', background: 'rgba(57,255,20,0.1)', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                                                    O: {owners.length}
                                                </span>
                                                {captains.length > 0 && (
                                                    <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', background: 'rgba(255,215,0,0.15)', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
                                                        C: {captains.length}
                                                    </span>
                                                )}
                                                <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', background: 'rgba(255,215,0,0.1)', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
                                                    I: {icons.length}
                                                </span>
                                                <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontWeight: 'bold' }}>
                                                    P: {auctioned.length}
                                                </span>
                                            </div>

                                            {/* Action Buttons */}
                                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <button 
                                                    onClick={() => toggleSquad(team.id)} 
                                                    className="btn btn-outline" 
                                                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem' }}
                                                >
                                                    {isExpanded ? 'Hide Squad ▲' : 'View Squad ▼'}
                                                </button>
                                            </div>

                                            {/* Collapsible Squad details */}
                                            {isExpanded && (
                                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fadeIn 0.2s ease' }}>
                                                    {owners.length > 0 && (
                                                        <div>
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Owners</span>
                                                            {owners.map(p => (
                                                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                                                    <span>{p.name} {p.bought_by ? `(Bought by ${p.bought_by})` : ''}</span>
                                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.role}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {captains.length > 0 && (
                                                        <div>
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Captain / VC</span>
                                                            {captains.map(p => (
                                                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                                                    <span>{p.players.first_name} {p.players.last_name}</span>
                                                                    <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem' }}>👑 Retained (₹0)</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {icons.length > 0 && (
                                                        <div>
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Icons</span>
                                                            {icons.map(p => (
                                                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                                                    <span>{p.players.first_name} {p.players.last_name}</span>
                                                                    <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem' }}>⭐ Retained (₹0)</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {auctioned.length > 0 && (
                                                        <div>
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Purchased ({auctioned.length})</span>
                                                            {auctioned.map(p => (
                                                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', alignItems: 'center', color: 'var(--text-main)' }}>
                                                                    <span>{p.players.first_name} {p.players.last_name} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({p.players.player_role})</span></span>
                                                                    <span style={{ fontWeight: 'bold' }}>₹{p.sold_price?.toLocaleString('en-IN')}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {squad.length === 0 && (
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', margin: 0 }}>Squad is empty.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* List View rendering */
                            <div className="teams-list">
                                {teams.map(team => {
                                    const squad = squads[team.id] || [];
                                    const spent = squad.reduce((acc, p) => acc + (p.sold_price || 0), 0);
                                    const maxBudget = activeAuction.max_budget || 0;
                                    const remaining = maxBudget - spent;
                                    const percentSpent = maxBudget > 0 ? Math.min((spent / maxBudget) * 100, 100) : 0;
                                    
                                    const modernTeamOwners = (teamOwnersMap[team.id] || []).map(mo => ({
                                        id: `mod_${mo.id}`,
                                        name: mo.owner_name,
                                        role: 'Owner',
                                        bought_by: null
                                    }));
                                    const legacyTeamOwners = allPlayers.filter(p => isTeamOwner(p, team.id)).map(p => {
                                        const playingTeam = p.team_id && p.team_id !== team.id ? teams.find(t => t.id === p.team_id) : null;
                                        return {
                                            id: p.id,
                                            name: `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.trim() || 'Owner',
                                            role: p.players?.player_role || 'Owner',
                                            bought_by: playingTeam ? playingTeam.team_name : null
                                        };
                                    });
                                    const owners = modernTeamOwners.length > 0 ? modernTeamOwners : legacyTeamOwners;

                                    const isCaptOrVc = (p) => p.is_captain || p.id == team.captain_id || p.id == team.vice_captain_id;
                                    const captains = squad.filter(p => isCaptOrVc(p) && !p.is_icon);
                                    const icons = squad.filter(p => p.is_icon && !isCaptOrVc(p));
                                    const auctioned = squad.filter(p => !p.is_icon && !isCaptOrVc(p) && (p.sold_price > 0 || p.auction_status === 'sold'));
                                    const playingSquad = squad.filter(p => !p.is_owner || p.is_captain || p.is_icon || p.id == team.captain_id || p.id == team.vice_captain_id || (p.sold_price > 0 || p.auction_status === 'sold'));
                                    const isExpanded = !!expandedTeams[team.id];

                                    return (
                                        <div key={team.id} className="team-list-row" style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--glass-border)', borderRadius: '12px', background: 'rgba(10,15,29,0.5)', padding: '1.2rem', marginBottom: '1.5rem' }}>
                                            <div className="list-main-row" style={{ width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5rem', justifyContent: 'space-between' }}>
                                                {/* Left: Team Logo & Name */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '220px', flex: '1 1 250px' }}>
                                                    {team.logo_url ? (
                                                        <img src={team.logo_url} alt="Logo" style={{ width: 45, height: 45, borderRadius: '6px', background: '#fff', padding: '2px', objectFit: 'contain' }} />
                                                    ) : (
                                                        <div style={{ width: 45, height: 45, borderRadius: '6px', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}>
                                                            {getTeamInitials(team.team_name)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent-gold)', textTransform: 'uppercase' }}>{team.team_name}</h3>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Squad Size: {playingSquad.length} / {activeAuction.max_players || 11}</span>
                                                    </div>
                                                </div>

                                                {/* Center: Financial progress bar */}
                                                <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                                                        <span style={{ color: 'var(--text-muted)' }}>Spent: {percentSpent.toFixed(0)}%</span>
                                                        <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>Rem: {((100 - percentSpent)).toFixed(0)}%</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${percentSpent}%`, height: '100%', background: percentSpent > 85 ? '#ef4444' : percentSpent > 60 ? '#f59e0b' : 'var(--accent-green)', borderRadius: '10px' }}></div>
                                                    </div>
                                                </div>

                                                {/* Financial Stats Details */}
                                                <div style={{ display: 'flex', gap: '1.5rem', flex: '0 1 auto', minWidth: '220px' }}>
                                                    <div>
                                                        <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Spent Purse</span>
                                                        <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff' }}>₹{spent.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remaining Purse</span>
                                                        <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>₹{remaining.toLocaleString('en-IN')}</span>
                                                    </div>
                                                </div>

                                                {/* Action Button */}
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <button 
                                                        onClick={() => toggleSquad(team.id)} 
                                                        className="btn btn-outline" 
                                                        style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                    >
                                                        {isExpanded ? 'Hide Squad ▲' : 'View Squad ▼'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Squad lists in horizontal list blocks */}
                                            {isExpanded && (
                                                <div style={{ width: '100%', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid var(--glass-border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', animation: 'fadeIn 0.2s ease' }}>
                                                    {/* Owners block */}
                                                    <div>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem', borderBottom: '1px solid rgba(57,255,20,0.1)', paddingBottom: '0.2rem' }}>Owners ({owners.length})</span>
                                                        {owners.length === 0 ? <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>None</p> : owners.map(p => (
                                                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.15rem 0' }}>
                                                                <span>{p.name} {p.bought_by ? `(Bought by ${p.bought_by})` : ''}</span>
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.role}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Captains block */}
                                                    {captains.length > 0 && (
                                                        <div>
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,215,0,0.1)', paddingBottom: '0.2rem' }}>Captain / VC ({captains.length})</span>
                                                            {captains.map(p => (
                                                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.15rem 0' }}>
                                                                    <span>{p.players.first_name} {p.players.last_name}</span>
                                                                    <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem' }}>👑 Retained (₹0)</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Icons block */}
                                                    <div>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,215,0,0.1)', paddingBottom: '0.2rem' }}>Icons ({icons.length})</span>
                                                        {icons.length === 0 ? <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>None</p> : icons.map(p => (
                                                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.15rem 0' }}>
                                                                <span>{p.players.first_name} {p.players.last_name}</span>
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.players.player_role}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Purchased block */}
                                                    <div style={{ gridColumn: 'span 2' }}>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.2rem' }}>Purchased Players ({auctioned.length})</span>
                                                        {auctioned.length === 0 ? <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>None</p> : (
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                                                                {auctioned.map(p => (
                                                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.15rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                                        <span>{p.players.first_name} {p.players.last_name} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({p.players.player_role})</span></span>
                                                                        <span style={{ fontWeight: 'bold' }}>₹{p.sold_price.toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <style>{`
                .teams-grid {
                    display: grid;
                    gap: 1.5rem;
                    width: 100%;
                }
                @media (min-width: 1400px) {
                    .teams-grid {
                        grid-template-columns: repeat(4, 1fr);
                    }
                }
                @media (max-width: 1399px) and (min-width: 1024px) {
                    .teams-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
                @media (max-width: 1023px) and (min-width: 640px) {
                    .teams-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                @media (max-width: 639px) {
                    .teams-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .hover-grow {
                    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
                }
                .hover-grow:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(255, 215, 0, 0.1);
                    border-color: rgba(255,215,0,0.3) !important;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default TeamBudgetPage;
