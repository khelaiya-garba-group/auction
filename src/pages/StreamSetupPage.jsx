import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { supabase } from '../services/supabase';
import { Camera, Smartphone, Tv, Copy, Check, Play, Layers, HelpCircle, Save } from 'lucide-react';

const StreamSetupPage = () => {
    // Interactive choices state
    const [streamMode, setStreamMode] = useState('with_camera'); // 'with_camera' | 'without_camera'
    const [cameraMode, setCameraMode] = useState('single_phone'); // 'single_phone' | 'multi_phone'
    
    const [auctions, setAuctions] = useState([]);
    const [selectedAuctionCode, setSelectedAuctionCode] = useState('');
    const [selectedAuction, setSelectedAuction] = useState(null);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isLiveStreaming, setIsLiveStreaming] = useState(false);
    
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const getFullRouteUrl = (path, code) => {
        const originPath = window.location.origin + window.location.pathname;
        const cleanOriginPath = originPath.endsWith('/') ? originPath : `${originPath}/`;
        const query = code ? `?code=${encodeURIComponent(code)}` : '';
        return `${cleanOriginPath}#${path}${query}`;
    };

    const overlayUrl = getFullRouteUrl('/obs-overlay', selectedAuctionCode);
    const projectorUrl = getFullRouteUrl('/live-auction-projector', selectedAuctionCode);

    useEffect(() => {
        const fetchAuctions = async () => {
            try {
                const { data, error } = await supabase
                    .from('auctions')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setAuctions(data || []);
                if (data && data.length > 0) {
                    setSelectedAuctionCode(data[0].auction_code || '');
                    setSelectedAuction(data[0]);
                    setYoutubeUrl(data[0].youtube_live_url || '');
                    setIsLiveStreaming(data[0].is_live_streaming || false);
                }
            } catch (err) {
                console.error('Error fetching auctions:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAuctions();
    }, []);

    const handleAuctionChange = (code) => {
        setSelectedAuctionCode(code);
        const match = auctions.find(a => a.auction_code === code);
        if (match) {
            setSelectedAuction(match);
            setYoutubeUrl(match.youtube_live_url || '');
            setIsLiveStreaming(match.is_live_streaming || false);
        }
    };

    const handleSaveYouTubeDetails = async () => {
        if (!selectedAuction) return;
        try {
            const { error } = await supabase
                .from('auctions')
                .update({
                    youtube_live_url: youtubeUrl,
                    is_live_streaming: isLiveStreaming
                })
                .eq('id', selectedAuction.id);

            if (error) throw error;
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving youtube link:', err);
            alert('Failed to save YouTube stream settings.');
        }
    };

    const handleCopy = (url) => {
        navigator.clipboard.writeText(url);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2500);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', paddingBottom: '4rem', fontFamily: "'Inter', sans-serif" }}>
            <div className="spotlight"></div>
            <PageHeader 
                title="📺 YouTube & OBS Broadcast Setup Wizard" 
                subtitle="Configure live stream camera modes, OBS lower-third overlay links, and YouTube setup" 
                showLogos={false} 
            />

            <div style={{ maxWidth: '1100px', margin: '1.5rem auto', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative', zIndex: 1 }}>

                {/* TOURNAMENT SELECTOR BOX */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '16px',
                    padding: '1.25rem 1.75rem',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', color: '#ffd700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-heading)' }}>
                            <Layers size={20} color="#ffd700" /> Select Tournament / Auction
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>Choose active tournament to customize broadcast links</p>
                    </div>
                    <select
                        value={selectedAuctionCode}
                        onChange={(e) => handleAuctionChange(e.target.value)}
                        style={{
                            background: '#1e293b',
                            color: '#f8fafc',
                            border: '1px solid var(--accent-gold, #ffd700)',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            outline: 'none',
                            minWidth: '280px',
                            cursor: 'pointer'
                        }}
                    >
                        {auctions.map((a) => (
                            <option key={a.id} value={a.auction_code}>
                                {a.auction_name} ({a.auction_code})
                            </option>
                        ))}
                    </select>
                </div>

                {/* STEP 1: CHOOSE BROADCAST MODE */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '20px',
                    padding: '1.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.75rem' }}>
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            color: '#ffd700',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            background: 'rgba(255, 215, 0, 0.15)',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            border: '1px solid rgba(255, 215, 0, 0.3)'
                        }}>
                            STEP 1 OF 3
                        </span>
                        <h2 style={{ fontSize: '1.6rem', color: '#ffffff', margin: '0.6rem 0 0.2rem 0', fontFamily: 'var(--font-heading)' }}>
                            Choose Broadcast Mode
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>
                            Are you streaming with live camera video feed or digital data-only?
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        {/* WITH CAMERA OPTION */}
                        <div 
                            onClick={() => setStreamMode('with_camera')}
                            style={{
                                cursor: 'pointer',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                border: streamMode === 'with_camera' ? '2px solid #39ff14' : '1px solid rgba(255,255,255,0.1)',
                                background: streamMode === 'with_camera' ? 'rgba(57, 255, 20, 0.08)' : 'rgba(30, 41, 59, 0.5)',
                                transition: 'all 0.2s ease-in-out',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(57, 255, 20, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Camera size={24} color="#39ff14" />
                                </div>
                                {streamMode === 'with_camera' && (
                                    <span style={{ background: '#39ff14', color: '#000', fontSize: '0.75rem', fontWeight: '900', padding: '3px 10px', borderRadius: '20px' }}>
                                        SELECTED
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', color: '#ffffff', margin: '0 0 0.4rem 0' }}>📷 Stream WITH Camera</h3>
                                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
                                    Live video of Auctioneer / Bidders with transparent IPL-style TV lower-third overlay (<code style={{ color: '#39ff14' }}>/obs-overlay</code>).
                                </p>
                            </div>
                        </div>

                        {/* WITHOUT CAMERA OPTION */}
                        <div 
                            onClick={() => setStreamMode('without_camera')}
                            style={{
                                cursor: 'pointer',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                border: streamMode === 'without_camera' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                                background: streamMode === 'without_camera' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(30, 41, 59, 0.5)',
                                transition: 'all 0.2s ease-in-out',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Tv size={24} color="#38bdf8" />
                                </div>
                                {streamMode === 'without_camera' && (
                                    <span style={{ background: '#38bdf8', color: '#000', fontSize: '0.75rem', fontWeight: '900', padding: '3px 10px', borderRadius: '20px' }}>
                                        SELECTED
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', color: '#ffffff', margin: '0 0 0.4rem 0' }}>💻 Stream WITHOUT Camera (Data-Only)</h3>
                                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
                                    Zero cameras needed. Stream full-screen TV auction projector with player cards, purse counters &amp; sound FX (<code style={{ color: '#38bdf8' }}>/live-auction-projector</code>).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* SUB-SELECTION FOR CAMERA MODES */}
                    {streamMode === 'with_camera' && (
                        <div style={{ marginTop: '0.5rem', paddingTop: '1.25rem', borderTop: '1px dashed rgba(255, 255, 255, 0.15)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <h4 style={{ fontSize: '1rem', color: '#ffd700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Smartphone size={18} color="#ffd700" /> How many mobile phones / cameras are you using?
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                                <div 
                                    onClick={() => setCameraMode('single_phone')}
                                    style={{
                                        cursor: 'pointer',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: cameraMode === 'single_phone' ? '1.5px solid #39ff14' : '1px solid rgba(255,255,255,0.1)',
                                        background: cameraMode === 'single_phone' ? 'rgba(57, 255, 20, 0.1)' : 'rgba(15, 23, 42, 0.6)'
                                    }}
                                >
                                    <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.95rem' }}>📱 Single Phone / Camera</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                        1 Phone camera on Auctioneer table + OBS Browser Overlay (<code style={{ color: '#39ff14' }}>/obs-overlay</code>). Simple &amp; quick setup.
                                    </div>
                                </div>

                                <div 
                                    onClick={() => setCameraMode('multi_phone')}
                                    style={{
                                        cursor: 'pointer',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: cameraMode === 'multi_phone' ? '1.5px solid #39ff14' : '1px solid rgba(255,255,255,0.1)',
                                        background: cameraMode === 'multi_phone' ? 'rgba(57, 255, 20, 0.1)' : 'rgba(15, 23, 42, 0.6)'
                                    }}
                                >
                                    <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.95rem' }}>📱📱 Multiple Phones / Cameras (Multi-Angle)</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                        Phone 1 on Auctioneer, Phone 2 on Bidders. Switch camera angles in OBS while persistent lower-third stays on screen!
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* STEP 2: GENERATED OBS URL & QUICK COPY */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '20px',
                    padding: '1.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.75rem' }}>
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            color: '#ffd700',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            background: 'rgba(255, 215, 0, 0.15)',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            border: '1px solid rgba(255, 215, 0, 0.3)'
                        }}>
                            STEP 2 OF 3
                        </span>
                        <h2 style={{ fontSize: '1.6rem', color: '#ffffff', margin: '0.6rem 0 0.2rem 0', fontFamily: 'var(--font-heading)' }}>
                            OBS Studio Source URL
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>
                            Copy this link into OBS Studio as a <strong>Browser Source</strong>
                        </p>
                    </div>

                    <div style={{
                        background: '#020617',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        padding: '1.25rem',
                        borderRadius: '14px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                    }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#39ff14', wordBreak: 'break-all', fontWeight: 'bold' }}>
                            {streamMode === 'with_camera' ? overlayUrl : projectorUrl}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => handleCopy(streamMode === 'with_camera' ? overlayUrl : projectorUrl)}
                                style={{
                                    background: 'linear-gradient(135deg, #ffd700, #f59e0b)',
                                    color: '#000',
                                    fontWeight: '900',
                                    padding: '0.6rem 1.4rem',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)'
                                }}
                            >
                                {copiedUrl ? <Check size={16} /> : <Copy size={16} />}
                                {copiedUrl ? 'COPIED!' : 'COPY URL'}
                            </button>

                            {streamMode === 'with_camera' && (
                                <button
                                    onClick={() => setShowPreviewModal(true)}
                                    style={{
                                        background: 'rgba(30, 41, 59, 0.9)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        color: '#ffffff',
                                        fontWeight: '800',
                                        padding: '0.6rem 1.4rem',
                                        borderRadius: '10px',
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <Play size={16} color="#39ff14" /> PREVIEW OVERLAY
                                </button>
                            )}
                        </div>
                    </div>

                    {/* OBS SETUP GUIDELINE BOX */}
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255, 215, 0, 0.2)',
                        borderRadius: '14px',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.8rem'
                    }}>
                        <h4 style={{ fontSize: '1.05rem', color: '#ffd700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <HelpCircle size={18} color="#ffd700" />
                            OBS Studio Step-by-Step Guide ({streamMode === 'with_camera' ? (cameraMode === 'single_phone' ? '1 Camera' : 'Multi-Camera') : 'Data-Only'})
                        </h4>

                        <ol style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                            <li>Open <strong>OBS Studio</strong> (Free software on Windows/Mac).</li>
                            <li>Go to <strong>Settings → Video</strong> and set Canvas Resolution to <strong>1920 × 1080</strong>.</li>

                            {streamMode === 'with_camera' ? (
                                <>
                                    <li>
                                        <strong>Phone Camera Setup</strong>: Install <strong>Iriun Webcam</strong> or <strong>DroidCam</strong> on mobile &amp; PC. Connect phone via USB cable or Wi-Fi.
                                    </li>
                                    <li>
                                        In OBS <strong>Sources</strong> panel, click <strong>+ → Video Capture Device</strong> → Select 'Iriun Webcam' / 'DroidCam'.
                                    </li>
                                    <li style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '10px 14px', borderRadius: '8px', color: '#bae6fd', lineHeight: 1.6 }}>
                                        ✂️ <strong>How to Crop Out DroidCam App Window Borders / Menus in OBS:</strong>
                                        <br />• <em>Method A (ALT-Crop Shortcut)</em>: In OBS, click your video source. Hold the <strong>ALT key</strong> on keyboard and drag the red edge handles inward to crop out the DroidCam title bar, bottom buttons, and side stripes!
                                        <br />• <em>Method B (DroidCam Pop-Out)</em>: In DroidCam Client app on PC, click <strong>View → Pop-Out Video</strong>. Then in OBS Window Capture, select that clean video window!
                                    </li>
                                    <li style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: '8px', color: '#fca5a5', lineHeight: 1.6 }}>
                                        ⚠️ <strong>If Video Capture Device shows Solid Green Screen:</strong>
                                        <br />• Change <strong>Resolution</strong> in Properties from 1920x1080 to <strong>1280x720</strong> or <strong>640x480</strong> → Set <strong>Video Format</strong> to <em>Any</em> → Click <strong>OK</strong>.
                                    </li>
                                    {cameraMode === 'multi_phone' && (
                                        <li style={{ color: '#ffd700', fontWeight: '600' }}>
                                            <strong>Multi-Phone Switching</strong>: Create <strong>Scene 1</strong> (Auctioneer Phone) and <strong>Scene 2</strong> (Bidders Phone). Add the Browser Overlay source to BOTH scenes so lower-third graphics persist seamlessly!
                                        </li>
                                    )}
                                    <li>
                                        In OBS <strong>Sources</strong> panel, click <strong>+ → Browser</strong> → Set URL to the copied link above, Width: <code>1920</code>, Height: <code>1080</code>.
                                    </li>
                                </>
                            ) : (
                                <>
                                    <li>
                                        In OBS <strong>Sources</strong> panel, click <strong>+ → Browser</strong> → Set URL to <code>{projectorUrl}</code>, Width: <code>1920</code>, Height: <code>1080</code>.
                                    </li>
                                </>
                            )}
                        </ol>
                    </div>
                </div>

                {/* STEP 3: YOUTUBE LIVE LINK SAVER */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '20px',
                    padding: '1.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.75rem' }}>
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            color: '#ffd700',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            background: 'rgba(255, 215, 0, 0.15)',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            border: '1px solid rgba(255, 215, 0, 0.3)'
                        }}>
                            STEP 3 OF 3
                        </span>
                        <h2 style={{ fontSize: '1.6rem', color: '#ffffff', margin: '0.6rem 0 0.2rem 0', fontFamily: 'var(--font-heading)' }}>
                            Link YouTube Live to Public Homepage
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>
                            Paste your YouTube Live URL so visitors can watch the stream directly on your website
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', color: '#ffd700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>
                                YouTube Live Stream URL or Video ID
                            </label>
                            <input 
                                type="text"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                                style={{
                                    width: '100%',
                                    background: '#020617',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    padding: '0.8rem 1.2rem',
                                    borderRadius: '12px',
                                    color: '#ffffff',
                                    fontFamily: 'monospace',
                                    fontSize: '0.95rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input 
                                type="checkbox"
                                id="is_live_streaming"
                                checked={isLiveStreaming}
                                onChange={(e) => setIsLiveStreaming(e.target.checked)}
                                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#39ff14' }}
                            />
                            <label htmlFor="is_live_streaming" style={{ fontSize: '0.95rem', fontWeight: '600', color: '#f8fafc', cursor: 'pointer' }}>
                                Enable Live Stream Embed Badge on Website (<code>/</code>)
                            </label>
                        </div>

                        <div style={{ paddingTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button
                                onClick={handleSaveYouTubeDetails}
                                style={{
                                    background: 'linear-gradient(135deg, #39ff14, #059669)',
                                    color: '#000',
                                    fontWeight: '900',
                                    padding: '0.8rem 1.8rem',
                                    borderRadius: '12px',
                                    fontSize: '0.95rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 6px 20px rgba(57, 255, 20, 0.3)'
                                }}
                            >
                                <Save size={18} /> SAVE YOUTUBE STREAM LINK
                            </button>

                            {savedSuccess && (
                                <span style={{ color: '#39ff14', fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Check size={16} /> Saved Successfully!
                                </span>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* PREVIEW MODAL */}
            {showPreviewModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '900px',
                        overflow: 'hidden',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.2rem', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Play size={20} color="#39ff14" /> OBS Transparent Overlay Preview
                            </h3>
                            <button 
                                onClick={() => setShowPreviewModal(false)}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Close ✕
                            </button>
                        </div>

                        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {/* Simulated Camera Feed */}
                            <img 
                                src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80" 
                                alt="Camera feed preview"
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                            />
                            {/* Embedded Live Transparent Overlay */}
                            <iframe 
                                src={overlayUrl}
                                title="OBS Overlay Preview"
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
                            />
                        </div>

                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', margin: 0 }}>
                            This preview simulates your auctioneer video camera feed with the transparent <code>/obs-overlay</code> lower-third TV graphics active.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StreamSetupPage;
