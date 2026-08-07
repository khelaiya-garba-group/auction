import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Loader } from '../components/Loader';
import {
  Trophy,
  Users,
  Tv,
  Activity,
  TrendingUp,
  UserCheck,
  Calendar,
  MapPin,
  ArrowRight,
  Lock,
  Menu,
  X,
  Search
} from 'lucide-react';
import heroImg from '../assets/hero.png';

const LandingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const auctionCodeParam = searchParams.get('code');
  const [inputCode, setInputCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const [auction, setAuction] = useState(null);
  const [allAuctions, setAllAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        setLoading(true);
        setCodeError('');
        if (auctionCodeParam) {
          const { data, error } = await supabase
            .from('auctions')
            .select('*')
            .eq('auction_code', auctionCodeParam)
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            setCodeError(`No tournament found with code "${auctionCodeParam}"`);
          }
          setAuction(data || null);
        } else {
          setAuction(null);
          const { data, error } = await supabase
            .from('auctions')
            .select('*')
            .neq('status', 'draft')
            .order('created_at', { ascending: false });

          if (error) throw error;
          setAllAuctions(data || []);
        }
      } catch (err) {
        console.error("Error fetching auctions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuctions();
  }, [auctionCodeParam]);

  const handleVerifyCodeSubmit = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setSearchParams({ code: inputCode.trim().toUpperCase() });
  };

  const handleClearSelected = () => {
    setSearchParams({});
    setInputCode('');
  };

  if (loading) return <Loader message="LOADING AUCTION DETAILS..." />;

  // Dynamic Navigation URLs that preserve code parameter
  const getNavUrl = (basePath) => {
    return auctionCodeParam ? `${basePath}?code=${auctionCodeParam}` : basePath;
  };

  return (
    <div className="landing-page">
      <div className="landing-radial-bg"></div>

      {/* Sticky Glassmorphic Navbar */}
      <nav className="landing-navbar">
        <div className="landing-navbar-container">
          <Link to="/" className="landing-logo" onClick={handleClearSelected}>
            <Trophy style={{ color: 'var(--accent-gold)' }} size={24} />
            <span>CRICKET AUCTION PANEL</span>
            <span className="landing-logo-badge">PRO</span>
          </Link>

          <div className="landing-nav-links">
            <Link to="/" className="landing-nav-link active" onClick={handleClearSelected}>Home</Link>
            <Link to={getNavUrl("/all-players")} className="landing-nav-link">Players</Link>
            <Link to={getNavUrl("/teams")} className="landing-nav-link">Teams</Link>
            <Link to={getNavUrl("/stats")} className="landing-nav-link">Stats</Link>
            <Link to={getNavUrl("/register")} className="landing-nav-link">Register</Link>
            <Link to={getNavUrl("/admin")} className="landing-nav-cta">
              <Lock size={14} /> Admin Portal
            </Link>
          </div>

          <div className="landing-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu">
            <Link to="/" className="landing-nav-link active" onClick={() => { setMobileMenuOpen(false); handleClearSelected(); }}>Home</Link>
            <Link to={getNavUrl("/all-players")} className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}>Players</Link>
            <Link to={getNavUrl("/teams")} className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}>Teams</Link>
            <Link to={getNavUrl("/stats")} className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}>Stats</Link>
            <Link to={getNavUrl("/register")} className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}>Register</Link>
            <Link to={getNavUrl("/admin")} className="landing-nav-cta" style={{ justifyContent: 'center' }} onClick={() => setMobileMenuOpen(false)}>
              <Lock size={14} /> Admin Portal
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header className="landing-hero-section">
        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <Activity size={14} /> Ultimate Cricket Auction Panel
          </div>
          <h1 className="landing-hero-title">
            ELEVATE YOUR LEAGUE WITH <span className="landing-gradient-text">IPL-STYLE AUCTIONS</span>
          </h1>
          <p className="landing-hero-desc">
            Organize, run, and broadcast professional-grade cricket player auctions. Host real-time bidding, track team purses instantly, manage player registrations with KYC verification, and showcase a dynamic live screen for your audience.
          </p>
          <div className="landing-hero-ctas">
            <Link to={getNavUrl("/register")} className="landing-btn-glow">
              Register Player <ArrowRight size={16} />
            </Link>
            <Link to={getNavUrl("/live-auction-projector")} className="landing-btn-outline">
              Live Projector View <Tv size={16} />
            </Link>
          </div>

          <div className="landing-hero-stats">
            <div className="landing-stat-item">
              <span className="landing-stat-value">500+</span>
              <span className="landing-stat-label">Players Registered</span>
            </div>
            <div className="landing-stat-item">
              <span className="landing-stat-value">12+</span>
              <span className="landing-stat-label">Active Teams</span>
            </div>
            <div className="landing-stat-item">
              <span className="landing-stat-value landing-stat-value-highlight">₹1.5M+</span>
              <span className="landing-stat-label">Purse Tracked</span>
            </div>
          </div>
        </div>

        <div className="landing-hero-visual-container">
          <div className="landing-mockup-wrapper">
            <img src={heroImg} alt="Cricket Stadium Spotlight Dashboard" className="landing-mockup-img" />
            <div className="landing-mockup-glow"></div>
          </div>
        </div>
      </header>

      {/* Active Tournament Spotlight / Search Section */}
      <div className="landing-section-divider"></div>
      <section className="landing-spotlight-section" id="tournaments">
        <div className="landing-section-subtitle">TOURNAMENT COMPASS</div>
        <h2 className="landing-section-title">FIND YOUR LEAGUE</h2>

        {/* Enter Code form */}
        <div style={{ maxWidth: '500px', margin: '0 auto 3rem', padding: '0 1rem' }}>
          <form onSubmit={handleVerifyCodeSubmit} style={{ display: 'flex', gap: '0.5rem', width: '100%', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <input
              type="text"
              value={inputCode}
              onChange={e => setInputCode(e.target.value)}
              placeholder="ENTER TOURNAMENT CODE (e.g. IPL26)"
              style={{ flex: 1, border: 'none', background: 'transparent', color: '#fff', padding: '0.6rem 1rem', fontSize: '0.9rem', outline: 'none', textTransform: 'uppercase' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold' }}>
              <Search size={16} />
            </button>
          </form>
          {codeError && (
            <div style={{ color: '#ff4444', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 'bold' }}>
              ⚠️ {codeError}
            </div>
          )}
        </div>

        {auction ? (
          /* Spotlight for a single selected auction */
          <div>
            <div className="landing-active-auction-card">
              <div className={`landing-auction-badge-status ${auction.status === 'running' ? 'landing-badge-running' : auction.status === 'registration_open' ? 'landing-badge-open' : 'landing-badge-open'}`} style={{ backgroundColor: auction.status === 'completed' ? 'rgba(255,255,255,0.1)' : '', color: auction.status === 'completed' ? '#fff' : '' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }}></span>
                {auction.status === 'running' ? '🔴 Bidding Live' : auction.status === 'registration_open' ? '🟢 Registration Open' : '⚪ Completed'}
              </div>

              {auction.auction_logo ? (
                <img src={auction.auction_logo} alt={auction.auction_name} className="landing-auction-logo" />
              ) : (
                <div className="landing-auction-logo-placeholder">CAP</div>
              )}

              <div className="landing-auction-details">
                <h3 className="landing-auction-name">{auction.auction_name}</h3>
                <div className="landing-auction-meta-list">
                  <div className="landing-meta-item">
                    <span style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '0.85rem' }}>CODE: {auction.auction_code}</span>
                  </div>
                  {auction.auction_date && (
                    <div className="landing-meta-item">
                      <Calendar size={16} style={{ color: 'var(--accent-gold)' }} />
                      <span>{new Date(auction.auction_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {auction.venue && (
                    <div className="landing-meta-item">
                      <MapPin size={16} style={{ color: 'var(--accent-gold)' }} />
                      <span>{auction.venue}</span>
                    </div>
                  )}
                </div>

                <div className="landing-auction-cta-row">
                  {auction.status === 'registration_open' && (
                    <Link to={`/register?code=${auction.auction_code}`} className="landing-btn-glow" style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem' }}>
                      Register as Player <ArrowRight size={14} />
                    </Link>
                  )}
                  {auction.status === 'running' && (
                    <Link to={`/live-auction-projector?code=${auction.auction_code}`} className="landing-btn-glow" style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem' }}>
                      Enter Live Stadium <Tv size={14} />
                    </Link>
                  )}
                  <Link to={`/teams?code=${auction.auction_code}`} className="landing-btn-outline" style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem' }}>
                    View Squads <Users size={14} />
                  </Link>
                  <Link to={`/stats?code=${auction.auction_code}`} className="landing-btn-outline" style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}>
                    View Stats <TrendingUp size={14} />
                  </Link>
                </div>
              </div>
            </div>

            <button onClick={handleClearSelected} className="btn btn-outline" style={{ marginTop: '2rem', fontSize: '0.9rem', padding: '0.5rem 1.5rem' }}>
              ← View All Tournaments
            </button>
          </div>
        ) : (
          /* List of all active/completed auctions */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem', padding: '0 1rem' }}>
            {allAuctions.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem', gridColumn: '1 / -1', textAlign: 'center' }}>
                <p className="text-muted" style={{ margin: 0 }}>No active or running tournaments at the moment.</p>
              </div>
            ) : (
              allAuctions.map(a => (
                <div key={a.id} className="landing-feature-card" style={{ textAlign: 'left', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase',
                      background: a.status === 'running' ? 'rgba(239, 68, 68, 0.15)' : a.status === 'registration_open' ? 'rgba(57, 255, 20, 0.15)' : 'rgba(255,255,255,0.06)',
                      color: a.status === 'running' ? '#f87171' : a.status === 'registration_open' ? 'var(--accent-green)' : 'var(--text-muted)'
                    }}>
                      {a.status === 'running' ? '🔴 Live Bidding' : a.status === 'registration_open' ? '🟢 Registration Open' : '⚪ Completed'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>CODE: {a.auction_code}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                    {a.auction_logo ? (
                      <img src={a.auction_logo} alt={a.auction_name} style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', background: 'rgba(255,255,255,0.05)' }} />
                    ) : (
                      <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'var(--accent-gold)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>CAP</div>
                    )}
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>{a.auction_name}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {a.venue ? `📍 ${a.venue}` : 'Venue TBA'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    {a.status === 'registration_open' ? (
                      <Link to={`/register?code=${a.auction_code}`} className="btn" style={{ padding: '0.4rem 0.8rem', background: 'var(--accent-green)', color: '#000', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px' }}>
                        Register
                      </Link>
                    ) : null}

                    {a.status === 'running' ? (
                      <Link to={`/live-auction-projector?code=${a.auction_code}`} className="btn" style={{ padding: '0.4rem 0.8rem', background: '#3b82f6', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px' }}>
                        Watch Live
                      </Link>
                    ) : null}

                    <Link to={`/teams?code=${a.auction_code}`} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '4px' }}>
                      Squads
                    </Link>

                    <Link to={`/stats?code=${a.auction_code}`} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '4px' }}>
                      Stats
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Features Grid Section */}
      <div className="landing-section-divider"></div>
      <section className="landing-features-section">
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div className="landing-section-subtitle">PLATFORM FEATURES</div>
          <h2 className="landing-section-title" style={{ margin: 0 }}>POWERED BY ADVANCED BIDDING TOOLS</h2>
        </div>

        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon-wrapper">
              <Activity size={24} />
            </div>
            <h3 className="landing-feature-title">Real-Time Bidding Engine</h3>
            <p className="landing-feature-desc">
              Experience zero-latency live bidding. Automatically update team purse sizes, track bid histories, and deduct available funds instantly.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon-wrapper">
              <Tv size={24} />
            </div>
            <h3 className="landing-feature-title">Interactive Projector Display</h3>
            <p className="landing-feature-desc">
              Broadcast clean, television-grade live bidding overlay panels on a projector screen for viewers, owners, and attendees.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon-wrapper">
              <UserCheck size={24} />
            </div>
            <h3 className="landing-feature-title">KYC Player Onboarding</h3>
            <p className="landing-feature-desc">
              Self-serve registration forms allow players to submit skill roles (batter, bowler, all-rounder), photos, batting styles, and payment details.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon-wrapper">
              <Users size={24} />
            </div>
            <h3 className="landing-feature-title">Team Purse & Squad Limits</h3>
            <p className="landing-feature-desc">
              Admins configure purse sizes, squad counts, and baseline player prices. Bidding validation safeguards against budget violations.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon-wrapper">
              <TrendingUp size={24} />
            </div>
            <h3 className="landing-feature-title">Interactive Squad Analytics</h3>
            <p className="landing-feature-desc">
              Track individual player performance, bidding valuations, base versus final buy spreads, and categorical stats.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon-wrapper">
              <Trophy size={24} />
            </div>
            <h3 className="landing-feature-title">Unified Tournament Center</h3>
            <p className="landing-feature-desc">
              Admins exercise total control from a single interface to manage players, undo faulty entries, edit base limits, and finalize teams.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <div className="landing-section-divider"></div>
      <section className="landing-steps-section">
        <div className="landing-section-subtitle">THE PROCESS</div>
        <h2 className="landing-section-title">HOW IT WORKS</h2>

        <div className="landing-steps-grid">
          <div className="landing-step-card">
            <div className="landing-step-number">01</div>
            <h3 className="landing-step-title">Register Players</h3>
            <p className="landing-step-desc">
              Players fill out the registration form, upload photo assets, select capabilities, and confirm registration payments.
            </p>
          </div>

          <div className="landing-step-card">
            <div className="landing-step-number">02</div>
            <h3 className="landing-step-title">Admin Approval</h3>
            <p className="landing-step-desc">
              Organizers review player profiles, confirm registration payments, and assign base bidding tiers.
            </p>
          </div>

          <div className="landing-step-card">
            <div className="landing-step-number">03</div>
            <h3 className="landing-step-title">Bidding Live</h3>
            <p className="landing-step-desc">
              Start the live bidding panel, mirror the projector display, and allow franchise teams to build their squads.
            </p>
          </div>

          <div className="landing-step-card">
            <div className="landing-step-number">04</div>
            <h3 className="landing-step-title">Play Tournament</h3>
            <p className="landing-step-desc">
              Finalize team squads, review team compositions, export squad reports, and initiate the tournament!
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <div className="landing-section-divider"></div>
      <section className="landing-testimonials-section">
        <div className="landing-section-subtitle">TESTIMONIALS</div>
        <h2 className="landing-section-title">TRUSTED BY LEAGUE ORGANIZERS</h2>

        <div className="landing-testimonials-grid">
          <div className="landing-testimonial-card">
            <p className="landing-testimonial-quote">
              "We hosted our annual city league with 180 registered players using CAP. The live projector screen was absolute magic. It made our local club cricket match feel like the IPL. The real-time purse math saved us hours of stress!"
            </p>
            <div className="landing-testimonial-author">
              <div className="landing-author-avatar">AM</div>
              <div className="landing-author-info">
                <span className="landing-author-name">Amit Mishra</span>
                <span className="landing-author-role">Chairman, Premier City League</span>
              </div>
            </div>
          </div>

          <div className="landing-testimonial-card">
            <p className="landing-testimonial-quote">
              "Player self-registration was incredibly smooth. Having them upload their photo, batting style, and pay verification QR code automatically on the site saved us from managing endless spreadsheets. Strongly recommended!"
            </p>
            <div className="landing-testimonial-author">
              <div className="landing-author-avatar">RP</div>
              <div className="landing-author-info">
                <span className="landing-author-name">Rohan Patel</span>
                <span className="landing-author-role">Organizer, Corporate Cricket Bash</span>
              </div>
            </div>
          </div>

          <div className="landing-testimonial-card">
            <p className="landing-testimonial-quote">
              "The ability to immediately undo bidding errors and inspect team purse counts kept all 8 franchise owners happy and aligned. Broadcast layouts look sleek, high contrast, and look perfect on large displays."
            </p>
            <div className="landing-testimonial-author">
              <div className="landing-author-avatar">SK</div>
              <div className="landing-author-info">
                <span className="landing-author-name">Sanjay Kumar</span>
                <span className="landing-author-role">Director, Winter T20 Trophy</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Call to Action */}
      <div className="landing-section-divider"></div>
      <section className="landing-cta-section">
        <div className="landing-cta-box">
          <div className="landing-cta-icon">🏆</div>
          <h2 className="landing-cta-title">READY TO HOST YOUR AUCTION?</h2>
          <p className="landing-cta-desc">
            Access the administrator panel to configure auctions, authorize new player signups, build team squads, and manage live auction operations.
          </p>
          <Link to="/admin" className="landing-btn-glow">
            Access Admin Console <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <div className="landing-section-divider"></div>
      <section className="landing-contact-section" style={{ padding: '4rem 1rem 6rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#fff', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="landing-section-subtitle" style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 'bold' }}>Support & Queries</div>
        <h2 className="landing-section-title" style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 1.5rem 0' }}>CONTACT US</h2>
        <div className="glass-panel" style={{ padding: '2.5rem 2rem', maxWidth: '500px', width: '100%', border: '1px solid rgba(255,215,0,0.25)', borderRadius: '16px', background: 'rgba(10,15,29,0.6)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
          <h3 style={{ color: 'var(--accent-gold)', margin: '0 0 0.4rem 0', fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>Ronak Patel</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 2rem 0', fontSize: '0.9rem', fontWeight: 500 }}>Tournament Organizer & Support Helpline</p>
          <a href="tel:7567924142" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', color: '#000', backgroundColor: 'var(--accent-gold)', padding: '0.8rem 2rem', borderRadius: '50px', fontWeight: '800', fontSize: '1.05rem', boxShadow: '0 4px 15px rgba(255,215,0,0.3)', transition: 'all 0.2s ease-in-out' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            📞 Call: +91 7567924142
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="landing-footer-brand">
            <span className="landing-footer-logo">CRICKET AUCTION PANEL</span>
            <span className="landing-footer-copy">© {new Date().getFullYear()} CAP. All rights reserved.</span>
          </div>

          <div className="landing-footer-links">
            <Link to={getNavUrl("/all-players")} className="landing-footer-link">Players</Link>
            <Link to={getNavUrl("/teams")} className="landing-footer-link">Teams</Link>
            <Link to={getNavUrl("/stats")} className="landing-footer-link">Stats</Link>
            <Link to={getNavUrl("/register")} className="landing-footer-link">Register</Link>
            <Link to={getNavUrl("/admin")} className="landing-footer-link">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
