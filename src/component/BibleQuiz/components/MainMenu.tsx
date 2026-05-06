import { type FC, useEffect, useRef, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../../firebase.ts";
import type { Player } from "../types/type.ts";
import biblequizLogo from "../assets/biblequiz.png";
import { BrowseGames } from "../../game/BrowseGames.tsx";
import { PlayerNameModal } from "../../game/Playernamemodal.tsx";
import "../style/mainmenu.css";

interface MainMenuProps {
  player: Player;
  onStartGame: () => void;
  onShowTutorial: () => void;
  onLeaderboard: () => void;
}

const MainMenu: FC<MainMenuProps> = ({ player, onStartGame, onShowTutorial, onLeaderboard }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [name, setName]   = useState(() => localStorage.getItem("bongo_player_name") ?? "");
  const [phone, setPhone] = useState(() => localStorage.getItem("bongo_player_phone") ?? "");
  const personalBest = parseInt(localStorage.getItem("bible_best_score") ?? "0");

  const handlePlay = () => {
    const p = localStorage.getItem("bongo_player_phone") ?? "";
    if (!p || !/^07\d{8}$/.test(p)) { setShowNameModal(true); return; }
    onStartGame();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.8 + 0.3,
      speed: Math.random() * 0.4 + 0.1,
      opacity: Math.random() * 0.7 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
    }));
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.twinkle += 0.02;
        s.y += s.speed;
        if (s.y > canvas.height) { s.y = -4; s.x = Math.random() * canvas.width; }
        const alpha = s.opacity * (0.6 + 0.4 * Math.sin(s.twinkle));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="mm-root">
      {/* Top bar */}
      <div className="mm-topbar">
        <img src={biblequizLogo} alt="Bible Quiz" className="mm-topbar-logo" />
        <button className="mm-topbar-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>

      {/* Drawer backdrop */}
      {menuOpen && <div className="mm-backdrop" onClick={() => setMenuOpen(false)} />}

      {/* Slide-out drawer */}
      <div className={`mm-drawer${menuOpen ? " mm-drawer--open" : ""}`}>
        <div className="mm-drawer-header">
          <img src={biblequizLogo} alt="" style={{ width: 32 }} />
          <span className="mm-drawer-title">Menu</span>
          <button className="mm-drawer-close" onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        <div className="mm-drawer-items">
          <button className="mm-drawer-item" onClick={() => { setMenuOpen(false); onShowTutorial(); }}>
            <span className="mm-drawer-icon">❓</span>
            <div><div className="mm-drawer-label">How to Play</div><div className="mm-drawer-sub">Learn the rules</div></div>
          </button>
          <button className="mm-drawer-item" onClick={() => { setMenuOpen(false); onLeaderboard(); }}>
            <span className="mm-drawer-icon">🏆</span>
            <div><div className="mm-drawer-label">Leaderboard</div><div className="mm-drawer-sub">See top players</div></div>
          </button>
          <button className="mm-drawer-item" onClick={() => {
            const text = `📖 Play Bible Quiz — test your knowledge of the Scriptures!\n${window.location.href}`;
            if (navigator.share) navigator.share({ title: "Bible Quiz", text, url: window.location.href }).catch(() => {});
            else navigator.clipboard?.writeText(window.location.href).then(() => alert("Link copied!")).catch(() => {});
          }}>
            <span className="mm-drawer-icon">🔗</span>
            <div><div className="mm-drawer-label">Share</div><div className="mm-drawer-sub">Invite friends to play</div></div>
          </button>
          <button className="mm-drawer-item" onClick={() => {
            setMenuOpen(false);
            const p = localStorage.getItem("bongo_player_phone") ?? "";
            if (!p) { setShowNameModal(true); return; }
            getDocs(query(collection(db, "bibleQuizSessions"), where("phone", "==", p), limit(20)))
              .then(snap => {
                const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                  .sort((a: any, b: any) => (b.playedAt?.seconds ?? 0) - (a.playedAt?.seconds ?? 0));
                setHistorySessions(sessions);
              })
              .catch(() => setHistorySessions([]));
            setShowHistory(true);
          }}>
            <span className="mm-drawer-icon">📜</span>
            <div><div className="mm-drawer-label">Game History</div><div className="mm-drawer-sub">View your past sessions</div></div>
          </button>
        </div>
        {personalBest > 0 && (
          <div className="mm-drawer-best">🏅 Personal Best: <strong>{personalBest.toLocaleString()} pts</strong></div>
        )}
      </div>

      <canvas ref={canvasRef} className="mm-canvas" />
      <div className="mm-orbs">
        <div className="mm-orb1" /><div className="mm-orb2" /><div className="mm-orb3" />
      </div>
      <div className="mm-scanline-wrap"><div className="mm-scanline" /></div>

      <div className="mm-content">
        {/*<div className="mm-badge">*/}
        {/*  /!*<span className="mm-badge-dot" />*!/*/}
        {/*  <span className="mm-badge-text">✝️ How Well Do You Know The Bible?</span>*/}
        {/*</div>*/}

        <div className="mm-title-wrap">
          <img src={biblequizLogo} alt="Bible Quiz" className="mm-title-image" />
        </div>

        <p className="mm-subtitle">Test your knowledge of the Holy Scriptures</p>

        <div className="mm-player-bar">
          <button className="mm-player-name-btn" onClick={() => setShowNameModal(true)}
            data-initial={(name || "?").charAt(0).toUpperCase()}>
            {name || "Set your name"} ✏️
            {phone && <span style={{ fontSize: "0.75rem", color: "#aaa", marginLeft: 6 }}>· {phone}</span>}
          </button>
          <div className="mm-player-bar-row">
            {player.score > 0 && (
              <div className="mm-best-score">🏆 Score: <strong>{player.score.toLocaleString()}</strong></div>
            )}
            {player.bestStreak > 0 && (
              <div className="mm-streak-badge">🔥 Best Streak: {player.bestStreak}</div>
            )}
          </div>
        </div>

        <div className="mm-cta-wrap">
          {/* Game flow cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, width: "100%", marginBottom: 14 }}>
            {[
              { step: "STEP 01", icon: "💳", title: "Pay & Enter", desc: "KES 20 via M-Pesa STK push", color: "#f43f5e" },
              { step: "STEP 02", icon: "📖", title: "Answer Fast", desc: "60s · +100 correct · −50 wrong", color: "#fbbf24" },
              { step: "STEP 03", icon: "🏆", title: "Climb Ranks", desc: "Score high · beat others · own the leaderboard", color: "#a78bfa" },
            ].map(c => (
              <div key={c.step} style={{
                background: "rgba(10,5,30,0.7)", border: `1px solid ${c.color}30`,
                borderRadius: 16, padding: "12px 8px", textAlign: "center",
                boxShadow: `0 4px 20px ${c.color}15`, backdropFilter: "blur(8px)",
              }}>
                <p style={{ color: c.color, fontSize: "0.55rem", fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 6px" }}>{c.step}</p>
                <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>{c.icon}</div>
                <p style={{ color: "#fff", fontSize: "0.75rem", fontWeight: 800, margin: "0 0 4px" }}>{c.title}</p>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.65rem", margin: 0, lineHeight: 1.4 }}>{c.desc}</p>
              </div>
            ))}
          </div>
          <button className="mm-btn" onClick={handlePlay}>
            <span className="mm-btn-shine" />
            🎯 &nbsp;PLAY NOW
          </button>
          {/*<button className="mm-lb-btn" onClick={onLeaderboard}>🏆 Leaderboard</button>*/}
        </div>

        <p className="mm-hint">Entry: KES 20 · 40s per question · +100 correct · −50 wrong</p>

        {/* Browse Games */}
        <BrowseGames exclude="Bible Quiz" />
      </div>

      {/* Game History Modal */}
      {showHistory && (
        <div style={{ position: "fixed", inset: 0, zIndex: 30, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowHistory(false)}>
          <div style={{ background: "linear-gradient(160deg,rgba(40,10,80,0.97),rgba(10,0,30,0.99))", border: "1px solid rgba(180,100,255,0.25)", borderRadius: 24, padding: "24px 20px", width: "min(420px,92vw)", maxHeight: "80vh", display: "flex", flexDirection: "column", backdropFilter: "blur(24px)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ color: "#fff", margin: 0, fontSize: "1.2rem", fontWeight: 900 }}>📜 Game History</h2>
              <button onClick={() => setShowHistory(false)} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.7)", width: 32, height: 32, cursor: "pointer", fontSize: "0.85rem" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {historySessions.length === 0 ? (
                <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "2rem 0" }}>No sessions found.</p>
              ) : historySessions.map((s, i) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: i === 0 ? "rgba(255,215,0,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${i === 0 ? "rgba(255,215,0,0.25)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "10px 14px" }}>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>{(s.score ?? 0).toLocaleString()} pts</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginTop: 2 }}>
                      ✅ {s.correct ?? 0} correct · ❌ {s.wrong ?? 0} wrong
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.7rem" }}>
                      {s.playedAt?.toDate?.()?.toLocaleDateString("en-GB") ?? "—"}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.65rem" }}>
                      {s.playedAt?.toDate?.()?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showNameModal && (
        <PlayerNameModal
          currentName={name}
          currentPhone={phone}
          onSave={(n, p) => { setName(n); setPhone(p); onStartGame(); }}
          onClose={() => setShowNameModal(false)}
        />
      )}

    </div>
  );
};

export default MainMenu;
