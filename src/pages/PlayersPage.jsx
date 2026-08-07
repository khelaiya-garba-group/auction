import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import FilterBar from '../components/FilterBar';
import PlayerCard from '../components/PlayerCard';
import { generatePlayersListPDF, generatePlayerSlidesPDF } from '../services/pdfGenerator';

const PlayersPage = () => {
  const [searchParams] = useSearchParams();
  const auctionCode = searchParams.get('code') || localStorage.getItem('cap_admin_selected_auction_code');

  const [activeAuction, setActiveAuction] = useState(null);
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 20;

  const [filters, setFilters] = useState({
    player_role: '',
    batting_style: '',
    bowling_style: ''
  });

  const [pdfGroup, setPdfGroup] = useState('none');
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingSlides, setDownloadingSlides] = useState(false);

  const handleDownloadSlidesPDF = async () => {
    if (!players || players.length === 0) return;
    setDownloadingSlides(true);
    try {
      await generatePlayerSlidesPDF(players, `Player_Slides_${activeAuction?.auction_name?.replace(/ /g, '_') || 'Catalog'}.pdf`, activeAuction);
    } catch (err) {
      console.error("Error generating slides PDF:", err);
      alert("Failed to download slides PDF.");
    } finally {
      setDownloadingSlides(false);
    }
  };

  const filterOptions = {
    player_role: ['Batter', 'Bowler', 'All Rounder', 'Wicket Keeper'],
    batting_style: ['Right Hand', 'Left Hand'],
    bowling_style: ['Right Arm Fast', 'Right Arm Medium', 'Right Arm Spin', 'Left Arm Fast', 'Left Arm Spin', 'None']
  };

  const fetchData = async () => {
    try {
      if (!auctionCode) {
        setLoading(false);
        return;
      }
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('id, auction_name, auction_logo, auction_date, venue')
        .eq('auction_code', auctionCode)
        .maybeSingle();

      if (auctionError) throw auctionError;
      setActiveAuction(auctionData);

      if (auctionData) {
        // 1. Fetch approved auction_players mapping (with player_number, is_icon, sold_price, auction_status)
        const { data: apData, error: apError } = await supabase
          .from('auction_players')
          .select('player_id, player_number, is_captain, is_icon, is_owner, sold_price, auction_status')
          .eq('auction_id', auctionData.id)
          .eq('approval_status', 'approved');

        if (apError) throw apError;

        let extractedPlayers = [];

        if (apData && apData.length > 0) {
          const playerIds = apData.map(ap => ap.player_id);

          // 2. Fetch actual player details
          const { data: pData, error: pError } = await supabase
            .from('players')
            .select('*')
            .in('id', playerIds);

          if (pError) throw pError;

          // 3. Merge player details into each player, then sort by player_number
          const apMap = {};
          apData.forEach(ap => {
            apMap[ap.player_id] = {
              player_number: ap.player_number,
              is_captain: ap.is_captain,
              is_icon: ap.is_icon,
              is_owner: ap.is_owner,
              sold_price: ap.sold_price,
              auction_status: ap.auction_status
            };
          });

          extractedPlayers = (pData || []).map(p => ({
            ...p,
            player_number: apMap[p.id]?.player_number ?? null,
            is_captain: apMap[p.id]?.is_captain ?? false,
            is_icon: apMap[p.id]?.is_icon ?? false,
            is_owner: apMap[p.id]?.is_owner ?? false,
            sold_price: apMap[p.id]?.sold_price ?? 0,
            auction_status: apMap[p.id]?.auction_status ?? null
          })).sort((a, b) => (a.player_number ?? 9999) - (b.player_number ?? 9999));
        }
        setPlayers(extractedPlayers);
        setFilteredPlayers(extractedPlayers);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auctionCode]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    let result = [...players];
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k]) {
        result = result.filter(p => p[k] === newFilters[k]);
      }
    });
    setFilteredPlayers(result);
    setCurrentPage(1);
  };

  const handleLogout = () => {
    localStorage.removeItem('cap_admin_auth');
    window.location.reload();
  };

  const generatePDF = async (dataToExport, filename) => {
    await generatePlayersListPDF(dataToExport, filename, activeAuction, pdfGroup);
  };

  const handleDownloadPDF = async () => {
    await generatePDF(players, `Approved_Players_${activeAuction?.auction_name?.replace(/ /g, '_') || 'List'}.pdf`);
  };

  const handleDownloadAllPDF = async () => {
    if (!activeAuction) return;
    setDownloadingAll(true);
    try {
      const { data: apData, error: apError } = await supabase
        .from('auction_players')
        .select('player_id, player_number, is_captain, is_icon, is_owner')
        .eq('auction_id', activeAuction.id)
        .in('approval_status', ['approved', 'pending']);

      if (apError) throw apError;

      let allPlayersToExport = [];
      if (apData && apData.length > 0) {
        const playerIds = apData.map(ap => ap.player_id);
        const { data: pData, error: pError } = await supabase
          .from('players')
          .select('*')
          .in('id', playerIds);

        if (pError) throw pError;

        const apMap = {};
        apData.forEach(ap => {
          apMap[ap.player_id] = {
            player_number: ap.player_number,
            is_captain: ap.is_captain,
            is_icon: ap.is_icon,
            is_owner: ap.is_owner
          };
        });

        allPlayersToExport = (pData || []).map(p => ({
          ...p,
          player_number: apMap[p.id]?.player_number ?? null,
          is_captain: apMap[p.id]?.is_captain ?? false,
          is_icon: apMap[p.id]?.is_icon ?? false,
          is_owner: apMap[p.id]?.is_owner ?? false
        }));
      }

      await generatePDF(allPlayersToExport, `All_Registered_Players_${activeAuction?.auction_name?.replace(/ /g, '_') || 'List'}.pdf`);
    } catch (error) {
      console.error("Error fetching all players for PDF:", error);
      alert("Failed to download all players PDF.");
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) return <Loader message="LOADING PLAYERS..." />;
  if (!auctionCode || (!loading && !activeAuction)) return <Navigate to="/admin" replace />;

  const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + playersPerPage);

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader
        title="Auction Players"
        subtitle={activeAuction ? `Registered Players for ${activeAuction.auction_name}` : ''}
        showLogos={false}
      />

      <main className="container" style={{ flex: 1, padding: '2rem 1rem 4rem', zIndex: 1, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginRight: 'auto', flexWrap: 'wrap' }}>
            <select
              value={pdfGroup}
              onChange={(e) => setPdfGroup(e.target.value)}
              className="input"
              style={{ padding: '0.45rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
            >
              <option value="none">No Grouping</option>
              <option value="area">Group by Area</option>
              <option value="role">Group by Role</option>
            </select>
            <button onClick={handleDownloadPDF} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: 'var(--accent-gold)', color: '#000', fontWeight: 'bold' }}>
              Download Approved Players PDF
            </button>
            <button onClick={handleDownloadAllPDF} disabled={downloadingAll} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: 'var(--accent-green)', color: '#000', fontWeight: 'bold' }}>
              {downloadingAll ? 'Downloading...' : 'Download All Registered Players PDF'}
            </button>
            <button onClick={handleDownloadSlidesPDF} disabled={downloadingSlides} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold' }}>
              {downloadingSlides ? 'Generating Slides PDF...' : '📷 Download Player Slides PDF (Big Photos)'}
            </button>
          </div>
          <Link to="/admin" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Admin</Link>
          <Link to="/admin-players" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Manage Players</Link>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Logout</button>
        </div>

        {!activeAuction ? (
          <EmptyState
            title="No Active Auction"
            description="There is no active auction at the moment. Please check back later."
          />
        ) : (
          <>
            <FilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              options={filterOptions}
            >
              <button
                onClick={() => setViewMode('grid')}
                className="btn"
                style={{
                  padding: '0.4rem 0.8rem', fontSize: '0.8rem',
                  background: viewMode === 'grid' ? 'var(--accent-green)' : 'transparent',
                  color: viewMode === 'grid' ? '#000' : 'var(--text-main)',
                  border: '1px solid var(--accent-green)'
                }}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="btn"
                style={{
                  padding: '0.4rem 0.8rem', fontSize: '0.8rem',
                  background: viewMode === 'list' ? 'var(--accent-green)' : 'transparent',
                  color: viewMode === 'list' ? '#000' : 'var(--text-main)',
                  border: '1px solid var(--accent-green)'
                }}
              >
                List
              </button>
            </FilterBar>

            {players.length === 0 ? (
              <EmptyState
                title="No Players Yet"
                description="Players will appear here once they are registered by the admin."
              />
            ) : filteredPlayers.length === 0 ? (
              <EmptyState
                title="No Players Found"
                description="No players match the selected filters. Try adjusting your criteria."
              />
            ) : (
              <>
                <div style={{
                  display: viewMode === 'grid' ? 'grid' : 'flex',
                  flexDirection: viewMode === 'grid' ? 'unset' : 'column',
                  gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'unset',
                  gap: viewMode === 'grid' ? '2rem' : '1rem'
                }}>
                  {paginatedPlayers.map(player => (
                    <PlayerCard key={player.id} player={player} viewMode={viewMode} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem', gap: '1rem', alignItems: 'center' }}>
                    <button
                      className="btn btn-outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      Previous
                    </button>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>
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
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default PlayersPage;
