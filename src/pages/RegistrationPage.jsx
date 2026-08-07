import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { uploadToCloudinary } from '../services/cloudinary';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { normalizeMobile } from '../utils/phoneUtils';

const RegistrationPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const auctionCodeParam = searchParams.get('code');
  const [inputCode, setInputCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const [activeAuction, setActiveAuction] = useState(null);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', mobile: '', email: '',
    dob: '', area: '', gender: '',
    player_role: '', batting_style: '', bowling_style: '',
    photo: null, aadhar: null
  });

  const fetchAuctionByCode = async (code) => {
    try {
      setLoading(true);
      setFormError('');
      setCodeError('');
      setRegistrationClosed(false);
      const { data, error } = await supabase
        .from('auctions')
        .select('id, auction_name, qr_code_url, per_player_fees, status, auction_code, auction_logo')
        .eq('auction_code', code)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("No auction found with code: " + code);
      }

      if (data.status === 'running' || data.status === 'completed') {
        setRegistrationClosed(true);
        setActiveAuction(data);
      } else if (data.status === 'registration_open') {
        setActiveAuction(data);
      } else {
        throw new Error("Registration is not open for this auction.");
      }
    } catch (err) {
      console.error("Error fetching auction by code:", err);
      setCodeError(err.message || "Invalid auction code.");
      setActiveAuction(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const inviteId = searchParams.get('invite');
    if (!inviteId) {
      setInvalidLink(true);
      setLinkExpired(false);
      if (auctionCodeParam) {
        fetchAuctionByCode(auctionCodeParam);
      } else {
        setActiveAuction(null);
        setLoading(false);
      }
      return;
    } else {
      setInvalidLink(false);
      setLinkExpired(false);
    }

    if (auctionCodeParam) {
      fetchAuctionByCode(auctionCodeParam);
    } else {
      setActiveAuction(null);
      setLoading(false);
    }
  }, [auctionCodeParam, searchParams]);

  useEffect(() => {
    const inviteId = searchParams.get('invite');
    if (activeAuction && inviteId) {
      const validateInvite = async () => {
        try {
          const { data: invData, error: invError } = await supabase
            .from('invitations')
            .select('*')
            .eq('id', inviteId)
            .maybeSingle();

          if (invError) throw invError;

          if (!invData || invData.auction_id !== activeAuction.id) {
            setLinkExpired(true);
            return;
          }

          if (invData.status === 'used') {
            setAlreadyRegistered(true);
            setFormData(prev => ({ ...prev, mobile: invData.mobile }));
            return;
          }

          // If pending, prefill mobile and lock it
          setFormData(prev => ({ ...prev, mobile: invData.mobile }));
        } catch (err) {
          console.error("Invite validation error:", err);
          setLinkExpired(true);
        }
      };
      validateInvite();
    }
  }, [activeAuction, searchParams]);

  const handleVerifyCodeSubmit = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setSearchParams({ code: inputCode.trim() });
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (!activeAuction) throw new Error("No active auction available for registration.");
      if (registrationClosed) throw new Error("Registration is now closed for this auction.");

      // Double check current status from DB for safety
      const { data: latestStatus } = await supabase
        .from('auctions')
        .select('status')
        .eq('id', activeAuction.id)
        .single();

      if (latestStatus?.status === 'running') {
        setRegistrationClosed(true);
        throw new Error("Registration just closed as the auction has started!");
      }
      // Verify and force invitation mobile to prevent client-side HTML tampering
      const inviteId = searchParams.get('invite');
      let finalMobile = formData.mobile;
      if (inviteId) {
        const { data: invData, error: fetchInvError } = await supabase
          .from('invitations')
          .select('mobile, status')
          .eq('id', inviteId)
          .maybeSingle();
        if (fetchInvError || !invData) {
          throw new Error("Invalid invitation token.");
        }
        if (invData.status === 'used') {
          throw new Error("This invitation link has already been used.");
        }
        finalMobile = invData.mobile;
      } else {
        throw new Error("Invitation token is required to register.");
      }

      const finalNorm = normalizeMobile(finalMobile);
      if (finalNorm) {
        const { data: existingPlayers, error: checkError } = await supabase
          .from('players')
          .select('id, mobile');

        if (checkError) throw checkError;
        const isAlreadyRegistered = (existingPlayers || []).some(p => normalizeMobile(p.mobile) === finalNorm);

        if (isAlreadyRegistered) {
          throw new Error("Already registered with this mobile number. Please contact the auction owner.");
        }
      }

      if (!formData.photo) {
        throw new Error("Player Photo is required.");
      }

      // Upload Images
      let photo_url = null;
      let aadhar_card_url = null;

      if (formData.photo) photo_url = await uploadToCloudinary(formData.photo);
      if (formData.aadhar) aadhar_card_url = await uploadToCloudinary(formData.aadhar);

      const playerPayload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        mobile: finalMobile,
        email: formData.email,
        dob: formData.dob || null,
        area: formData.area || null,
        gender: formData.gender || null,
        photo_url,
        aadhar_card_url,
        player_role: formData.player_role,
        batting_style: formData.batting_style,
        bowling_style: formData.bowling_style
      };

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert([playerPayload])
        .select()
        .single();

      if (playerError) throw playerError;

      // Generate next player_number for this auction
      const { data: maxData } = await supabase
        .from('auction_players')
        .select('player_number')
        .eq('auction_id', activeAuction.id)
        .order('player_number', { ascending: false })
        .limit(1);
      const nextNumber = (maxData && maxData.length > 0 && maxData[0].player_number != null)
        ? maxData[0].player_number + 1
        : 1;

      // Insert into auction_players
      const { error: auctionPlayerError } = await supabase
        .from('auction_players')
        .insert([{
          auction_id: activeAuction.id,
          player_id: playerData.id,
          approval_status: 'pending',
          player_number: nextNumber
        }]);

      if (auctionPlayerError) throw auctionPlayerError;

      // Consume/Update invitation status
      if (inviteId) {
        const { error: consumeError } = await supabase
          .from('invitations')
          .update({ status: 'used' })
          .eq('id', inviteId);
        if (consumeError) {
          console.error("Error consuming invite:", consumeError);
        }
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader message="LOADING FORM..." />;

  if (invalidLink) {
    return (
      <div className="flex-col min-h-screen">
        <PageHeader title="Access Denied" showLogos={false} />
        <main className="container flex-col items-center justify-center text-center" style={{ flex: 1, padding: '4rem 1rem' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem', maxWidth: '600px', width: '100%', margin: '0 auto', border: '1px solid rgba(255, 68, 68, 0.3)' }}>
            {activeAuction && activeAuction.auction_logo ? (
              <img 
                src={activeAuction.auction_logo} 
                alt="Auction Logo" 
                style={{ 
                  width: '90px', 
                  height: '90px', 
                  borderRadius: '12px', 
                  objectFit: 'contain', 
                  background: '#fff', 
                  padding: '6px', 
                  margin: '0 auto 1.5rem', 
                  border: '2px solid rgba(255, 68, 68, 0.4)',
                  boxShadow: '0 0 15px rgba(255, 68, 68, 0.2)'
                }} 
              />
            ) : (
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔒</div>
            )}
            <h2 style={{ color: '#ff4444', marginBottom: '1rem' }}>Private Registration</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              Registration for this tournament is restricted. You must use the personalized link sent by your tournament administrator to register.
            </p>
            <a href="#/" className="btn btn-outline">Return to Home Hub</a>
          </div>
        </main>
      </div>
    );
  }

  if (linkExpired) {
    return (
      <div className="flex-col min-h-screen">
        <PageHeader title="Link Expired" showLogos={false} />
        <main className="container flex-col items-center justify-center text-center" style={{ flex: 1, padding: '4rem 1rem' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem', maxWidth: '600px', width: '100%', margin: '0 auto', border: '1px solid rgba(255, 68, 68, 0.3)' }}>
            {activeAuction && activeAuction.auction_logo ? (
              <img 
                src={activeAuction.auction_logo} 
                alt="Auction Logo" 
                style={{ 
                  width: '90px', 
                  height: '90px', 
                  borderRadius: '12px', 
                  objectFit: 'contain', 
                  background: '#fff', 
                  padding: '6px', 
                  margin: '0 auto 1.5rem', 
                  border: '2px solid rgba(255, 68, 68, 0.4)',
                  boxShadow: '0 0 15px rgba(255, 68, 68, 0.2)'
                }} 
              />
            ) : (
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⚠️</div>
            )}
            <h2 style={{ color: '#ff4444', marginBottom: '1rem' }}>Link Expired</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              Link expired. Contact the organizer of the tournament.
            </p>
            <a href="#/" className="btn btn-outline">Return to Home Hub</a>
          </div>
        </main>
      </div>
    );
  }

  if (alreadyRegistered) {
    return (
      <div className="flex-col min-h-screen">
        <PageHeader title="Already Registered" showLogos={false} />
        <main className="container flex-col items-center justify-center text-center" style={{ flex: 1, padding: '4rem 1rem' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem', maxWidth: '600px', width: '100%', margin: '0 auto', border: '1px solid var(--accent-gold)' }}>
            {activeAuction && activeAuction.auction_logo ? (
              <img 
                src={activeAuction.auction_logo} 
                alt="Auction Logo" 
                style={{ 
                  width: '95px', 
                  height: '95px', 
                  borderRadius: '12px', 
                  objectFit: 'contain', 
                  background: '#fff', 
                  padding: '6px', 
                  margin: '0 auto 1.5rem', 
                  border: '2px solid var(--accent-gold)',
                  boxShadow: '0 0 15px rgba(255, 215, 0, 0.2)'
                }} 
              />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#000', fontSize: '2.5rem', fontWeight: 'bold' }}>
                ℹ
              </div>
            )}
            <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>Already Registered</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              You are already registered for this auction under the mobile number: <strong>{formData.mobile}</strong>.
            </p>
            <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '0.9rem' }}>
              Your application is currently pending approval or has already been processed. Please contact the tournament administrator if you need to update your details.
            </p>
            <a href="#/" className="btn btn-outline">Return to Home Hub</a>
          </div>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex-col min-h-screen">
        <PageHeader title="Registration Successful" showLogos={false} />
        <main className="container flex-col items-center justify-center text-center" style={{ flex: 1, padding: '4rem 1rem' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem', maxWidth: '600px', width: '100%', margin: '0 auto' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#000', fontSize: '2.5rem', fontWeight: 'bold' }}>
              ✓
            </div>
            <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>You're Registered!</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              Your application is currently pending approval. You will be notified once the admin approves your registration.
            </p>
            <a href="#/" className="btn btn-outline">Return to Home</a>
          </div>
        </main>
      </div>
    );
  }

  if (registrationClosed) {
    return (
      <div className="flex-col min-h-screen">
        <PageHeader title="Registration Closed" subtitle={activeAuction?.auction_name} showLogos={false} />
        <main className="container flex-col items-center justify-center text-center" style={{ flex: 1, padding: '4rem 1rem' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem', maxWidth: '600px', width: '100%', margin: '0 auto', border: '1px solid rgba(255, 68, 68, 0.3)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🚫</div>
            <h2 style={{ color: '#ff4444', marginBottom: '1rem' }}>Registration is Closed</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              The live auction for <strong>{activeAuction?.auction_name}</strong> has already started. We are no longer accepting new registrations.
            </p>
            <a href="#/" className="btn btn-outline">Return to Home</a>
          </div>
        </main>
      </div>
    );
  }

  if (!activeAuction) {
    return (
      <div className="flex-col min-h-screen">
        <div className="spotlight"></div>
        <PageHeader title="Player Registration" showLogos={false} />
        <main className="container flex-col items-center justify-center text-center" style={{ flex: 1, padding: '4rem 1rem', zIndex: 1, position: 'relative' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>🏏</div>
            <h2 style={{ color: 'var(--text-main)', margin: '0' }}>ENTER TOURNAMENT CODE</h2>
            <p className="text-muted" style={{ fontSize: '0.95rem', margin: 0 }}>
              To register as a player, enter the unique tournament code shared by your organizer.
            </p>
            {codeError && (
              <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff4444', color: '#ff4444', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                {codeError}
              </div>
            )}
            <form onSubmit={handleVerifyCodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <input
                type="text"
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
                placeholder="e.g. IPL26"
                className="form-input text-center"
                style={{ fontSize: '1.2rem', letterSpacing: '2px', textTransform: 'uppercase', padding: '0.75rem' }}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.1rem', padding: '0.75rem' }}>
                Verify & Register
              </button>
            </form>
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <a href="#/" className="btn btn-outline" style={{ width: '100%' }}>Back to Home Hub</a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader title="Player Registration" subtitle={activeAuction ? `Register for ${activeAuction.auction_name}` : ''} showLogos={false} />

      <main className="container flex-col items-center" style={{ flex: 1, padding: '2rem 1rem 4rem', zIndex: 1, position: 'relative' }}>
        <div className="glass-panel responsive-padding" style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
          {formError && (
            <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid red', padding: '1rem', borderRadius: '8px', color: '#ff4444', marginBottom: '2rem' }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>Personal Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem' }}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input required type="text" name="first_name" className="form-input" value={formData.first_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input required type="text" name="last_name" className="form-input" value={formData.last_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input 
                  required 
                  type="tel" 
                  name="mobile" 
                  className="form-input" 
                  value={formData.mobile} 
                  onChange={handleChange} 
                  readOnly={!!searchParams.get('invite')}
                  style={searchParams.get('invite') ? { backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'not-allowed', color: 'var(--text-muted)' } : {}}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input type="date" name="dob" className="form-input" value={formData.dob} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select name="gender" className="form-select" value={formData.gender} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '2rem 0 1.5rem', color: 'var(--accent-gold)' }}>Address</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Area / Village / City</label>
                <input type="text" name="area" className="form-input" value={formData.area} onChange={handleChange} />
              </div>
            </div>

            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '2rem 0 1.5rem', color: 'var(--accent-gold)' }}>Cricket Profile</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Player Role *</label>
                <select required name="player_role" className="form-select" value={formData.player_role} onChange={handleChange}>
                  <option value="">Select Role</option>
                  <option value="Batter">Batter</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All Rounder">All Rounder</option>
                  <option value="Wicket Keeper">Wicket Keeper</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Batting Style *</label>
                <select required name="batting_style" className="form-select" value={formData.batting_style} onChange={handleChange}>
                  <option value="">Select Style</option>
                  <option value="Right Hand">Right Hand</option>
                  <option value="Left Hand">Left Hand</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bowling Style *</label>
                <select required name="bowling_style" className="form-select" value={formData.bowling_style} onChange={handleChange}>
                  <option value="">Select Style</option>
                  <option value="Right Arm Fast">Right Arm Fast</option>
                  <option value="Right Arm Medium">Right Arm Medium</option>
                  <option value="Right Arm Spin">Right Arm Spin</option>
                  <option value="Left Arm Fast">Left Arm Fast</option>
                  <option value="Left Arm Spin">Left Arm Spin</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>

            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '2rem 0 1.5rem', color: 'var(--accent-gold)' }}>Documents</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Player Photo * (Square aspect ratio preferred)</label>
                <input required type="file" name="photo" accept="image/*" className="form-input" onChange={handleChange} />
              </div>
              {/* <div className="form-group">
                <label className="form-label">Aadhar Card</label>
                <input type="file" name="aadhar" accept="image/*,application/pdf" className="form-input" onChange={handleChange} />
              </div> */}
            </div>

            {activeAuction && (activeAuction.qr_code_url || activeAuction.per_player_fees) && (
              <div style={{ marginTop: '3rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>Registration Fee Payment</h3>
                <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  {activeAuction.per_player_fees && (
                    <>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-green)', marginBottom: '1.5rem' }}>
                        Registration Fee for Male: ₹{activeAuction.per_player_fees}
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-green)', marginBottom: '1.5rem' }}>
                        Registration Fee for Female: ₹500
                      </div>
                      {/* <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-green)', marginBottom: '1.5rem' }}>
                        Registration Fee for Icon Player : ₹{500}
                      </div> */}
                    </>
                  )}
                  {activeAuction.qr_code_url && (
                    <>
                      <p style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem' }}>Scan below QR code to complete your registration fee payment.</p>
                      <p style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem' }}>Send screenshot of payment to the tournament Owner.</p>
                      <img
                        src={activeAuction.qr_code_url}
                        alt="Payment QR Code for Registration"
                        style={{ maxWidth: '280px', width: '100%', borderRadius: '12px', border: '3px solid var(--accent-gold)', boxShadow: '0 8px 30px rgba(255, 215, 0, 0.15)' }}
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', maxWidth: '300px', fontSize: '1.2rem', padding: '1rem' }}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Register Player'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default RegistrationPage;
