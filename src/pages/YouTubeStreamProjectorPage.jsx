import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { getOptimizedImageUrl } from '../services/cloudinary';
import IndianCurrencyDisplay from '../components/IndianCurrencyDisplay';
import { Trophy, Users, Award, Shield, Sparkles, Flame, RefreshCw } from 'lucide-react';

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

const YouTubeStreamProjectorPage = () => {
    const [searchParams] = useSearchParams();
    const auctionCode = searchParams.get('code') || localStorage.getItem('cap_admin_selected_auction_code');

    const [loading, setLoading] = useState(true);
    const [activeAuction, setActiveAuction] = useState(null);
    const [teams, setTeams] = useState([]);
    const [allAuctionPlayers, setAllAuctionPlayers] = useState([]);
    const [activePlayer, setActivePlayer] = useState(null);
    const [lastSoldPlayer, setLastSoldPlayer] = useState(null);
    const [showSoldOverlay, setShowSoldOverlay] = useState(false);
    const [sponsors, setSponsors] = useState([]);

    const scrollContainerRef = useRef(null);
    const processedEvents = useRef(new Set());

    // Fetch initial auction data
    const fetchRealtimeData = async () => {
        try {
            if (!auctionCode) return;

            const { data: aData } = await supabase
                .from('auctions')
                .select('*')
                .eq('auction_code', auctionCode)
                .single();

            if (!aData) return;
            setActiveAuction(aData);

            // Fetch Teams
            const { data: tData } = await supabase
                .from('auction_teams')
                .select('*')
                .eq('auction_id', aData.id)
                .order('id', { ascending: true });
            setTeams(tData || []);

            // Fetch All Auction Players (with player details)
            const { data: apData } = await supabase
                .from('auction_players')
                .select('*, players(*)')
                .eq('auction_id', aData.id);
            setAllAuctionPlayers(apData || []);

            // Find Active Bidding Player
            const currentActive = (apData || []).find(p => p.auction_status === 'active');
            setActivePlayer(currentActive || null);

            // Fetch Sponsors
            const { data: sData } = await supabase
                .from('sponsors')
                .select('*')
                .eq('auction_id', aData.id)
                .eq('is_active', true)
                .order('sequence', { ascending: true });
            setSponsors(sData || []);

        } catch (err) {
            console.error("YouTube Projector Data Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRealtimeData();

        if (!auctionCode) return;

        // Subscribe to Realtime Updates
        const channel = supabase
            .channel(`yt_projector_${auctionCode}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'auction_players' },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        const updated = payload.new;
                        if (updated.auction_status === 'sold' && !processedEvents.current.has(`${updated.id}-sold`)) {
                            processedEvents.current.add(`${updated.id}-sold`);
                            // Fetch full sold player details
                            supabase.from('auction_players').select('*, players(*)').eq('id', updated.id).single().then(({ data }) => {
                                if (data) {
                                    setLastSoldPlayer(data);
                                    setShowSoldOverlay(true);
                                    setTimeout(() => {
                                        setShowSoldOverlay(false);
                                        setLastSoldPlayer(null);
                                    }, 7000);
                                }
                            });
                        }
                    }
                    fetchRealtimeData();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'auction_teams' },
                () => {
                    fetchRealtimeData();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'auctions' },
                () => {
                    fetchRealtimeData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [auctionCode]);

    // Automatic Gender Filter (Follows active bidding player's gender)
    const activePlayerGender = activePlayer?.players?.gender || null;

    const displayedTeams = teams.filter(t => {
        if (!activeAuction?.is_separate_gender) return true;
        if (!activePlayerGender) return true;
        return (t.gender || 'Male').toLowerCase() === activePlayerGender.toLowerCase();
    });

    // Guaranteed Continuous Auto-Scroll Effect for OBS Stream
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let animId;

        // Reset scroll position when displayed teams change
        container.scrollTop = 0;

        const performScroll = () => {
            if (container) {
                if (container.scrollHeight > container.clientHeight) {
                    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 3) {
                        // Smooth loop back to top
                        container.scrollTop = 0;
                    } else {
                        container.scrollTop += 0.7; // Smooth continuous sub-pixel step
                    }
                }
            }
            animId = requestAnimationFrame(performScroll);
        };

        const delayTimer = setTimeout(() => {
            animId = requestAnimationFrame(performScroll);
        }, 150);

        return () => {
            clearTimeout(delayTimer);
            if (animId) cancelAnimationFrame(animId);
        };
    }, [displayedTeams]);

    if (loading) {
        return (
            <div style={{ height: '100vh', backgroundColor: '#020617', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>🔴 YOUTUBE LIVE PROJECTOR SCREEN</div>
                    <p style={{ color: 'var(--text-muted)' }}>Connecting to Live Auction Feed...</p>
                </div>
            </div>
        );
    }

    const winningTeam = activePlayer?.current_bid_team_id
        ? teams.find(t => t.id === activePlayer.current_bid_team_id)
        : null;

    const maxBudget = activeAuction?.max_budget || 0;
    const maxPlayers = activeAuction?.max_players || 11;

    // Gender-filtered Approved & Sold Counts for Header Pill
    const genderFilteredPlayers = allAuctionPlayers.filter(p => {
        if (p.approval_status !== 'approved') return false;
        if (!activeAuction?.is_separate_gender) return true;
        if (!activePlayerGender) return true;
        return (p.players?.gender || 'Male').toLowerCase() === activePlayerGender.toLowerCase();
    });

    const approvedPlayers = genderFilteredPlayers;
    const soldPlayersList = approvedPlayers.filter(p => p.auction_status === 'sold');
    const unsoldPlayersList = approvedPlayers.filter(p => p.auction_status === 'unsold');
    const highestBuy = soldPlayersList.reduce((max, p) => (p.sold_price || 0) > max ? (p.sold_price || 0) : max, 0);

    return (
        <div style={{
            height: '100vh',
            maxHeight: '100vh',
            backgroundColor: '#020617',
            color: '#f8fafc',
            fontFamily: "'Inter', sans-serif",
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Ambient Spotlight Glow */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                left: '20%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(255,215,0,0.08) 0%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-10%',
                right: '10%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(57,255,20,0.06) 0%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none'
            }} />

            {/* TOP BROADCAST HEADER BAR */}
            <header style={{
                background: 'linear-gradient(90deg, rgba(15,23,42,0.95), rgba(2,6,23,0.98))',
                borderBottom: '2px solid rgba(255,215,0,0.25)',
                padding: '0.6rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
                zIndex: 10,
                height: '65px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                    {activeAuction?.logo_url ? (
                        <img src={activeAuction.logo_url} alt="Logo" style={{ height: 40, objectFit: 'contain' }} />
                    ) : (
                        <div style={{ background: 'var(--accent-gold)', color: '#000', padding: '0.3rem 0.7rem', borderRadius: '8px', fontWeight: 900, fontSize: '1.1rem' }}>
                            🏆
                        </div>
                    )}
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#fff', fontFamily: 'var(--font-heading)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                            {activeAuction?.auction_name || 'LIVE AUCTION BROADCAST'}
                        </h2>
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: 600, display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                            <span>OFFICIAL PROJECTOR SCREEN</span>
                            <span>•</span>
                            <span style={{ color: '#10b981' }}>LIVE PURSE & SQUAD MONITOR</span>
                        </div>
                    </div>
                </div>

                {/* Live Badge & Overall Stats Pill (Auto Gender Filtered) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                    <div style={{ display: 'flex', gap: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.35rem 0.9rem', borderRadius: '50px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>
                                TOTAL {activePlayerGender ? activePlayerGender.toUpperCase() : ''}
                            </span>
                            <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>{approvedPlayers.length}</span>
                        </div>
                        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>SOLD</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-green)', fontSize: '0.9rem' }}>{soldPlayersList.length}</span>
                        </div>
                        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>UNSOLD</span>
                            <span style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '0.9rem' }}>{unsoldPlayersList.length}</span>
                        </div>
                        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>TOP BUY</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-gold)', fontSize: '0.9rem' }}>₹{highestBuy.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    {/* YouTube Broadcast Red Badge */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                        color: '#fff',
                        padding: '0.45rem 1.1rem',
                        borderRadius: '30px',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        letterSpacing: '1px',
                        boxShadow: '0 0 15px rgba(239,68,68,0.5)'
                    }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse 1.2s infinite' }} />
                        YOUTUBE LIVE
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT SPLIT LAYOUT (FITS STRICTLY INSIDE VIEWPORT) */}
            <main style={{ flex: 1, padding: '1rem 1.5rem', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', zIndex: 1, height: 'calc(100vh - 65px)', overflow: 'hidden' }}>

                {/* LEFT STAGE: ACTIVE BIDDING PLAYER DISPLAY + SPONSORS TICKER AT BOTTOM */}
                <div style={{
                    background: 'linear-gradient(180deg, rgba(15,23,42,0.85), rgba(2,6,23,0.95))',
                    border: '1px solid rgba(255,215,0,0.2)',
                    borderRadius: '16px',
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {!activePlayer ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: '4.5rem', marginBottom: '1rem', opacity: 0.8 }}>🏏</div>
                            <h2 style={{ fontSize: '2rem', color: 'var(--accent-gold)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                                WAITING FOR NEXT BIDDING PLAYER
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                                Auctioneer will select the next player shortly...
                            </p>
                        </div>
                    ) : (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                            {/* Live Badge */}
                            <div style={{
                                background: 'var(--accent-gold)',
                                color: '#000',
                                padding: '0.3rem 1.6rem',
                                borderRadius: '50px',
                                fontWeight: 900,
                                fontSize: '0.85rem',
                                letterSpacing: '2px',
                                marginBottom: '1rem',
                                boxShadow: '0 0 20px rgba(255,215,0,0.4)'
                            }}>
                                ⚡ ON THE BIDDING BLOCK
                            </div>

                            {/* Player Info & Photo Card */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', width: '100%', justifyContent: 'center' }}>
                                {/* Photo Container */}
                                <div style={{ position: 'relative' }}>
                                    {activePlayer.players.photo_url ? (
                                        <img
                                            src={getOptimizedImageUrl(activePlayer.players.photo_url, 500)}
                                            alt="Player"
                                            style={{
                                                width: 155,
                                                height: 190,
                                                objectFit: 'contain',
                                                objectPosition: 'top center',
                                                backgroundColor: '#090d16',
                                                borderRadius: '16px',
                                                border: '4px solid var(--accent-gold)',
                                                boxShadow: '0 0 35px rgba(255,215,0,0.35)'
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: 155,
                                            height: 190,
                                            borderRadius: '16px',
                                            border: '4px solid var(--accent-gold)',
                                            background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(0,0,0,0.6))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justify: 'center',
                                            fontSize: '2.5rem',
                                            fontWeight: 900,
                                            color: 'var(--accent-gold)',
                                            boxShadow: '0 0 35px rgba(255,215,0,0.35)'
                                        }}>
                                            {getPlayerInitials(activePlayer.players)}
                                        </div>
                                    )}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: -12,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'var(--accent-gold)',
                                        color: '#000',
                                        padding: '0.2rem 0.8rem',
                                        borderRadius: '4px',
                                        fontWeight: 'bold',
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {activePlayer.players.player_role || 'PLAYER'}
                                    </div>
                                </div>

                                {/* Player Name & Details */}
                                <div style={{ textAlign: 'left', flex: 1, maxWidth: '420px' }}>
                                    <h1 style={{ fontSize: '2.1rem', margin: 0, color: '#fff', fontFamily: 'var(--font-heading)', lineHeight: 1.1 }}>
                                        {activePlayer.player_number && <span style={{ color: 'var(--accent-gold)', marginRight: '0.8rem' }}>#{activePlayer.player_number}</span>}
                                        {activePlayer.players.first_name} {activePlayer.players.last_name}
                                    </h1>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0.3rem 0 0.8rem' }}>
                                        Branch: <strong style={{ color: 'var(--accent-gold)' }}>{activePlayer.players.branch || '-'}</strong> | Base Price: ₹{(activeAuction?.base_price || 0).toLocaleString('en-IN')}
                                        {activePlayer.players.gender && (
                                            <span style={{ marginLeft: '0.8rem', color: activePlayer.players.gender.toLowerCase() === 'female' ? '#f472b6' : '#60a5fa', fontWeight: 'bold' }}>
                                                ({activePlayer.players.gender})
                                            </span>
                                        )}
                                    </p>

                                    {/* Highest Bid Banner Box */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(0,0,0,0.4))',
                                        padding: '0.9rem 1.1rem',
                                        borderRadius: '12px',
                                        border: '1.5px solid var(--accent-gold)',
                                        boxShadow: '0 0 25px rgba(255,215,0,0.15)'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>
                                            CURRENT HIGHEST BID
                                        </div>
                                        {(() => {
                                            const bidVal = activePlayer.current_bid_price || activeAuction?.base_price || 0;
                                            return (
                                                <div style={{ margin: '0.25rem 0 0.4rem' }}>
                                                    <IndianCurrencyDisplay
                                                        amount={bidVal}
                                                        size="2xl"
                                                        color="#fff"
                                                        subtextColor="var(--accent-gold)"
                                                    />
                                                </div>
                                            );
                                        })()}
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: winningTeam ? 'var(--accent-green)' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {winningTeam ? (
                                                <>
                                                    {winningTeam.logo_url && <img src={winningTeam.logo_url} alt="Logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />}
                                                    <span>By: {winningTeam.team_name}</span>
                                                </>
                                            ) : (
                                                'No Bids Placed Yet'
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TOURNAMENT SPONSORS CAROUSEL/MARQUEE IN LEFT BIDDING BLOCK STAGE */}
                    {sponsors.length > 0 && (
                        <div style={{
                            width: '100%',
                            marginTop: '0.8rem',
                            paddingTop: '0.6rem',
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                            textAlign: 'center',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                fontSize: '0.78rem',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                color: 'var(--accent-gold)',
                                marginBottom: '0.5rem',
                                fontWeight: 'bold',
                                opacity: 0.9,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem'
                            }}>
                                TOURNAMENT SPONSORS 🔄
                            </div>
                            <div style={{
                                overflow: 'hidden',
                                width: '100%',
                                display: 'flex',
                                maskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
                                WebkitMaskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    gap: '1rem',
                                    animation: 'marquee 22s linear infinite',
                                    whiteSpace: 'nowrap',
                                    width: 'max-content',
                                    padding: '2px 0'
                                }}>
                                    {(sponsors.length < 4
                                        ? [...sponsors, ...sponsors, ...sponsors, ...sponsors]
                                        : [...sponsors, ...sponsors]
                                    ).map((sponsor, idx) => (
                                        <div
                                            key={`${sponsor.id}-${idx}`}
                                            style={{
                                                display: 'inline-flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '4px',
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                padding: '6px 14px',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
                                                textAlign: 'center',
                                                flexShrink: 0
                                            }}
                                        >
                                            <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                                {sponsor.name}
                                            </span>
                                            {(sponsor.photo_url || sponsor.logo_url) ? (
                                                <img
                                                    src={getOptimizedImageUrl(sponsor.photo_url || sponsor.logo_url, 300)}
                                                    alt={sponsor.name}
                                                    style={{
                                                        height: '42px',
                                                        width: '110px',
                                                        objectFit: 'contain',
                                                        borderRadius: '6px'
                                                    }}
                                                />
                                            ) : (
                                                <div style={{
                                                    height: '42px',
                                                    width: '110px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justify: 'center',
                                                    fontSize: '0.75rem',
                                                    color: 'rgba(255,255,255,0.4)',
                                                }}>
                                                    {sponsor.name}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: 100% AUTOMATED TEAM LIVE BUDGET MONITOR */}
                <div style={{
                    background: 'rgba(15,23,42,0.85)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Automated Header */}
                    <div style={{ borderBottom: '1px solid rgba(255,215,0,0.2)', paddingBottom: '0.8rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '1.1rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={18} />
                            TEAM LIVE BUDGET ({displayedTeams.length}) {activePlayerGender ? `— ${activePlayerGender.toUpperCase()} TEAMS` : ''}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                            AUTO-SYNC & SCROLL
                        </span>
                    </div>

                    {/* Teams Budget Cards Scrollable Container */}
                    <div 
                        ref={scrollContainerRef}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.8rem',
                            overflowY: 'auto',
                            maxHeight: 'calc(100vh - 170px)',
                            height: 'calc(100vh - 170px)',
                            paddingRight: '0.3rem'
                        }}
                    >
                        {displayedTeams.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
                                No teams added for this category yet.
                            </p>
                        ) : (
                            displayedTeams.map(team => {
                                const teamSquad = allAuctionPlayers.filter(p => p.team_id === team.id && p.approval_status === 'approved');
                                const squadCount = teamSquad.length;
                                const spent = teamSquad.reduce((acc, p) => acc + (p.sold_price || 0), 0);
                                
                                const isCurrentBidder = activePlayer && team.id === activePlayer.current_bid_team_id;
                                const activeBidCost = isCurrentBidder ? (activePlayer?.current_bid_price || 0) : 0;
                                const remainingPurse = maxBudget - spent - activeBidCost;
                                const pursePercent = maxBudget > 0 ? Math.max(0, Math.min(100, (remainingPurse / maxBudget) * 100)) : 100;

                                return (
                                    <div
                                        key={team.id}
                                        style={{
                                            background: isCurrentBidder ? 'rgba(255,215,0,0.14)' : 'rgba(255,255,255,0.03)',
                                            border: isCurrentBidder ? '2px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '10px',
                                            padding: '0.85rem 1rem',
                                            transition: 'all 0.3s ease',
                                            boxShadow: isCurrentBidder ? '0 0 15px rgba(255,215,0,0.2)' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                {team.logo_url ? (
                                                    <img src={team.logo_url} alt="Team" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                                                ) : (
                                                    <div style={{ width: 34, height: 34, borderRadius: '6px', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                        {getTeamInitials(team.team_name)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <span>{team.team_name}</span>
                                                        {isCurrentBidder && (
                                                            <span style={{ background: 'var(--accent-gold)', color: '#000', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 900 }}>
                                                                HIGHEST BIDDER
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        Squad: <strong style={{ color: squadCount >= maxPlayers ? '#ef4444' : '#fff' }}>{squadCount}/{maxPlayers}</strong>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Purse Display */}
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>REMAINING PURSE</div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: remainingPurse < 0 ? '#ef4444' : 'var(--accent-green)' }}>
                                                    ₹{remainingPurse.toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Visual Purse Progress Bar */}
                                        {maxBudget > 0 && (
                                            <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginTop: '0.4rem' }}>
                                                <div style={{
                                                    width: `${pursePercent}%`,
                                                    height: '100%',
                                                    background: pursePercent < 20 ? '#ef4444' : pursePercent < 50 ? '#f59e0b' : 'var(--accent-green)',
                                                    transition: 'width 0.5s ease'
                                                }} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>

            {/* CELEBRATION SOLD OVERLAY POPUP */}
            {showSoldOverlay && lastSoldPlayer && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(2,6,23,0.92)',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center',
                    zIndex: 100,
                    animation: 'fadeIn 0.4s ease'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.99))',
                        border: '3px solid var(--accent-green)',
                        borderRadius: '24px',
                        padding: '3rem 4rem',
                        textAlign: 'center',
                        boxShadow: '0 0 60px rgba(57,255,20,0.4)',
                        maxWidth: '650px',
                        width: '90%'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔨 HAMMER DOWN!</div>
                        <h1 style={{ fontSize: '2.5rem', color: 'var(--accent-green)', margin: '0 0 1.5rem', fontFamily: 'var(--font-heading)' }}>
                            SOLD!
                        </h1>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
                            {lastSoldPlayer.players?.photo_url && (
                                <img
                                    src={getOptimizedImageUrl(lastSoldPlayer.players.photo_url, 300)}
                                    alt="Player"
                                    style={{ width: 110, height: 130, objectFit: 'contain', borderRadius: '12px', border: '2px solid var(--accent-green)' }}
                                />
                            )}
                            <div style={{ textAlign: 'left' }}>
                                <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>
                                    {lastSoldPlayer.players?.first_name} {lastSoldPlayer.players?.last_name}
                                </h2>
                                <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0 0.8rem' }}>Role: {lastSoldPlayer.players?.player_role}</p>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-gold)' }}>
                                    ₹{(lastSoldPlayer.sold_price || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>

                        {/* Winning Team */}
                        {(() => {
                            const winT = teams.find(t => t.id === lastSoldPlayer.team_id);
                            return (
                                <div style={{ background: 'rgba(57,255,20,0.1)', border: '1px solid var(--accent-green)', padding: '1rem', borderRadius: '12px' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)', display: 'block', marginBottom: '0.2rem' }}>BOUGHT BY</span>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
                                        {winT ? winT.team_name : 'Unknown Team'}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* CSS KEYFRAMES STYLES */}
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes pulse {
                    0%   { transform: scale(1); opacity: 1; }
                    50%  { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(1.05); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default YouTubeStreamProjectorPage;
