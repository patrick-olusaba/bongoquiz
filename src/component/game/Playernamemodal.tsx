// PlayerNameModal.tsx — name + phone entry, saved to localStorage
import { type FC, useState } from "react";
import '../../styles/Playernamemodal.css';

interface Props {
    currentName:  string;
    currentPhone: string;
    onSave: (name: string, phone: string) => void;
    onClose: () => void;
}

export const PlayerNameModal: FC<Props> = ({ currentName, currentPhone, onSave, onClose }) => {
    const [name,  setName]  = useState(currentName === "Player" ? "" : currentName);
    const [phone, setPhone] = useState(currentPhone);
    const [err,   setErr]   = useState("");

    const save = () => {
        const trimmedName  = name.trim().slice(0, 20);
        const trimmedPhone = phone.trim();
        if (!trimmedName)                          return setErr("Please enter your name.");
        if (!/^07\d{8}$/.test(trimmedPhone))       return setErr("Enter a valid phone number (07XXXXXXXX).");
        setErr("");
        onSave(trimmedName, trimmedPhone);
        onClose();
    };

    return (
        <div className="pnm-overlay" onClick={onClose}>
            <div className="pnm-modal" onClick={e => e.stopPropagation()}>
                <div className="pnm-emoji">👤</div>
                <h2 className="pnm-title">Who are you?</h2>
                <p className="pnm-sub">Your name shows on the leaderboard. Phone is used for M-Pesa payment.</p>

                <input
                    className="pnm-input"
                    value={name}
                    maxLength={20}
                    placeholder="Your name…"
                    autoFocus
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && save()}
                />
                <input
                    className="pnm-input"
                    value={phone}
                    maxLength={10}
                    placeholder="Phone number (07XXXXXXXX)"
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && save()}
                    style={{ marginTop: 10 }}
                />
                {err && <p style={{ color: "#e53e3e", fontSize: "0.8rem", margin: "6px 0 0" }}>{err}</p>}

                <div className="pnm-actions">
                    <button className="pnm-btn pnm-btn--save" onClick={save}>✅ Save & Play</button>
                    <button className="pnm-btn pnm-btn--cancel" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};
