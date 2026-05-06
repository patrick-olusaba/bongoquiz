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
            {onBack && (
                <button onClick={onBack} style={{position:'fixed',top:16,left:16,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:10,color:'#fff',width:36,height:36,cursor:'pointer',fontSize:'1.1rem',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10}}>←</button>
            )}
            <div className="power-card">
                <span className="power-badge">Your Power</span>

                <div className="power-img-wrap">
                    <img src={power.img} alt={power.name} className="power-img" />
                </div>

                <h2 className="power-name">{power.name}</h2>
                <p className="power-desc">
                    {POWER_DESC[power.name] ?? power.description ?? "A mysterious power awaits!"}
                </p>
                <div style={{width:'60px',height:'2px',background:'linear-gradient(90deg,transparent,rgba(255,215,0,0.6),transparent)',margin:'0 auto 24px',borderRadius:2}}/>
                <button className="power-btn" onClick={onContinue}>
                    ⚡ Start Round 1
                </button>
            </div>
        </div>
    );
};