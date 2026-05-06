// HomeScreen.tsx
import {type FC, useEffect, useRef, useState} from "react";
import { Home, Gamepad2, Trophy } from 'lucide-react';
import logoBg from "../../assets/logo.png";
// import mainLogo from "../../assets/background.png";
import wheelImg from "../../assets/wheel-hero.png";
import biblePoster from "../../assets/gamesposter/Bible-IMG.png";
import biologyPoster from "../../assets/gamesposter/biologyquizposter.png";
import {PlayerNameModal} from "./Playernamemodal.tsx";
import {HowToPlayModal} from "./Howtoplaymodal.tsx";
// import {getStreakInfo} from "../../utils/streakDays.ts";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase.ts";
import '../../styles/HomeScreen.css';

interface Props {
    onStart: (playerName: string) => void;
    onLeaderboard: () => void;
    onHistory?: () => void;
    onReviewSession?: () => void;
    hasPaidSession?: boolean;
    triggerPlay?: boolean;
    onTriggerPlayDone?: () => void;
    onViewAllGames?: () => void;
}

export const HomeScreen: FC<Props> = ({onStart, onLeaderboard, onHistory, onReviewSession, hasPaidSession = false, triggerPlay, onTriggerPlayDone, onViewAllGames}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const logoRef = useRef<HTMLImageElement>(null);
    const [showNameModal, setShowNameModal] = useState(false);
    const [showHTP, setShowHTP] = useState(false);
    const [playerName, setPlayerName] = useState(() =>
        localStorage.getItem("bongo_player_name") ?? "Player"
    );
    const [playerPhone, setPlayerPhone] = useState(() =>
        localStorage.getItem("bongo_player_phone") ?? ""
    );
    const [menuOpen, setMenuOpen] = useState(false);
    const [personalBest, setPersonalBest] = useState(() =>
        parseInt(localStorage.getItem("bongo_best_score") ?? "0")
    );
    const [totalPoints, setTotalPoints] = useState(() =>
        parseInt(localStorage.getItem("bongo_total_points") ?? "0")
    );

    // Fetch real personal best and total points from Firestore when phone is known
    useEffect(() => {
        if (!playerPhone || !/^07\d{8}$/.test(playerPhone)) return;
        getDocs(query(
            collection(db, "gameSessions"),
            where("phone", "==", playerPhone),
            orderBy("total", "desc"),
            limit(1)
        )).then(snap => {
            if (!snap.empty) {
                const best = snap.docs[0].data().total ?? 0;
                setPersonalBest(best);
                localStorage.setItem("bongo_best_score", String(best));
            }
        }).catch(() => {});

        getDocs(query(
            collection(db, "gameSessions"),
            where("phone", "==", playerPhone)
        )).then(snap => {
            const total = snap.docs.reduce((sum, d) => sum + (d.data().total ?? 0), 0);
            setTotalPoints(total);
            localStorage.setItem("bongo_total_points", String(total));
        }).catch(() => {});
    }, [playerPhone]);
    //     const next = !soundOn;
    //     setSoundOn(next);
    //     localStorage.setItem("bongo_sound", next ? "on" : "off");
    // };
    // const streakInfo = getStreakInfo();

    const saveProfile = (name: string, phone: string) => {
        setPlayerName(name);
        setPlayerPhone(phone);
        localStorage.setItem("bongo_player_name", name);
        localStorage.setItem("bongo_player_phone", phone);
        localStorage.setItem("bongo_last_activity", Date.now().toString());
    };

    const checkInactivity = () => {
        const lastActivity = localStorage.getItem("bongo_last_activity");
        if (lastActivity) {
            const hoursSinceActivity = (Date.now() - parseInt(lastActivity)) / (1000 * 60 * 60);
            if (hoursSinceActivity >= 24) {
                // Clear cache after 4 hours of inactivity
                ["bongo_player_name", "bongo_player_phone", "bongo_best_score", "bongo_total_points",
                    "bongo_session_score", "bongo_achievements", "bongo_streak", "bongo_last_activity"].forEach(k => localStorage.removeItem(k));
                setPlayerName("Player");
                setPlayerPhone("");
            }
        }
    };

    const handlePlay = () => {
        localStorage.setItem("bongo_last_activity", Date.now().toString());
        if (!playerPhone || !/^07\d{8}$/.test(playerPhone)) {
            setShowNameModal(true);
        } else {
            onStart(playerName);
        }
    };

    useEffect(() => {
        if (triggerPlay) { handlePlay(); onTriggerPlayDone?.(); }
    }, [triggerPlay]);

    useEffect(() => {
        const onScroll = () => {
            if (logoRef.current) {
                logoRef.current.style.transform = `translate(-50%, calc(-50% + ${window.scrollY * 0.3}px))`;
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        checkInactivity();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        let animId: number;
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);
        const stars = Array.from({length: 120}, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 1.8 + 0.3,
            speed: Math.random() * 0.4 + 0.1,
            opacity: Math.random() * 0.7 + 0.3,
            twinkle: Math.random() * Math.PI * 2,
        }));
        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(s => {
                s.twinkle += 0.02;
                s.y += s.speed;
                if (s.y > canvas.height) {
                    s.y = -4;
                    s.x = Math.random() * canvas.width;
                }
                const alpha = s.opacity * (0.6 + 0.4 * Math.sin(s.twinkle));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.fill();
            });
            animId = requestAnimationFrame(tick);
        };
        animId = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", resize);
        };
    }, []);

    const rounds = [
        { num: "01", label: "Quickfire", icon: "⚡", desc: "90s · 100 pts per answer · race the clock", color: "#00e5ff", glow: "drop-shadow(0 0 12px rgba(0,229,255,0.6))", footerIcon: "⏱", footerLabel: "90s" },
        { num: "02", label: "Categories", icon: "🗂️", desc: "40s · 10 questions · powers apply", color: "#c084fc", glow: "drop-shadow(0 0 12px rgba(192,132,252,0.6))", footerIcon: "⏱", footerLabel: "40s" },
        { num: "03", label: "Spin & Win", icon: "🎡", desc: "Spin the wheel · answer to claim your bonus", color: "#e2e8f0", glow: "drop-shadow(0 0 12px rgba(226,232,240,0.4))", footerIcon: "🎡", footerLabel: "SPIN" },
    ];

    const moreApps = [
        { label: "Bible Quiz", logo: biblePoster, path: "/bible-quiz", tag: "NEW" },
        { label: "Biology Quiz", logo: biologyPoster, path: "/biology-quiz", tag: "NEW" },
        // { label: "Math Quiz", logo: null, path: null, tag: "NEW", emoji: "2+2=?" },
        // { label: "History Quiz", logo: null, path: null, tag: "NEW", emoji: "🏛️" },
    ];

    return (
        <div className="home-root">
            <div className="bongo-top-bar">
                <div className="topbar-left">
                    <img src={logoBg} alt="Bongo Quiz" className="topbar-logo"/>
                    <div className="topbar-coins">
                        <span className="topbar-coin-icon">🪙</span>
                        <span className="topbar-coin-value">{totalPoints.toLocaleString()}</span>
                    </div>
                </div>
                {/* Desktop nav links */}
                <div className="topbar-desktop-nav">
                    <button className="topbar-nav-link active" onClick={() => {}}><Home size={16} strokeWidth={2}/> Home</button>
                    <button className="topbar-nav-link" onClick={onViewAllGames}><Gamepad2 size={16} strokeWidth={2}/> Games</button>
                    <button className="topbar-nav-link" onClick={onLeaderboard}><Trophy size={16} strokeWidth={2}/> Leaderboard</button>
                </div>
                <div className="topbar-right">
                    {personalBest > 0 && (
                        <div className="topbar-score">
                            <span>🏆</span>
                            <span>{personalBest.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="topbar-avatar" data-initial={playerName.charAt(0).toUpperCase()} onClick={() => setShowNameModal(true)} />
                    <button className="topbar-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
                        <span/><span/><span/>
                    </button>
                </div>
            </div>

            {/* Floating centered logo */}
            {/*<div className="home-floating-logo">*/}
            {/*    <img src={logoBg} alt="Bongo Quiz" className="home-title-image"/>*/}
            {/*</div>*/}

            {menuOpen && <div className="menu-backdrop" onClick={() => setMenuOpen(false)}/>}
            <div className={`menu-drawer${menuOpen ? ' menu-drawer--open' : ''}`}>
                <div className="menu-drawer-header">
                    <img src={logoBg} alt="" style={{width:32}}/>
                    <span className="menu-drawer-title">Menu</span>
                    <button className="menu-close-btn" onClick={() => setMenuOpen(false)}>✕</button>
                </div>
                <div className="menu-items">
                    <button className="menu-item" onClick={() => { setMenuOpen(false); setShowHTP(true); }}>
                        <span className="menu-item-icon">❓</span>
                        <div><div className="menu-item-label">How to Play</div><div className="menu-item-sub">Learn the rules & rounds</div></div>
                    </button>
                    <div className="hideonmobile">
                        <button className="menu-item" onClick={() => { setMenuOpen(false); onLeaderboard(); }}>
                            <span className="menu-item-icon">🏆</span>
                            <div><div className="menu-item-label">Leaderboard</div><div className="menu-item-sub">See top players</div></div>
                        </button>
                        <button className="menu-item" onClick={() => { setMenuOpen(false); setShowNameModal(true); }}>
                            <span className="menu-item-icon">👤</span>
                            <div><div className="menu-item-label">Edit Profile</div><div className="menu-item-sub">{playerName} · {playerPhone || 'No phone set'}</div></div>
                        </button>
                    </div>

                    {onHistory && (
                        <button className="menu-item" onClick={() => { setMenuOpen(false); onHistory(); }}>
                            <span className="menu-item-icon">📜</span>
                            <div><div className="menu-item-label">Game History</div><div className="menu-item-sub">View your past sessions</div></div>
                        </button>
                    )}
                    {onReviewSession && (
                        <button className="menu-item" onClick={() => { setMenuOpen(false); onReviewSession(); }}>
                            <span className="menu-item-icon">📋</span>
                            <div><div className="menu-item-label">Review Last Game</div><div className="menu-item-sub">See questions & answers</div></div>
                        </button>
                    )}
                    <button className="menu-item" onClick={() => {
                        const text = `🎯 Play Bongo Quiz — 3 rounds of trivia, hidden powers & a prize wheel!\n${window.location.href}`;
                        if (navigator.share) {
                            navigator.share({ title: 'Bongo Quiz', text, url: window.location.href }).catch(() => {});
                        } else {
                            navigator.clipboard?.writeText(window.location.href).then(() => alert('Link copied!')).catch(() => {});
                        }
                    }}>
                        <span className="menu-item-icon">🔗</span>
                        <div><div className="menu-item-label">Share</div><div className="menu-item-sub">Invite friends to play</div></div>
                    </button>
                    {/*<button className="menu-item" onClick={toggleSound}>*/}
                    {/*    <span className="menu-item-icon">{soundOn ? '🔊' : '🔇'}</span>*/}
                    {/*    <div><div className="menu-item-label">Sound</div><div className="menu-item-sub">{soundOn ? 'On — tap to mute' : 'Off — tap to unmute'}</div></div>*/}
                    {/*    <span className={`menu-toggle${soundOn ? ' menu-toggle--on' : ''}`}/>*/}
                    {/*</button>*/}
                    {playerPhone && (
                        <button className="menu-item" style={{ color: "#ef4444" }} onClick={() => {
                            ["bongo_player_name","bongo_player_phone","bongo_best_score","bongo_total_points",
                             "bongo_session_score","bongo_achievements","bongo_streak","bongo_last_activity"].forEach(k => localStorage.removeItem(k));
                            setPlayerName("Player");
                            setPlayerPhone("");
                            setMenuOpen(false);
                        }}>
                            <span className="menu-item-icon">🚪</span>
                            <div><div className="menu-item-label" style={{ color: "#ef4444" }}>Log Out</div><div className="menu-item-sub">Sign out of your account</div></div>
                        </button>
                    )}
                </div>
                {personalBest > 0 && (
                    <div className="menu-best">🏅 Personal Best: <strong>{personalBest.toLocaleString()} pts</strong></div>
                )}
            </div>

            <canvas ref={canvasRef} className="home-canvas"/>
            <img ref={logoRef} src={logoBg} alt="" className="home-logo-bg"/>
            <div className="home-orbs">
                <div className="home-orb1"/>
                <div className="home-orb2"/>
                <div className="home-orb3"/>
            </div>
            <div className="home-scanline-wrap">
                <div className="home-scanline"/>
            </div>

            <div className="home-content">
                {/*<div className="home-badge">*/}
                {/*    <span className="home-badge-dot"/>*/}
                {/*    <span className="home-badge-text">Trivia · 3 Rounds · Entry KES 20</span>*/}
                {/*</div>*/}



                {/* ── Hero section: text + wheel ── */}
                <div className="home-hero">
                    <div className="home-hero-text">
                        <p className="home-hero-label">3 EXPLOSIVE</p>
                        <p className="home-hero-rounds">ROUNDS</p>
                        <p className="home-hero-sub">TEST YOUR KNOWLEDGE</p>
                        <p className="home-hero-win">WIN BIG!</p>
                        <button className="home-btn" onClick={handlePlay}>
                            <span className="home-btn-shine"/>
                            {hasPaidSession ? "▶️  Continue" : "PLAY NOW"}
                        </button>
                        <p className="home-hint">Rounds 1 &amp; 2: KES 20 · Spin round: KES 10</p>
                    </div>
                    <div className="home-hero-wheel">
                        <img src={wheelImg} alt="Prize Wheel" className="home-wheel-img"/>
                    </div>
                </div>

                {/* Player name + personal best bar */}
                <div className="home-rounds">
                    {rounds.map((r, i) => (
                        <div key={r.num} className="home-round-card" style={{animationDelay: `${0.4 + i * 0.08}s`, borderColor: r.color, boxShadow: `0 0 16px ${r.color}33`}}>
                            <div className="home-round-num" style={{color: r.color}}>ROUND {r.num}</div>
                            <div className="home-round-icon" style={{filter: r.glow}}>{r.icon}</div>
                            <div className="home-round-label" style={{color: r.color}}>{r.label}</div>
                            <div className="home-round-desc">{r.desc}</div>
                            <div className="home-round-footer" style={{borderTopColor: `${r.color}44`}}>
                                <span className="home-round-footer-text" style={{color: r.color}}>{r.footerIcon} {r.footerLabel}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Browse Games */}
                <div className="home-browse-games">
                    <div className="home-browse-header">
                        <span className="home-browse-title">BROWSE GAMES</span>
                        <span className="home-browse-viewall" onClick={onViewAllGames}>View all &gt;</span>
                    </div>
                    <div className="home-browse-grid">
                        {moreApps.map((app) => (
                            <div key={app.label} className="home-browse-item" onClick={() => { if (app.path) window.location.href = app.path; }}>
                                {app.tag && <span className="home-browse-tag">{app.tag}</span>}
                                <div className="home-browse-img-wrap">
                                    <img src={app.logo} alt={app.label} />
                                </div>
                                <span className="home-browse-label">{app.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showNameModal && (
                <PlayerNameModal
                    currentName={playerName}
                    currentPhone={playerPhone}
                    onSave={(name, phone) => {
                        saveProfile(name, phone);
                        onStart(name);
                    }}
                    onClose={() => setShowNameModal(false)}
                />
            )}
            {showHTP && <HowToPlayModal onClose={() => setShowHTP(false)}/>}

            {/* ── Fixed bottom ad banner ── */}
            {/* <a href="https://tushinde.com/" target="_blank" rel="noopener noreferrer"
                style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, display: "block", cursor: "pointer" }}>
                <div style={{ position: "relative", width: "100%", maxWidth: 800, margin: "0 auto" }}>
                    <img src={chezaTenaAd} alt="Cheza Tena — Activate & Get 50% Back"
                        style={{ width: "100%", display: "block", maxHeight: 56, objectFit: "cover", objectPosition: "center" }} />
                    <button
                        onClick={e => e.preventDefault()}
                        aria-label="Close ad"
                        style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.55)", border: "none",
                            borderRadius: "50%", width: 20, height: 20, color: "#fff", fontSize: "0.65rem",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                        onClickCapture={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget.closest("a") as HTMLElement | null)?.remove(); }}>
                        ✕
                    </button>
                </div>
            </a> */}
        </div>
    );
};