// PowerRevealScreen.tsx
import { type FC, useEffect } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import { POWER_DESC } from "../types/gametypes.ts";
import { useSoundFX } from "../hooks/Usesoundfx.ts";
import '../styles/PowerRevealScreen.css';

interface Props {
    power: PrizeItem;
    onContinue: () => void;
}

export const PowerRevealScreen: FC<Props> = ({ power, onContinue }) => {
    const { play } = useSoundFX();

    useEffect(() => { play("power_reveal"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="power-root">
            <div className="power-card">
                <span className="power-badge">Your Power</span>

                <div className="power-img-wrap">
                    <img src={power.img} alt={power.name} className="power-img" />
                </div>

                <h2 className="power-name">{power.name}</h2>
                <p className="power-desc">
                    {POWER_DESC[power.name] ?? power.description ?? "A mysterious power awaits!"}
                </p>

                <button className="power-btn" onClick={onContinue}>
                    ⚡ Start Round 1
                </button>
            </div>
        </div>
    );
};