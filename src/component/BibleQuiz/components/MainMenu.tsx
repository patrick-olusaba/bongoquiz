import { type FC, useEffect, useRef, useState } from "react";
import type { Player } from "../types/type.ts";
import biblequizLogo from "../assets/biblequiz.png";
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
  const personalBest = parseInt(localStorage.getItem("bible_best_score") ?? "0");

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
          <span className="mm-badge-text">Bible Quiz · Season 1</span>
        </div>

        <div className="mm-title-wrap">
          <img src={biblequizLogo} alt="Bible Quiz" className="mm-title-image" />
        </div>

        <p className="mm-subtitle">Test your knowledge of the Holy Scriptures</p>

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
    </div>
  );
};

export default MainMenu;
