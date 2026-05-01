import React from "react";
import biblequizLogo from "../assets/biblequiz.png";

interface TutorialProps {
  onStartGame: () => void;
  onBack: () => void;
}

const steps = [
  { icon: "💳", title: "Pay KES 20", desc: "Enter your M-Pesa number and confirm the STK push to unlock a session." },
  { icon: "⏱️", title: "60-Second Clock", desc: "One shared timer for the whole session. Answer as many questions as you can before it runs out." },
  { icon: "✅", title: "+100 Correct", desc: "Every right answer adds 100 points to your score. Speed doesn't matter — accuracy does." },
  { icon: "❌", title: "−50 Wrong", desc: "A wrong answer deducts 50 points. Think before you tap." },
  { icon: "🔥", title: "Streak Bonus", desc: "Chain correct answers to build a streak. The longer the streak, the higher your multiplier." },
  { icon: "🏆", title: "Leaderboard", desc: "Your final score is saved. Climb the ranks and see how you compare with other players." },
];

const Tutorial: React.FC<TutorialProps> = ({ onStartGame, onBack }) => (
  <div style={{
    minHeight: "100vh", background: "radial-gradient(ellipse at 30% 20%, #1a0050 0%, #0a0020 60%, #000 100%)",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "24px 16px 32px", boxSizing: "border-box", overflowY: "auto", WebkitOverflowScrolling: "touch" as any,
  }}>
    {/* Header */}
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <img src={biblequizLogo} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
      <h2 style={{ color: "#fff", fontSize: "1.3rem", fontWeight: 900, margin: 0 }}>How to Play</h2>
    </div>
    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", margin: "0 0 24px", textAlign: "center" }}>
      Everything you need to know about Bible Quiz
    </p>

    {/* Steps */}
    <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 10 }}>
      {steps.map((s, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 14,
          background: "linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))",
          border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: "14px 16px",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(135deg,rgba(123,97,255,0.3),rgba(255,107,107,0.15))",
            border: "1px solid rgba(180,100,255,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem",
          }}>{s.icon}</div>
          <div>
            <p style={{ color: "#fff", fontWeight: 800, fontSize: "0.9rem", margin: "0 0 3px" }}>{s.title}</p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
          </div>
        </div>
      ))}
    </div>

    {/* Actions */}
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 480, marginTop: 28 }}>
      <button onClick={onStartGame} style={{
        background: "linear-gradient(135deg,#e91e8c,#7B61FF)", border: "none", borderRadius: 50,
        color: "#fff", fontWeight: 900, fontSize: "1rem", padding: "14px", cursor: "pointer",
        boxShadow: "0 4px 20px rgba(233,30,140,0.4)", fontFamily: "inherit",
      }}>🎯 &nbsp;Play Now</button>
      <button onClick={onBack} style={{
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 50,
        color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: "0.9rem", padding: "12px", cursor: "pointer", fontFamily: "inherit",
      }}>← Back to Menu</button>
    </div>
  </div>
);

export default Tutorial;
