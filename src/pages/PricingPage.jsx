import React from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { PRICING_CONFIG, PLANS } from '../config/plans';
import { Sparkles, MessageCircle, Phone, Clock, User, ShieldCheck, CheckCircle } from 'lucide-react';

const PricingPage = () => {
  const contactName = "Ronak Patel";
  const contactPhone = "7567924142";
  const whatsappUrl = `https://api.whatsapp.com/send?phone=91${contactPhone}&text=${encodeURIComponent("Hi Ronak Patel! I would like to inquire about the Cricket Auction Platform plans and pricing.")}`;

  return (
    <div className="flex-col min-h-screen" style={{ background: 'var(--bg-gradient)', color: 'var(--text-main)' }}>
      <div className="spotlight"></div>
      <PageHeader title="PLANS & PRICING" subtitle="Custom Cricket Auction Solutions & Premier Tournament Setup" showLogos={false} />

      <main className="container-fluid" style={{ flex: 1, padding: '2rem 1.5rem 5rem', zIndex: 1, position: 'relative', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <Link to="/" className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            ← Return Home
          </Link>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold' }}>
              Register Player
            </Link>
          </div>
        </div>

        {/* Coming Soon Hero Banner */}
        <div className="glass-panel" style={{
          textAlign: 'center',
          maxWidth: '900px',
          margin: '0 auto 3.5rem',
          padding: '3.5rem 2rem',
          borderRadius: '20px',
          border: '1px solid var(--accent-gold)',
          background: 'linear-gradient(180deg, rgba(255,215,0,0.08) 0%, rgba(15,23,42,0.9) 100%)',
          boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,215,0,0.15)',
            border: '1px solid var(--accent-gold)',
            color: 'var(--accent-gold)',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            padding: '0.3rem 0.8rem',
            borderRadius: '20px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Clock size={14} /> COMING SOON
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.3)', padding: '0.4rem 1.2rem', borderRadius: '30px', color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            <Sparkles size={16} /> NEW PACKAGES IN DEVELOPMENT
          </div>

          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontFamily: 'var(--font-heading)', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', lineHeight: 1.15 }}>
            New Automated Plans <span style={{ color: 'var(--accent-gold)' }}>Coming Soon!</span>
          </h1>

          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '720px', margin: '0 auto 2.5rem' }}>
            We are upgrading our self-serve tier pricing for cricket leagues of all sizes. For instant setup, custom tournament quotes, live auction software, and team purse management, contact us directly!
          </p>

          {/* Contact Details Highlight Box */}
          <div style={{
            background: 'rgba(15,23,42,0.85)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '650px',
            margin: '0 auto',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '0.9rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
              <User size={18} /> DIRECT TOURNAMENT SUPPORT
            </div>

            <h2 style={{ fontSize: '1.8rem', color: '#fff', margin: '0 0 0.4rem 0', fontWeight: 'bold' }}>
              {contactName}
            </h2>

            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-green)', fontFamily: 'monospace', marginBottom: '1.5rem' }}>
              📞 {contactPhone}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  padding: '0.8rem 1.8rem',
                  fontSize: '0.95rem',
                  background: '#25D366',
                  color: '#fff',
                  fontWeight: 'bold',
                  borderColor: '#25D366',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '8px',
                  boxShadow: '0 4px 15px rgba(37,211,102,0.3)'
                }}
              >
                <MessageCircle size={18} /> WhatsApp Ronak Patel
              </a>

              <a
                href={`tel:${contactPhone}`}
                className="btn btn-outline"
                style={{
                  padding: '0.8rem 1.8rem',
                  fontSize: '0.95rem',
                  color: 'var(--accent-gold)',
                  borderColor: 'var(--accent-gold)',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '8px'
                }}
              >
                <Phone size={18} /> Call {contactPhone}
              </a>
            </div>
          </div>
        </div>

        {/* Coming Soon Plan Teasers */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', color: '#fff', textTransform: 'uppercase', margin: 0 }}>
            Upcoming Tournament Tiers
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.4rem' }}>Flexible options designed for local matches to grand premier leagues</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className="glass-panel"
              style={{
                padding: '2.2rem 1.8rem',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(15,23,42,0.6)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,215,0,0.15)',
                color: 'var(--accent-gold)',
                fontSize: '0.68rem',
                fontWeight: 'bold',
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
                textTransform: 'uppercase',
                border: '1px solid rgba(255,215,0,0.3)'
              }}>
                COMING SOON
              </div>

              <h3 style={{ fontSize: '1.4rem', color: '#fff', margin: '0 0 0.5rem 0', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
                {plan.name}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', minHeight: '38px' }}>
                {plan.tagline}
              </p>

              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 'bold', marginBottom: '0.3rem' }}>INCLUDED CAPACITY:</div>
                <div style={{ fontSize: '0.85rem', color: '#fff' }}>• {plan.limits.teams}</div>
                <div style={{ fontSize: '0.85rem', color: '#fff' }}>• {plan.limits.players}</div>
              </div>

              <div style={{ marginTop: 'auto' }}>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    borderColor: 'var(--accent-gold)',
                    color: 'var(--accent-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    borderRadius: '8px'
                  }}
                >
                  <MessageCircle size={16} /> Contact Ronak for Quotes
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Feature List Overview */}
        <div className="glass-panel" style={{ padding: '2.5rem 2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--accent-gold)', margin: 0, fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
              All Platform Capabilities
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.3rem' }}>Included with custom tournament setup & manager onboarding</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <CheckCircle size={20} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#fff', display: 'block', fontSize: '0.95rem' }}>Live Bidding Dashboard</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Instant 0ms live bidding control with sound FX</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <CheckCircle size={20} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#fff', display: 'block', fontSize: '0.95rem' }}>TV Projector Screen View</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Full HD projector screens with live bid animations</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <CheckCircle size={20} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#fff', display: 'block', fontSize: '0.95rem' }}>Public & Private Registrations</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>1-click links for public & invite code player registration</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <CheckCircle size={20} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#fff', display: 'block', fontSize: '0.95rem' }}>Sponsor Skins & Logos</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Display sponsor branding on live screens & squad PDFs</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <CheckCircle size={20} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#fff', display: 'block', fontSize: '0.95rem' }}>WhatsApp PDF Squad Sharing</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Generate squad lists & T-Shirt vendor PDF order sheets</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <CheckCircle size={20} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#fff', display: 'block', fontSize: '0.95rem' }}>Direct Owner Contacts</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>WhatsApp owner & player contact phone numbers</span>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default PricingPage;
