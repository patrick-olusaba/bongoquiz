// PlayerNameModal.tsx — name entry modal shown on home screen
import { type FC, useState } from "react";
import '../styles/Playernamemodal.css';

interface Props {
    currentName: string;
    onSave: (name: string) => void;
    onClose: () => void;
}

export const PlayerNameModal: FC<Props> = ({ currentName, onSave, onClose }) => {
    const [val, setVal] = useState(currentName);

    const save = () => {
        const trimmed = val.trim().slice(0, 20) || "Player";
        onSave(trimmed);
        onClose();
    };

    return (
        <div className="pnm-overlay" onClick={onClose}>
            <div className="pnm-modal" onClick={e => e.stopPropagation()}>
                <div className="pnm-emoji">👤</div>
                <h2 className="pnm-title">What's your name?</h2>
                <p className="pnm-sub">Shows on the leaderboard</p>
                <input
                    className="pnm-input"
                    value={val}
                    maxLength={20}
                    placeholder="Enter your name…"
                    autoFocus
                    onChange={e => setVal(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && save()}
                />
                <div className="pnm-actions">
                    <button className="pnm-btn pnm-btn--save" onClick={save}>✅ Save</button>
                    <button className="pnm-btn pnm-btn--cancel" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};