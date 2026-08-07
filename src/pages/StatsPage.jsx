import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { getOptimizedImageUrl } from '../services/cloudinary';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import EmptyState from '../components/EmptyState';

const getTeamInitials = (name) => {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words.map(w => w.charAt(0)).join('').toUpperCase();
};

const StatsPage = () => {
    const [searchParams] = useSearchParams();
    const auctionCode = searchParams.get('code');
    const [allAuctions, setAllAuctions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [activeAuction, setActiveAuction] = useState(null);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [activeTab, setActiveTab] = useState('topBuys'); // 'topBuys' or 'allPlayers'
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchRealtimeStats = async (auctionId) => {
        try {
            const { data: tData } = await supabase
                .from('auction_teams')
                .select('*')
                .eq('auction_id', auctionId);
            setTeams(tData || []);

            const { data: apData } = await supabase
                .from('auction_players')
                .select('*, players(*)')
                .eq('auction_id', auctionId)
                .eq('approval_status', 'approved');
            setPlayers(apData || []);
        } catch (err) {
            console.error("Realtime fetch stats error:", err);
        }
    };

    useEffect(() => {
        const fetchStatsAndAuctions = async () => {
            try {
                setLoading(true);
                if (auctionCode) {
                    const { data: auctionData, error: auctionError } = await supabase
                        .from('auctions')
                        .select('*')
                        .eq('auction_code', auctionCode)
                        .maybeSingle();

                    if (auctionError) throw auctionError;
                    setActiveAuction(auctionData);

                    if (auctionData) {
                        // Fetch Teams
                        const { data: tData, error: tError } = await supabase
                            .from('auction_teams')
                            .select('*')
                            .eq('auction_id', auctionData.id);
                        if (tError) throw tError;
                        setTeams(tData || []);

                        // Fetch all approved auction players
                        const { data: apData, error: apError } = await supabase
                            .from('auction_players')
                            .select('*, players(*)')
                            .eq('auction_id', auctionData.id)
                            .eq('approval_status', 'approved');
                        if (apError) throw apError;

                        setPlayers(apData || []);
                    } else {
                        setTeams([]);
                        setPlayers([]);
                    }
                } else {
                    setActiveAuction(null);
                    const { data, error } = await supabase
                        .from('auctions')
                        .select('*')
                        .neq('status', 'draft')
                        .order('created_at', { ascending: false });

                    if (error) throw error;
                    setAllAuctions(data || []);
                }
            } catch (err) {
                console.error("Error fetching stats data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStatsAndAuctions();
    }, [auctionCode]);

    useEffect(() => {
        if (!activeAuction?.id) return;

        const subscription = supabase
            .channel('stats_realtime_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_players' }, () => {
                fetchRealtimeStats(activeAuction.id);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [activeAuction?.id]);

    if (loading) return <Loader message="COMPILING STATS LAB..." />;
    if (!activeAuction) {
        return (
            <div className="flex-col min-h-screen">
                <div className="spotlight"></div>
                <PageHeader title="AUCTION STATISTICS" showLogos={false} />
                <main className="container" style={{ flex: 1, padding: '2rem 1rem 4rem', zIndex: 1, position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>Select Tournament to View Stats</h3>
                            <p className="text-muted" style={{ marginBottom: 0 }}>Please select a tournament from the list below to view its statistics.</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            {allAuctions.length === 0 ? (
                                <div className="glass-panel" style={{ padding: '3rem', gridColumn: '1 / -1', textAlign: 'center' }}>
                                    <p className="text-muted" style={{ margin: 0 }}>No tournaments found.</p>
                                </div>
                            ) : (
                                allAuctions.map(a => (
                                    <Link key={a.id} to={`/stats?code=${a.auction_code}`} className="glass-panel render-card" style={{ padding: '2rem 1.5rem', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--glass-border)' }}>
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
                                            View Stats →
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Get sold players sorted by sold_price descending
    const soldPlayers = players
        .filter(p => p.auction_status === 'sold' && p.sold_price > 0)
        .sort((a, b) => b.sold_price - a.sold_price);

    // Get top 5 sold players
    const topFive = soldPlayers.slice(0, 5);

    // Create a 5-item list for Top Buys grid (fill empty slots if topFive.length < 5)
    const topBuysGrid = [...topFive];
    while (topBuysGrid.length < 5) {
        topBuysGrid.push(null);
    }

    // Sort all players: sold players first (sorted descending by price), then unsold, then pending
    const allPlayersSorted = [...players].sort((a, b) => {
        const aSold = a.auction_status === 'sold';
        const bSold = b.auction_status === 'sold';

        if (aSold && !bSold) return -1;
        if (!aSold && bSold) return 1;
        if (aSold && bSold) {
            return (b.sold_price || 0) - (a.sold_price || 0);
        }

        // Secondary sort for unsold/pending by player_number
        const aNum = a.player_number != null ? a.player_number : Infinity;
        const bNum = b.player_number != null ? b.player_number : Infinity;
        return aNum - bNum;
    });

    const filteredAllPlayers = allPlayersSorted.filter(p => {
        const fullName = `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.toLowerCase();
        const search = searchTerm.toLowerCase();
        const teamName = teams.find(t => t.id === p.team_id)?.team_name?.toLowerCase() || '';
        return fullName.includes(search) ||
            teamName.includes(search) ||
            (p.player_number && p.player_number.toString().includes(search));
    });

    const formatPriceCompact = (price) => {
        if (price == null || price === 0) return '₹0';
        if (price >= 1000) {
            const kValue = price / 1000;
            return `₹${Number(kValue.toFixed(1))}K`;
        }
        return `₹${price}`;
    };

    const teamMap = {};
    teams.forEach(t => {
        teamMap[t.id] = t;
    });

    return (
        <div className="flex-col min-h-screen" style={{ overflowX: 'hidden' }}>
            <div className="spotlight"></div>
            <PageHeader title="AUCTION STATISTICS" subtitle={activeAuction.auction_name} showLogos={false} />

            <main className="container" style={{ flex: 1, padding: '2rem 1rem 4rem', zIndex: 1, position: 'relative' }}>

                {/* Tabs & Navigation */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                        onClick={() => setActiveTab('topBuys')}
                        className={`btn ${activeTab === 'topBuys' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.6rem 1.5rem', background: activeTab === 'topBuys' ? 'var(--accent-gold)' : 'transparent', color: activeTab === 'topBuys' ? '#000' : 'var(--text-main)' }}
                    >
                        🏆 TOP BUYS
                    </button>
                    <button
                        onClick={() => setActiveTab('allPlayers')}
                        className={`btn ${activeTab === 'allPlayers' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.6rem 1.5rem', background: activeTab === 'allPlayers' ? 'var(--accent-gold)' : 'transparent', color: activeTab === 'allPlayers' ? '#000' : 'var(--text-main)' }}
                    >
                        📋 SQUAD BOARD
                    </button>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
                        <a href="#/all-players" className="btn btn-outline" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>Registered Players</a>
                        <a href="#/teams" className="btn btn-outline" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>Squads</a>
                    </div>
                </div>

                {activeTab === 'topBuys' ? (
                    <div>
                        {/* Reference Image Header Style */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', flexWrap: 'wrap', gap: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <h1 style={{ fontSize: '2.8rem', fontWeight: 'bold', color: '#fff', margin: 0, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Cricket<span style={{ color: 'var(--accent-green)' }}>Auction</span>
                                </h1>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 'bold', marginTop: '0.2rem' }}>
                                    {activeAuction.auction_name}
                                </span>
                            </div>
                            <div style={{ textAlign: isMobile ? 'left' : 'right', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
                                <div style={{ color: 'var(--accent-green)', fontSize: '1rem', letterSpacing: '2px', fontWeight: '600' }}>Most Expensive</div>
                                <div style={{ color: '#fff', fontSize: '3rem', fontWeight: '800', lineHeight: '0.9', textShadow: '0 0 15px rgba(57,255,20,0.2)' }}>Top Buys</div>
                            </div>
                        </div>

                        {/* Top 5 Cards Container */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1.5rem',
                            justifyContent: 'center',
                            width: '100%'
                        }}>
                            {topBuysGrid.map((p, idx) => {
                                const name = p ? `${p.players?.first_name} ${p.players?.last_name}` : 'AWAITING BUY';
                                const team = p ? teamMap[p.team_id] : null;
                                const teamName = team ? team.team_name : '-';
                                const role = p ? p.players?.player_role : '-';
                                const price = p ? p.sold_price : 0;
                                const fallbackAvatar = p
                                    ? `https://ui-avatars.com/api/?name=${p.players?.first_name}+${p.players?.last_name}&background=1f2937&color=39ff14&size=256`
                                    : `https://ui-avatars.com/api/?name=Empty+Slot&background=020617&color=475569&size=256`;
                                const imageUrl = p?.players?.photo_url
                                    ? getOptimizedImageUrl(p.players.photo_url, 300)
                                    : fallbackAvatar;

                                return (
                                    <div
                                        key={p ? p.id : `empty-${idx}`}
                                        className="glass-panel"
                                        style={{
                                            overflow: 'hidden',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(to bottom, rgba(15,23,42,0.4), rgba(2,6,23,0.8))',
                                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                            boxShadow: p ? '0 10px 20px rgba(0,0,0,0.5)' : 'none',
                                            opacity: p ? 1 : 0.6
                                        }}
                                        onMouseEnter={(e) => {
                                            if (p) {
                                                e.currentTarget.style.transform = 'translateY(-8px)';
                                                e.currentTarget.style.boxShadow = '0 15px 30px rgba(57, 255, 20, 0.2)';
                                                e.currentTarget.style.borderColor = 'var(--accent-green)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (p) {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.5)';
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                            }
                                        }}
                                    >
                                        {/* Player Image with Gradient Shadow */}
                                        <div style={{ position: 'relative', width: '100%', paddingTop: '115%', backgroundColor: '#020617' }}>
                                            <img
                                                src={imageUrl}
                                                alt={name}
                                                onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar; }}
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                                            />
                                            {/* Top Buys Badge Rank */}
                                            <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#fff', fontWeight: 'bold' }}>
                                                RANK {idx + 1}
                                            </div>

                                            {/* Gradient Overlay for text readability */}
                                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60%', background: 'linear-gradient(to top, rgba(2, 6, 23, 0.95), transparent)' }}></div>

                                            {/* Overlay Text: Name */}
                                            <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', textAlign: 'center' }}>
                                                <h3 style={{ fontSize: '1.25rem', color: '#fff', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    {name}
                                                </h3>
                                            </div>
                                        </div>

                                        {/* Details Panel */}
                                        <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'space-between' }}>

                                            {/* Team Name Badge */}
                                            <div style={{
                                                padding: '0.2rem 0.8rem',
                                                borderRadius: '4px',
                                                background: 'rgba(255,255,255,0.06)',
                                                color: 'var(--text-muted)',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase',
                                                textAlign: 'center',
                                                border: '1px solid rgba(255,255,255,0.04)',
                                                maxWidth: '100%',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {teamName}
                                            </div>

                                            {/* Role */}
                                            <div style={{ color: 'var(--accent-green)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                                {role}
                                            </div>

                                            {/* Price */}
                                            <div style={{ color: 'var(--accent-green)', fontSize: '2.2rem', fontWeight: 'bold', fontFamily: 'var(--font-heading)', marginTop: '0.4rem', textShadow: p ? '0 0 10px rgba(57,255,20,0.3)' : 'none' }}>
                                                {p ? formatPriceCompact(price) : '-'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* Tab 2: All Players sorted by price */
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2 style={{ color: 'var(--accent-gold)', margin: 0 }}>Squad Players Ledger (Expensive First)</h2>
                            <div style={{ width: '100%', maxWidth: '350px' }}>
                                <input
                                    type="text"
                                    placeholder="Search by player, team or number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="form-input"
                                    style={{ border: '1px solid var(--glass-border)' }}
                                />
                            </div>
                        </div>

                        {filteredAllPlayers.length === 0 ? (
                            <p className="text-muted text-center" style={{ padding: '3rem' }}>No matching players found.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '2px solid var(--glass-border)' }}>
                                            <th style={{ padding: '1rem', width: '80px' }}>Rank</th>
                                            <th style={{ padding: '1rem', width: '80px' }}>No.</th>
                                            <th style={{ padding: '1rem' }}>Photo</th>
                                            <th style={{ padding: '1rem' }}>Player Name</th>
                                            <th style={{ padding: '1rem' }}>Role</th>
                                            <th style={{ padding: '1rem' }}>Sold To Team</th>
                                            <th style={{ padding: '1rem', textAlign: 'right' }}>Sold Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAllPlayers.map((p, idx) => {
                                            const team = teamMap[p.team_id];
                                            const isSold = p.auction_status === 'sold';
                                            const fallbackAvatar = `https://ui-avatars.com/api/?name=${p.players?.first_name}+${p.players?.last_name}&background=1f2937&color=39ff14&size=128`;
                                            const imageUrl = p.players?.photo_url ? getOptimizedImageUrl(p.players.photo_url, 100) : fallbackAvatar;

                                            return (
                                                <tr
                                                    key={p.id}
                                                    style={{
                                                        borderBottom: '1px solid var(--glass-border)',
                                                        background: isSold ? 'rgba(57, 255, 20, 0.02)' : 'rgba(0,0,0,0.1)',
                                                        transition: 'background 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = isSold ? 'rgba(57, 255, 20, 0.02)' : 'rgba(0,0,0,0.1)'}
                                                >
                                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: isSold ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                                                        {isSold ? `#${idx + 1}` : '-'}
                                                    </td>
                                                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                                                        {p.player_number != null ? `#${p.player_number}` : '-'}
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <img
                                                            src={imageUrl}
                                                            alt="Player"
                                                            onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar; }}
                                                            style={{ width: 45, height: 45, objectFit: 'cover', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                                                            {p.players?.first_name} {p.players?.last_name}
                                                        </div>
                                                        {p.is_icon && (
                                                            <span style={{ background: 'var(--accent-gold)', color: '#000', padding: '1px 5px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 'bold', display: 'inline-block', marginTop: '0.2rem' }}>
                                                                ICON
                                                            </span>
                                                        )}
                                                        {p.is_owner && (
                                                            <span style={{ background: 'var(--accent-green)', color: '#000', padding: '1px 5px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 'bold', display: 'inline-block', marginTop: '0.2rem', marginLeft: '0.3rem' }}>
                                                                OWNER
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem', textTransform: 'capitalize' }}>
                                                        {p.players?.player_role || '-'}
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        {team ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                {team.logo_url ? (
                                                                    <img src={team.logo_url} alt="Logo" style={{ width: 25, height: 25, objectFit: 'contain' }} />
                                                                ) : (
                                                                    <div style={{ width: 25, height: 25, borderRadius: '4px', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>
                                                                        {getTeamInitials(team.team_name)}
                                                                    </div>
                                                                )}
                                                                <span style={{ fontWeight: '600' }}>{team.team_name}</span>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                                {p.auction_status === 'unsold' ? 'UNSOLD' : 'PENDING'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: isSold ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                                                        {isSold ? `₹${p.sold_price?.toLocaleString()}` : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
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

export default StatsPage;
