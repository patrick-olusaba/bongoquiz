import { type FC, useEffect, useRef, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../../firebase.ts";
import type { Player } from "../types/type.ts";
import gkquizLogo from "../assets/gkquiz.webp";
import { AppTopBar, type SettingsItem } from "../../game/AppTopBar.tsx";
import { HelpCircle, History, Share2, UserCog } from "lucide-react";
import "../style/mainmenu.css";

interface MainMenuProps {
  player: Player;
  onStartGame: () => void;
  onShowTutorial: () => void;
  onLeaderboard: () => void;
  onChangeName: () => void;
}

const MainMenu: FC<MainMenuProps> = ({ player, onStartGame, onShowTutorial, onChangeName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historySessions, setHistorySessions] = useState<any[]>([]);

  const loadHistory = () => {
    const p = localStorage.getItem("bongo_player_phone") ?? "";
    getDocs(query(collection(db, "gkQuizSessions"), where("phone", "==", p), limit(20)))
      .then(snap => {
        const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => (b.playedAt?.seconds ?? 0) - (a.playedAt?.seconds ?? 0));
        setHistorySessions(sessions);
      })
      .catch(() => setHistorySessions([]));
    setShowHistory(true);
  };

  const handleShare = () => {
    const text = `🧠 Play General Knowledge Quiz — test your knowledge!\n${window.location.href}`;
    if (navigator.share) navigator.share({ title: "GK Quiz", text, url: window.location.href }).catch(() => {});
    else navigator.clipboard?.writeText(window.location.href).then(() => alert("Link copied!")).catch(() => {});
  };

  const settingsItems: SettingsItem[] = [
    { key: "htp", label: "How to Play", icon: <HelpCircle size={18} />, onClick: onShowTutorial },
    { key: "history", label: "Game History", icon: <History size={18} />, onClick: loadHistory },
    { key: "share", label: "Share", icon: <Share2 size={18} />, onClick: handleShare },
    { key: "profile", label: "Edit Profile", icon: <UserCog size={18} />, onClick: onChangeName },
  ];

  useEffect(() => {
    const phone = localStorage.getItem("bongo_player_phone");
    if (!phone) return;
    const phone254 = phone.replace(/^0/, "254");
    fetch("https://us-central1-bongoquiz-23ad4.cloudfunctions.net/getLeaderboard")
      .then(r => r.json())
      .then((data: any[]) => {
        const entry = data.find((d: any) => String(d.msisdn) === phone254 || String(d.msisdn) === phone);
        if (entry) {
          const s = entry.score ?? 0;
          localStorage.setItem("bongo_total_points", String(s));
        }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    // Floating knowledge particles — cyan/blue tones
    const COLORS = ['0,200,255', '100,80,255', '0,230,180', '180,140,255'];
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2.2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.5 + 0.15),
      opacity: Math.random() * 0.5 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.twinkle += 0.018;
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -6) { p.y = canvas.height + 4; p.x = Math.random() * canvas.width; }
        if (p.x < -6) p.x = canvas.width + 4;
        if (p.x > canvas.width + 6) p.x = -4;
        const alpha = p.opacity * (0.55 + 0.45 * Math.sin(p.twinkle));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="mm-root">
      <AppTopBar settingsItems={settingsItems} />

      <canvas ref={canvasRef} className="mm-canvas" />
      <div className="mm-orbs">
        <div className="mm-orb1" /><div className="mm-orb2" /><div className="mm-orb3" />
      </div>
      <div className="mm-scanline-wrap"><div className="mm-scanline" /></div>

      <div className="mm-content">
        <div className="mm-badge">
          <span className="mm-badge-dot" />
          <span className="mm-badge-text">GK Quiz · Season 1</span>
        </div>

        <div className="mm-title-wrap">
          <img src={gkquizLogo} alt="General Knowledge Quiz" className="mm-title-image" />
        </div>

        <p className="mm-subtitle">Test your general knowledge across science, history, geography and more</p>

        <div className="mm-player-bar">
          <div className="mm-player-name-btn">👤 {player.name}</div>
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
          <button className="mm-btn" onClick={onStartGame}>
            <span className="mm-btn-shine" />
            🎯 &nbsp;PLAY NOW
          </button>
        </div>

        <p className="mm-hint">Test Yourself</p>
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
    </div>
  );
};

export default MainMenu;
