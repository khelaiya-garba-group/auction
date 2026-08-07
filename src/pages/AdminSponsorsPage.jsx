import React, { useState, useEffect, useRef } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { uploadToCloudinary, deleteFromCloudinary, getOptimizedImageUrl } from '../services/cloudinary';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';

const AdminSponsorsPage = () => {
  const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
  const [searchParams] = useSearchParams();
  const auctionCode = searchParams.get('code') || localStorage.getItem('cap_admin_selected_auction_code');

  const [activeAuction, setActiveAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sponsors, setSponsors] = useState([]);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const initialFormState = {
    name: '',
    number: '',
    address: '',
    sequence: 1,
    is_active: true,
    photo: null
  };
  const [formData, setFormData] = useState(initialFormState);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchAuctionAndSponsors();
  }, [isAuthenticated, auctionCode]);

  const fetchAuctionAndSponsors = async () => {
    try {
      setLoading(true);
      if (!auctionCode) {
        setLoading(false);
        return;
      }

      // Fetch active auction
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('auction_code', auctionCode)
        .maybeSingle();

      if (auctionError) throw auctionError;
      setActiveAuction(auctionData);

      if (auctionData) {
        await fetchSponsors(auctionData.id);
      }
    } catch (err) {
      console.error("Error fetching admin sponsors page data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSponsors = async (auctionId) => {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('auction_id', auctionId)
        .order('sequence', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSponsors(data || []);
    } catch (err) {
      console.error("Error fetching sponsors:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'sequence') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 1 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingSponsor(null);
    setShowForm(false);
    setFormError('');
    setFormSuccess('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditClick = (sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({
      name: sponsor.name,
      number: sponsor.number || '',
      address: sponsor.address || '',
      sequence: sponsor.sequence,
      is_active: sponsor.is_active,
      photo: null
    });
    setFormError('');
    setFormSuccess('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!activeAuction) return setFormError('No active tournament selected.');
    if (!formData.name.trim()) return setFormError('Name is required.');

    setActionLoading(true);
    try {
      let photo_url = editingSponsor ? editingSponsor.photo_url : null;

      // Upload new photo if provided
      if (formData.photo) {
        // Delete old photo from Cloudinary if editing
        if (photo_url) {
          try {
            await deleteFromCloudinary(photo_url);
          } catch (delErr) {
            console.error("Failed to delete old image from Cloudinary:", delErr);
          }
        }
        photo_url = await uploadToCloudinary(formData.photo);
      }

      const sponsorPayload = {
        auction_id: activeAuction.id,
        name: formData.name.trim(),
        number: formData.number.trim() || null,
        address: formData.address.trim() || null,
        sequence: formData.sequence,
        is_active: formData.is_active,
        photo_url
      };

      if (editingSponsor) {
        const { error } = await supabase
          .from('sponsors')
          .update(sponsorPayload)
          .eq('id', editingSponsor.id);

        if (error) throw error;
        setFormSuccess('Sponsor updated successfully!');
      } else {
        const { error } = await supabase
          .from('sponsors')
          .insert([sponsorPayload]);

        if (error) throw error;
        setFormSuccess('Sponsor added successfully!');
      }

      await fetchSponsors(activeAuction.id);
      setTimeout(() => {
        resetForm();
      }, 1500);
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to save sponsor.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (sponsor) => {
    if (!window.confirm(`Are you sure you want to delete sponsor "${sponsor.name}"?`)) return;
    
    setActionLoading(true);
    try {
      // 1. Delete from Supabase
      const { error } = await supabase
        .from('sponsors')
        .delete()
        .eq('id', sponsor.id);

      if (error) throw error;

      // 2. Delete logo from Cloudinary if exists
      if (sponsor.photo_url) {
        try {
          await deleteFromCloudinary(sponsor.photo_url);
        } catch (delErr) {
          console.error("Failed to delete Cloudinary asset:", delErr);
        }
      }

      if (activeAuction) await fetchSponsors(activeAuction.id);
    } catch (err) {
      console.error(err);
      alert('Failed to delete sponsor.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (sponsor) => {
    try {
      const { error } = await supabase
        .from('sponsors')
        .update({ is_active: !sponsor.is_active })
        .eq('id', sponsor.id);

      if (error) throw error;
      if (activeAuction) await fetchSponsors(activeAuction.id);
    } catch (err) {
      console.error(err);
      alert('Failed to update sponsor status.');
    }
  };

  if (!isAuthenticated) return <Navigate to="/admin" replace />;
  if (!auctionCode || (!loading && !activeAuction)) return <Navigate to="/admin" replace />;
  if (loading) return <Loader message="LOADING SPONSORS..." />;

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader title="Sponsors Management" subtitle={activeAuction ? `Manage Sponsors for ${activeAuction.auction_name}` : 'Sponsors'} showLogos={false} />

      <main className="container" style={{ padding: '2rem 1rem 4rem', zIndex: 1, position: 'relative' }}>
        
        {/* Header navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ color: 'var(--text-main)', margin: 0 }}>Active Scope: {activeAuction ? activeAuction.auction_name : 'None'}</h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => {
                if (showForm) resetForm();
                else setShowForm(true);
              }} 
              className="btn btn-primary"
              style={{ background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold' }}
            >
              {showForm ? 'Cancel' : '➕ Add Sponsor'}
            </button>
            <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>← Back to Admin</Link>
          </div>
        </div>

        {/* Sponsor Form Panel */}
        {showForm && (
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', marginBottom: '3rem', border: '1px solid rgba(255,215,0,0.2)' }}>
            <h3 style={{ color: 'var(--accent-gold)', margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>
              {editingSponsor ? '✏️ Edit Tournament Sponsor' : '🤝 Add New Tournament Sponsor'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Sponsor Name *</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    className="form-input" 
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Contact Number (Optional)</label>
                  <input 
                    type="text" 
                    name="number" 
                    value={formData.number} 
                    onChange={handleInputChange} 
                    className="form-input" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address (Optional)</label>
                  <input 
                    type="text" 
                    name="address" 
                    value={formData.address} 
                    onChange={handleInputChange} 
                    className="form-input" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sequence Order * (Lower numbers show first)</label>
                  <input 
                    type="number" 
                    name="sequence" 
                    value={formData.sequence} 
                    onChange={handleInputChange} 
                    className="form-input" 
                    min="1" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sponsor Logo / Image {editingSponsor?.photo_url && '(Uploaded)'}</label>
                  <input 
                    type="file" 
                    name="photo" 
                    accept="image/*" 
                    onChange={handleInputChange} 
                    className="form-input" 
                    ref={fileInputRef}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '1.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                    <input 
                      type="checkbox" 
                      name="is_active" 
                      checked={formData.is_active} 
                      onChange={handleInputChange}
                      style={{ width: '20px', height: '20px', accentColor: 'var(--accent-green)' }}
                    />
                    Is Sponsor Active (Visible on Projector)
                  </label>
                </div>
              </div>

              {formError && <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff4444', color: '#ff4444', padding: '0.8rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{formError}</div>}
              {formSuccess && <div style={{ background: 'rgba(57,255,20,0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', padding: '0.8rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{formSuccess}</div>}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ background: 'var(--accent-green)', color: '#000', fontWeight: 'bold' }}>
                  {actionLoading ? 'Saving...' : editingSponsor ? 'Update Sponsor' : 'Add Sponsor'}
                </button>
                <button type="button" onClick={resetForm} className="btn btn-outline">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sponsor list table */}
        <div className="glass-panel" style={{ padding: '2rem', width: '100%' }}>
          <h3 style={{ color: '#fff', margin: '0 0 1.5rem 0', fontSize: '1.2rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Current Sponsors</h3>
          
          <div style={{ overflowX: 'auto' }}>
            {sponsors.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem 0' }}>No sponsors added for this tournament yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Logo</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sponsor Name</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Contact</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Address</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Seq</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sponsors.map(sponsor => (
                    <tr key={sponsor.id} style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.1)' }}>
                      <td style={{ padding: '0.8rem 1rem' }}>
                        {sponsor.photo_url ? (
                          <img 
                            src={getOptimizedImageUrl(sponsor.photo_url, 100)} 
                            alt={sponsor.name} 
                            style={{ width: '50px', height: '40px', objectFit: 'contain', background: 'rgba(255,255,255,0.02)', padding: '2px', borderRadius: '4px' }} 
                          />
                        ) : (
                          <div style={{ width: '50px', height: '40px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            No Logo
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{sponsor.name}</td>
                      <td style={{ padding: '0.8rem 1rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>{sponsor.number || '-'}</td>
                      <td style={{ padding: '0.8rem 1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{sponsor.address || '-'}</td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'center', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{sponsor.sequence}</td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                        <button 
                          onClick={() => handleToggleStatus(sponsor)}
                          style={{
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '20px', 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold', 
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            border: 'none',
                            background: sponsor.is_active ? 'rgba(57, 255, 20, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: sponsor.is_active ? 'var(--accent-green)' : '#ef4444'
                          }}
                        >
                          {sponsor.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleEditClick(sponsor)} 
                            className="btn btn-outline" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)' }}
                            disabled={actionLoading}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(sponsor)} 
                            className="btn" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            disabled={actionLoading}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default AdminSponsorsPage;
