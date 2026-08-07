import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getOptimizedImageUrl } from '../services/cloudinary';

const PlayerCard = ({ player, viewMode = 'grid' }) => {
  const location = useLocation();
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${player.first_name}+${player.last_name}&background=1e293b&color=39ff14&size=256`;

  if (viewMode === 'list') {
    return (
      <Link to={`/player/${player.id}`} state={{ from: location.pathname }} className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', transition: 'all 0.3s', textDecoration: 'none' }}>
        {player.player_number != null && (
          <div style={{ minWidth: '42px', height: '42px', borderRadius: '8px', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', flexShrink: 0 }}>
            #{player.player_number}
          </div>
        )}
        <img
          src={getOptimizedImageUrl(player.photo_url, 150) || fallbackAvatar}
          alt={player.first_name}
          onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar; }}
          style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)', backgroundColor: '#0f172a' }}
        />

        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{player.first_name} {player.last_name}</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-block', backgroundColor: 'var(--accent-green)', color: '#000', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                {player.player_role?.toUpperCase() || 'PLAYER'}
              </span>
              {player.is_captain && (
                <span style={{ display: 'inline-block', backgroundColor: 'var(--accent-gold)', color: '#000', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  👑 CAPTAIN
                </span>
              )}
              {player.is_icon && (
                <span style={{ display: 'inline-block', backgroundColor: 'var(--accent-gold)', color: '#000', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  ICON
                </span>
              )}
              {player.is_owner && (
                <span style={{ display: 'inline-block', backgroundColor: 'var(--accent-green)', color: '#000', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  OWNER
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', textAlign: 'center', alignItems: 'center' }}>
            {player.sold_price > 0 && (
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', textTransform: 'uppercase', fontWeight: 'bold' }}>Sold Price</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>₹{player.sold_price?.toLocaleString()}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Batting</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{player.batting_style || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bowling</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{player.bowling_style || 'N/A'}</div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/player/${player.id}`} state={{ from: location.pathname }} className="glass-panel render-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', textDecoration: 'none' }}>
      {/* Player Number Badge */}
      {player.player_number != null && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--accent-gold)', color: '#000', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 10, letterSpacing: '0.05em' }}>
          #{player.player_number}
        </div>
      )}

      {/* CAPTAIN Badge */}
      {player.is_captain && (
        <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--accent-gold)', color: '#000', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 10, letterSpacing: '0.05em' }}>
          👑 CAPTAIN
        </div>
      )}

      {/* ICON Badge */}
      {player.is_icon && (
        <div style={{ position: 'absolute', top: '10px', left: player.is_captain ? '105px' : '10px', background: 'var(--accent-gold)', color: '#000', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 10, letterSpacing: '0.05em' }}>
          ICON
        </div>
      )}

      {/* OWNER Badge */}
      {player.is_owner && (
        <div style={{ position: 'absolute', top: '10px', left: (player.is_captain && player.is_icon) ? '165px' : (player.is_captain || player.is_icon) ? '105px' : '10px', background: 'var(--accent-green)', color: '#000', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 10, letterSpacing: '0.05em' }}>
          OWNER
        </div>
      )}

      {/* Image Section */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '100%', backgroundColor: '#0f172a' }}>
        <img
          src={getOptimizedImageUrl(player.photo_url, 300) || fallbackAvatar}
          alt={`${player.first_name} ${player.last_name}`}
          onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar; }}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
        />
        {/* Gradient Overlay for text */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}></div>

        {/* Name on image */}
        <div style={{ position: 'absolute', bottom: '10px', left: '15px', right: '15px' }}>
          <h3 style={{ fontSize: '1.4rem', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {player.first_name} {player.last_name}
          </h3>
          <p style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '0.9rem', margin: 0 }}>
            {player.player_role}
          </p>
        </div>
      </div>

      {/* Details Section */}
      <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="flex justify-between" style={{ fontSize: '0.9rem' }}>
            <span className="text-muted">Batting</span>
            <span style={{ fontWeight: 500 }}>{player.batting_style || 'N/A'}</span>
          </div>
          <div className="flex justify-between" style={{ fontSize: '0.9rem' }}>
            <span className="text-muted">Bowling</span>
            <span style={{ fontWeight: 500 }}>{player.bowling_style || 'N/A'}</span>
          </div>
        </div>

        {player.sold_price > 0 && (
          <div className="flex justify-between" style={{ fontSize: '0.9rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Sold Price</span>
            <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>₹{player.sold_price?.toLocaleString()}</span>
          </div>
        )}
      </div>

      <style>{`
        .render-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .render-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-neon);
          border-color: rgba(57, 255, 20, 0.3);
        }
      `}</style>
    </Link>
  );
};

export default PlayerCard;
