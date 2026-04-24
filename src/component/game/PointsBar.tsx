// PointsBar.tsx — live points balance shown at top of every round screen
import { type FC, useEffect, useRef, useState } from "react";

interface Props {
    total:      number;   // current running total to display
    label?:     string;   // e.g. "Round 1" | "Round 2" | "Round 3"
}

export const PointsBar: FC<Props> = ({ total, label }) => {
    const [display, setDisplay] = useState(() => {
        const saved = parseInt(localStorage.getItem("bongo_session_score") ?? "0");
        return Math.max(saved, total);
    });

    // Persist running balance so it survives between round screens
    useEffect(() => {
        localStorage.setItem("bongo_session_score", String(total));
    }, [total]);
    const prev = useRef(total);

    // Animate counter when total changes
    useEffect(() => {
        const from = prev.current;
        const to   = total;
        prev.current = to;
        if (from === to) return;

        const steps = 20;
        const diff  = to - from;
        let step = 0;
        const id = setInterval(() => {
            step++;
            setDisplay(Math.round(from + (diff * step) / steps));
            if (step >= steps) clearInterval(id);
        }, 18);
        return () => clearInterval(id);
    }, [total]);

    const phone = localStorage.getItem("bongo_player_phone");
    const name  = localStorage.getItem("bongo_player_name");

    // Only show for logged-in users (phone saved)
    if (!phone) return null;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
            background: "linear-gradient(90deg, #1a1a2e 0%, #16213e 100%)",
            borderBottom: "1px solid rgba(255,210,0,0.2)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 16px", gap: 12,
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.75rem", color: "#aaa" }}>👤 {name}</span>
                {label && <span style={{ fontSize: "0.7rem", color: "#555", borderLeft: "1px solid #333", paddingLeft: 8 }}>{label}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Points</span>
                <span style={{
                    fontSize: "1rem", fontWeight: 800, color: "#ffd200",
                    fontVariantNumeric: "tabular-nums",
                    textShadow: "0 0 10px rgba(255,210,0,0.5)",
                    minWidth: 80, textAlign: "right",
                }}>
                    {display.toLocaleString()}
                </span>
            </div>
        </div>
    );
};
