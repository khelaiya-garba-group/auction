import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinary';
import PageHeader from '../components/PageHeader';
import { Link } from 'react-router-dom';
import { Loader } from '../components/Loader';

const getAuctionInitials = (name) => {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words.map(w => w.charAt(0)).join('').toUpperCase();
};

const AuctionPage = () => {
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');

  const [auctionsList, setAuctionsList] = useState([]);
  const [editingAuction, setEditingAuction] = useState(null);

  const fileInputRef = useRef(null);
  const qrInputRef = useRef(null);

  const initialFormState = {
    auction_name: '',
    auction_code: '',
    auction_date: '',
    venue: '',
    status: 'draft',
    logo: null,
    qr_code: null,
    per_player_fees: '',
    number_of_teams: '',
    number_of_icon: '',
    number_of_owner: '',
    base_price: '',
    max_budget: '',
    max_players: '',
    registration_type: 'private',
    ask_tshirt_details: false,
    youtube_live_url: '',
    is_live_streaming: false,
    is_separate_gender: false
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setAuctionsList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, []);

  const handleChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    if (files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEditClick = (auction) => {
    setEditingAuction(auction);
    setFormData({
      auction_name: auction.auction_name || '',
      auction_code: auction.auction_code || '',
      auction_date: auction.auction_date || '',
      venue: auction.venue || '',
      status: auction.status || 'draft',
      per_player_fees: auction.per_player_fees || '',
      number_of_teams: auction.number_of_teams || '',
      number_of_icon: auction.number_of_icon || '',
      number_of_owner: auction.number_of_owner || '',
      base_price: auction.base_price || '',
      max_budget: auction.max_budget || '',
      max_players: auction.max_players || '',
      registration_type: auction.registration_type || 'private',
      ask_tshirt_details: auction.ask_tshirt_details || false,
      youtube_live_url: auction.youtube_live_url || '',
      is_live_streaming: auction.is_live_streaming || false,
      is_separate_gender: auction.is_separate_gender || false,
      logo: null, // Don't reload file objects
      qr_code: null
    });
    setSuccessMsg('');
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (qrInputRef.current) qrInputRef.current.value = "";
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingAuction(null);
    setFormData(initialFormState);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (qrInputRef.current) qrInputRef.current.value = "";
    setSuccessMsg('');
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      let auction_logo = editingAuction ? editingAuction.auction_logo : null;
      let qr_code_url = editingAuction ? editingAuction.qr_code_url : null;

      if (formData.logo) {
        if (auction_logo) {
          await deleteFromCloudinary(auction_logo);
        }
        auction_logo = await uploadToCloudinary(formData.logo);
      }
      
      if (formData.qr_code) {
        if (qr_code_url) {
          await deleteFromCloudinary(qr_code_url);
        }
        qr_code_url = await uploadToCloudinary(formData.qr_code);
      }

      const payload = {
        auction_name: formData.auction_name,
        auction_code: formData.auction_code,
        auction_date: formData.auction_date || null,
        venue: formData.venue || null,
        status: formData.status,
        registration_type: formData.registration_type || 'private',
        ask_tshirt_details: !!formData.ask_tshirt_details,
        youtube_live_url: formData.youtube_live_url || null,
        is_live_streaming: !!formData.is_live_streaming,
        is_separate_gender: !!formData.is_separate_gender,
        per_player_fees: formData.per_player_fees ? parseFloat(formData.per_player_fees) : null,
        number_of_teams: formData.number_of_teams ? parseInt(formData.number_of_teams, 10) : null,
        number_of_icon: formData.number_of_icon ? parseInt(formData.number_of_icon, 10) : null,
        number_of_owner: formData.number_of_owner ? parseInt(formData.number_of_owner, 10) : null,
        base_price: formData.base_price ? parseFloat(formData.base_price) : null,
        max_budget: formData.max_budget ? parseFloat(formData.max_budget) : null,
        max_players: formData.max_players ? parseInt(formData.max_players, 10) : null,
        auction_logo,
        qr_code_url
      };

      if (editingAuction) {
        // UPDATE
        const { error } = await supabase
          .from('auctions')
          .update(payload)
          .eq('id', editingAuction.id);

        if (error) throw error;
        setSuccessMsg(`Auction "${formData.auction_name}" updated successfully!`);
      } else {
        // INSERT
        const { error } = await supabase
          .from('auctions')
          .insert([payload]);

        if (error) throw error;
        setSuccessMsg(`Auction "${formData.auction_name}" created successfully!`);
      }

      setFormData(initialFormState);
      setEditingAuction(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (qrInputRef.current) qrInputRef.current.value = "";
      
      await fetchAuctions(); // Refresh list

    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to save auction. Ensure QR Code column exists.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader title="Auction Management" subtitle="Create, Edit, and Manage Events" showLogos={false} />
      
      <main className="container" style={{ padding: '2rem 1rem 4rem', zIndex: 1, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '2rem' }}>
          <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>← Back to Admin</Link>
        </div>

        {/* TOP FORM SECTION */}
        <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '800px', margin: '0 auto 3rem' }}>
          <h2 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editingAuction ? 'Edit Auction' : 'Create New Auction'}
            {editingAuction && (
              <button type="button" onClick={handleCancelEdit} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                Cancel Edit
              </button>
            )}
          </h2>
          
          {successMsg && <div style={{ background: 'rgba(57, 255, 20, 0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>{successMsg}</div>}
          {formError && <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff4444', color: '#ff4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>{formError}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem 1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Auction Name *</label>
                <input required type="text" name="auction_name" value={formData.auction_name} onChange={handleChange} className="form-input" placeholder="e.g. IPL 2026" />
              </div>
              <div className="form-group">
                <label className="form-label">Auction Code * (Unique)</label>
                <input required type="text" name="auction_code" value={formData.auction_code} onChange={handleChange} className="form-input" placeholder="e.g. IPL26" disabled={!!editingAuction} />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" name="auction_date" value={formData.auction_date} onChange={handleChange} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Venue</label>
                <input type="text" name="venue" value={formData.venue} onChange={handleChange} className="form-input" placeholder="e.g. Wankhede Stadium" />
              </div>
              <div className="form-group">
                <label className="form-label">Per Player Fee (₹)</label>
                <input type="number" name="per_player_fees" value={formData.per_player_fees} onChange={handleChange} className="form-input" placeholder="e.g. 500" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Number of Teams</label>
                <input type="number" name="number_of_teams" value={formData.number_of_teams} onChange={handleChange} className="form-input" placeholder="e.g. 8" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Icons Per Team</label>
                <input type="number" name="number_of_icon" value={formData.number_of_icon} onChange={handleChange} className="form-input" placeholder="e.g. 2" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Owners Per Team</label>
                <input type="number" name="number_of_owner" value={formData.number_of_owner} onChange={handleChange} className="form-input" placeholder="e.g. 1" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Base Price (₹)</label>
                <input type="number" name="base_price" value={formData.base_price} onChange={handleChange} className="form-input" placeholder="e.g. 1000" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Max Budget Per Team (₹)</label>
                <input type="number" name="max_budget" value={formData.max_budget} onChange={handleChange} className="form-input" placeholder="e.g. 100000" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Max Players Per Team</label>
                <input type="number" name="max_players" value={formData.max_players} onChange={handleChange} className="form-input" placeholder="e.g. 11" min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">Status *</label>
                <select required name="status" value={formData.status} onChange={handleChange} className="form-select">
                  <option value="draft">Draft (Hidden)</option>
                  <option value="registration_open">Registration Open</option>
                  <option value="running">Running (Live)</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Registration Access *</label>
                <select required name="registration_type" value={formData.registration_type} onChange={handleChange} className="form-select">
                  <option value="private">Private (Invitation Link Required)</option>
                  <option value="public">Public (Open Link for Anyone)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">T-Shirt Registration Details *</label>
                <select required name="ask_tshirt_details" value={formData.ask_tshirt_details ? "true" : "false"} onChange={(e) => setFormData(prev => ({ ...prev, ask_tshirt_details: e.target.value === "true" }))} className="form-select">
                  <option value="false">Disabled (Do not ask T-Shirt details)</option>
                  <option value="true">Enabled (Ask Name, Size & Number)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">YouTube Live Stream URL / Video ID</label>
                <input type="text" name="youtube_live_url" value={formData.youtube_live_url} onChange={handleChange} className="form-input" placeholder="e.g. https://youtube.com/watch?v=..." />
              </div>
              <div className="form-group">
                <label className="form-label">Enable YouTube Embed on Website</label>
                <select name="is_live_streaming" value={formData.is_live_streaming ? "true" : "false"} onChange={(e) => setFormData(prev => ({ ...prev, is_live_streaming: e.target.value === "true" }))} className="form-select">
                  <option value="false">Disabled</option>
                  <option value="true">Enabled (Show Watch Live Stream on Homepage)</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1', background: 'rgba(255,215,0,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,215,0,0.2)' }}>
                <label className="form-label" style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>
                  Separate Auction for Male & Female Players?
                </label>
                <select name="is_separate_gender" value={formData.is_separate_gender ? "true" : "false"} onChange={(e) => setFormData(prev => ({ ...prev, is_separate_gender: e.target.value === "true" }))} className="form-select">
                  <option value="false">No (Combined / Unified Auction - Default)</option>
                  <option value="true">Yes (Separate Male & Female Teams & Bidding Sessions)</option>
                </select>
                <span className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginTop: '0.3rem' }}>
                  If enabled, you can assign teams as Male/Female and switch between Male and Female bidding sessions during Live Auction & Random Draw within this single auction.
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Auction Logo {editingAuction?.auction_logo && '(Uploaded)'}</label>
                <input type="file" name="logo" accept="image/*" onChange={handleChange} className="form-input" ref={fileInputRef} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment QR Code {editingAuction?.qr_code_url && '(Uploaded)'}</label>
                <input type="file" name="qr_code" accept="image/*" onChange={handleChange} className="form-input" ref={qrInputRef} />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', maxWidth: '300px' }}>
              {submitting ? 'Saving...' : (editingAuction ? 'Update Auction' : 'Create Auction')}
            </button>
          </form>
        </div>

        {/* LIST SECTION */}
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ color: 'var(--text-main)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            All Auctions
          </h2>
          
          {loading ? <Loader message="Fetching..." /> : (
            <div style={{ overflowX: 'auto' }}>
              {auctionsList.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: '2rem' }}>No auctions created yet.</p>
              ) : (
                <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Logo</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Name & Code</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Venue / Date</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Teams Details</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Budget Info</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Fee</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Reg Mode</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Status</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>QR</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auctionsList.map(a => {
                      const isPublic = a.registration_type === 'public';
                      const publicRegUrl = `${window.location.origin}${window.location.pathname}#/register?code=${a.auction_code}`;
                      return (
                        <tr key={a.id} style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                          <td style={{ padding: '1rem' }}>
                            {a.auction_logo ? (
                              <img src={a.auction_logo} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }} />
                            ) : (
                              <div style={{ width: 40, height: 40, borderRadius: '4px', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                {getAuctionInitials(a.auction_name)}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 'bold' }}>{a.auction_name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Code: {a.auction_code}</div>
                            {a.is_separate_gender && (
                              <div style={{ marginTop: '0.2rem' }}>
                                <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', background: 'rgba(236,72,153,0.15)', color: '#f472b6', border: '1px solid rgba(236,72,153,0.3)' }}>
                                  ♂ Male & ♀ Female Separate
                                </span>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div>{a.venue || '-'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.auction_date || '-'}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div>Teams: <span style={{ fontWeight: 'bold' }}>{a.number_of_teams || 0}</span></div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Icons/Team: {a.number_of_icon || 0} | Owners/Team: {a.number_of_owner || 0}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div>Budget: <span style={{ fontWeight: 'bold' }}>{a.max_budget ? `₹${a.max_budget}` : '-'}</span></div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Max Players: {a.max_players || 11} | Base Price: {a.base_price ? `₹${a.base_price}` : '-'}</div>
                          </td>
                          <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                            {a.per_player_fees ? `₹${a.per_player_fees}` : '-'}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase',
                              background: isPublic ? 'rgba(57, 255, 20, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                              color: isPublic ? 'var(--accent-green)' : '#ffc107',
                              border: `1px solid ${isPublic ? 'var(--accent-green)' : '#ffc107'}`
                            }}>
                              {isPublic ? '🌐 Public' : '🔒 Private'}
                            </span>
                            {a.ask_tshirt_details && (
                              <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
                                👕 T-Shirt Details
                              </div>
                            )}
                            {isPublic && (
                              <button 
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(publicRegUrl);
                                  alert(`Public registration link copied to clipboard!\n\n${publicRegUrl}`);
                                }}
                                style={{
                                  marginTop: '6px', display: 'block', fontSize: '0.7rem', background: 'none', border: '1px solid var(--border-color)',
                                  color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px'
                                }}
                              >
                                📋 Copy Link
                              </button>
                            )}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ 
                              padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase',
                              background: a.status === 'running' ? 'rgba(57, 255, 20, 0.2)' : a.status === 'registration_open' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.1)',
                              color: a.status === 'running' ? 'var(--accent-green)' : a.status === 'registration_open' ? '#38bdf8' : 'var(--text-muted)'
                            }}>
                              {a.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {a.qr_code_url ? <span style={{ color: 'var(--accent-green)', fontSize: '1.2rem' }}>✓</span> : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <button onClick={() => handleEditClick(a)} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AuctionPage;
