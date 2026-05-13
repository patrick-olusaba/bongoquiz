import { type FC, useEffect, useRef, useState } from "react";
import type { Player } from "../types/type.ts";
import gkquizLogo from "../assets/gkquiz.png";
import { BrowseGames } from "../../game/BrowseGames.tsx";
import "../style/mainmenu.css";

interface MainMenuProps {
  player: Player;
  onStartGame: () => void;
  onShowTutorial: () => void;
  onLeaderboard: () => void;
  onChangeName: () => void;
}

const MainMenu: FC<MainMenuProps> = ({ player, onStartGame, onShowTutorial, onLeaderboard, onChangeName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const personalBest = parseInt(localStorage.getItem("quiz_best_score") ?? "0");
  const [totalScore, setTotalScore] = useState(() => parseInt(localStorage.getItem("bongo_total_points") ?? "0"));

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
          setTotalScore(s);
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
      {/* Top bar */}
      <div className="mm-topbar">
        <img src={gkquizLogo} alt="GK Quiz" className="mm-topbar-logo" />
        {totalScore > 0 && (
          <div className="mm-topbar-score">
            <span className="mm-topbar-score-coin">🪙</span>
            <span className="mm-topbar-score-val">{totalScore.toLocaleString()}</span>
          </div>
        )}
        <button className="mm-topbar-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>

      {/* Drawer backdrop */}
      {menuOpen && <div className="mm-backdrop" onClick={() => setMenuOpen(false)} />}

      {/* Slide-out drawer */}
      <div className={`mm-drawer${menuOpen ? " mm-drawer--open" : ""}`}>
        <div className="mm-drawer-header">
          <img src={gkquizLogo} alt="" className="mm-drawer-logo" />
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
            const text = `🧠 Play General Knowledge Quiz — test your knowledge!\n${window.location.href}`;
            if (navigator.share) navigator.share({ title: "GK Quiz", text, url: window.location.href }).catch(() => {});
            else navigator.clipboard?.writeText(window.location.href).then(() => alert("Link copied!")).catch(() => {});
          }}>
            <span className="mm-drawer-icon">🔗</span>
            <div><div className="mm-drawer-label">Share</div><div className="mm-drawer-sub">Invite friends to play</div></div>
          </button>
          <button className="mm-drawer-item" onClick={() => { setMenuOpen(false); onChangeName(); }}>
            <span className="mm-drawer-icon">✏️</span>
            <div><div className="mm-drawer-label">Change Name</div><div className="mm-drawer-sub">Update your player name</div></div>
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

        {/* Browse Games */}
        <BrowseGames exclude="General Knowledge" />
      </div>
    </div>
  );
};

export default MainMenu;
