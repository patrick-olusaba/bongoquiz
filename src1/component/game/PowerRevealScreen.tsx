// PowerRevealScreen.tsx
import { type FC, useEffect } from "react";
import type { PrizeItem } from "../../types/bongotypes.ts";
import { POWER_DESC } from "../../types/gametypes.ts";
import { useSoundFX } from "../../hooks/Usesoundfx.ts";
import '../../styles/PowerRevealScreen.css';

interface Props {
    power: PrizeItem;
    onContinue: () => void;
    onBack?: () => void;
}

export const PowerRevealScreen: FC<Props> = ({ power, onContinue, onBack }) => {
    const { play } = useSoundFX();

    useEffect(() => { play("power_reveal"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="power-root">
            {/* Animated background objects */}
            <div className="power-bg">
                {['⚡','🎯','💥','🔥','✨','⭐','💎','🎲'].map((icon, i) => (
                    <div key={i} className="power-float-icon" style={{
                        left: `${(i * 14 + 5) % 92}%`,
                        top: `${(i * 19 + 8) % 88}%`,
                        animationDelay: `${i * 0.5}s`,
                        fontSize: `${1.1 + (i % 3) * 0.4}rem`,
                        opacity: 0.12 + (i % 3) * 0.04
                    }}>{icon}</div>
                ))}
                <div className="power-orb power-orb-1" />
                <div className="power-orb power-orb-2" />
                <div className="power-orb power-orb-3" />
            </div>

            {/* Fixed back button */}
            {onBack && (
                <div className="power-topbar">
                    <button onClick={onBack} className="power-back-btn">← <span>Back</span></button>
                </div>
            )}

            <div className="power-card">
                <span className="power-badge">
                    <span className="power-badge-pulse" />
                    Step 2 of 3
                </span>

                <h3 className="power-section-title">Your Power</h3>

                <div className="power-img-wrap">
                    <div className="power-img-ring" />
                    <img src={power.img} alt={power.name} className="power-img" />
                </div>

                <h2 className="power-name">{power.name}</h2>
                <p className="power-desc">
                    {POWER_DESC[power.name] ?? power.description ?? "A mysterious power awaits!"}
                </p>

                <div className="power-divider" />

                <button className="power-btn" onClick={onContinue}>
                    ⚡ Start Round 1
                </button>
            </div>
        </div>
    );
};