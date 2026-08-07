import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import FilterBar from '../components/FilterBar';
import PlayerCard from '../components/PlayerCard';

const PublicPlayersPage = () => {
    const [searchParams] = useSearchParams();
    const auctionCode = searchParams.get('code');
    const [allAuctions, setAllAuctions] = useState([]);

    const [activeAuction, setActiveAuction] = useState(null);
    const [players, setPlayers] = useState([]);
    const [filteredPlayers, setFilteredPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const playersPerPage = 20;

    const [filters, setFilters] = useState({
        player_role: '',
        batting_style: '',
        bowling_style: ''
    });

    const filterOptions = {
        player_role: ['Batter', 'Bowler', 'All Rounder', 'Wicket Keeper'],
        batting_style: ['Right Hand', 'Left Hand'],
        bowling_style: ['Right Arm Fast', 'Right Arm Medium', 'Right Arm Spin', 'Left Arm Fast', 'Left Arm Spin', 'None']
    };

    useEffect(() => {
        const fetchPublicData = async () => {
            try {
                setLoading(true);
                if (auctionCode) {
                    const { data: auctionData, error: auctionError } = await supabase
                        .from('auctions')
                        .select('id, auction_name, auction_logo, auction_date, venue')
                        .eq('auction_code', auctionCode)
                        .maybeSingle();

                    if (auctionError) throw auctionError;
                    setActiveAuction(auctionData);

                    if (auctionData) {
                        const { data: apData, error: apError } = await supabase
                            .from('auction_players')
                            .select('player_id, player_number, approval_status, is_captain, is_icon, is_owner, sold_price, auction_status')
                            .eq('auction_id', auctionData.id)
                            .neq('approval_status', 'rejected'); 

                        if (apError) throw apError;

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
                                    is_owner: ap.is_owner,
                                    sold_price: ap.sold_price,
                                    auction_status: ap.auction_status
                                };
                            });

                            const mergedPlayers = (pData || []).map(p => ({
                                ...p,
                                player_number: apMap[p.id]?.player_number ?? null,
                                is_captain: apMap[p.id]?.is_captain ?? false,
                                is_icon: apMap[p.id]?.is_icon ?? false,
                                is_owner: apMap[p.id]?.is_owner ?? false,
                                sold_price: apMap[p.id]?.sold_price ?? 0,
                                auction_status: apMap[p.id]?.auction_status ?? null
                            })).sort((a, b) => (a.player_number ?? 9999) - (b.player_number ?? 9999));

                            setPlayers(mergedPlayers);
                            applyFilters(mergedPlayers, filters, searchTerm);
                        } else {
                            setPlayers([]);
                            setFilteredPlayers([]);
                        }
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
                console.error("Error fetching public players:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchPublicData();
    }, [auctionCode]);

    const applyFilters = (allPlayers, currentFilters, currentSearch) => {
        let result = [...allPlayers];

        // Apply dropdown filters
        Object.keys(currentFilters).forEach(k => {
            if (currentFilters[k]) {
                result = result.filter(p => p[k] === currentFilters[k]);
            }
        });

        // Apply text search (name, area, and number)
        if (currentSearch) {
            const lowSearch = currentSearch.toLowerCase();
            result = result.filter(p => 
                `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(lowSearch) ||
                (p.area && p.area.toLowerCase().includes(lowSearch)) ||
                (p.player_number && p.player_number.toString().includes(currentSearch))
            );
        }

        setFilteredPlayers(result);
        setCurrentPage(1);
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        applyFilters(players, newFilters, searchTerm);
    };

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        applyFilters(players, filters, value);
    };

    if (loading) return <Loader message="LOADING ALL PLAYERS..." />;

    const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);
    const startIndex = (currentPage - 1) * playersPerPage;
    const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + playersPerPage);

    return (
        <div className="flex-col min-h-screen">
            <div className="spotlight"></div>
            <PageHeader
                title="Registered Players"
                subtitle={activeAuction ? `Players for ${activeAuction.auction_name}` : ''}
                showLogos={true}
            />

            <main className="container" style={{ flex: 1, padding: '2rem 1rem 4rem', zIndex: 1, position: 'relative' }}>
                {!activeAuction ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>Select Tournament to View Players</h3>
                            <p className="text-muted" style={{ marginBottom: 0 }}>Please select a tournament from the list below to view its registered players.</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            {allAuctions.length === 0 ? (
                                <div className="glass-panel" style={{ padding: '3rem', gridColumn: '1 / -1', textAlign: 'center' }}>
                                    <p className="text-muted" style={{ margin: 0 }}>No tournaments found.</p>
                                </div>
                            ) : (
                                allAuctions.map(a => (
                                    <Link key={a.id} to={`/all-players?code=${a.auction_code}`} className="glass-panel render-card" style={{ padding: '2rem 1.5rem', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--glass-border)' }}>
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
                                            View Players →
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Custom Search & Filter Area */}
                        <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ flex: '1', minWidth: '280px' }}>
                                    <input
                                        type="text"
                                        placeholder="Search by name, area or number..."
                                        value={searchTerm}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        className="form-input"
                                        style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className="btn"
                                        style={{
                                            padding: '0.6rem 1rem', fontSize: '0.85rem',
                                            background: viewMode === 'grid' ? 'var(--accent-green)' : 'transparent',
                                            color: viewMode === 'grid' ? '#000' : 'var(--text-main)',
                                            border: '1px solid var(--accent-green)',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Grid
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className="btn"
                                        style={{
                                            padding: '0.6rem 1rem', fontSize: '0.85rem',
                                            background: viewMode === 'list' ? 'var(--accent-green)' : 'transparent',
                                            color: viewMode === 'list' ? '#000' : 'var(--text-main)',
                                            border: '1px solid var(--accent-green)',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        List
                                    </button>
                                </div>
                            </div>

                            {/* Dropdown Filters using the same style as FilterBar */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-green)', letterSpacing: '1px', textTransform: 'uppercase' }}>Filter By:</h3>
                                {Object.entries(filterOptions).map(([key, list]) => (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <select 
                                            className="form-select"
                                            value={filters[key] || ''}
                                            onChange={(e) => handleFilterChange(key, e.target.value)}
                                            style={{ width: 'auto', minWidth: '150px', padding: '0.4rem 1rem' }}
                                        >
                                            <option value="">{key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} (All)</option>
                                            {list.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {players.length === 0 ? (
                            <EmptyState
                                title="No Players Registered"
                                description="Players will appear here once they are registered and approved."
                            />
                        ) : filteredPlayers.length === 0 ? (
                            <EmptyState
                                title="No Matching Players"
                                description="Try adjusting your search or filters to find what you're looking for."
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
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', background: 'var(--glass-bg)', padding: '0.4rem 1rem', borderRadius: '4px' }}>
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

export default PublicPlayersPage;
