import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { getOptimizedImageUrl } from '../services/cloudinary';
import { generateAllTeamsPDF, generateSingleTeamPDF } from '../services/pdfGenerator';
import { Download, LayoutGrid, List, User } from 'lucide-react';

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

const isTeamOwner = (p, teamId) => {
    if (!p.is_owner) return false;
    if (p.owner_team_id) return p.owner_team_id === teamId;
    if (p.previous_bid_team_id) return p.previous_bid_team_id === teamId;
    return p.team_id === teamId && !p.sold_price && p.auction_status !== 'sold';
};

const TeamDetailsPage = () => {
    const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
    const [searchParams] = useSearchParams();
    const auctionCode = searchParams.get('code') || localStorage.getItem('cap_admin_selected_auction_code');

    const [loading, setLoading] = useState(true);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [activeAuction, setActiveAuction] = useState(null);
    const [teams, setTeams] = useState([]);
    const [squads, setSquads] = useState({});
    const [teamOwnersMap, setTeamOwnersMap] = useState({});
    const [allPlayers, setAllPlayers] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [expandedTeams, setExpandedTeams] = useState({});
    const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', or 'single'

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            await generateAllTeamsPDF(activeAuction, teams, squads);
        } catch (err) {
            console.error("PDF generation failed:", err);
            alert("Failed to generate PDF.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const toggleSquad = (teamId) => {
        setExpandedTeams(prev => ({
            ...prev,
            [teamId]: !prev[teamId]
        }));
    };

    const handleShareWhatsApp = (team) => {
        if (!team) return;
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

    const handleDownloadSingleTeamPdf = async (team) => {
        if (!team) return;
        const squad = squads[team.id] || [];
        await generateSingleTeamPDF(activeAuction, team, squad);
    };

    const handleSendPdfWhatsApp = async (team) => {
        if (!team) return;
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
        const legacyOwners = allPlayers.filter(p => isTeamOwner(p, team.id));

        let msg = `🏏 *${team.team_name.toUpperCase()} - OFFICIAL TEAM SQUAD*\n`;
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

        try {
            // Generate PDF document in memory
            const doc = await generateSingleTeamPDF(activeAuction, team, squad, { saveFile: false, returnDoc: true });
            if (doc) {
                const pdfBlob = doc.output('blob');
                const filename = `${team.team_name.replace(/ /g, '_')}_Team_Squad.pdf`;
                const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

                // Try Web Share API (mobile & supported browsers)
                if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                    await navigator.share({
                        title: `${team.team_name} Team Squad PDF`,
                        text: msg,
                        files: [pdfFile]
                    });
                    return;
                }
                
                // Fallback for desktop: download PDF file + open WhatsApp Web pre-filled with text & note
                doc.save(filename);
                msg += `\n📎 *Note: The official team squad PDF has been downloaded to your device as "${filename}". Attach it directly into this WhatsApp chat!*`;
            }
        } catch (err) {
            console.warn("Share API error fallback:", err);
        }

        const encoded = encodeURIComponent(msg);
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    };

    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        fetchData();
        
        const subscription = supabase
            .channel('team_updates_vertical')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_players' }, payload => {
                const { new: updatedPlayer, old: oldPlayer } = payload;
                if (!updatedPlayer || !oldPlayer) {
                    fetchData(); // Always refetch for inserts/deletes
                    return;
                }
                const statusChanged = updatedPlayer.auction_status !== oldPlayer.auction_status;
                const teamChanged = updatedPlayer.team_id !== oldPlayer.team_id;
                if (statusChanged || teamChanged) {
                    fetchData();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
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
                const { data: tData, error: tError } = await supabase
                    .from('auction_teams')
                    .select('*')
                    .eq('auction_id', auctionData.id)
                    .order('created_at', { ascending: true });

                if (tError) throw tError;
                setTeams(tData || []);
                if (tData && tData.length > 0 && !selectedTeamId) {
                    setSelectedTeamId(tData[0].id);
                }

                const { data: apData, error: apError } = await supabase
                    .from('auction_players')
                    .select('*, players(*)')
                    .eq('auction_id', auctionData.id)
                    .eq('approval_status', 'approved');

                if (apError) throw apError;
                setAllPlayers(apData || []);

                // Fetch team_owners with owners details
                const { data: toData } = await supabase
                    .from('team_owners')
                    .select('*, owners(*)')
                    .eq('auction_id', auctionData.id);

                const teamOwnersGrouped = {};
                (toData || []).forEach(to => {
                    if (!teamOwnersGrouped[to.team_id]) teamOwnersGrouped[to.team_id] = [];
                    if (to.owners) teamOwnersGrouped[to.team_id].push(to.owners);
                });
                setTeamOwnersMap(teamOwnersGrouped);

                const grouped = {};
                (tData || []).forEach(team => {
                    grouped[team.id] = (apData || []).filter(p => p.team_id === team.id);
                });
                setSquads(grouped);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) return <Navigate to="/admin" replace />;
    if (!auctionCode || (!loading && !activeAuction)) return <Navigate to="/admin" replace />;
    if (loading) return <Loader message="ORGANIZING TEAM SQUADS..." />;

    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    const squad = selectedTeamId ? (squads[selectedTeamId] || []) : [];
    
    // Modern team owners from team_owners table
    const modernOwners = selectedTeamId ? (teamOwnersMap[selectedTeamId] || []) : [];
    // Legacy player owners for fallback
    const legacyOwners = squad.filter(p => p.is_owner);
    // Combine modern & legacy owners safely without duplicates
    const combinedOwners = modernOwners.length > 0 ? modernOwners : legacyOwners.map(p => ({
        id: p.id,
        owner_name: `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.trim() || 'Owner',
        photo_url: p.players?.photo_url,
        mobile_number: p.players?.mobile
    }));
    const icons = squad.filter(p => p.is_icon);
    const auctioned = squad.filter(p => !p.is_icon && !p.is_owner);
    const spent = squad.reduce((acc, p) => acc + (p.sold_price || 0), 0);
    const maxBudget = activeAuction?.max_budget || 0;
    const remaining = maxBudget - spent;
    const percentSpent = maxBudget > 0 ? (spent / maxBudget) * 100 : 0;

    return (
        <div className="flex-col min-h-screen">
            <div className="spotlight"></div>
            <PageHeader title="Team Squad & Purse" showLogos={false} />

            <main className="container-fluid" style={{ flex: 1, padding: '2rem 2rem 4rem', zIndex: 1, position: 'relative', width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
                {/* Header Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                         <Link to="/admin" className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>← Dashboard</Link>
                         <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.2rem' }}>{activeAuction?.auction_name || 'Auction Details'}</h2>
                    </div>

                    {/* View Mode Toggle Switcher */}
                    <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', borderRadius: '6px', border: 'none',
                                background: viewMode === 'grid' ? 'var(--accent-gold)' : 'transparent',
                                color: viewMode === 'grid' ? '#000' : 'var(--text-main)',
                                cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s'
                            }}
                        >
                            <LayoutGrid size={16} /> Budget Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', borderRadius: '6px', border: 'none',
                                background: viewMode === 'list' ? 'var(--accent-gold)' : 'transparent',
                                color: viewMode === 'list' ? '#000' : 'var(--text-main)',
                                cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s'
                            }}
                        >
                            <List size={16} /> Budget List
                        </button>
                        <button
                            onClick={() => setViewMode('single')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', borderRadius: '6px', border: 'none',
                                background: viewMode === 'single' ? 'var(--accent-gold)' : 'transparent',
                                color: viewMode === 'single' ? '#000' : 'var(--text-main)',
                                cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s'
                            }}
                        >
                            <User size={16} /> Single Team
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {activeAuction && teams.length > 0 && (
                            <button 
                                onClick={handleDownloadPdf}
                                disabled={isGeneratingPdf}
                                className="btn btn-outline" 
                                style={{ 
                                    padding: '0.5rem 1.2rem', 
                                    border: '1px solid var(--accent-green)', 
                                    color: 'var(--accent-green)', 
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: isGeneratingPdf ? 'wait' : 'pointer',
                                    background: 'transparent',
                                    opacity: isGeneratingPdf ? 0.7 : 1
                                }}
                            >
                                <Download size={16} /> {isGeneratingPdf ? 'Generating PDF...' : 'Download All Teams PDF'}
                            </button>
                        )}
                        <Link to="/live-auction" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', background: 'var(--accent-gold)', fontSize: '0.9rem' }}>Live Bidding</Link>
                    </div>
                </div>

                {/* Overall Tournament Summary Card */}
                <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', border: '1px solid rgba(255,215,0,0.2)' }}>
                    <div>
                        <h2 style={{ color: '#fff', margin: 0, fontSize: '1.5rem', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>{activeAuction.auction_name} - TEAM BUDGETS</h2>
                        <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>Overview of all team purses, spend progress, squad limits, owner WhatsApp contacts, and PDF squad files.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <div>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Teams</span>
                            <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>{teams.length}</span>
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Max Budget</span>
                            <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>₹{(activeAuction.max_budget || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Max Players</span>
                            <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>{activeAuction.max_players || 11}</span>
                        </div>
                    </div>
                </div>

                {/* VIEW MODE 1: GRID VIEW */}
                {viewMode === 'grid' && (
                    <div className="teams-grid">
                        {teams.map(team => {
                            const teamSquad = squads[team.id] || [];
                            const teamSpent = teamSquad.reduce((acc, p) => acc + (p.sold_price || 0), 0);
                            const teamRemaining = maxBudget - teamSpent;
                            const teamPercentSpent = maxBudget > 0 ? Math.min((teamSpent / maxBudget) * 100, 100) : 0;

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
                            const captains = teamSquad.filter(p => isCaptOrVc(p) && !p.is_icon).map(p => ({
                                id: p.id,
                                name: `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.trim() || 'Captain',
                                role: p.id == team.captain_id ? 'Captain' : p.id == team.vice_captain_id ? 'Vice-Captain' : 'Captain'
                            }));

                            const teamIcons = teamSquad.filter(p => p.is_icon && !isCaptOrVc(p)).map(p => ({
                                id: p.id,
                                name: `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.trim() || 'Icon Player',
                                role: p.players?.player_role || 'Icon'
                            }));

                            const auctionedPlayers = teamSquad.filter(p => !p.is_icon && !isCaptOrVc(p) && (p.sold_price > 0 || p.auction_status === 'sold')).map(p => ({
                                id: p.id,
                                name: `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.trim() || 'Player',
                                price: p.sold_price || 0,
                                role: p.players?.player_role || 'Player'
                            }));

                            const playingSquad = teamSquad.filter(p => !p.is_owner || p.is_captain || p.is_icon || p.id == team.captain_id || p.id == team.vice_captain_id || (p.sold_price > 0 || p.auction_status === 'sold'));
                            const isExpanded = !!expandedTeams[team.id];

                            return (
                                <div key={team.id} className="glass-panel render-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid var(--glass-border)' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                                        {team.logo_url ? (
                                            <img src={getOptimizedImageUrl(team.logo_url, 150)} alt="Logo" style={{ width: 45, height: 45, borderRadius: '6px', objectFit: 'contain', background: '#fff', padding: '2px' }} />
                                        ) : (
                                            <div style={{ width: 45, height: 45, borderRadius: '6px', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}>
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

                                    {/* Progress Bar */}
                                    <div style={{ marginBottom: '1.2rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Purse Spent: {teamPercentSpent.toFixed(0)}%</span>
                                            <span style={{ color: '#fff', fontWeight: 'bold' }}>Remaining: {((100 - teamPercentSpent)).toFixed(0)}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{ width: `${teamPercentSpent}%`, height: '100%', background: teamPercentSpent > 85 ? '#ef4444' : teamPercentSpent > 60 ? '#f59e0b' : 'var(--accent-green)', borderRadius: '10px' }}></div>
                                        </div>
                                    </div>

                                    {/* Financial Stats Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem', background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '8px' }}>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Spent</span>
                                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>₹{teamSpent.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remaining</span>
                                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>₹{teamRemaining.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>

                                    {/* Badges */}
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
                                            I: {teamIcons.length}
                                        </span>
                                        <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontWeight: 'bold' }}>
                                            P: {auctionedPlayers.length}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem' }}>
                                            <button
                                                onClick={() => handleShareWhatsApp(team)}
                                                className="btn"
                                                style={{ fontSize: '0.7rem', padding: '0.4rem 0.3rem', background: '#25D366', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', fontWeight: 'bold' }}
                                                title="Share Squad Details on WhatsApp"
                                            >
                                                💬 Text
                                            </button>
                                            <button
                                                onClick={() => handleSendPdfWhatsApp(team)}
                                                className="btn"
                                                style={{ fontSize: '0.7rem', padding: '0.4rem 0.3rem', background: '#128C7E', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', fontWeight: 'bold' }}
                                                title="Send PDF Document on WhatsApp"
                                            >
                                                📲 PDF
                                            </button>
                                            <button
                                                onClick={() => handleDownloadSingleTeamPdf(team)}
                                                className="btn btn-outline"
                                                style={{ fontSize: '0.7rem', padding: '0.4rem 0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                                                title="Download Team PDF File"
                                            >
                                                📄 Save
                                            </button>
                                        </div>

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
                                                            <span>{p.name}</span>
                                                            <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 'bold' }}>{p.role}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {teamIcons.length > 0 && (
                                                <div>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Icons ({teamIcons.length})</span>
                                                    {teamIcons.map(p => (
                                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                                            <span>{p.name}</span>
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.role}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Bought Squad ({auctionedPlayers.length})</span>
                                                {auctionedPlayers.length === 0 ? (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No players bought yet</span>
                                                ) : (
                                                    auctionedPlayers.map(p => (
                                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-main)', padding: '0.15rem 0' }}>
                                                            <span>{p.name} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({p.role})</span></span>
                                                            <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>₹{p.price.toLocaleString('en-IN')}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* VIEW MODE 2: LIST VIEW */}
                {viewMode === 'list' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {teams.map(team => {
                            const teamSquad = squads[team.id] || [];
                            const teamSpent = teamSquad.reduce((acc, p) => acc + (p.sold_price || 0), 0);
                            const teamRemaining = maxBudget - teamSpent;
                            const teamPercentSpent = maxBudget > 0 ? Math.min((teamSpent / maxBudget) * 100, 100) : 0;

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
                            const captains = teamSquad.filter(p => isCaptOrVc(p) && !p.is_icon).map(p => ({
                                id: p.id,
                                name: `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.trim() || 'Captain',
                                role: p.id == team.captain_id ? 'Captain' : p.id == team.vice_captain_id ? 'Vice-Captain' : 'Captain'
                            }));

                            const teamIcons = teamSquad.filter(p => p.is_icon && !isCaptOrVc(p)).map(p => ({
                                id: p.id,
                                name: `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.trim() || 'Icon Player',
                                role: p.players?.player_role || 'Icon'
                            }));

                            const auctionedPlayers = teamSquad.filter(p => !p.is_icon && !isCaptOrVc(p) && (p.sold_price > 0 || p.auction_status === 'sold')).map(p => ({
                                id: p.id,
                                name: `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.trim() || 'Player',
                                price: p.sold_price || 0,
                                role: p.players?.player_role || 'Player'
                            }));

                            const playingSquad = teamSquad.filter(p => !p.is_owner || p.is_captain || p.is_icon || p.id == team.captain_id || p.id == team.vice_captain_id || (p.sold_price > 0 || p.auction_status === 'sold'));
                            const isExpanded = !!expandedTeams[team.id];

                            return (
                                <div key={team.id} className="glass-panel render-card" style={{ padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                                        {/* Left: Logo & Team Name */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '220px', flex: '1 1 200px' }}>
                                            {team.logo_url ? (
                                                <img src={getOptimizedImageUrl(team.logo_url, 150)} alt="Logo" style={{ width: 45, height: 45, borderRadius: '6px', objectFit: 'contain', background: '#fff', padding: '2px' }} />
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
                                                <span style={{ color: 'var(--text-muted)' }}>Spent: {teamPercentSpent.toFixed(0)}%</span>
                                                <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>Rem: {((100 - teamPercentSpent)).toFixed(0)}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{ width: `${teamPercentSpent}%`, height: '100%', background: teamPercentSpent > 85 ? '#ef4444' : teamPercentSpent > 60 ? '#f59e0b' : 'var(--accent-green)', borderRadius: '10px' }}></div>
                                            </div>
                                        </div>

                                        {/* Financial Stats Details */}
                                        <div style={{ display: 'flex', gap: '1.5rem', flex: '0 1 auto', minWidth: '220px' }}>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Spent Purse</span>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff' }}>₹{teamSpent.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remaining Purse</span>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>₹{teamRemaining.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <button
                                                onClick={() => handleShareWhatsApp(team)}
                                                className="btn"
                                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', background: '#25D366', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }}
                                                title="Share Squad Details on WhatsApp"
                                            >
                                                💬 Text WhatsApp
                                            </button>
                                            <button
                                                onClick={() => handleSendPdfWhatsApp(team)}
                                                className="btn"
                                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', background: '#128C7E', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }}
                                                title="Send PDF Document on WhatsApp"
                                            >
                                                📲 Send PDF
                                            </button>
                                            <button
                                                onClick={() => handleDownloadSingleTeamPdf(team)}
                                                className="btn btn-outline"
                                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                title="Download Team PDF File"
                                            >
                                                📄 Save PDF
                                            </button>
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
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{p.role}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Captains block */}
                                            <div>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,215,0,0.1)', paddingBottom: '0.2rem' }}>Captain / VC</span>
                                                {captains.length === 0 ? <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Not Assigned</p> : captains.map(p => (
                                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.15rem 0' }}>
                                                        <span>{p.name}</span>
                                                        <span style={{ color: 'var(--accent-gold)', fontSize: '0.7rem', fontWeight: 'bold' }}>{p.role}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Icons block */}
                                            <div>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,215,0,0.1)', paddingBottom: '0.2rem' }}>Icons ({teamIcons.length})</span>
                                                {teamIcons.length === 0 ? <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>None</p> : teamIcons.map(p => (
                                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.15rem 0' }}>
                                                        <span>{p.name}</span>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{p.role}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Auctioned Players block */}
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.2rem' }}>Bought Squad ({auctionedPlayers.length})</span>
                                                {auctionedPlayers.length === 0 ? <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No players bought yet</p> : (
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                                                        {auctionedPlayers.map(p => (
                                                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                                                <span style={{ color: 'var(--accent-green)', fontWeight: 'bold', marginLeft: '0.5rem' }}>₹{p.price.toLocaleString('en-IN')}</span>
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

                {/* VIEW MODE 3: SINGLE TEAM FOCUS VIEW */}
                {viewMode === 'single' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem', height: 'calc(100vh - 250px)', minHeight: '600px' }}>
                        {/* Vertical Sidebar */}
                        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', borderRight: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '0.5rem' }}>SELECT TEAM</h3>
                            {teams.map(team => (
                                <button
                                    key={team.id}
                                    onClick={() => setSelectedTeamId(team.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.8rem',
                                        borderRadius: '8px',
                                        border: '1px solid transparent',
                                        background: selectedTeamId === team.id ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
                                        borderColor: selectedTeamId === team.id ? 'var(--accent-gold)' : 'transparent',
                                        color: selectedTeamId === team.id ? 'var(--accent-gold)' : 'var(--text-main)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {team.logo_url ? (
                                        <img src={team.logo_url} alt="L" style={{ width: 30, height: 30, borderRadius: '50%', background: '#fff', objectFit: 'contain' }} />
                                    ) : (
                                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            {getTeamInitials(team.team_name)}
                                        </div>
                                    )}
                                    <span style={{ fontSize: '0.9rem', fontWeight: selectedTeamId === team.id ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.team_name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Right Side Content */}
                        <div className="glass-panel" style={{ padding: '2.5rem', overflowY: 'auto' }}>
                            {selectedTeam ? (
                                <div>
                                    {/* Header with Stats */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '2.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                            {selectedTeam.logo_url ? (
                                                <img src={selectedTeam.logo_url} alt="Team" style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: '15px', background: '#fff', padding: '10px', border: '3px solid var(--accent-gold)', boxShadow: '0 0 20px rgba(255,215,0,0.2)' }} />
                                            ) : (
                                                <div style={{ width: 120, height: 120, borderRadius: '15px', background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(57,255,20,0.1))', border: '3px solid var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-gold)', boxShadow: '0 0 20px rgba(255,215,0,0.2)' }}>
                                                    {getTeamInitials(selectedTeam.team_name)}
                                                </div>
                                            )}
                                            <div>
                                                <h2 style={{ fontSize: '2.5rem', color: 'var(--accent-gold)', margin: '0 0 0.5rem 0' }}>{selectedTeam.team_name}</h2>
                                                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>SQUAD SIZE</span>
                                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{squad.length} Players</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>PURSE SPENT</span>
                                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>₹{spent.toLocaleString()}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--accent-gold)', fontSize: '0.8rem', display: 'block', fontWeight: 'bold' }}>👑 CAPTAIN</span>
                                                        <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                                            {squad.find(p => p.id == selectedTeam.captain_id) 
                                                                ? `${squad.find(p => p.id == selectedTeam.captain_id).players.first_name} ${squad.find(p => p.id == selectedTeam.captain_id).players.last_name}` 
                                                                : 'Not Assigned'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--accent-green)', fontSize: '0.8rem', display: 'block', fontWeight: 'bold' }}>⭐ VICE-CAPTAIN</span>
                                                        <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                                            {squad.find(p => p.id == selectedTeam.vice_captain_id) 
                                                                ? `${squad.find(p => p.id == selectedTeam.vice_captain_id).players.first_name} ${squad.find(p => p.id == selectedTeam.vice_captain_id).players.last_name}` 
                                                                : 'Not Assigned'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Purse Progress Box & Actions */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '280px' }}>
                                            <div style={{ width: '100%', background: 'rgba(0,0,0,0.2)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>Purse Spent: {percentSpent.toFixed(0)}%</span>
                                                    <span style={{ color: '#fff', fontWeight: 'bold' }}>Remaining: {((100 - percentSpent)).toFixed(0)}%</span>
                                                </div>
                                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${percentSpent}%`, height: '100%', background: percentSpent > 85 ? '#ef4444' : percentSpent > 60 ? '#f59e0b' : 'var(--accent-green)', borderRadius: '10px' }}></div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem', fontSize: '0.8rem' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>Spent: ₹{spent.toLocaleString()}</span>
                                                    <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>Rem: ₹{remaining.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                                                <button
                                                    onClick={() => handleShareWhatsApp(selectedTeam)}
                                                    className="btn"
                                                    style={{
                                                        padding: '0.6rem 0.4rem',
                                                        background: '#25D366',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.75rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justify: 'center',
                                                        gap: '0.25rem',
                                                        boxShadow: '0 4px 12px rgba(37,211,102,0.3)',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Share Squad Details on WhatsApp"
                                                >
                                                    💬 Squad Text
                                                </button>
                                                <button
                                                    onClick={() => handleSendPdfWhatsApp(selectedTeam)}
                                                    className="btn"
                                                    style={{
                                                        padding: '0.6rem 0.4rem',
                                                        background: '#128C7E',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.75rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justify: 'center',
                                                        gap: '0.25rem',
                                                        boxShadow: '0 4px 12px rgba(18,140,126,0.3)',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Send PDF Document on WhatsApp"
                                                >
                                                    📲 Send PDF
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadSingleTeamPdf(selectedTeam)}
                                                    className="btn btn-outline"
                                                    style={{
                                                        padding: '0.6rem 0.4rem',
                                                        borderColor: 'var(--accent-gold)',
                                                        color: 'var(--accent-gold)',
                                                        borderRadius: '8px',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.75rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justify: 'center',
                                                        gap: '0.25rem',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Download PDF Squad for this Team"
                                                >
                                                    📄 Save PDF
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Squad Lists */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                                        
                                        {/* Owner & Icon Players Listing */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                            {/* Owner Players */}
                                            <div>
                                                <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--accent-green)', marginBottom: '1.5rem', borderBottom: '1px solid rgba(57,255,20,0.2)', paddingBottom: '0.5rem' }}>
                                                    TEAM OWNERS <span>({combinedOwners.length})</span>
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {combinedOwners.length === 0 ? <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No team owners assigned.</p> : combinedOwners.map(owner => (
                                                        <div key={owner.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(57,255,20,0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(57,255,20,0.1)' }}>
                                                            {owner.photo_url ? (
                                                                <img src={getOptimizedImageUrl(owner.photo_url, 150)} alt="Owner" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-green)' }} />
                                                            ) : (
                                                                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(57,255,20,0.2), rgba(0,0,0,0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-green)', border: '2px solid var(--accent-green)' }}>
                                                                    {(owner.owner_name || 'OW').slice(0, 2).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    {owner.owner_name}
                                                                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', background: 'var(--accent-green)', color: '#000', borderRadius: '10px', fontWeight: '900' }}>OWNER</span>
                                                                </div>
                                                                {owner.mobile_number && (
                                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {owner.mobile_number}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Icon Players */}
                                            <div>
                                                <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,215,0,0.2)', paddingBottom: '0.5rem' }}>
                                                    ICON PLAYERS <span>({icons.length})</span>
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {icons.length === 0 ? <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No icon players assigned.</p> : icons.map(p => (
                                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,215,0,0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,215,0,0.1)' }}>
                                                            {p.players.photo_url ? (
                                                                <img src={getOptimizedImageUrl(p.players.photo_url, 150)} alt="Player" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }} />
                                                            ) : (
                                                                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(0,0,0,0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-gold)', border: '2px solid var(--accent-gold)' }}>
                                                                    {getPlayerInitials(p.players)}
                                                                </div>
                                                            )}
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <span>{p.players.first_name} {p.players.last_name}</span>
                                                                    {selectedTeam.captain_id == p.id && <span style={{ background: 'var(--accent-gold)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>👑 CAPTAIN</span>}
                                                                    {selectedTeam.vice_captain_id == p.id && <span style={{ background: 'var(--accent-green)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>⭐ VICE-CAPTAIN</span>}
                                                                </div>
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>
                                                                    {p.players.player_role.toUpperCase()} {p.players.mobile ? `| 📞 ${p.players.mobile}` : ''}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Auctioned Players Listing */}
                                        <div>
                                            <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-main)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                                AUCTIONED PLAYERS <span>({auctioned.length})</span>
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                {auctioned.length === 0 ? <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No auction players bought yet.</p> : auctioned.map(p => (
                                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1.2rem', borderRadius: '10px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            {p.players.photo_url ? (
                                                                <img src={getOptimizedImageUrl(p.players.photo_url, 150)} alt="Player" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
                                                                    {getPlayerInitials(p.players)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <span>{p.players.first_name} {p.players.last_name}</span>
                                                                    {selectedTeam.captain_id == p.id && <span style={{ background: 'var(--accent-gold)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>👑 CAPTAIN</span>}
                                                                    {selectedTeam.vice_captain_id == p.id && <span style={{ background: 'var(--accent-green)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>⭐ VICE-CAPTAIN</span>}
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    {p.players.player_role} {p.players.mobile ? `| 📞 ${p.players.mobile}` : ''}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>₹{p.sold_price?.toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    Select a team to view its squad and purse budget details.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TeamDetailsPage;
