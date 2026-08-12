import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import IndianCurrencyDisplay from '../components/IndianCurrencyDisplay';

const OBSOverlayPage = () => {
    const [searchParams] = useSearchParams();
    const auctionCode = searchParams.get('code');

    const [loading, setLoading] = useState(true);
    const [auction, setAuction] = useState(null);
    const [activePlayer, setActivePlayer] = useState(null);
    const [teams, setTeams] = useState([]);
    const [showSoldOverlay, setShowSoldOverlay] = useState(false);
    const [lastSoldPlayer, setLastSoldPlayer] = useState(null);
    const [showUnsoldOverlay, setShowUnsoldOverlay] = useState(false);
    const [lastUnsoldPlayer, setLastUnsoldPlayer] = useState(null);
    
    // Ticker state
    const [drawOverlay, setDrawOverlay] = useState(false);
    const [drawNumber, setDrawNumber] = useState('?');
    const [drawName, setDrawName] = useState('');
    const [drawPhoto, setDrawPhoto] = useState(null);
    const processedEvents = useRef(new Set());

    const fetchData = async () => {
        try {
            let auctionData = null;
            if (auctionCode) {
                const { data } = await supabase
                    .from('auctions')
                    .select('*')
                    .eq('auction_code', auctionCode)
                    .maybeSingle();
                auctionData = data;
            } else {
                const { data } = await supabase
                    .from('auctions')
                    .select('*')
                    .neq('status', 'draft')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                auctionData = data;
            }

            setAuction(auctionData);

            if (auctionData) {
                const { data: tData } = await supabase
                    .from('auction_teams')
                    .select('*')
                    .eq('auction_id', auctionData.id);
                setTeams(tData || []);

                const { data: apData } = await supabase
                    .from('auction_players')
                    .select('*, players(*)')
                    .eq('auction_id', auctionData.id)
                    .eq('auction_status', 'active')
                    .limit(1)
                    .maybeSingle();

                setActivePlayer(apData || null);
            }
        } catch (err) {
            console.error('OBS Overlay fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSoldEvent = async (apRecord) => {
        const eventKey = `${apRecord.id}-sold-${apRecord.updated_at || Date.now()}`;
        if (processedEvents.current.has(eventKey)) return;
        processedEvents.current.add(eventKey);

        const { data } = await supabase
            .from('auction_players')
            .select('*, players(*)')
            .eq('id', apRecord.id)
            .single();

        if (data) {
            setLastSoldPlayer(data);
            setShowSoldOverlay(true);
            setTimeout(() => {
                setShowSoldOverlay(false);
                setLastSoldPlayer(null);
                fetchData();
            }, 6000);
        }
    };

    const handleUnsoldEvent = async (apRecord) => {
        const eventKey = `${apRecord.id}-unsold-${apRecord.updated_at || Date.now()}`;
        if (processedEvents.current.has(eventKey)) return;
        processedEvents.current.add(eventKey);

        const { data } = await supabase
            .from('auction_players')
            .select('*, players(*)')
            .eq('id', apRecord.id)
            .single();

        if (data) {
            setLastUnsoldPlayer(data);
            setShowUnsoldOverlay(true);
            setTimeout(() => {
                setShowUnsoldOverlay(false);
                setLastUnsoldPlayer(null);
                fetchData();
            }, 6000);
        }
    };

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('obs_overlay_sync')
            .on('broadcast', { event: 'random_number_draw' }, payload => {
                if (payload?.payload?.playerNumber != null) {
                    const p = payload.payload;
                    setDrawOverlay(true);
                    setDrawNumber(`#${p.playerNumber}`);
                    setDrawName(p.playerName || '');
                    setDrawPhoto(p.photoUrl || null);
                    setTimeout(() => setDrawOverlay(false), 5000);
                }
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'auction_players'
            }, payload => {
                const { new: updatedPlayer } = payload;
                if (!updatedPlayer) return;

                if (updatedPlayer.auction_status === 'sold') {
                    handleSoldEvent(updatedPlayer);
                } else if (updatedPlayer.auction_status === 'unsold') {
                    handleUnsoldEvent(updatedPlayer);
                } else {
                    fetchData();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [auctionCode]);

    // Field normalization helpers
    const playerDetails = activePlayer?.players;
    const rawName = playerDetails?.first_name 
        ? `${playerDetails.first_name} ${playerDetails.last_name || ''}`.trim()
        : (playerDetails?.name || 'Player');
    const playerName = rawName.toUpperCase();

    const playerRole = (playerDetails?.player_role || playerDetails?.role || playerDetails?.category || 'PLAYER').toUpperCase();
    const playerPhoto = playerDetails?.photo_url;
    const playerNum = activePlayer?.player_number || playerDetails?.player_number;

    const basePriceVal = activePlayer?.base_price ?? auction?.base_price ?? 0;
    const currentBidVal = activePlayer?.current_bid_price ?? activePlayer?.current_bid ?? basePriceVal;

    const leadingTeamId = activePlayer?.current_bid_team_id || activePlayer?.current_team_id;
    const leadingTeam = teams.find(t => t.id === leadingTeamId);
    const teamName = (leadingTeam?.team_name || leadingTeam?.name || '').toUpperCase();
    const teamLogo = leadingTeam?.team_logo || leadingTeam?.logo_url;

    // Sold / Unsold details
    const soldPriceVal = lastSoldPlayer?.sold_price || lastSoldPlayer?.current_bid_price || lastSoldPlayer?.current_bid || 0;
    const soldTeamId = lastSoldPlayer?.team_id || lastSoldPlayer?.current_bid_team_id;
    const soldTeam = teams.find(t => t.id === soldTeamId);
    const soldPlayerName = (lastSoldPlayer?.players?.first_name 
        ? `${lastSoldPlayer.players.first_name} ${lastSoldPlayer.players.last_name || ''}`.trim()
        : (lastSoldPlayer?.players?.name || 'Player')).toUpperCase();

    const unsoldPlayerName = (lastUnsoldPlayer?.players?.first_name 
        ? `${lastUnsoldPlayer.players.first_name} ${lastUnsoldPlayer.players.last_name || ''}`.trim()
        : (lastUnsoldPlayer?.players?.name || 'Player')).toUpperCase();

    const initials = ((playerDetails?.first_name?.charAt(0) || playerDetails?.name?.charAt(0) || 'P') + (playerDetails?.last_name?.charAt(0) || '')).toUpperCase();

    return (
        <div 
            style={{ 
                background: 'transparent', 
                width: '100vw', 
                height: '100vh', 
                overflow: 'hidden', 
                position: 'relative',
                fontFamily: "'Oswald', 'Outfit', 'Inter', sans-serif",
                color: '#ffffff',
                userSelect: 'none'
            }}
        >
            {/* Top Right Live Badge */}
            <div style={{
                position: 'absolute',
                top: '24px',
                right: '32px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(15, 23, 42, 0.88)',
                backdropFilter: 'blur(12px)',
                padding: '8px 20px',
                borderRadius: '9999px',
                border: '1.5px solid rgba(255, 215, 0, 0.3)',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
                zIndex: 50
            }}>
                <span style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    boxShadow: '0 0 12px #ef4444',
                    animation: 'pulse 1.5s infinite'
                }} />
                <span style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#ffd700' }}>
                    LIVE AUCTION
                </span>
                {auction?.auction_name && (
                    <>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f8fafc', textTransform: 'uppercase' }}>
                            {auction.auction_name}
                        </span>
                    </>
                )}
            </div>

            {/* Random Draw Overlay Notification */}
            {drawOverlay && (
                <div style={{
                    position: 'absolute',
                    top: '30%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
                    border: '2px solid var(--accent-gold, #ffd700)',
                    borderRadius: '24px',
                    padding: '24px 48px',
                    textAlign: 'center',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                    zIndex: 100,
                    animation: 'fadeInUp 0.3s ease-out'
                }}>
                    <div style={{ fontSize: '0.9rem', color: '#ffd700', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800 }}>
                        🎰 NEXT PLAYER DRAWN
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: 900, color: '#ffffff', margin: '8px 0', textTransform: 'uppercase' }}>
                        {drawNumber} {drawName}
                    </div>
                </div>
            )}

            {/* SOLD POPUP BANNER OVERLAY */}
            {showSoldOverlay && lastSoldPlayer && (
                <div style={{
                    position: 'absolute',
                    bottom: '28px',
                    left: '32px',
                    right: '32px',
                    height: '140px',
                    background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.96), rgba(5, 150, 105, 0.96))',
                    borderRadius: '24px',
                    padding: '16px 36px',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    border: '2px solid #6ee7b7',
                    boxShadow: '0 20px 50px rgba(16, 185, 129, 0.5)',
                    zIndex: 90,
                    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            fontSize: '2.2rem',
                            fontWeight: 900,
                            letterSpacing: '2px',
                            color: '#ffffff',
                            textShadow: '0 4px 10px rgba(0,0,0,0.3)',
                            background: '#064e3b',
                            padding: '6px 20px',
                            borderRadius: '12px'
                        }}>
                            🏆 SOLD!
                        </div>
                        <div>
                            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', textTransform: 'uppercase' }}>
                                {soldPlayerName}
                            </div>
                            <div style={{ fontSize: '1.1rem', color: '#d1fae5', fontWeight: 600 }}>
                                Sold for <IndianCurrencyDisplay amount={soldPriceVal} color="#ffffff" size="md" />
                            </div>
                        </div>
                    </div>
                    {soldTeam && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.35)', padding: '12px 24px', borderRadius: '16px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#a7f3d0', fontWeight: 800, letterSpacing: '1px' }}>WON BY</span>
                            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', textTransform: 'uppercase' }}>
                                {soldTeam.team_name || soldTeam.name}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* UNSOLD POPUP BANNER OVERLAY */}
            {showUnsoldOverlay && lastUnsoldPlayer && (
                <div style={{
                    position: 'absolute',
                    bottom: '28px',
                    left: '32px',
                    right: '32px',
                    height: '140px',
                    background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.96), rgba(185, 28, 28, 0.96))',
                    borderRadius: '24px',
                    padding: '16px 36px',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    border: '2px solid #fca5a5',
                    boxShadow: '0 20px 50px rgba(239, 68, 68, 0.5)',
                    zIndex: 90,
                    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            fontSize: '2.2rem',
                            fontWeight: 900,
                            letterSpacing: '2px',
                            color: '#ffffff',
                            background: '#7f1d1d',
                            padding: '6px 20px',
                            borderRadius: '12px'
                        }}>
                            ❌ UNSOLD
                        </div>
                        <div>
                            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', textTransform: 'uppercase' }}>
                                {unsoldPlayerName}
                            </div>
                            <div style={{ fontSize: '1.1rem', color: '#fecaca', fontWeight: 600 }}>
                                Passed without bids (Base: <IndianCurrencyDisplay amount={lastUnsoldPlayer.base_price || basePriceVal} color="#ffffff" size="sm" />)
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN LOWER-THIRD BROADCAST BANNER (PERSISTENT TV GRAPHICS WITH POP-OUT LARGE PLAYER PHOTO) */}
            {!showSoldOverlay && !showUnsoldOverlay && activePlayer && (
                <div style={{
                    position: 'absolute',
                    bottom: '28px',
                    left: '32px',
                    right: '32px',
                    height: '145px',
                    background: 'linear-gradient(135deg, rgba(10, 15, 30, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '24px',
                    border: '2px solid rgba(255, 215, 0, 0.4)',
                    boxShadow: '0 25px 70px rgba(0, 0, 0, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '0 28px',
                    zIndex: 40,
                    overflow: 'visible'
                }}>
                    {/* SECTION 1: LARGE PLAYER PHOTO POP-OUT & NAME DETAILS */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, minWidth: 0, paddingRight: '20px' }}>
                        {/* LARGE POP-OUT PLAYER AVATAR CARD */}
                        <div style={{ position: 'relative', shrink: 0, marginTop: '-36px' }}>
                            {playerPhoto ? (
                                <div style={{
                                    width: '140px',
                                    height: '150px',
                                    borderRadius: '22px',
                                    border: '4px solid #ffd700',
                                    overflow: 'hidden',
                                    background: '#090d16',
                                    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 215, 0, 0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justify: 'center'
                                }}>
                                    <img 
                                        src={playerPhoto} 
                                        alt={playerName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                </div>
                            ) : (
                                <div style={{
                                    width: '140px',
                                    height: '150px',
                                    borderRadius: '22px',
                                    border: '4px solid #ffd700',
                                    background: 'linear-gradient(135deg, rgba(255,215,0,0.3), rgba(57,255,20,0.18))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justify: 'center',
                                    fontSize: '3.6rem',
                                    fontWeight: '900',
                                    color: '#ffd700',
                                    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 215, 0, 0.35)',
                                    textShadow: '0 4px 10px rgba(0,0,0,0.5)'
                                }}>
                                    {initials}
                                </div>
                            )}

                            {playerNum && (
                                <span style={{
                                    position: 'absolute',
                                    bottom: '-8px',
                                    right: '-6px',
                                    background: '#ffd700',
                                    color: '#000000',
                                    fontWeight: 900,
                                    fontSize: '0.85rem',
                                    padding: '3px 10px',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.7)',
                                    letterSpacing: '0.5px'
                                }}>
                                    #{playerNum}
                                </span>
                            )}
                        </div>

                        {/* Player Meta Info (Name, Role, Base Price) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{
                                    background: '#ffd700',
                                    color: '#000000',
                                    fontSize: '0.8rem',
                                    fontWeight: 900,
                                    padding: '3px 12px',
                                    borderRadius: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>
                                    {playerRole}
                                </span>
                                <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Base: <IndianCurrencyDisplay amount={basePriceVal} color="#ffd700" size="sm" />
                                </span>
                            </div>

                            <div style={{ 
                                fontSize: 'clamp(1.6rem, 2.8vw, 2.4rem)', 
                                fontWeight: 900, 
                                letterSpacing: '1px', 
                                color: '#ffffff', 
                                lineHeight: 1.1,
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textShadow: '0 4px 12px rgba(0,0,0,0.6)'
                            }}>
                                {playerName}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: HIGHEST BIDDER TEAM BOX (SHRINK-RESISTANT) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', shrink: 0 }}>
                        <div style={{
                            background: teamName ? 'rgba(57, 255, 20, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                            border: teamName ? '1.5px solid #39ff14' : '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '18px',
                            padding: '12px 22px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            {teamLogo ? (
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '14px',
                                    background: '#0f172a',
                                    border: '1px solid #39ff14',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justify: 'center',
                                    shrink: 0
                                }}>
                                    <img src={teamLogo} alt={teamName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                            ) : teamName ? (
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '14px',
                                    background: '#39ff14',
                                    color: '#000',
                                    fontWeight: 900,
                                    fontSize: '1.3rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justify: 'center',
                                    shrink: 0
                                }}>
                                    {teamName.charAt(0)}
                                </div>
                            ) : null}

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#94a3b8', fontWeight: 800 }}>
                                    {teamName ? 'HIGHEST BIDDER' : 'BIDDING OPEN'}
                                </div>
                                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: teamName ? '#39ff14' : '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                    {teamName || 'NO BIDS YET'}
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: CURRENT BID DISPLAY BOX */}
                        <div style={{
                            background: teamName ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            padding: '14px 26px',
                            borderRadius: '18px',
                            boxShadow: teamName ? '0 8px 25px rgba(5, 150, 105, 0.4)' : '0 8px 25px rgba(2, 132, 199, 0.4)',
                            textAlign: 'center',
                            minWidth: '190px',
                            shrink: 0
                        }}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#e2e8f0', fontWeight: 800 }}>
                                CURRENT BID
                            </div>
                            <IndianCurrencyDisplay amount={currentBidVal} color="#ffffff" size="xl" align="center" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OBSOverlayPage;
