import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { getOptimizedImageUrl } from '../services/cloudinary';
import { Shuffle, Flame, Sparkles, X, RotateCcw, UserCheck, ShieldAlert } from 'lucide-react';

const getPlayerInitials = (p) => {
  if (!p) return 'P';
  return ((p.first_name?.charAt(0) || '') + (p.last_name?.charAt(0) || '')).toUpperCase();
};

const RandomDrawPage = () => {
  const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auctionCode = searchParams.get('code') || localStorage.getItem('cap_admin_selected_auction_code');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeAuction, setActiveAuction] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);

  // Filter & Control States
  const [genderTab, setGenderTab] = useState('Male'); // 'Male', 'Female', 'ALL'
  const [excludedInput, setExcludedInput] = useState('');
  const [excludedNumbers, setExcludedNumbers] = useState([]);

  // Draw States
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayNumber, setDisplayNumber] = useState('?');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const spinTimerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [isAuthenticated, auctionCode]);

  // Load saved static excluded numbers from localStorage once activeAuction is loaded
  useEffect(() => {
    if (activeAuction?.id) {
      const saved = localStorage.getItem(`cap_admin_excluded_nums_${activeAuction.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setExcludedNumbers(parsed);
            setExcludedInput(parsed.join(', '));
          }
        } catch (e) {
          console.error("Failed to parse saved excluded numbers", e);
        }
      }
    }
  }, [activeAuction?.id]);

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
        // Fetch All Approved Auction Players with full details
        const { data: apData, error: apError } = await supabase
          .from('auction_players')
          .select('*, players(*)')
          .eq('auction_id', auctionData.id)
          .eq('approval_status', 'approved');

        if (apError) throw apError;

        setAllPlayers(apData || []);
      }
    } catch (err) {
      console.error("Error fetching data for random draw:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Static Excluded Numbers Input
  const handleUpdateExcludedInput = (val) => {
    setExcludedInput(val);
    const nums = val
      .split(/[\s,]+/)
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n));

    const uniqueNums = Array.from(new Set(nums));
    setExcludedNumbers(uniqueNums);

    if (activeAuction?.id) {
      localStorage.setItem(`cap_admin_excluded_nums_${activeAuction.id}`, JSON.stringify(uniqueNums));
    }
  };

  const handleRemoveExcludedNumber = (numToRemove) => {
    const updated = excludedNumbers.filter(n => n !== numToRemove);
    setExcludedNumbers(updated);
    setExcludedInput(updated.join(', '));
    if (activeAuction?.id) {
      localStorage.setItem(`cap_admin_excluded_nums_${activeAuction.id}`, JSON.stringify(updated));
    }
  };

  // Check if player is eligible for random draw
  const isPlayerEligible = (ap) => {
    const p = ap.players || {};

    // 1. Must have a valid player number
    if (ap.player_number == null) return false;

    // 2. Gender Filter
    if (genderTab !== 'ALL') {
      const pGender = (p.gender || '').trim().toLowerCase();
      const targetGender = genderTab.toLowerCase();
      if (pGender && pGender !== targetGender) return false;
    }

    // 3. Exclude already auctioned (sold, unsold, active)
    if (ap.auction_status === 'sold' || ap.auction_status === 'unsold' || ap.auction_status === 'active') {
      return false;
    }

    // 4. Exclude Icon and Captain only (Owners come in auction if not Captain or Icon)
    if (ap.is_icon || ap.is_captain) {
      return false;
    }

    // 5. Exclude static user-specified numbers
    if (excludedNumbers.includes(ap.player_number)) {
      return false;
    }

    return true;
  };

  const eligiblePlayers = allPlayers.filter(isPlayerEligible);

  // Statistics Breakdown
  const totalCount = allPlayers.length;
  const genderFilteredCount = allPlayers.filter(ap => {
    if (genderTab === 'ALL') return true;
    const g = (ap.players?.gender || '').trim().toLowerCase();
    return g === genderTab.toLowerCase();
  }).length;

  const soldUnsoldCount = allPlayers.filter(ap => {
    if (genderTab !== 'ALL') {
      const g = (ap.players?.gender || '').trim().toLowerCase();
      if (g !== genderTab.toLowerCase()) return false;
    }
    return ap.auction_status === 'sold' || ap.auction_status === 'unsold' || ap.auction_status === 'active';
  }).length;

  const retainedCount = allPlayers.filter(ap => {
    if (genderTab !== 'ALL') {
      const g = (ap.players?.gender || '').trim().toLowerCase();
      if (g !== genderTab.toLowerCase()) return false;
    }
    return ap.is_icon || ap.is_captain;
  }).length;

  const staticExcludedCount = allPlayers.filter(ap => {
    if (genderTab !== 'ALL') {
      const g = (ap.players?.gender || '').trim().toLowerCase();
      if (g !== genderTab.toLowerCase()) return false;
    }
    return excludedNumbers.includes(ap.player_number);
  }).length;

  // Spin Random Generator & Auto-Start Auction
  const generateRandomPlayer = () => {
    if (eligiblePlayers.length === 0) {
      alert("No eligible players available in the pool for the selected criteria.");
      return;
    }

    setIsSpinning(true);
    setSelectedPlayer(null);

    // Pick winning player uniformly from eligible pool
    const randomIndex = Math.floor(Math.random() * eligiblePlayers.length);
    const winner = eligiblePlayers[randomIndex];

    // Animation Ticker: 2 seconds roll
    let counter = 0;
    const maxRolls = 20;

    if (spinTimerRef.current) clearInterval(spinTimerRef.current);

    spinTimerRef.current = setInterval(async () => {
      counter++;
      const randomDisplayIndex = Math.floor(Math.random() * eligiblePlayers.length);
      const tempNum = eligiblePlayers[randomDisplayIndex]?.player_number ?? '?';
      setDisplayNumber(`#${tempNum}`);

      if (counter >= maxRolls) {
        clearInterval(spinTimerRef.current);
        setDisplayNumber(`#${winner.player_number}`);
        setSelectedPlayer(winner);
        setIsSpinning(false);

        // Auto-Start Auction in Database
        try {
          setActionLoading(true);

          // Reset any currently active player back to pending
          const currentlyActive = allPlayers.find(ap => ap.auction_status === 'active');
          if (currentlyActive && currentlyActive.id !== winner.id) {
            await supabase
              .from('auction_players')
              .update({ auction_status: 'pending' })
              .eq('id', currentlyActive.id);
          }

          // Set winner as active player
          const { error } = await supabase
            .from('auction_players')
            .update({
              auction_status: 'active',
              current_bid_price: activeAuction?.base_price || 0,
              current_bid_team_id: null,
              previous_bid_price: null,
              previous_bid_team_id: null
            })
            .eq('id', winner.id);

          if (error) throw error;

          // Broadcast to Live Projector Screen
          try {
            const channel = supabase.channel('projector_sync_channel');
            channel.send({
              type: 'broadcast',
              event: 'random_number_draw',
              payload: {
                playerNumber: winner.player_number,
                playerName: `${winner.players?.first_name || ''} ${winner.players?.last_name || ''}`.trim(),
                photoUrl: winner.players?.photo_url || null
              }
            });
          } catch (e) {
            console.error("Error sending draw broadcast to projector:", e);
          }

          // Auto-navigate to Live Bidding page after 1 second reveal
          setTimeout(() => {
            navigate(`/live-auction?code=${activeAuction?.auction_code}`);
          }, 1000);

        } catch (err) {
          console.error("Error auto-starting auction:", err);
          alert("Failed to auto-start live auction for drawn player.");
        } finally {
          setActionLoading(false);
        }
      }
    }, 90);
  };

  // Start Auction & Bidding for Drawn Player
  const startAuctionForDrawnPlayer = async () => {
    if (!selectedPlayer || !activeAuction) return;
    try {
      setActionLoading(true);

      // Check if any other player is currently active
      const currentlyActive = allPlayers.find(ap => ap.auction_status === 'active');
      if (currentlyActive && currentlyActive.id !== selectedPlayer.id) {
        const confirmReplace = window.confirm(
          `Player #${currentlyActive.player_number} (${currentlyActive.players?.first_name || ''}) is currently active for bidding.\n\nDo you want to deactivate them and start bidding for Player #${selectedPlayer.player_number}?`
        );
        if (!confirmReplace) return;

        // Reset currently active player back to pending
        await supabase
          .from('auction_players')
          .update({ auction_status: 'pending' })
          .eq('id', currentlyActive.id);
      }

      // Set selected player as active
      const { error } = await supabase
        .from('auction_players')
        .update({
          auction_status: 'active',
          current_bid_price: activeAuction.base_price || 0,
          current_bid_team_id: null,
          previous_bid_price: null,
          previous_bid_team_id: null
        })
        .eq('id', selectedPlayer.id);

      if (error) throw error;

      // Navigate to Live Auction Page
      navigate(`/live-auction?code=${activeAuction.auction_code}`);
    } catch (err) {
      console.error("Error starting auction:", err);
      alert("Failed to start live auction for selected player.");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAuthenticated) return <Navigate to="/admin" replace />;
  if (!auctionCode || (!loading && !activeAuction)) return <Navigate to="/admin" replace />;
  if (loading) return <Loader message="LOADING RANDOM PLAYER GENERATOR..." />;

  const codeParam = auctionCode ? `?code=${auctionCode}` : '';

  return (
    <div className="flex-col min-h-screen" style={{ overflowX: 'hidden' }}>
      <div className="spotlight"></div>
      <PageHeader
        title="RANDOM PLAYER GENERATOR"
        subtitle={activeAuction ? `${activeAuction.auction_name} (${activeAuction.auction_code})` : 'Auction Draw'}
        showLogos={false}
      />

      <main className="container" style={{ padding: '1.5rem 1rem 4rem', zIndex: 1, position: 'relative', maxWidth: '1200px' }}>

        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <Link to={`/admin${codeParam}`} className="btn btn-outline" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
              ← Dashboard
            </Link>
            <h2 style={{ color: '#fff', margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>
              RANDOM AUCTION DRAW
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <Link to={`/live-auction${codeParam}`} className="btn" style={{ padding: '0.5rem 1.2rem', background: '#ef4444', color: '#fff', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Flame size={16} /> LIVE BIDDING ROOM
            </Link>
          </div>
        </div>

        {/* GENDER SELECTOR TABS */}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(255,215,0,0.3)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1rem', fontWeight: 'bold' }}>
            SELECT GENDER CATEGORY FOR RANDOM DRAW
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', maxWidth: '700px', margin: '0 auto' }}>
            <button
              onClick={() => setGenderTab('Male')}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '2px solid',
                borderColor: genderTab === 'Male' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)',
                background: genderTab === 'Male' ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.3)',
                color: genderTab === 'Male' ? 'var(--accent-gold)' : 'var(--text-muted)',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span>👨</span> MALE AUCTION
            </button>

            <button
              onClick={() => setGenderTab('Female')}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '2px solid',
                borderColor: genderTab === 'Female' ? '#ec4899' : 'rgba(255,255,255,0.1)',
                background: genderTab === 'Female' ? 'rgba(236,72,153,0.15)' : 'rgba(0,0,0,0.3)',
                color: genderTab === 'Female' ? '#f472b6' : 'var(--text-muted)',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span>👩</span> FEMALE AUCTION
            </button>

            <button
              onClick={() => setGenderTab('ALL')}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '2px solid',
                borderColor: genderTab === 'ALL' ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)',
                background: genderTab === 'ALL' ? 'rgba(57,255,20,0.15)' : 'rgba(0,0,0,0.3)',
                color: genderTab === 'ALL' ? 'var(--accent-green)' : 'var(--text-muted)',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span>👥</span> ALL GENDERS
            </button>
          </div>
        </div>

        {/* STATIC EXCLUDED PLAYER NUMBERS INPUT */}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            {/* <label style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} color="#f59e0b" /> HOLD / EXCLUDE PLAYER NUMBERS FOR LAST (Comma Separated)
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              These numbers will NOT be picked in the random generator until removed.
            </span> */}
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="e.g. 5, 12, 45, 99"
              value={excludedInput}
              onChange={(e) => handleUpdateExcludedInput(e.target.value)}
              style={{
                flex: 1,
                padding: '0.8rem 1.2rem',
                fontSize: '1rem',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,215,0,0.3)',
                borderRadius: '8px',
                color: 'var(--accent-gold)',
                fontWeight: 'bold',
                outline: 'none'
              }}
            />
            {excludedNumbers.length > 0 && (
              <button
                onClick={() => handleUpdateExcludedInput('')}
                className="btn btn-outline"
                style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#ef4444', borderColor: '#ef4444' }}
              >
                Clear All
              </button>
            )}
          </div>

          {/* Pill tags for excluded numbers */}
          {excludedNumbers.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Currently Excluded:</span> */}
              {excludedNumbers.map(num => (
                <span
                  key={num}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  #{num}
                  <button
                    onClick={() => handleRemoveExcludedNumber(num)}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* POOL STATS & MAIN DRAW AREA */}
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 900 ? '1fr' : '320px 1fr', gap: '2rem' }}>

          {/* Left Column: Pool Stats */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              POOL SUMMARY ({genderTab.toUpperCase()})
            </h3>

            <div>
              {/* <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Eligible Random Pool</div> */}
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent-green)' }}>
                {eligiblePlayers.length} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Players</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total {genderTab} Registered:</span>
                <span style={{ fontWeight: 'bold' }}>{genderFilteredCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Already Auctioned (Sold/Unsold):</span>
                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{soldUnsoldCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Excluded Icons & Captains:</span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>{retainedCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Statically Held Numbers:</span>
                <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{staticExcludedCount}</span>
              </div>
            </div>

            {eligiblePlayers.length === 0 && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', textAlign: 'center' }}>
                ⚠️ No eligible players in the random pool! Try switching gender or clearing static excluded numbers.
              </div>
            )}
          </div>

          {/* Right Column: Random Generator & Drawn Player Card */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '450px', position: 'relative' }}>

            {/* Draw Button */}
            <button
              onClick={generateRandomPlayer}
              disabled={isSpinning || eligiblePlayers.length === 0}
              className="btn"
              style={{
                padding: '1.2rem 3rem',
                fontSize: '1.4rem',
                background: isSpinning ? 'rgba(255,215,0,0.4)' : 'linear-gradient(135deg, var(--accent-gold), #f59e0b)',
                color: '#000',
                fontWeight: 900,
                borderRadius: '50px',
                border: 'none',
                cursor: isSpinning || eligiblePlayers.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: isSpinning ? 'none' : '0 0 25px rgba(255,215,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                marginBottom: '2rem',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              <Shuffle size={24} className={isSpinning ? 'spin-icon' : ''} />
              {isSpinning ? 'DRAWING RANDOM NUMBER...' : '🎰 GENERATE & AUTO-START AUCTION'}
            </button>

            {/* Big Ticker / Selected Player Display */}
            {!selectedPlayer && !isSpinning && (
              <div style={{ margin: '2rem 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '4.5rem', fontWeight: 900, color: 'rgba(255,255,255,0.1)', fontFamily: 'var(--font-heading)' }}>
                  {displayNumber}
                </div>
                <p style={{ margin: '1rem 0 0', fontSize: '1rem' }}>
                  Click the button above to randomly draw the next player for live bidding.
                </p>
              </div>
            )}

            {isSpinning && (
              <div style={{ margin: '2rem 0' }}>
                <div style={{
                  fontSize: '6rem',
                  fontWeight: 900,
                  color: 'var(--accent-gold)',
                  fontFamily: 'var(--font-heading)',
                  textShadow: '0 0 30px rgba(255,215,0,0.8)',
                  animation: 'pulse 0.2s infinite'
                }}>
                  {displayNumber}
                </div>
                <div style={{ color: 'var(--accent-green)', fontWeight: 'bold', letterSpacing: '2px', fontSize: '1.1rem' }}>
                  SELECTING RANDOM PLAYER...
                </div>
              </div>
            )}

            {/* DRAWN PLAYER RESULT CARD */}
            {selectedPlayer && !isSpinning && (
              <div style={{
                width: '100%',
                maxWidth: '650px',
                background: 'rgba(0,0,0,0.5)',
                border: '2px solid var(--accent-gold)',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 0 30px rgba(255,215,0,0.25)',
                animation: 'popIn 0.4s ease-out',
                display: 'flex',
                flexDirection: window.innerWidth < 650 ? 'column' : 'row',
                gap: '2rem',
                alignItems: 'center',
                textAlign: 'left'
              }}>
                {/* Big Square Frame Photo */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {selectedPlayer.players?.photo_url ? (
                    <img
                      src={getOptimizedImageUrl(selectedPlayer.players.photo_url, 300)}
                      alt="Player"
                      style={{
                        width: 140,
                        height: 140,
                        objectFit: 'cover',
                        borderRadius: '12px',
                        border: '3px solid var(--accent-gold)',
                        boxShadow: '0 0 15px rgba(255,215,0,0.3)'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 140,
                      height: 140,
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(0,0,0,0.6))',
                      border: '3px solid var(--accent-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.5rem',
                      fontWeight: 900,
                      color: 'var(--accent-gold)'
                    }}>
                      {getPlayerInitials(selectedPlayer.players)}
                    </div>
                  )}

                  {/* Player Number Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '-10px',
                    background: 'var(--accent-gold)',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: '1rem',
                    padding: '0.3rem 0.7rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                  }}>
                    #{selectedPlayer.player_number}
                  </div>
                </div>

                {/* Player Details */}
                <div style={{ flex: 1, width: '100%' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(57,255,20,0.2)', color: 'var(--accent-green)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {selectedPlayer.players?.player_role?.toUpperCase() || 'PLAYER'}
                    </span>
                    {selectedPlayer.players?.gender && (
                      <span style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {selectedPlayer.players.gender.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h2 style={{ fontSize: '2rem', color: '#fff', margin: '0 0 0.8rem 0', lineHeight: 1.1, textTransform: 'uppercase' }}>
                    {selectedPlayer.players?.first_name} <span style={{ color: 'var(--accent-gold)' }}>{selectedPlayer.players?.last_name}</span>
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem' }}>BATTING</span>
                      <strong style={{ color: '#fff' }}>{selectedPlayer.players?.batting_style || 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem' }}>BOWLING</span>
                      <strong style={{ color: '#fff' }}>{selectedPlayer.players?.bowling_style || 'N/A'}</strong>
                    </div>
                  </div>

                  {/* Start Auction Action Button */}
                  <button
                    onClick={startAuctionForDrawnPlayer}
                    disabled={actionLoading}
                    className="btn"
                    style={{
                      width: '100%',
                      padding: '0.9rem',
                      fontSize: '1rem',
                      background: 'var(--accent-green)',
                      color: '#000',
                      fontWeight: 900,
                      borderRadius: '10px',
                      border: 'none',
                      cursor: actionLoading ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 0 15px rgba(57,255,20,0.3)'
                    }}
                  >
                    <Flame size={18} /> {actionLoading ? 'STARTING BIDDING...' : `START AUCTION FOR PLAYER #${selectedPlayer.player_number}`}
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </main>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .spin-icon {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RandomDrawPage;
