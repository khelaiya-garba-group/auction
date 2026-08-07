import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { PLANS, PRICING_CONFIG, FEATURE_MATRIX } from '../config/plans';
import { Check, X, Shield, Sparkles, MessageCircle, HelpCircle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

const PricingPage = () => {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan.id);
    const text = `Hi! I would like to inquire about the *${plan.name}* (₹${plan.price.amount} ${plan.price.period}) for my cricket tournament auction.`;
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${PRICING_CONFIG.contactWhatsAppNumber}&text=${encoded}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="flex-col min-h-screen" style={{ background: 'var(--bg-gradient)', color: 'var(--text-main)' }}>
      <div className="spotlight"></div>
      <PageHeader title="Plans & Feature Pricing" subtitle="Choose the perfect tier for your cricket tournament auction" showLogos={false} />

      <main className="container-fluid" style={{ flex: 1, padding: '2rem 1.5rem 5rem', zIndex: 1, position: 'relative', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
          <Link to="/" className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            ← Return Home
          </Link>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link to="/admin" className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              Admin Dashboard
            </Link>
            <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', background: 'var(--accent-gold)' }}>
              Register Player
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <div style={{ textAlign: 'center', maxWidth: '850px', margin: '0 auto 4rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', padding: '0.4rem 1rem', borderRadius: '30px', color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            <Sparkles size={16} /> POWERFUL CRICKET AUCTION ENGINE
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontFamily: 'var(--font-heading)', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
            Transparent Pricing for <span style={{ color: 'var(--accent-gold)' }}>Every Tournament</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            From local community matches to grand televised premier leagues. Get live bidding overlays, public & private player registration links, sponsor skins, and direct WhatsApp PDF squad sharing!
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '5rem', alignItems: 'stretch' }}>
          {PLANS.map(plan => {
            const isPopular = plan.popular;
            return (
              <div
                key={plan.id}
                className="glass-panel render-card"
                style={{
                  padding: '2.5rem 2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '16px',
                  position: 'relative',
                  border: isPopular ? '2px solid var(--accent-gold)' : '1px solid var(--glass-border)',
                  background: isPopular ? 'linear-gradient(180deg, rgba(255,215,0,0.08) 0%, rgba(15,23,42,0.85) 100%)' : 'rgba(15,23,42,0.6)',
                  boxShadow: isPopular ? '0 12px 35px rgba(255,215,0,0.2)' : '0 8px 25px rgba(0,0,0,0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Popular Ribbon Badge */}
                {plan.badge && (
                  <div style={{
                    position: 'absolute',
                    top: '-14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: isPopular ? 'var(--accent-gold)' : 'var(--accent-green)',
                    color: '#000',
                    fontSize: '0.75rem',
                    fontWeight: '900',
                    padding: '0.25rem 1rem',
                    borderRadius: '20px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    {plan.badge}
                  </div>
                )}

                {/* Plan Header */}
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.6rem', color: isPopular ? 'var(--accent-gold)' : '#fff', margin: '0 0 0.5rem 0', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, minHeight: '40px' }}>
                    {plan.tagline}
                  </p>
                </div>

                {/* Price Display */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>₹</span>
                    <span style={{ fontSize: '3rem', fontWeight: '900', color: '#fff', fontFamily: 'var(--font-heading)' }}>{plan.price.amount}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {plan.price.period}</span>
                  </div>
                  {plan.price.originalAmount && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', fontSize: '0.8rem' }}>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>₹{plan.price.originalAmount}</span>
                      <span style={{ color: 'var(--accent-green)', fontWeight: 'bold', background: 'rgba(57,255,20,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        {plan.price.discountNote}
                      </span>
                    </div>
                  )}
                </div>

                {/* Limit Badges */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                  <span style={{ padding: '0.3rem 0.6rem', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff' }}>
                    🏟️ {plan.limits.teams}
                  </span>
                  <span style={{ padding: '0.3rem 0.6rem', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff' }}>
                    👥 {plan.limits.players}
                  </span>
                </div>

                {/* Feature List */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2.5rem' }}>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                      {feat.included ? (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(57,255,20,0.15)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={13} strokeWidth={3} />
                        </div>
                      ) : (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <X size={13} strokeWidth={2} />
                        </div>
                      )}
                      <span style={{
                        color: feat.included ? (feat.highlight ? 'var(--accent-gold)' : 'var(--text-main)') : 'var(--text-muted)',
                        fontWeight: feat.highlight ? 'bold' : 'normal',
                        textDecoration: feat.included ? 'none' : 'line-through'
                      }}>
                        {feat.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Action Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`btn ${isPopular ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    background: isPopular ? 'var(--accent-gold)' : 'transparent',
                    color: isPopular ? '#000' : 'var(--accent-gold)',
                    borderColor: 'var(--accent-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    boxShadow: isPopular ? '0 4px 15px rgba(255,215,0,0.3)' : 'none'
                  }}
                >
                  <MessageCircle size={18} /> {plan.ctaText}
                </button>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Matrix */}
        <div style={{ marginBottom: '5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
              Detailed Plan Feature Matrix
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Compare exact capabilities across all plans</p>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  <th style={{ padding: '1rem', color: '#fff', fontSize: '1rem', width: '35%' }}>Feature</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', width: '20%' }}>Starter League</th>
                  <th style={{ padding: '1rem', color: 'var(--accent-gold)', fontSize: '1rem', textAlign: 'center', width: '22%', fontWeight: 'bold' }}>Pro Tournament 👑</th>
                  <th style={{ padding: '1rem', color: 'var(--accent-green)', fontSize: '0.95rem', textAlign: 'center', width: '23%' }}>Grand Premier</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_MATRIX.map((cat, catIdx) => (
                  <React.Fragment key={catIdx}>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <td colSpan={4} style={{ padding: '0.8rem 1rem', color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {cat.category}
                      </td>
                    </tr>
                    {cat.items.map((item, itemIdx) => (
                      <tr key={itemIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>{item.name}</td>
                        
                        {/* Starter */}
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.85rem' }}>
                          {typeof item.starter === 'boolean' ? (
                            item.starter ? <Check size={16} color="var(--accent-green)" style={{ margin: '0 auto' }} /> : <X size={16} color="var(--text-muted)" style={{ margin: '0 auto' }} />
                          ) : item.starter}
                        </td>

                        {/* Pro */}
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>
                          {typeof item.pro === 'boolean' ? (
                            item.pro ? <Check size={16} color="var(--accent-green)" style={{ margin: '0 auto' }} /> : <X size={16} color="var(--text-muted)" style={{ margin: '0 auto' }} />
                          ) : item.pro}
                        </td>

                        {/* Enterprise */}
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                          {typeof item.enterprise === 'boolean' ? (
                            item.enterprise ? <Check size={16} color="var(--accent-green)" style={{ margin: '0 auto' }} /> : <X size={16} color="var(--text-muted)" style={{ margin: '0 auto' }} />
                          ) : item.enterprise}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div style={{ maxWidth: '900px', margin: '0 auto 4rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', color: '#fff', textTransform: 'uppercase' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Everything you need to know about plans and features</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {PRICING_CONFIG.faq.map((faq, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '1.2rem 1.5rem', borderRadius: '10px', cursor: 'pointer' }} onClick={() => toggleFaq(idx)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HelpCircle size={18} color="var(--accent-gold)" /> {faq.question}
                  </h4>
                  {openFaq === idx ? <ChevronUp size={18} color="var(--accent-gold)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </div>
                {openFaq === idx && (
                  <p style={{ margin: '1rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem' }}>
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(57,255,20,0.05))', border: '1px solid var(--accent-gold)', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '1.8rem', color: '#fff', fontFamily: 'var(--font-heading)', margin: '0 0 0.8rem 0', textTransform: 'uppercase' }}>
            Need a Customized Custom Plan for Your League?
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '650px', margin: '0 auto 1.5rem' }}>
            Talk to our cricket auction specialists to setup custom branding, custom bidding rules, live video overlays, or multi-venue auction support.
          </p>
          <a
            href={`https://api.whatsapp.com/send?phone=${PRICING_CONFIG.contactWhatsAppNumber}&text=${encodeURIComponent("Hi! I have custom requirements for my Cricket Auction tournament.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ padding: '0.8rem 2rem', fontSize: '1rem', background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px' }}
          >
            <MessageCircle size={20} /> Chat with Auction Support
          </a>
        </div>

      </main>
    </div>
  );
};

export default PricingPage;
