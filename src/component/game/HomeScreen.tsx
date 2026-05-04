// HomeScreen.tsx
import {type FC, useEffect, useRef, useState} from "react";
import logoBg from "../../assets/logo.png";
import mainLogo from "../../assets/background.png";
import chezaTenaAd from "../../assets/cheza-tena-ad.jpeg";
// import biblequizLogo from "../BibleQuiz/assets/biblequiz.png";
// import biologyLogo from "../BiologyQuiz/assets/logo2.png";
// import bongoPoster from "../../assets/gamesposter/bongoquizb.png";
import biblePoster from "../../assets/gamesposter/Bible-IMG.png";
import biologyPoster from "../../assets/gamesposter/biologyquizposter.png";
import {PlayerNameModal} from "./Playernamemodal.tsx";
import {HowToPlayModal} from "./Howtoplaymodal.tsx";
import {getStreakInfo} from "../../utils/streakDays.ts";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase.ts";
import '../../styles/HomeScreen.css';

interface Props {
    onStart: (playerName: string) => void;
    onLeaderboard: () => void;
    onHistory?: () => void;
    onReviewSession?: () => void;
    hasPaidSession?: boolean;
}

export const HomeScreen: FC<Props> = ({onStart, onLeaderboard, onHistory, onReviewSession, hasPaidSession = false}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
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
    const streakInfo = getStreakInfo();

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
        {
            num: "01",
            label: "Quickfire",
            icon: "⚡",
            desc: "90s · 100 pts per answer · race the clock",
            color: "#00c6ff",
            glow: "drop-shadow(0 0 12px rgba(123,97,255,0.6))"
        },
        {
            num: "02",
            label: "Categories",
            icon: "🗂️",
            desc: "40s · 10 questions · powers apply",
            color: "#eaaaff",
            glow: "drop-shadow(0 0 12px rgba(255,107,107,0.6))"
        },
        {
            num: "03",
            label: "Spin & Win",
            icon: "🎡",
            desc: "Spin the wheel · answer to claim your bonus",
            color: "#FFD93D",
            glow: "drop-shadow(0 0 12px rgba(255,217,61,0.6))"
        },
    ];

    const moreApps = [
        { label: "Bible Quiz", logo: biblePoster, path: "/bible-quiz", tag: "NEW" },
        { label: "Biology Quiz", logo: biologyPoster, path: "/biology-quiz", tag: "NEW" },
        // { label: "Math Quiz", logo: mathLogo, path: "/math-quiz", tag: "" },
    ];

    return (
        <div className="home-root">
            <div className="bongo-top-bar">
                <img src={logoBg} alt="" className="topbar-logo"/>
                <button className="topbar-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
                    <span/><span/><span/>
                </button>
            </div>

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
                    <button className="menu-item" onClick={() => { setMenuOpen(false); onLeaderboard(); }}>
                        <span className="menu-item-icon">🏆</span>
                        <div><div className="menu-item-label">Leaderboard</div><div className="menu-item-sub">See top players</div></div>
                    </button>
                    <button className="menu-item" onClick={() => { setMenuOpen(false); setShowNameModal(true); }}>
                        <span className="menu-item-icon">👤</span>
                        <div><div className="menu-item-label">Edit Profile</div><div className="menu-item-sub">{playerName} · {playerPhone || 'No phone set'}</div></div>
                    </button>
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
            <img src={logoBg} alt="" className="home-logo-bg"/>
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



                <div className="home-title-wrap">
                    <img src={mainLogo} alt="Bongo Quiz" className="home-title-image"/>
                </div>

                <p className="home-subtitle">
                    3 explosive rounds of trivia · hidden powers · a spinning prize wheel
                </p>

                {/* Player name + personal best bar */}
                <div className="home-player-bar">
                    <div style={{display: "flex", alignItems: "center", gap: 8}}>
                        <button className="home-player-name-btn" onClick={() => setShowNameModal(true)}>
                            👤 {playerName} {playerPhone &&
                            <span style={{fontSize: "0.75rem", color: "#aaa"}}>· {playerPhone}</span>} <span
                            className="home-player-edit">✏️</span>
                        </button>
                    </div>
                    {!playerPhone || !/^07\d{8}$/.test(playerPhone) ? (
                        <button className="home-phone-warning" onClick={() => setShowNameModal(true)}>
                            ⚠️ Set your phone number to play
                        </button>
                    ) : (personalBest > 0 || streakInfo.current > 0) && (
                        <div className="home-player-bar-row">
                            {personalBest > 0 && (
                                <div className="home-best-score">
                                    🏆 Best: <strong>{personalBest.toLocaleString()}</strong>
                                </div>
                            )}
                            {totalPoints > 0 && (
                                <div className="home-best-score" style={{ color: "#FFD93D" }}>
                                    ⭐ Total: <strong>{totalPoints.toLocaleString()} pts</strong>
                                </div>
                            )}
                            {streakInfo.current > 0 && (
                                <div className="home-streak-badge">
                                    🔥 {streakInfo.current} day{streakInfo.current !== 1 ? "s" : ""} streak
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="home-rounds">
                    {rounds.map((r, i) => (
                        <div key={r.num} className="home-round-card" style={{animationDelay: `${0.4 + i * 0.08}s`}}>
                            <div className="home-round-num">ROUND {r.num}</div>
                            <div className="home-round-icon" style={{filter: r.glow}}>{r.icon}</div>
                            <div className="home-round-label" style={{color: r.color}}>{r.label}</div>
                            <div className="home-round-divider"
                                 style={{background: `linear-gradient(90deg, transparent, ${r.color}, transparent)`}}/>
                            <div className="home-round-desc">{r.desc}</div>
                        </div>
                    ))}
                </div>

                <div className="home-cta-wrap">
                    <button className="home-btn" onClick={handlePlay}>
                        <span className="home-btn-shine"/>
                        {hasPaidSession ? "▶️ \u00a0Continue Where You Left Off" : "🎯 \u00a0PLAY NOW"}
                    </button>
                    {/*<div className="home-secondary-btns">*/}
                    {/*    <button className="home-lb-btn" onClick={onLeaderboard}>🏆 Leaderboard</button>*/}
                    {/*    <button className="home-lb-btn" onClick={() => setShowHTP(true)}>❓ How to Play</button>*/}
                    {/*</div>*/}
                </div>

                <p className="home-hint">Rounds 1 &amp; 2: KES 20 · Spin round: KES 10</p>

                {/* Browse Games */}
                <div style={{ width: "100%", marginTop: 20, textAlign: "center", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "18px 16px", boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)" }}>
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 16px" }}>Browse Games</p>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
                        {moreApps.map((app) => (
                            <div key={app.label} onClick={() => { window.location.href = app.path; }} title={app.label}
                                style={{ cursor: "pointer", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, WebkitTapHighlightColor: "transparent" }}>
                                {app.tag && <span style={{ position: "absolute", top: -8, right: -8, background: app.tag === "HOT" ? "linear-gradient(135deg,#ff4e00,#ff9500)" : "linear-gradient(135deg,#00c6ff,#7B61FF)", color: "#fff", fontSize: "0.55rem", fontWeight: 900, letterSpacing: 1, padding: "2px 6px", borderRadius: 20, textTransform: "uppercase", zIndex: 1, boxShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{app.tag}</span>}
                                <div style={{ width: 90, height: 90, borderRadius: 14, overflow: "hidden", border: "2px solid rgba(255,255,255,0.15)", boxShadow: "0 6px 24px rgba(0,0,0,0.6)", animation: "gamePulse 2.4s ease-in-out infinite", transition: "transform 0.15s" }}>
                                    <img src={app.logo} alt={app.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>{app.label}</span>
                            </div>
                        ))}
                    </div>
                    <style>{`@keyframes gamePulse{0%,100%{box-shadow:0 0 0 0 rgba(255,180,0,0.4),0 6px 20px rgba(0,0,0,0.4);transform:translateY(0)}50%{box-shadow:0 0 0 6px rgba(255,180,0,0),0 6px 20px rgba(0,0,0,0.4);transform:translateY(-3px)}}`}</style>
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
            <a href="https://tushinde.com/" target="_blank" rel="noopener noreferrer"
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
            </a>
        </div>
    );
};