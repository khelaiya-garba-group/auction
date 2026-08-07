import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Loader } from '../components/Loader';
import { getOptimizedImageUrl } from '../services/cloudinary';

const LiveAuctionProjectorPage = () => {
    const [searchParams] = useSearchParams();
    const auctionCode = searchParams.get('code');
    const [allAuctions, setAllAuctions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [activeAuction, setActiveAuction] = useState(null);
    const [activePlayer, setActivePlayer] = useState(null);
    const [teams, setTeams] = useState([]);
    const [sponsors, setSponsors] = useState([]);
    const [showSoldOverlay, setShowSoldOverlay] = useState(false);
    const [lastSoldPlayer, setLastSoldPlayer] = useState(null);
    const [showUnsoldOverlay, setShowUnsoldOverlay] = useState(false);
    const [lastUnsoldPlayer, setLastUnsoldPlayer] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
    const [isSmall, setIsSmall] = useState(window.innerWidth <= 600);
    const [imageError, setImageError] = useState(false);
    const [soldImageError, setSoldImageError] = useState(false);
    const [unsoldImageError, setUnsoldImageError] = useState(false);
    const [showDrawOverlay, setShowDrawOverlay] = useState(false);
    const [drawPlayerName, setDrawPlayerName] = useState('');
    const [drawPlayerPhoto, setDrawPlayerPhoto] = useState(null);
    const [tickerNumber, setTickerNumber] = useState('?');
    const [isTickerSpinning, setIsTickerSpinning] = useState(false);
    const spinTimerRef = useRef(null);
    const drawHideTimerRef = useRef(null);
    const processedEvents = useRef(new Set());
    const sponsorsLoadedRef = useRef(false);

    const triggerProjectorDrawAnimation = (targetNum, name, photo) => {
        if (targetNum == null) return;
        setShowDrawOverlay(true);
        setIsTickerSpinning(true);
        setDrawPlayerName('');
        setDrawPlayerPhoto(null);

        if (spinTimerRef.current) clearInterval(spinTimerRef.current);
        if (drawHideTimerRef.current) clearTimeout(drawHideTimerRef.current);

        let count = 0;
        const maxRolls = 22;
        spinTimerRef.current = setInterval(() => {
            count++;
            const randomFakeNum = Math.floor(Math.random() * 99) + 1;
            setTickerNumber(`#${randomFakeNum}`);

            if (count >= maxRolls) {
                clearInterval(spinTimerRef.current);
                setTickerNumber(`#${targetNum}`);
                setIsTickerSpinning(false);
                setDrawPlayerName(name || '');
                setDrawPlayerPhoto(photo || null);

                drawHideTimerRef.current = setTimeout(() => {
                    setShowDrawOverlay(false);
                }, 3000);
            }
        }, 85);
    };

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 700);
            setIsSmall(window.innerWidth <= 600);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchData = async (forceSponsors = false) => {
        try {
            console.log("Fetching fresh projector data...", { forceSponsors });
            let auctionData = null;
            if (auctionCode) {
                const { data } = await supabase
                    .from('auctions')
                    .select('*')
                    .eq('auction_code', auctionCode)
                    .maybeSingle();
                auctionData = data;
            } else {
                const { data, error } = await supabase
                    .from('auctions')
                    .select('*')
                    .neq('status', 'draft')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setAllAuctions(data || []);
                setActiveAuction(null);
                setTeams([]);
                setActivePlayer(null);
                return;
            }

            setActiveAuction(auctionData);

            if (auctionData) {
                const { data: tData } = await supabase.from('auction_teams').select('*').eq('auction_id', auctionData.id);
                setTeams(tData || []);

                const { data: apData } = await supabase
                    .from('auction_players')
                    .select('*, players(*)')
                    .eq('auction_id', auctionData.id)
                    .eq('auction_status', 'active')
                    .limit(1)
                    .maybeSingle();

                setActivePlayer(apData || null);

                // Fetch active sponsors (Only once on initial load, or if forced via clicking)
                if (!sponsorsLoadedRef.current || forceSponsors) {
                    console.log("Fetching sponsors from database (Cache miss / forced)...");
                    const { data: sData } = await supabase
                        .from('sponsors')
                        .select('*')
                        .eq('auction_id', auctionData.id)
                        .eq('is_active', true)
                        .order('sequence', { ascending: true });
                    setSponsors(sData || []);
                    sponsorsLoadedRef.current = true;
                } else {
                    console.log("Using cached sponsors data.");
                }
            } else {
                setTeams([]);
                setActivePlayer(null);
                setSponsors([]);
                sponsorsLoadedRef.current = false;
            }
        } catch (err) {
            console.error("Projector fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSoldEvent = async (apRecord) => {
        const eventKey = `${apRecord.id}-sold`;
        if (processedEvents.current.has(eventKey)) {
            console.log("Duplicate sold event ignored for player:", apRecord.id);
            return;
        }
        processedEvents.current.add(eventKey);

        const { data } = await supabase
            .from('auction_players')
            .select('*, players(*)')
            .eq('id', apRecord.id)
            .single();

        if (data) {
            setLastSoldPlayer(data);
            setShowSoldOverlay(true);
            setTimeout(() => {
                setShowSoldOverlay(false);
                setLastSoldPlayer(null);
                fetchData(); // Sync setup for next player
            }, 8000);
        }
    };

    const handleUnsoldEvent = async (apRecord) => {
        const eventKey = `${apRecord.id}-unsold`;
        if (processedEvents.current.has(eventKey)) {
            console.log("Duplicate unsold event ignored for player:", apRecord.id);
            return;
        }
        processedEvents.current.add(eventKey);

        const { data } = await supabase
            .from('auction_players')
            .select('*, players(*)')
            .eq('id', apRecord.id)
            .single();

        if (data) {
            setLastUnsoldPlayer(data);
            setShowUnsoldOverlay(true);
            setTimeout(() => {
                setShowUnsoldOverlay(false);
                setLastUnsoldPlayer(null);
                fetchData(); // Sync setup for next player
            }, 8000);
        }
    };

    useEffect(() => {
        fetchData();

        // 1. Robust Realtime Subscription
        const channel = supabase
            .channel('projector_sync_channel')
            .on('broadcast', { event: 'random_number_draw' }, payload => {
                console.log('Received random_number_draw broadcast on projector:', payload);
                if (payload?.payload?.playerNumber != null) {
                    const p = payload.payload;
                    triggerProjectorDrawAnimation(p.playerNumber, p.playerName, p.photoUrl);
                }
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'auction_players'
            }, payload => {
                console.log('Realtime Player Event:', payload.eventType, payload.new?.auction_status);
                const { new: updatedPlayer, old: oldPlayer, eventType } = payload;

                if (updatedPlayer.auction_status === 'sold') {
                    handleSoldEvent(updatedPlayer);
                } else if (updatedPlayer.auction_status === 'unsold') {
                    handleUnsoldEvent(updatedPlayer);
                } else {
                    if (updatedPlayer.auction_status === 'active') {
                        // Clear event history for this player if they are put back to active
                        processedEvents.current.delete(`${updatedPlayer.id}-sold`);
                        processedEvents.current.delete(`${updatedPlayer.id}-unsold`);
                    }

                    if (
                        eventType === 'UPDATE' &&
                        updatedPlayer.auction_status === 'active' &&
                        oldPlayer && oldPlayer.auction_status === 'active'
                    ) {
                        // Update active player's bid details locally without fetching everything
                        setActivePlayer(prev => {
                            if (prev && prev.id === updatedPlayer.id) {
                                return {
                                    ...prev,
                                    current_bid_price: updatedPlayer.current_bid_price,
                                    current_bid_team_id: updatedPlayer.current_bid_team_id,
                                    previous_bid_price: updatedPlayer.previous_bid_price,
                                    previous_bid_team_id: updatedPlayer.previous_bid_team_id
                                };
                            }
                            fetchData(); // If ID doesn't match, reload to fetch joined player profile
                            return prev;
                        });
                    } else {
                        // For other updates (e.g. pending -> active), fetch fresh data
                        fetchData();
                    }
                }
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'auctions'
            }, () => {
                console.log('Realtime Auction Event triggered refresh');
                fetchData();
            })
            .subscribe((status, err) => {
                console.log('Realtime Status:', status);
                if (status === 'SUBSCRIPTION_ERROR') {
                    console.error('Realtime Subscription Error:', err);
                }
                if (status === 'SUBSCRIBED') {
                    // Refresh on successful subscription to catch any missed events during connect
                    fetchData();
                }
            });

        // 2. Visibility Change Listener (Auto-sync when tab focused)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('Tab focused, syncing projector...');
                fetchData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 3. Heartbeat Sync (Backup in case events missed)
        const heartbeat = setInterval(() => {
            console.log('Heartbeat sync...');
            fetchData();
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(heartbeat);
        };
    }, [auctionCode]);

    useEffect(() => {
        setImageError(false);
    }, [activePlayer?.id]);

    useEffect(() => {
        setSoldImageError(false);
    }, [lastSoldPlayer?.id]);

    useEffect(() => {
        setUnsoldImageError(false);
    }, [lastUnsoldPlayer?.id]);

    // SOLD Canvas 3D Animation Hook (Holographic Golden Trophy & 3D Confetti)
    useEffect(() => {
        if (!showSoldOverlay) return;
        const canvas = document.getElementById('sold-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const project = (x, y, z) => {
            const fov = 400;
            const scale = fov / (fov + z + 300);
            const px = x * scale + canvas.width / 2;
            const py = y * scale + canvas.height * 0.45;
            return { x: px, y: py, scale: scale };
        };

        const rotateY = (x, z, rad) => {
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            return [x * cos + z * sin, -x * sin + z * cos];
        };

        const rotateX = (y, z, rad) => {
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            return [y * cos - z * sin, y * sin + z * cos];
        };

        const trophyPoints = [];
        const baseRadius = 60;
        for (let r = 0; r < 5; r++) {
            const y = 80 - r * 15;
            const rad = baseRadius - r * 10;
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
                trophyPoints.push({ x: Math.cos(a) * rad, y, z: Math.sin(a) * rad });
            }
        }
        for (let r = 0; r < 6; r++) {
            const y = -10 - r * 15;
            const rad = 25 + r * 10;
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
                trophyPoints.push({ x: Math.cos(a) * rad, y, z: Math.sin(a) * rad });
            }
        }

        class Confetti3D {
            constructor() {
                this.reset();
                this.y = Math.random() * -canvas.height - 50;
            }
            reset() {
                this.x = Math.random() * canvas.width - canvas.width / 2;
                this.y = -canvas.height / 2 - 20;
                this.z = Math.random() * 600 - 300;
                this.vx = Math.random() * 2 - 1;
                this.vy = Math.random() * 3 + 2;
                this.vz = Math.random() * 2 - 1;
                this.color = `hsl(${Math.random() * 360}, 100%, 65%)`;
                this.size = Math.random() * 12 + 6;
                this.rx = Math.random() * Math.PI;
                this.ry = Math.random() * Math.PI;
                this.rz = Math.random() * Math.PI;
                this.vrx = Math.random() * 0.05 - 0.025;
                this.vry = Math.random() * 0.05 - 0.025;
                this.vrz = Math.random() * 0.05 - 0.025;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.z += this.vz;
                this.rx += this.vrx;
                this.ry += this.vry;
                this.rz += this.vrz;

                if (this.y > canvas.height / 2 + 50) {
                    this.reset();
                }
            }
            draw() {
                const p = project(this.x, this.y, this.z);
                if (p.scale <= 0) return;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(this.rz);
                ctx.fillStyle = this.color;
                ctx.globalAlpha = Math.min(1, p.scale);
                const s = this.size * p.scale;
                ctx.fillRect(-s / 2, -s / 2, s, s);
                ctx.restore();
            }
        }

        const confettis = Array.from({ length: 85 }, () => new Confetti3D());
        let trophyAngle = 0;

        const loop = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            confettis.forEach(c => {
                c.update();
                c.draw();
            });

            trophyAngle += 0.015;
            ctx.save();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffd700';

            const rings = {};
            trophyPoints.forEach(pt => {
                let [x1, z1] = rotateY(pt.x, pt.z, trophyAngle);
                let [y1, z2] = rotateX(pt.y, z1, 0.1);
                const p = project(x1, y1, z2);

                if (!rings[pt.y]) rings[pt.y] = [];
                rings[pt.y].push(p);
            });

            Object.keys(rings).forEach(y => {
                const pts = rings[y];
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) {
                    ctx.lineTo(pts[i].x, pts[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            });

            ctx.restore();
            animationFrameId = requestAnimationFrame(loop);
        };
        loop();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [showSoldOverlay]);

    // UNSOLD Canvas 3D Animation Hook (3D Wicket Shattering & 3D Ball Collision)
    useEffect(() => {
        if (!showUnsoldOverlay) return;
        const canvas = document.getElementById('unsold-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const project = (x, y, z) => {
            const fov = 350;
            const scale = fov / (fov + z + 400);
            const px = x * scale + (window.innerWidth < 768 ? canvas.width * 0.5 : canvas.width * 0.25);
            const py = y * scale + canvas.height * 0.65;
            return { x: px, y: py, scale: scale };
        };

        const rotateY = (x, z, rad) => {
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            return [x * cos + z * sin, -x * sin + z * cos];
        };

        const rotateX = (y, z, rad) => {
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            return [y * cos - z * sin, y * sin + z * cos];
        };

        const groundY = 120;

        const ball3D = {
            x: -200,
            y: -50,
            z: -400,
            vx: 6,
            vy: 3,
            vz: 12,
            radius: 12,
            hit: false
        };

        class Stump3D {
            constructor(x) {
                this.x = x;
                this.y = groundY - 50;
                this.z = 0;
                this.w = 8;
                this.h = 100;
                this.vx = 0;
                this.vy = 0;
                this.vz = 0;
                this.rx = 0;
                this.ry = 0;
                this.rz = 0;
                this.vrx = 0;
                this.vry = 0;
                this.vrz = 0;
            }
            update() {
                if (ball3D.hit) {
                    this.vy += 0.35;
                    this.x += this.vx;
                    this.y += this.vy;
                    this.z += this.vz;
                    this.rx += this.vrx;
                    this.ry += this.vry;
                    this.rz += this.vrz;

                    if (this.y + this.h / 2 > groundY) {
                        this.y = groundY - this.h / 2;
                        this.vy = -this.vy * 0.3;
                        this.vx *= 0.8;
                        this.vz *= 0.8;
                        this.vrx *= 0.8;
                        this.vry *= 0.8;
                        this.vrz *= 0.8;
                    }
                }
            }
            draw() {
                const halfH = this.h / 2;
                const points = [
                    { x: -this.w / 2, y: -halfH, z: 0 },
                    { x: this.w / 2, y: -halfH, z: 0 },
                    { x: this.w / 2, y: halfH, z: 0 },
                    { x: -this.w / 2, y: halfH, z: 0 }
                ];

                const projPoints = points.map(pt => {
                    let [y1, z1] = rotateX(pt.y, pt.z, this.rx);
                    let [x1, z2] = rotateY(pt.x, z1, this.ry);
                    return project(x1 + this.x, y1 + this.y, z2 + this.z);
                });

                ctx.save();
                ctx.fillStyle = '#8b5a2b';
                ctx.strokeStyle = '#5c3a21';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(projPoints[0].x, projPoints[0].y);
                for (let i = 1; i < projPoints.length; i++) {
                    ctx.lineTo(projPoints[i].x, projPoints[i].y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        }

        class Bail3D {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.z = 0;
                this.w = 24;
                this.h = 5;
                this.vx = 0;
                this.vy = 0;
                this.vz = 0;
                this.rx = 0;
                this.ry = 0;
                this.rz = 0;
                this.vrx = 0;
                this.vry = 0;
                this.vrz = 0;
            }
            update() {
                if (ball3D.hit) {
                    this.vy += 0.35;
                    this.x += this.vx;
                    this.y += this.vy;
                    this.z += this.vz;
                    this.rx += this.vrx;
                    this.ry += this.vry;
                    this.rz += this.vrz;

                    if (this.y + this.h / 2 > groundY) {
                        this.y = groundY - this.h / 2;
                        this.vy = -this.vy * 0.25;
                        this.vx *= 0.8;
                        this.vz *= 0.8;
                    }
                }
            }
            draw() {
                const halfW = this.w / 2;
                const halfH = this.h / 2;
                const points = [
                    { x: -halfW, y: -halfH, z: 0 },
                    { x: halfW, y: -halfH, z: 0 },
                    { x: halfW, y: halfH, z: 0 },
                    { x: -halfW, y: halfH, z: 0 }
                ];
                const projPoints = points.map(pt => {
                    let [y1, z1] = rotateX(pt.y, pt.z, this.rx);
                    let [x1, z2] = rotateY(pt.x, z1, this.ry);
                    return project(x1 + this.x, y1 + this.y, z2 + this.z);
                });

                ctx.save();
                ctx.fillStyle = '#cd853f';
                ctx.beginPath();
                ctx.moveTo(projPoints[0].x, projPoints[0].y);
                for (let i = 1; i < projPoints.length; i++) {
                    ctx.lineTo(projPoints[i].x, projPoints[i].y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        const stumps = [
            new Stump3D(-22),
            new Stump3D(0),
            new Stump3D(22)
        ];
        const bails = [
            new Bail3D(-11, groundY - 103),
            new Bail3D(11, groundY - 103)
        ];

        class Tear {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * -canvas.height;
                this.length = Math.random() * 12 + 4;
                this.speed = Math.random() * 3 + 3;
            }
            update() {
                this.y += this.speed;
                if (this.y > canvas.height) {
                    this.y = -20;
                    this.x = Math.random() * canvas.width;
                }
            }
            draw() {
                ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x, this.y + this.length);
                ctx.stroke();
            }
        }
        const tears = Array.from({ length: 30 }, () => new Tear());

        const loop = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            tears.forEach(t => {
                t.update();
                t.draw();
            });

            if (!ball3D.hit) {
                ball3D.x += ball3D.vx;
                ball3D.y += ball3D.vy;
                ball3D.z += ball3D.vz;

                if (ball3D.z >= 0) {
                    ball3D.hit = true;
                    ball3D.vx = -4;
                    ball3D.vy = 4;
                    ball3D.vz = -2;

                    stumps[0].vx = -6;
                    stumps[0].vy = -6;
                    stumps[0].vz = -5;
                    stumps[0].vrx = 0.15;
                    stumps[0].vry = -0.1;
                    stumps[0].vrz = -0.05;

                    stumps[1].vx = 1;
                    stumps[1].vy = -8;
                    stumps[1].vz = -8;
                    stumps[1].vrx = -0.18;
                    stumps[1].vrz = 0.12;

                    stumps[2].vx = 7;
                    stumps[2].vy = -5;
                    stumps[2].vz = -4;
                    stumps[2].vrx = 0.12;
                    stumps[2].vry = 0.14;

                    bails[0].vx = -5;
                    bails[0].vy = -12;
                    bails[0].vz = -10;
                    bails[0].vrx = 0.25;

                    bails[1].vx = 6;
                    bails[1].vy = -14;
                    bails[1].vz = -12;
                    bails[1].vrx = -0.3;
                }
            } else {
                ball3D.x += ball3D.vx;
                ball3D.y += ball3D.vy;
                ball3D.z += ball3D.vz;
                ball3D.vy += 0.35;

                if (ball3D.y > groundY) {
                    ball3D.y = groundY;
                    ball3D.vy = -ball3D.vy * 0.25;
                }
            }

            const ballProj = project(ball3D.x, ball3D.y, ball3D.z);
            if (ballProj.scale > 0) {
                ctx.save();
                ctx.fillStyle = '#ef4444';
                ctx.shadowBlur = 10 * ballProj.scale;
                ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
                ctx.beginPath();
                ctx.arc(ballProj.x, ballProj.y, ball3D.radius * ballProj.scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            stumps.forEach(s => {
                s.update();
                s.draw();
            });

            bails.forEach(b => {
                b.update();
                b.draw();
            });

            animationFrameId = requestAnimationFrame(loop);
        };
        loop();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [showUnsoldOverlay]);

    // Keyboard controls for testing SOLD / UNSOLD overlay animations manually
    // useEffect(() => {
    //     const handleKeyDown = (e) => {
    //         if (e.key === 's' || e.key === 'S') {
    //             console.log("Triggering mock SOLD overlay");
    //             setLastSoldPlayer({
    //                 player_number: 99,
    //                 sold_price: 1500000,
    //                 players: {
    //                     first_name: "Virat",
    //                     last_name: "Kohli",
    //                     photo_url: "",
    //                     batting_style: "Right-hand bat",
    //                     bowling_style: "Right-arm medium",
    //                     player_role: "Batsman"
    //                 },
    //                 team_id: teams[0]?.id || null
    //             });
    //             setShowSoldOverlay(true);
    //             setTimeout(() => {
    //                 setShowSoldOverlay(false);
    //             }, 8000);
    //         }
    //         if (e.key === 'u' || e.key === 'U') {
    //             console.log("Triggering mock UNSOLD overlay");
    //             setLastUnsoldPlayer({
    //                 player_number: 45,
    //                 players: {
    //                     first_name: "Rohit",
    //                     last_name: "Sharma",
    //                     photo_url: "",
    //                     batting_style: "Right-hand bat",
    //                     bowling_style: "Right-arm offbreak",
    //                     player_role: "Batsman"
    //                 }
    //             });
    //             setShowUnsoldOverlay(true);
    //             setTimeout(() => {
    //                 setShowUnsoldOverlay(false);
    //             }, 8000);
    //         }
    //     };
    //     window.addEventListener('keydown', handleKeyDown);
    //     return () => window.removeEventListener('keydown', handleKeyDown);
    // }, [teams]);

    if (loading) return <Loader message="CALIBRATING PROJECTOR..." />;

    const winningTeam = activePlayer?.current_bid_team_id
        ? teams.find(t => t.id === activePlayer.current_bid_team_id)
        : null;
    const soldTeam = lastSoldPlayer?.team_id
        ? teams.find(t => t.id === lastSoldPlayer.team_id)
        : null;

    return (
        <div style={{
            backgroundColor: '#050a10',
            minHeight: '100vh',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            padding: 'clamp(12px, 2vw, 32px)',
            boxSizing: 'border-box',
        }}>

            {/* Background Glows */}
            <div style={{
                position: 'absolute', top: '-20%', left: '-10%', borderRadius: '50%',
                zIndex: 0, pointerEvents: 'none',
                width: 'clamp(300px, 50vw, 600px)', height: 'clamp(300px, 50vw, 600px)',
                background: 'radial-gradient(circle, rgba(255,215,0,0.05) 0%, transparent 70%)',
            }} />
            <div style={{
                position: 'absolute', bottom: '-20%', right: '-10%', borderRadius: '50%',
                zIndex: 0, pointerEvents: 'none',
                width: 'clamp(400px, 60vw, 800px)', height: 'clamp(400px, 60vw, 800px)',
                background: 'radial-gradient(circle, rgba(57,255,20,0.05) 0%, transparent 70%)',
            }} />

            <div style={{
                position: 'relative', zIndex: 1,
                display: 'flex', flexDirection: 'column',
                minHeight: 'calc(100vh - clamp(24px, 4vw, 64px))',
            }}>

                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: '8px',
                    marginBottom: 'clamp(8px, 2vh, 16px)',
                    borderBottom: '2px solid rgba(255,255,255,0.1)',
                    paddingBottom: 'clamp(6px, 1.2vh, 12px)',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h2 style={{
                            margin: 0, textTransform: 'uppercase',
                            letterSpacing: 'clamp(2px, 0.8vw, 8px)',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: 'clamp(0.75rem, 2vw, 1.5rem)',
                        }}>
                            {activeAuction?.auction_name || 'LIVE AUCTION'}
                        </h2>
                        {/* <div style={{ fontSize: 'clamp(0.6rem, 1.2vw, 0.85rem)', color: 'var(--accent-gold)', fontWeight: 'bold', letterSpacing: '1px' }}>
                            Organizer: Ronak Patel (+91 7567924142)
                        </div> */}
                    </div>
                    <div
                        onClick={() => fetchData()}
                        style={{
                            padding: '0.4rem 1.2rem', background: '#ff4444', color: '#fff',
                            fontWeight: 'bold', borderRadius: '4px', letterSpacing: '4px',
                            fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
                            animation: 'pulse 1.5s infinite', whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            userSelect: 'none',
                        }}
                        title="Click to force sync"
                    >
                        LIVE
                    </div>
                </div>

                {/* Main Content */}
                {!activeAuction ? (
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        maxWidth: '800px', margin: '0 auto', width: '100%',
                        padding: '2rem 1rem'
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 215, 0, 0.2)',
                            borderRadius: '16px',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            width: '100%',
                            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5)',
                            marginBottom: '2rem'
                        }}>
                            <h1 style={{
                                color: '#ffd700',
                                fontFamily: 'var(--font-heading)',
                                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                                margin: '0 0 1rem 0',
                                letterSpacing: '2px',
                                textTransform: 'uppercase'
                            }}>
                                Select Live Projector
                            </h1>
                            <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)' }}>
                                Choose an ongoing tournament to launch the real-time live auction projector screen.
                            </p>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '1.5rem',
                            width: '100%'
                        }}>
                            {allAuctions.length === 0 ? (
                                <div style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '12px',
                                    padding: '3rem',
                                    gridColumn: '1 / -1',
                                    textAlign: 'center'
                                }}>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>No active tournaments found.</p>
                                </div>
                            ) : (
                                allAuctions.map(a => (
                                    <Link
                                        key={a.id}
                                        to={`/live-auction-projector?code=${a.auction_code}`}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '12px',
                                            padding: '1.5rem',
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem',
                                            transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                                            cursor: 'pointer'
                                        }}
                                        className="projector-card-hover"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-5px)';
                                            e.currentTarget.style.borderColor = '#ffd700';
                                            e.currentTarget.style.boxShadow = '0 10px 20px rgba(255, 215, 0, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '4px',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase',
                                                background: a.status === 'running' ? 'rgba(239, 68, 68, 0.15)' : a.status === 'registration_open' ? 'rgba(57, 255, 20, 0.15)' : 'rgba(255,255,255,0.06)',
                                                color: a.status === 'running' ? '#f87171' : a.status === 'registration_open' ? '#39ff14' : 'rgba(255,255,255,0.4)'
                                            }}>
                                                {a.status === 'running' ? '🔴 Live' : a.status === 'registration_open' ? '🟢 Open' : '⚪ Ended'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#ffd700', fontWeight: 'bold' }}>{a.auction_code}</span>
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{a.auction_name}</h3>
                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                            {a.venue ? `📍 ${a.venue}` : ''}
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            marginTop: 'auto',
                                            color: '#39ff14',
                                            fontWeight: 'bold',
                                            fontSize: '0.85rem',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}>
                                            Launch Projector →
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                ) : !activePlayer && !showSoldOverlay && !showUnsoldOverlay ? (
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        textAlign: 'center', padding: '1rem',
                    }}>
                        <div style={{ position: 'relative', width: '250px', height: '160px', marginBottom: '1rem' }}>
                            <svg width="250" height="160" viewBox="0 0 250 200" style={{ overflow: 'visible' }}>
                                <defs>
                                    <linearGradient id="pitchGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                                        <stop offset="0%" stopColor="#111827" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="transparent" />
                                    </linearGradient>
                                    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="var(--accent-gold)" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="transparent" />
                                    </radialGradient>
                                </defs>

                                {/* Glowing background halo */}
                                <circle cx="125" cy="100" r="80" fill="url(#glow)" style={{ animation: 'pulseGlow 3s infinite ease-in-out' }} />

                                {/* Pitch/Ground representation */}
                                <ellipse cx="125" cy="145" rx="100" ry="12" fill="url(#pitchGrad)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                                {/* Stumps / Wickets */}
                                <g stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round" fill="none">
                                    <line x1="165" y1="140" x2="165" y2="70" />
                                    <line x1="173" y1="140" x2="173" y2="70" />
                                    <line x1="181" y1="140" x2="181" y2="70" />
                                    {/* Bails */}
                                    <line x1="162" y1="67" x2="184" y2="67" strokeWidth="2.5" stroke="var(--accent-gold)" />
                                </g>

                                {/* Batsman Silhouette */}
                                <g className="batsman-anim" style={{ transformOrigin: '70px 140px' }}>
                                    {/* Body */}
                                    <path d="M 60,140 Q 55,105 65,90 T 75,70" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="8" strokeLinecap="round" />
                                    {/* Head */}
                                    <circle cx="75" cy="60" r="8" fill="rgba(255,255,255,0.5)" />
                                    {/* Leg Left */}
                                    <path d="M 60,140 L 52,165" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="8" strokeLinecap="round" />
                                    {/* Leg Right */}
                                    <path d="M 60,140 L 70,165" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="8" strokeLinecap="round" />
                                    
                                    {/* Arms holding the bat */}
                                    <path d="M 65,90 Q 85,90 95,95" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="6" strokeLinecap="round" />
                                    
                                    {/* Bat */}
                                    <g>
                                        {/* Grip */}
                                        <line x1="70" y1="85" x2="105" y2="55" stroke="#ffd700" strokeWidth="4" strokeLinecap="round" />
                                        {/* Blade */}
                                        <path d="M 100,60 L 140,25 L 146,30 L 106,65 Z" fill="var(--accent-gold)" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
                                        
                                        <animateTransform 
                                            attributeName="transform" 
                                            type="rotate" 
                                            values="0 70 85; -35 70 85; 60 70 85; 0 70 85; 0 70 85" 
                                            keyTimes="0; 0.3; 0.45; 0.7; 1" 
                                            dur="2.5s" 
                                            repeatCount="indefinite" 
                                        />
                                    </g>
                                </g>

                                {/* Ball */}
                                <circle r="7" fill="#ef4444" style={{ filter: 'drop-shadow(0 0 6px #ef4444)' }}>
                                    <animate attributeName="cx" values="-30; 50; 95; 98; 260" keyTimes="0; 0.25; 0.45; 0.46; 0.65" dur="2.5s" repeatCount="indefinite" />
                                    <animate attributeName="cy" values="60; 125; 85; 80; -40" keyTimes="0; 0.25; 0.45; 0.46; 0.65" dur="2.5s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" values="0; 1; 1; 1; 1; 0; 0" keyTimes="0; 0.05; 0.25; 0.45; 0.65; 0.75; 1" dur="2.5s" repeatCount="indefinite" />
                                </circle>

                                {/* Impact sparks */}
                                <circle cx="95" cy="85" fill="none" stroke="#fff" strokeWidth="2">
                                    <animate attributeName="r" values="1; 1; 18; 1" keyTimes="0; 0.43; 0.55; 1" dur="2.5s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" values="0; 0; 1; 0; 0" keyTimes="0; 0.43; 0.45; 0.55; 1" dur="2.5s" repeatCount="indefinite" />
                                </circle>
                            </svg>
                        </div>
                        <h1 style={{ 
                            fontSize: 'clamp(1.5rem, 4vw, 3rem)', 
                            color: 'var(--accent-gold)', 
                            margin: 0, 
                            letterSpacing: '3px',
                            fontWeight: 900,
                            textShadow: '0 0 20px rgba(255, 215, 0, 0.4)',
                            textTransform: 'uppercase',
                            animation: 'pulseText 2s infinite'
                        }}>
                            Waiting for next turn...
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                            Organizers are preparing the next player card
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                        gap: isMobile ? '20px' : 'clamp(20px, 5vw, 60px)',
                        flex: 1,
                        alignItems: isMobile ? 'start' : 'center',
                    }}>

                        {/* Player Photo Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                {/* Player Number Badge */}
                                {activePlayer?.player_number != null && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        left: '12px',
                                        background: 'var(--accent-gold)',
                                        color: '#000',
                                        padding: 'clamp(4px, 0.8vh, 8px) clamp(8px, 1.5vw, 16px)',
                                        borderRadius: 'clamp(4px, 0.8vw, 8px)',
                                        fontSize: 'clamp(0.8rem, 1.5vw, 1.4rem)',
                                        fontWeight: 900,
                                        zIndex: 10,
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                                        border: '2px solid rgba(0,0,0,0.2)',
                                    }}>
                                        #{activePlayer.player_number}
                                    </div>
                                )}
                                {(activePlayer?.players?.photo_url && !imageError) ? (
                                    <img
                                        src={getOptimizedImageUrl(activePlayer.players.photo_url, 600)}
                                        alt="Player"
                                        onError={() => setImageError(true)}
                                        style={{
                                            width: 'auto',
                                            height: isMobile ? 'clamp(260px, 75vw, 450px)' : 'clamp(420px, 68vh, 750px)',
                                            maxWidth: '100%',
                                            objectFit: 'cover',
                                            borderRadius: 'clamp(12px, 2vw, 30px)',
                                            border: 'clamp(4px, 0.8vw, 8px) solid #ffd700',
                                            boxShadow: '0 0 80px rgba(255,215,0,0.2)',
                                            display: 'block',
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: isMobile ? 'clamp(260px, 75vw, 450px)' : 'clamp(420px, 68vh, 750px)',
                                        height: isMobile ? 'clamp(260px, 75vw, 450px)' : 'clamp(420px, 68vh, 750px)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(57,255,20,0.05))',
                                        color: 'rgba(255,215,0,0.3)',
                                        fontSize: isMobile ? 'clamp(4.5rem, 20vw, 10rem)' : 'clamp(7rem, 18vh, 20rem)',
                                        fontWeight: 900,
                                        borderRadius: 'clamp(12px, 2vw, 30px)',
                                        border: 'clamp(4px, 0.8vw, 8px) solid #ffd700',
                                        boxShadow: '0 0 80px rgba(255,215,0,0.2)',
                                    }}>
                                        {(activePlayer?.players?.first_name?.charAt(0) || '') + (activePlayer?.players?.last_name?.charAt(0) || '')}
                                    </div>
                                )}
                                <div style={{
                                    position: 'absolute',
                                    bottom: 'clamp(-10px, -1.5vh, -18px)',
                                    left: '50%', transform: 'translateX(-50%)',
                                    background: '#ffd700', color: '#000',
                                    padding: 'clamp(4px, 1vh, 10px) clamp(12px, 2.5vw, 28px)',
                                    borderRadius: 'clamp(6px, 1vw, 12px)',
                                    fontSize: isMobile ? 'clamp(0.65rem, 3vw, 1rem)' : 'clamp(0.7rem, 1.5vw, 1.8rem)',
                                    fontWeight: 900,
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {activePlayer?.players?.player_role?.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        {/* Bid Info Column */}
                        <div style={{
                            display: 'flex', flexDirection: 'column', justifyContent: 'center',
                            color: '#ffd700',
                            paddingTop: 'clamp(10px, 1.5vh, 20px)',
                        }}>
                            <h1 style={{
                                fontSize: isMobile ? 'clamp(1.4rem, 6vw, 2.5rem)' : 'clamp(1.6rem, 4.5vw, 5rem)',
                                margin: '0 0 clamp(4px, 1vh, 12px) 0',
                                lineHeight: 1.2,
                                textShadow: '0 8px 20px rgba(0,0,0,0.5)',
                                wordBreak: 'break-word',
                            }}>
                                {activePlayer?.players?.first_name}{' '}
                                <span>{activePlayer?.players?.last_name}</span>
                            </h1>
                            <div style={{
                                fontSize: isMobile ? 'clamp(0.7rem, 3vw, 1rem)' : 'clamp(0.75rem, 1.5vw, 1.8rem)',
                                color: 'rgba(255,255,255,0.7)',
                                margin: '0 0 clamp(8px, 2vh, 20px) 0',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'clamp(4px, 1vh, 8px)'
                            }}>
                                <div style={{ display: 'flex', gap: 'clamp(8px, 1.5vw, 20px)', flexWrap: 'wrap' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9em' }}>Batting Style:</span>
                                    <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{activePlayer?.players?.batting_style || 'N/A'}</span>
                                    <span style={{ opacity: 0.3 }}>|</span>
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9em' }}>Bowling Style:</span>
                                    <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{activePlayer?.players?.bowling_style || 'N/A'}</span>
                                </div>
                                <div style={{ opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    State: {activePlayer?.players?.state} | Base: ₹{(activeAuction?.base_price || 0).toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '2px solid rgba(255,215,0,0.2)',
                                padding: 'clamp(10px, 2vh, 20px)',
                                borderRadius: 'clamp(12px, 2vw, 25px)',
                                boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    fontSize: isMobile ? 'clamp(0.6rem, 2.5vw, 0.9rem)' : 'clamp(0.7rem, 1.2vw, 1.4rem)',
                                    color: '#ffd700', textTransform: 'uppercase',
                                    letterSpacing: '4px',
                                    marginBottom: 'clamp(4px, 0.5vh, 10px)',
                                    fontWeight: 'bold',
                                }}>
                                    Current Bid
                                </div>
                                {(() => {
                                    const bidVal = activePlayer?.current_bid_price || activeAuction?.base_price || 0;
                                    const bidStr = `₹ ${bidVal.toLocaleString('en-IN')}`;
                                    const len = bidStr.length;
                                    let dynamicFontSize = isMobile 
                                        ? (len > 16 ? '1.3rem' : len > 12 ? '1.7rem' : len > 9 ? '2.1rem' : '2.8rem')
                                        : (len > 18 ? '2.2rem' : len > 14 ? '2.8rem' : len > 11 ? '3.4rem' : len > 8 ? '4.2rem' : '5.5rem');
                                    return (
                                        <div style={{
                                            fontSize: dynamicFontSize,
                                            fontWeight: 900,
                                            margin: '0 0 clamp(8px, 1.5vh, 20px) 0',
                                            fontFamily: 'monospace',
                                            color: winningTeam ? '#39ff14' : '#fff',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: '100%',
                                            lineHeight: 1.15
                                        }}>
                                            {bidStr}
                                        </div>
                                    );
                                })()}

                                {winningTeam ? (
                                    <div style={{
                                        display: 'flex', alignItems: 'center',
                                        gap: 'clamp(8px, 1.5vw, 20px)',
                                        padding: 'clamp(6px, 1.2vh, 12px)',
                                        background: 'rgba(57,255,20,0.1)',
                                        borderRadius: 'clamp(8px, 1vw, 15px)',
                                        border: '1px solid #39ff14',
                                        flexWrap: 'wrap',
                                    }}>
                                        {winningTeam.logo_url && (
                                            <img src={winningTeam.logo_url} alt="Team" style={{
                                                width: 'clamp(28px, 5vw, 70px)',
                                                height: 'clamp(28px, 5vw, 70px)',
                                                objectFit: 'contain', flexShrink: 0,
                                            }} />
                                        )}
                                        <div style={{
                                            fontSize: isMobile ? 'clamp(0.9rem, 4vw, 1.4rem)' : 'clamp(1rem, 2.5vw, 2rem)',
                                            fontWeight: 'bold', color: '#39ff14',
                                        }}>
                                            {winningTeam.team_name}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        fontSize: isMobile ? 'clamp(0.9rem, 4vw, 1.4rem)' : 'clamp(1rem, 2.5vw, 2rem)',
                                        fontWeight: 'bold', color: '#ff4444',
                                        animation: 'flash 1s infinite',
                                    }}>
                                        OPENING BID...
                                    </div>
                                )}
                            </div>

                            {/* {activePlayer?.current_bid_price >= 20000 && (
                                <div style={{
                                    marginTop: 'clamp(12px, 2vh, 24px)',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '2px solid rgba(255, 215, 0, 0.4)',
                                    padding: 'clamp(10px, 2vh, 20px)',
                                    borderRadius: 'clamp(12px, 2vw, 20px)',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 'clamp(10px, 2vw, 20px)',
                                    animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both, goldGlowPulse 2s infinite ease-in-out',
                                    backdropFilter: 'blur(10px)',
                                }}>
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                    }}>
                                        <div style={{
                                            fontSize: isMobile ? 'clamp(0.9rem, 3.5vw, 1.3rem)' : 'clamp(1.1rem, 2vw, 1.8rem)',
                                            fontWeight: 900,
                                            color: '#ffd700',
                                            textShadow: '0 0 12px rgba(255,215,0,0.5)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            marginBottom: '4px',
                                        }}>
                                            Sab Changa Si!
                                        </div>
                                        <div style={{
                                            fontSize: isMobile ? 'clamp(0.7rem, 2.5vw, 0.95rem)' : 'clamp(0.8rem, 1.2vw, 1.1rem)',
                                            color: 'rgba(255, 255, 255, 0.85)',
                                            lineHeight: 1.4,
                                        }}>
                                            The current bid is <span style={{ color: '#ffd700', fontWeight: 'bold' }}>₹{activePlayer.current_bid_price.toLocaleString()}</span>! 🔥
                                        </div>
                                    </div>
                                    <div style={{ flexShrink: 0 }}>
                                        <img
                                            src="https://media1.tenor.com/m/rcUlT6pAH9MAAAAd/jethalal-sab-changa-c.gif"
                                            alt="Jethalal Sab Changa C"
                                            style={{
                                                width: isMobile ? 'clamp(80px, 15vw, 120px)' : 'clamp(120px, 16vh, 160px)',
                                                height: isMobile ? 'clamp(80px, 15vw, 120px)' : 'clamp(120px, 16vh, 160px)',
                                                borderRadius: '12px',
                                                border: '2px solid #ffd700',
                                                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                                                objectFit: 'cover',
                                            }}
                                        />
                                    </div>
                                </div>
                            )} */}
                        </div>
                    </div>
                )}

                {/* Sponsors Ticker */}
                {activeAuction && sponsors && sponsors.length > 0 && (
                    <div style={{
                        marginTop: 'auto',
                        paddingTop: 'clamp(8px, 1.2vh, 16px)',
                        borderTop: '1.5px solid rgba(255, 255, 255, 0.08)',
                        width: '100%',
                        textAlign: 'center',
                        zIndex: 2,
                        overflow: 'hidden'
                    }}>
                        <div 
                            onClick={() => fetchData(true)}
                            style={{
                                fontSize: 'clamp(0.6rem, 1.2vw, 0.8rem)',
                                textTransform: 'uppercase',
                                letterSpacing: '3px',
                                color: 'var(--accent-gold)',
                                marginBottom: 'clamp(6px, 1vh, 12px)',
                                fontWeight: 'bold',
                                opacity: 0.8,
                                cursor: 'pointer',
                                display: 'inline-block',
                                userSelect: 'none'
                            }}
                            title="Click to reload sponsors"
                        >
                            Tournament Sponsors 🔄
                        </div>
                        <div style={{
                            overflow: 'hidden',
                            width: '100%',
                            display: 'flex',
                            maskImage: 'linear-gradient(to right, transparent, white 15%, white 85%, transparent)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent, white 15%, white 85%, transparent)',
                        }}>
                            <div style={{
                                display: 'flex',
                                gap: 'clamp(15px, 2.5vw, 35px)',
                                animation: 'marquee 25s linear infinite',
                                whiteSpace: 'nowrap',
                                width: 'max-content',
                                padding: '4px 0'
                            }}>
                                {(sponsors.length < 4 
                                    ? [...sponsors, ...sponsors, ...sponsors, ...sponsors] 
                                    : [...sponsors, ...sponsors]
                                ).map((sponsor, idx) => (
                                    <div 
                                        key={`${sponsor.id}-${idx}`} 
                                        style={{ 
                                            display: 'inline-flex', 
                                            flexDirection: 'column',
                                            alignItems: 'center', 
                                            gap: '4px',
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            padding: '8px 16px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
                                            textAlign: 'center',
                                            flexShrink: 0
                                        }}
                                    >
                                        <span style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1rem)', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                            {sponsor.name}
                                        </span>
                                        {sponsor.photo_url ? (
                                            <img 
                                                src={getOptimizedImageUrl(sponsor.photo_url, 300)} 
                                                alt={sponsor.name} 
                                                style={{ 
                                                    height: 'clamp(60px, 8.5vh, 95px)', 
                                                    width: 'clamp(120px, 15vw, 200px)',
                                                    objectFit: 'contain',
                                                    borderRadius: '6px'
                                                }} 
                                            />
                                        ) : (
                                            <div style={{
                                                height: 'clamp(60px, 8.5vh, 95px)', 
                                                width: 'clamp(120px, 15vw, 200px)',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.8rem',
                                                color: 'rgba(255,255,255,0.4)',
                                            }}>
                                                NO LOGO
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SOLD Overlay */}
            {showSoldOverlay && lastSoldPlayer && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'radial-gradient(circle at center, rgba(16,24,39,0.98) 0%, #050a10 100%)',
                    zIndex: 1000,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.8s cubic-bezier(0.19,1,0.22,1)',
                    border: 'clamp(6px, 1.5vw, 15px) solid #ffd700',
                    overflowY: 'hidden',
                    padding: 'clamp(10px, 2vh, 24px)',
                    boxSizing: 'border-box',
                }}>
                    {/* Canvas Confetti and Fireworks */}
                    <canvas id="sold-canvas" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}></canvas>

                    <div className="sold-details-container">
                        <div style={{
                            fontSize: 'clamp(1rem, 2.8vh, 2.2rem)', color: '#fff',
                            textTransform: 'uppercase', letterSpacing: 'clamp(2px, 1vw, 12px)',
                            marginBottom: 'clamp(2px, 0.5vh, 8px)',
                            position: 'relative', zIndex: 2,
                            animation: 'slideUp 1s ease-out', textAlign: 'center',
                        }}>
                            Congratulations!
                        </div>

                        <div style={{
                            fontSize: 'clamp(2.5rem, 9vh, 6.5rem)', fontWeight: 900,
                            color: '#ffd700', textShadow: '0 0 30px rgba(255,215,0,0.5)',
                            transform: 'rotate(-3deg)',
                            marginBottom: 'clamp(8px, 1.5vh, 20px)',
                            position: 'relative', zIndex: 2,
                            animation: 'bounceIn 1.2s cubic-bezier(0.36,0,0.66,-0.56) both',
                            textAlign: 'center', width: '100%',
                        }}>
                            SOLD!
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: isSmall ? 'column' : 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'clamp(16px, 3vw, 40px)',
                            width: '100%',
                            maxWidth: '1200px',
                            zIndex: 2,
                            animation: 'scaleUp 1s 0.3s both',
                        }}>
                            {/* Rotating bat & dancing player animation & Tenor GIF */}
                            <div style={{ display: 'flex', flexDirection: isSmall ? 'column' : 'row', alignItems: 'center', gap: 'clamp(15px, 2.5vw, 30px)', flexShrink: 0 }}>
                                <div className="cricket-anim-sold-static-container" style={{
                                    width: 'clamp(180px, 25vh, 300px)',
                                    height: 'clamp(180px, 25vh, 300px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <svg width="100%" height="100%" viewBox="0 0 400 400" style={{ pointerEvents: 'none' }}>
                                        <defs>
                                            <linearGradient id="batWood" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#d97706" />
                                                <stop offset="50%" stopColor="#b45309" />
                                                <stop offset="100%" stopColor="#78350f" />
                                            </linearGradient>
                                            <linearGradient id="batGrip" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#ffd700" />
                                                <stop offset="100%" stopColor="#b45309" />
                                            </linearGradient>
                                            <radialGradient id="ballShade" cx="30%" cy="30%" r="70%">
                                                <stop offset="0%" stopColor="#ff6b6b" />
                                                <stop offset="70%" stopColor="#b91c1c" />
                                                <stop offset="100%" stopColor="#450a0a" />
                                            </radialGradient>
                                        </defs>
                                        <circle className="anim-shockwave" cx="200" cy="200" r="1" fill="none" stroke="#ffd700" strokeWidth="4" />
                                        <g className="anim-sparks" style={{ transformOrigin: '200px 200px' }}>
                                            <path d="M200,160 L200,130 M200,240 L200,270 M160,200 L130,200 M240,200 L270,200 M170,170 L150,150 M230,230 L250,250 M170,230 L150,250 M230,170 L250,150" stroke="#ffd700" strokeWidth="6" strokeLinecap="round" />
                                        </g>
                                        <g className="dancing-player-body" style={{ transformOrigin: '200px 220px' }}>
                                            <path d="M 188,220 Q 175,250 170,270" fill="none" stroke="#1e3a8a" strokeWidth="10" strokeLinecap="round" className="dancing-leg-left" style={{ transformOrigin: '188px 220px' }} />
                                            <ellipse cx="166" cy="272" rx="8" ry="5" fill="#fff" />
                                            <path d="M 212,220 Q 225,250 230,270" fill="none" stroke="#1e3a8a" strokeWidth="10" strokeLinecap="round" className="dancing-leg-right" style={{ transformOrigin: '212px 220px' }} />
                                            <ellipse cx="234" cy="272" rx="8" ry="5" fill="#fff" />
                                            <path d="M 180,165 L 220,165 L 215,225 L 185,225 Z" fill="#ffd700" stroke="#ffd700" strokeWidth="2" />
                                            <path d="M 180,175 L 217,200 L 215,210 L 182,185 Z" fill="#1e3a8a" />
                                            <text x="200" y="205" fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">7</text>
                                            <path d="M 180,175 Q 150,160 140,185" fill="none" stroke="#ffd700" strokeWidth="8" strokeLinecap="round" />
                                            <circle cx="138" cy="188" r="6" fill="#fff" />
                                            <path d="M 220,175 Q 250,175 260,195" fill="none" stroke="#ffd700" strokeWidth="8" strokeLinecap="round" />
                                            <circle cx="262" cy="198" r="6" fill="#fff" />
                                            <g className="celebrating-bat" style={{ transformOrigin: '262px 198px' }}>
                                                <rect x="259" y="168" width="6" height="30" rx="2" fill="url(#batGrip)" />
                                                <path d="M 254,88 L 270,88 L 274,168 C 274,172 270,175 262,175 C 254,175 250,172 250,168 Z" fill="url(#batWood)" />
                                                <rect x="252" y="110" width="20" height="35" fill="#ffd700" opacity="0.8" />
                                            </g>
                                            <rect x="195" y="158" width="10" height="10" fill="#ffedd5" />
                                            <circle cx="200" cy="146" r="16" fill="#ffedd5" />
                                            <circle cx="194" cy="144" r="2" fill="#000" />
                                            <circle cx="206" cy="144" r="2" fill="#000" />
                                            <path d="M 193,151 Q 200,158 207,151" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" />
                                            <path d="M 182,142 A 18,18 0 0,1 218,142 Z" fill="#1e3a8a" />
                                            <path d="M 215,142 L 230,145 L 230,149 L 215,148 Z" fill="#ffd700" />
                                        </g>
                                        <g className="confetti-group" style={{ transformOrigin: '200px 200px' }}>
                                            <circle cx="120" cy="150" r="4" fill="#ff0" />
                                            <circle cx="280" cy="150" r="4" fill="#0ff" />
                                            <circle cx="150" cy="100" r="3" fill="#f0f" />
                                            <circle cx="250" cy="100" r="3" fill="#ff0" />
                                            <circle cx="100" cy="220" r="5" fill="#39ff14" />
                                            <circle cx="300" cy="220" r="5" fill="#ff4444" />
                                        </g>
                                    </svg>
                                </div>
                                {/* <img
                                    src="https://media1.tenor.com/m/Q9woRkqECoQAAAAd/strong.gif"
                                    alt="Strong Celebration"
                                    style={{
                                        width: 'clamp(220px, 30vh, 380px)',
                                        height: 'auto',
                                        aspectRatio: '1.40351',
                                        borderRadius: '16px',
                                        border: '4px solid var(--accent-gold)',
                                        boxShadow: '0 0 30px rgba(255,215,0,0.4)',
                                        objectFit: 'cover',
                                        flexShrink: 0
                                    }}
                                /> */}
                            </div>

                            {/* Details Card */}
                            <div style={{
                                display: 'flex',
                                flexDirection: isSmall ? 'column' : 'row',
                                alignItems: 'center',
                                gap: isSmall ? '16px' : 'clamp(16px, 3vw, 40px)',
                                textAlign: isSmall ? 'center' : 'left',
                                background: 'rgba(255,255,255,0.05)',
                                padding: isSmall ? '16px 12px' : 'clamp(12px, 2vh, 32px)',
                                borderRadius: 'clamp(12px, 2vw, 30px)',
                                border: '2px solid rgba(255,215,0,0.4)',
                                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                                maxWidth: '100%',
                                flex: 1,
                            }}>
                                <div style={{ position: 'relative' }}>
                                    {lastSoldPlayer?.player_number != null && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            left: '-8px',
                                            background: 'var(--accent-gold)',
                                            color: '#000',
                                            padding: 'clamp(3px, 0.6vh, 6px) clamp(8px, 1.2vw, 14px)',
                                            borderRadius: '50px',
                                            fontSize: 'clamp(0.7rem, 1vw, 1.1rem)',
                                            fontWeight: 900,
                                            zIndex: 10,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                            border: '2px solid #fff',
                                        }}>
                                            #{lastSoldPlayer.player_number}
                                        </div>
                                    )}
                                    {(lastSoldPlayer.players.photo_url && !soldImageError) ? (
                                        <img
                                            src={getOptimizedImageUrl(lastSoldPlayer.players.photo_url, 400)}
                                            alt="Sold"
                                            onError={() => setSoldImageError(true)}
                                            style={{
                                                width: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                                height: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                                borderRadius: '50%',
                                                border: 'clamp(3px, 0.6vw, 8px) solid #39ff14',
                                                objectFit: 'cover',
                                                boxShadow: '0 0 40px rgba(57,255,20,0.3)',
                                                flexShrink: 0,
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                            height: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                            borderRadius: '50%',
                                            border: 'clamp(3px, 0.6vw, 8px) solid #39ff14',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'linear-gradient(135deg, rgba(57,255,20,0.1), rgba(255,255,255,0.05))',
                                            color: 'rgba(57,255,20,0.3)',
                                            fontSize: isSmall ? 'clamp(1.5rem, 5vh, 2.5rem)' : 'clamp(2.5rem, 7vh, 4.5rem)',
                                            fontWeight: 900,
                                            boxShadow: '0 0 40px rgba(57,255,20,0.3)',
                                            flexShrink: 0,
                                        }}>
                                            {(lastSoldPlayer.players.first_name?.charAt(0) || '') + (lastSoldPlayer.players.last_name?.charAt(0) || '')}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 0.8vh, 12px)', minWidth: 0 }}>
                                    <div style={{
                                        fontSize: isSmall ? 'clamp(1.1rem, 3.8vh, 1.6rem)' : 'clamp(1.3rem, 4.5vh, 2.8rem)',
                                        fontWeight: 'bold', color: '#fff', wordBreak: 'break-word',
                                    }}>
                                        {lastSoldPlayer.players.first_name} {lastSoldPlayer.players.last_name}
                                    </div>
                                    <div style={{
                                        fontSize: isSmall ? 'clamp(1.1rem, 3.8vh, 1.6rem)' : 'clamp(1.4rem, 4.8vh, 3.2rem)',
                                        color: '#ffd700', fontWeight: 900,
                                    }}>
                                        ₹ {lastSoldPlayer.sold_price.toLocaleString()}
                                    </div>
                                    <div style={{
                                        fontSize: isSmall ? 'clamp(0.7rem, 2.2vh, 0.9rem)' : 'clamp(0.8rem, 2.5vh, 1.4rem)',
                                        color: 'rgba(255,255,255,0.6)',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        gap: 'clamp(8px, 1.5vw, 20px)',
                                        marginBottom: 'clamp(4px, 1vh, 12px)'
                                    }}>
                                        <span style={{ opacity: 0.5 }}>Batting:</span>
                                        <span>{lastSoldPlayer.players.batting_style}</span>
                                        <span style={{ opacity: 0.3 }}>|</span>
                                        <span style={{ opacity: 0.5 }}>Bowling:</span>
                                        <span>{lastSoldPlayer.players.bowling_style}</span>
                                    </div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: isSmall ? 'center' : 'flex-start',
                                        gap: 'clamp(8px, 1vw, 16px)',
                                        flexWrap: 'wrap',
                                    }}>
                                        {soldTeam?.logo_url && (
                                            <img src={soldTeam.logo_url} alt="Team" style={{
                                                width: isSmall ? 'clamp(20px, 4vh, 32px)' : 'clamp(30px, 6vh, 50px)',
                                                height: isSmall ? 'clamp(20px, 4vh, 32px)' : 'clamp(30px, 6vh, 50px)',
                                                objectFit: 'contain',
                                            }} />
                                        )}
                                        <div style={{
                                            fontSize: isSmall ? 'clamp(1rem, 3.5vh, 1.5rem)' : 'clamp(1.2rem, 4vh, 2.4rem)',
                                            fontWeight: 900, color: '#39ff14', wordBreak: 'break-word',
                                        }}>
                                            {soldTeam?.team_name}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* UNSOLD Overlay */}
            {showUnsoldOverlay && lastUnsoldPlayer && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'radial-gradient(circle at center, rgba(31,41,55,0.98) 0%, #050a10 100%)',
                    zIndex: 1000,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.8s cubic-bezier(0.19,1,0.22,1)',
                    border: 'clamp(6px, 1.5vw, 15px) solid #ff4444',
                    overflowY: 'hidden',
                    padding: 'clamp(10px, 2vh, 24px)',
                    boxSizing: 'border-box',
                }}>
                    {/* Canvas Stump Shattering Physics */}
                    <canvas id="unsold-canvas" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}></canvas>

                    <div className="unsold-details-container" style={{ position: 'relative', zIndex: 2 }}>
                        <div style={{
                            fontSize: 'clamp(1rem, 2.8vh, 2.2rem)', color: '#fff',
                            textTransform: 'uppercase', letterSpacing: 'clamp(2px, 1vw, 12px)',
                            marginBottom: 'clamp(2px, 0.5vh, 8px)',
                            position: 'relative', zIndex: 2,
                            animation: 'slideUp 1s ease-out', textAlign: 'center',
                        }}>
                            Better Luck Next Time!
                        </div>

                        <div style={{
                            fontSize: 'clamp(2.5rem, 9vh, 6.5rem)', fontWeight: 900,
                            color: '#ff4444', textShadow: '0 0 30px rgba(255,68,68,0.5)',
                            transform: 'rotate(-3deg)',
                            marginBottom: 'clamp(8px, 1.5vh, 20px)',
                            position: 'relative', zIndex: 2,
                            animation: 'bounceIn 1.2s cubic-bezier(0.36,0,0.66,-0.56) both',
                            textAlign: 'center', width: '100%',
                        }}>
                            UNSOLD
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: isSmall ? 'column' : 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'clamp(16px, 3vw, 40px)',
                            width: '100%',
                            maxWidth: '1200px',
                            zIndex: 2,
                            animation: 'scaleUp 1s 0.3s both',
                        }}>
                            {/* Wickets & sad walking cricketer SVG */}
                            <div style={{ display: 'flex', flexDirection: isSmall ? 'column' : 'row', alignItems: 'center', gap: 'clamp(15px, 2.5vw, 30px)', flexShrink: 0 }}>
                                <div className="cricket-anim-unsold-static-container" style={{
                                    width: 'clamp(180px, 25vh, 300px)',
                                    height: 'clamp(180px, 25vh, 300px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <svg width="100%" height="100%" viewBox="0 0 400 400" style={{ pointerEvents: 'none' }}>
                                        <defs>
                                            <linearGradient id="stumpWood" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#cd853f" />
                                                <stop offset="50%" stopColor="#8b5a2b" />
                                                <stop offset="100%" stopColor="#5c3a21" />
                                            </linearGradient>
                                            <linearGradient id="batWood" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#d97706" />
                                                <stop offset="50%" stopColor="#b45309" />
                                                <stop offset="100%" stopColor="#78350f" />
                                            </linearGradient>
                                            <linearGradient id="batGrip" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#ffd700" />
                                                <stop offset="100%" stopColor="#b45309" />
                                            </linearGradient>
                                            <radialGradient id="redBallShade" cx="30%" cy="30%" r="70%">
                                                <stop offset="0%" stopColor="#ff4d4d" />
                                                <stop offset="70%" stopColor="#990000" />
                                                <stop offset="100%" stopColor="#3d0000" />
                                            </radialGradient>
                                        </defs>
                                        <circle className="anim-unsold-shockwave" cx="200" cy="180" r="1" fill="none" stroke="#ff4444" strokeWidth="4" />
                                        <g className="anim-stump-left" style={{ transformOrigin: '175px 260px' }}>
                                            <rect x="171" y="160" width="8" height="100" rx="3" fill="url(#stumpWood)" />
                                        </g>
                                        <g className="anim-stump-mid" style={{ transformOrigin: '200px 260px' }}>
                                            <rect x="196" y="160" width="8" height="100" rx="3" fill="url(#stumpWood)" />
                                        </g>
                                        <g className="anim-stump-right" style={{ transformOrigin: '225px 260px' }}>
                                            <rect x="221" y="160" width="8" height="100" rx="3" fill="url(#stumpWood)" />
                                        </g>
                                        <g className="anim-bail-left" style={{ transformOrigin: '185px 156px' }}>
                                            <rect x="170" y="154" width="28" height="6" rx="2" fill="url(#stumpWood)" />
                                        </g>
                                        <g className="anim-bail-right" style={{ transformOrigin: '215px 156px' }}>
                                            <rect x="202" y="154" width="28" height="6" rx="2" fill="url(#stumpWood)" />
                                        </g>
                                        <g className="anim-unsold-ball">
                                            <circle cx="0" cy="0" r="14" fill="url(#redBallShade)" />
                                            <path d="M -14,0 A 14,14 0 0,0 14,0" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="2,2" />
                                        </g>
                                        <g className="sad-cricketer-walk" style={{ transformOrigin: '200px 220px' }}>
                                            <path d="M 188,220 Q 175,250 170,270" fill="none" stroke="#475569" strokeWidth="10" strokeLinecap="round" className="sad-leg-left" style={{ transformOrigin: '188px 220px' }} />
                                            <ellipse cx="166" cy="272" rx="8" ry="5" fill="#fff" />
                                            <path d="M 212,220 Q 225,250 230,270" fill="none" stroke="#475569" strokeWidth="10" strokeLinecap="round" className="sad-leg-right" style={{ transformOrigin: '212px 220px' }} />
                                            <ellipse cx="234" cy="272" rx="8" ry="5" fill="#fff" />
                                            <path d="M 180,165 L 220,165 L 215,225 L 185,225 Z" fill="#64748b" stroke="#64748b" strokeWidth="2" />
                                            <path d="M 180,175 L 217,200 L 215,210 L 182,185 Z" fill="#334155" />
                                            <text x="200" y="205" fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">0</text>
                                            <path d="M 180,175 Q 165,155 180,148" fill="none" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
                                            <circle cx="180" cy="148" r="6" fill="#fff" />
                                            <path d="M 220,175 Q 235,210 240,220" fill="none" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
                                            <circle cx="240" cy="220" r="6" fill="#fff" />
                                            <g style={{ transformOrigin: '240px 220px', transform: 'rotate(25deg)' }}>
                                                <rect x="237" y="190" width="6" height="30" rx="2" fill="url(#batGrip)" />
                                                <path d="M 232,220 L 248,220 L 252,295 C 252,299 248,302 240,302 C 232,302 228,299 228,295 Z" fill="url(#batWood)" />
                                            </g>
                                            <rect x="195" y="158" width="10" height="10" fill="#ffedd5" />
                                            <circle cx="200" cy="146" r="16" fill="#ffedd5" />
                                            <path d="M 192,143 Q 195,145 198,143" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
                                            <path d="M 202,143 Q 205,145 208,143" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
                                            <path d="M 193,154 Q 200,148 207,154" fill="none" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
                                            <path d="M 194,146 L 194,158" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3,3" strokeDashoffset="0" className="sad-tears" />
                                            <path d="M 206,146 L 206,158" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3,3" strokeDashoffset="0" className="sad-tears" />
                                            <path d="M 182,142 A 18,18 0 0,1 218,142 Z" fill="#334155" />
                                            <path d="M 215,142 L 230,145 L 230,149 L 215,148 Z" fill="#94a3b8" />
                                        </g>
                                    </svg>
                                </div>
                            </div>

                            {/* Details Card */}
                            <div style={{
                                display: 'flex',
                                flexDirection: isSmall ? 'column' : 'row',
                                alignItems: 'center',
                                gap: isSmall ? '16px' : 'clamp(16px, 3vw, 40px)',
                                textAlign: isSmall ? 'center' : 'left',
                                background: 'rgba(255,255,255,0.05)',
                                padding: isSmall ? '16px 12px' : 'clamp(12px, 2vh, 32px)',
                                borderRadius: 'clamp(12px, 2vw, 30px)',
                                border: '2px solid rgba(255,68,68,0.4)',
                                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                                maxWidth: '100%',
                                flex: 1,
                            }}>
                                <div style={{ position: 'relative' }}>
                                    {lastUnsoldPlayer?.player_number != null && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            left: '-8px',
                                            background: '#ff4444',
                                            color: '#fff',
                                            padding: 'clamp(3px, 0.6vh, 6px) clamp(8px, 1.2vw, 14px)',
                                            borderRadius: '50px',
                                            fontSize: 'clamp(0.7rem, 1vw, 1.1rem)',
                                            fontWeight: 900,
                                            zIndex: 10,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                            border: '2px solid #fff',
                                        }}>
                                            #{lastUnsoldPlayer.player_number}
                                        </div>
                                    )}
                                    {(lastUnsoldPlayer.players.photo_url && !unsoldImageError) ? (
                                        <img
                                            src={getOptimizedImageUrl(lastUnsoldPlayer.players.photo_url, 400)}
                                            alt="Unsold"
                                            onError={() => setUnsoldImageError(true)}
                                            style={{
                                                width: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                                height: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                                borderRadius: '50%',
                                                border: 'clamp(3px, 0.6vw, 8px) solid #94a3b8',
                                                objectFit: 'cover',
                                                boxShadow: '0 0 40px rgba(148,163,184,0.2)',
                                                flexShrink: 0,
                                                filter: 'grayscale(0.5)'
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                            height: isSmall ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 22vh, 220px)',
                                            borderRadius: '50%',
                                            border: 'clamp(3px, 0.6vw, 8px) solid #94a3b8',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'linear-gradient(135deg, rgba(255,68,68,0.1), rgba(255,255,255,0.05))',
                                            color: 'rgba(255,68,68,0.3)',
                                            fontSize: isSmall ? 'clamp(1.5rem, 5vh, 2.5rem)' : 'clamp(2.5rem, 7vh, 4.5rem)',
                                            fontWeight: 900,
                                            boxShadow: '0 0 40px rgba(255,68,68,0.1)',
                                            flexShrink: 0,
                                        }}>
                                            {(lastUnsoldPlayer.players.first_name?.charAt(0) || '') + (lastUnsoldPlayer.players.last_name?.charAt(0) || '')}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 0.8vh, 12px)', minWidth: 0 }}>
                                    <div style={{
                                        fontSize: isSmall ? 'clamp(1.2rem, 4vh, 1.8rem)' : 'clamp(1.4rem, 4.5vh, 2.8rem)',
                                        fontWeight: 'bold', color: '#fff', wordBreak: 'break-word',
                                    }}>
                                        {lastUnsoldPlayer.players.first_name} {lastUnsoldPlayer.players.last_name}
                                    </div>
                                    <div style={{
                                        fontSize: isSmall ? 'clamp(0.8rem, 2.5vh, 1rem)' : 'clamp(0.9rem, 2.8vh, 1.5rem)',
                                        color: 'rgba(255,255,255,0.7)',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        gap: 'clamp(10px, 2vw, 30px)',
                                    }}>
                                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '4px' }}>{lastUnsoldPlayer.players.player_role}</span>
                                        <span style={{ opacity: 0.5 }}>|</span>
                                        <span style={{ color: '#ff4444' }}>BASE: ₹ {activeAuction?.base_price?.toLocaleString()}</span>
                                    </div>
                                    <div style={{
                                        fontSize: isSmall ? 'clamp(0.7rem, 2.2vh, 0.9rem)' : 'clamp(0.8rem, 2.5vh, 1.2rem)',
                                        color: 'rgba(255,255,255,0.5)',
                                        fontStyle: 'italic',
                                        marginTop: '10px'
                                    }}>
                                        This player may come back for accelerated auction.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RANDOM PLAYER DRAW / SPIN OVERLAY FOR LIVE PROJECTOR SCREEN */}
            {showDrawOverlay && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 99999,
                    background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.99))',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    color: '#fff',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{
                        fontSize: 'clamp(1.2rem, 2.5vw, 2.2rem)',
                        fontWeight: 900,
                        color: 'var(--accent-gold)',
                        letterSpacing: '4px',
                        textTransform: 'uppercase',
                        marginBottom: '1.5rem',
                        animation: 'pulseText 1s infinite alternate'
                    }}>
                        🎰 {activeAuction?.auction_name || 'MALANG CRICKET LEAGUE'} - RANDOM PLAYER DRAW
                    </div>

                    {/* Rolling Slot Machine Number Ticker */}
                    <div style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: '4px solid var(--accent-gold)',
                        borderRadius: '30px',
                        padding: '2.5rem 5rem',
                        boxShadow: '0 0 80px rgba(255,215,0,0.5)',
                        marginBottom: '2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: '400px'
                    }}>
                        <div style={{
                            fontSize: 'clamp(6rem, 18vw, 14rem)',
                            fontWeight: 900,
                            color: isTickerSpinning ? 'var(--accent-gold)' : '#39ff14',
                            fontFamily: 'var(--font-heading)',
                            lineHeight: 1,
                            textShadow: isTickerSpinning ? '0 0 40px rgba(255,215,0,0.8)' : '0 0 60px rgba(57,255,20,0.9)',
                            animation: isTickerSpinning ? 'pulse 0.15s infinite' : 'bounceIn 0.5s ease-out'
                        }}>
                            {tickerNumber}
                        </div>

                        <div style={{
                            fontSize: 'clamp(1.1rem, 2.2vw, 1.8rem)',
                            color: isTickerSpinning ? 'var(--text-muted)' : 'var(--accent-gold)',
                            fontWeight: 'bold',
                            marginTop: '1rem',
                            letterSpacing: '2px'
                        }}>
                            {isTickerSpinning ? 'GENERATING RANDOM PLAYER NUMBER...' : '🎉 DRAWN AUCTION PLAYER!'}
                        </div>
                    </div>

                    {/* Drawn Player Profile Reveal */}
                    {!isTickerSpinning && drawPlayerName && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2rem',
                            background: 'rgba(255,255,255,0.08)',
                            border: '2px solid rgba(255,215,0,0.5)',
                            padding: '1.5rem 3.5rem',
                            borderRadius: '20px',
                            animation: 'cardFadeInFromBelow 0.6s ease-out both',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
                            maxWidth: '850px'
                        }}>
                            {drawPlayerPhoto && (
                                <img
                                    src={getOptimizedImageUrl(drawPlayerPhoto, 300)}
                                    alt="Player"
                                    style={{
                                        width: '130px',
                                        height: '130px',
                                        borderRadius: '16px',
                                        border: '3px solid var(--accent-gold)',
                                        objectFit: 'cover',
                                        boxShadow: '0 0 25px rgba(255,215,0,0.4)'
                                    }}
                                />
                            )}
                            <div>
                                <div style={{ fontSize: '1rem', color: 'var(--accent-green)', fontWeight: 'bold', letterSpacing: '2px' }}>
                                    STARTING AUCTION NOW:
                                </div>
                                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#fff', textTransform: 'uppercase' }}>
                                    {drawPlayerName}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes pulse {
                    0%   { transform: scale(1); opacity: 1; }
                    50%  { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes flash {
                    0%, 100% { opacity: 1; }
                    50%      { opacity: 0.3; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(1.05); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes explode {
                    0%   { transform: scale(1); opacity: 1; }
                    100% { transform: scale(30); opacity: 0; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to   { transform: translateY(0); opacity: 1; }
                }
                @keyframes goldGlowPulse {
                    0%, 100% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.4); }
                    50%      { box-shadow: 0 0 45px rgba(255, 215, 0, 0.45); border-color: rgba(255, 215, 0, 0.9); }
                }
                @keyframes bounceIn {
                    0%   { transform: scale(0.3) rotate(-10deg); opacity: 0; }
                    50%  { transform: scale(1.1) rotate(20deg); opacity: 1; }
                    70%  { transform: scale(0.9) rotate(-5deg); }
                    100% { transform: scale(1) rotate(-3deg); }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.8); opacity: 0; }
                    to   { transform: scale(1); opacity: 1; }
                }
                .fw-0  { top: 20%; left: 20%; background: #ff0;    animation: explode 2.0s infinite; }
                .fw-1  { top: 70%; left: 10%; background: #f0f;    animation: explode 2.5s infinite 0.5s; }
                .fw-2  { top: 10%; left: 80%; background: #0ff;    animation: explode 2.2s infinite 1.0s; }
                .fw-3  { top: 80%; left: 85%; background: #39ff14; animation: explode 2.8s infinite 0.2s; }
                .fw-4  { top: 40%; left: 50%; background: #ff4444; animation: explode 2.4s infinite 0.7s; }
                .fw-5  { top: 15%; left: 45%; background: #fff;    animation: explode 2.1s infinite 1.2s; }
                .fw-6  { top: 85%; left: 30%; background: #ffd700; animation: explode 2.6s infinite 0.8s; }
                .fw-7  { top: 50%; left: 15%; background: #007bff; animation: explode 2.3s infinite 0.4s; }
                .fw-8  { top: 30%; left: 75%; background: #ff8c00; animation: explode 2.7s infinite 0.9s; }
                .fw-9  { top: 60%; left: 90%; background: #9400d3; animation: explode 2.5s infinite 0.1s; }
                .fw-10 { top:  5%; left:  5%; background: #adff2f; animation: explode 2.9s infinite 1.1s; }
                .fw-11 { top: 90%; left: 60%; background: #00ffff; animation: explode 2.4s infinite 0.6s; }

                /* Cricket SOLD cinematic animations */
                .cricket-anim-sold-wrapper {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 400px;
                    height: 400px;
                    z-index: 1005;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIntroCinematic 2.0s ease-out both;
                }

                @keyframes fadeIntroCinematic {
                    0% { opacity: 1; visibility: visible; }
                    85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); visibility: hidden; }
                }

                /* Dancing player animations */
                .dancing-player-body {
                    animation: playerDance 0.8s ease-in-out infinite alternate;
                }

                @keyframes playerDance {
                    0% { transform: translateY(10px) scale(0.98) rotate(-3deg); }
                    100% { transform: translateY(-15px) scale(1.02) rotate(3deg); }
                }

                .celebrating-bat {
                    animation: spinBat 0.6s linear infinite;
                }

                @keyframes spinBat {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .dancing-leg-left {
                    animation: legDanceLeft 0.8s ease-in-out infinite alternate;
                }

                @keyframes legDanceLeft {
                    0% { transform: rotate(-10deg); }
                    100% { transform: rotate(15deg); }
                }

                .dancing-leg-right {
                    animation: legDanceRight 0.8s ease-in-out infinite alternate;
                }

                @keyframes legDanceRight {
                    0% { transform: rotate(10deg); }
                    100% { transform: rotate(-15deg); }
                }

                .confetti-group {
                    animation: confettiExplode 2.0s ease-out infinite;
                }

                @keyframes confettiExplode {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1.6); opacity: 0; }
                }

                .anim-bat-group {
                    animation: batSwing 1.8s cubic-bezier(0.25, 1, 0.5, 1) both;
                }

                @keyframes batSwing {
                    0% { transform: rotate(-85deg); }
                    /* Contact point around 27% of 1.8s (approx 0.5s) */
                    27% { transform: rotate(5deg); }
                    40% { transform: rotate(15deg); }
                    70% { transform: rotate(45deg); opacity: 1; }
                    100% { transform: rotate(60deg); opacity: 0; }
                }

                .anim-ball-group {
                    animation: ballFlightSold 1.8s cubic-bezier(0.25, 1, 0.5, 1) both;
                }

                @keyframes ballFlightSold {
                    0% { transform: translate(-150px, 320px) scale(1.4); }
                    /* Contact point at 0.5s */
                    27% { transform: translate(200px, 200px) scale(1); }
                    /* Flies high and away to top right */
                    60% { transform: translate(450px, -150px) scale(0.5); }
                    100% { transform: translate(600px, -300px) scale(0.2); opacity: 0; }
                }

                .anim-shockwave {
                    animation: glowShockwave 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes glowShockwave {
                    0%, 26% { transform: scale(0); opacity: 0; }
                    27% { transform: scale(0); opacity: 1; stroke-width: 8px; }
                    70% { transform: scale(6); opacity: 0; stroke-width: 1px; }
                    100% { transform: scale(6); opacity: 0; }
                }

                .anim-sparks {
                    animation: sparkBurst 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes sparkBurst {
                    0%, 26% { transform: scale(0); opacity: 0; }
                    27% { transform: scale(0.5); opacity: 1; }
                    60% { transform: scale(1.8); opacity: 0; }
                    100% { transform: scale(1.8); opacity: 0; }
                }

                /* Cricket UNSOLD cinematic animations */
                .cricket-anim-unsold-wrapper {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 400px;
                    height: 400px;
                    z-index: 1005;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIntroCinematic 2.0s ease-out both;
                }

                .anim-unsold-ball {
                    animation: ballFlightUnsold 1.8s cubic-bezier(0.25, 1, 0.5, 1) both;
                }

                @keyframes ballFlightUnsold {
                    0% { transform: translate(50px, -150px) scale(1.6); }
                    /* Contact point at 0.5s */
                    27% { transform: translate(200px, 175px) scale(1); }
                    /* Deflects down and right */
                    60% { transform: translate(260px, 280px) scale(0.8); }
                    100% { transform: translate(300px, 350px) scale(0.6); opacity: 0; }
                }

                .anim-unsold-shockwave {
                    animation: glowShockwaveUnsold 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes glowShockwaveUnsold {
                    0%, 26% { transform: scale(0); opacity: 0; }
                    27% { transform: scale(0); opacity: 1; stroke-width: 8px; }
                    70% { transform: scale(5); opacity: 0; stroke-width: 1px; }
                    100% { transform: scale(5); opacity: 0; }
                }

                .anim-stump-left {
                    animation: stumpShatterLeft 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes stumpShatterLeft {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(-55deg) translate(-100px, 20px); opacity: 0.8; }
                }

                .anim-stump-mid {
                    animation: stumpShatterMid 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes stumpShatterMid {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(15deg) translate(20px, 80px); opacity: 0.8; }
                }

                .anim-stump-right {
                    animation: stumpShatterRight 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes stumpShatterRight {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(65deg) translate(120px, 10px); opacity: 0.8; }
                }

                .anim-bail-left {
                    animation: bailShatterLeft 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes bailShatterLeft {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(-280deg) translate(-120px, -180px); opacity: 0.5; }
                }

                .anim-bail-right {
                    animation: bailShatterRight 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                /* Sad cricketer crying animations in place next to stumps */
                .sad-cricketer-walk {
                    animation: sadBob 0.6s ease-in-out infinite alternate;
                    opacity: 1;
                }

                @keyframes sadBob {
                    0% { transform: translate(90px, 10px) scale(0.85) translateY(0); }
                    100% { transform: translate(90px, 10px) scale(0.85) translateY(8px); }
                }

                .sad-leg-left {
                    /* Stand still */
                }

                .sad-leg-right {
                    /* Stand still */
                }

                .sad-tears {
                    animation: dripTears 0.4s linear infinite;
                }

                @keyframes dripTears {
                    0% { stroke-dashoffset: 0; opacity: 0.3; }
                    50% { opacity: 1; }
                    100% { stroke-dashoffset: 8; opacity: 0.2; }
                }

                @keyframes bailShatterRight {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(320deg) translate(140px, -200px); opacity: 0.5; }
                }

                /* Fading in details container instantly with the overlay */
                .sold-details-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    animation: cardFadeInFromBelow 1.2s cubic-bezier(0.19, 1, 0.22, 1) both;
                }

                .unsold-details-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    animation: cardFadeInFromBelow 1.2s cubic-bezier(0.19, 1, 0.22, 1) both;
                }

                @keyframes cardFadeInFromBelow {
                    from {
                        opacity: 0;
                        transform: translateY(40px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes pulseGlow {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.08); opacity: 0.7; }
                }

                .batsman-anim {
                    animation: batsmanStance 2.5s infinite ease-in-out;
                }

                @keyframes batsmanStance {
                    0%, 100% { transform: scale(1) translate(0, 0); }
                    50% { transform: scale(1) translate(1px, 0.5px); }
                }

                @keyframes pulseText {
                    0%, 100% { opacity: 0.8; text-shadow: 0 0 15px rgba(255, 215, 0, 0.3); }
                    50% { opacity: 1; text-shadow: 0 0 30px rgba(255, 215, 0, 0.7); }
                }
            `}</style>
        </div>
    );
};

export default LiveAuctionProjectorPage;
