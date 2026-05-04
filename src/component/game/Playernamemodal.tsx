// PlayerNameModal.tsx — name + phone + PIN auth, shared across all games
import { type FC, useState } from "react";
import { lookupPlayer, verifyPin, registerPlayer, saveLocalProfile } from "../../utils/playerAuth.ts";
import '../../styles/Playernamemodal.css';

interface Props {
    currentName:  string;
    currentPhone: string;
    onSave: (name: string, phone: string) => void;
    onClose: () => void;
}

export const PlayerNameModal: FC<Props> = ({ currentName, currentPhone, onSave, onClose }) => {
    const [name,    setName]    = useState(currentName === "Player" ? "" : currentName);
    const [phone,   setPhone]   = useState(currentPhone);
    const [pin,     setPin]     = useState("");
    const [pinConf, setPinConf] = useState("");
    const [step,    setStep]    = useState<"phone" | "new" | "login" | "reset_old" | "reset_new">(currentPhone ? "login" : "phone");
    const [err,     setErr]     = useState("");
    const [loading, setLoading] = useState(false);
    const [hasPin,  setHasPin]  = useState(true);

    // Step 1: check if phone exists
    const checkPhone = async () => {
        const p = phone.trim();
        if (!/^07\d{8}$/.test(p)) return setErr("Enter a valid phone number (07XXXXXXXX).");
        setErr(""); setLoading(true);
        try {
            const player = await lookupPlayer(p);
            if (player) {
                setName(player.name);
                setHasPin(player.hasPin);
                setStep("login");
            } else {
                setStep("new");
            }
        } catch { setErr("Network error. Try again."); }
        finally { setLoading(false); }
    };

    // Step 2a: new player — register
    const register = async () => {
        const n = name.trim().slice(0, 20);
        if (!n) return setErr("Enter your name.");
        if (!/^\d{4}$/.test(pin)) return setErr("PIN must be exactly 4 digits.");
        if (pin !== pinConf) return setErr("PINs do not match.");
        setErr(""); setLoading(true);
        try {
            await registerPlayer(n, phone.trim(), pin);
            saveLocalProfile(n, phone.trim());
            onSave(n, phone.trim());
            onClose();
        } catch { setErr("Failed to save. Try again."); }
        finally { setLoading(false); }
    };

    // Step 2b: existing player — verify PIN
    const login = async () => {
        if (!/^\d{4}$/.test(pin)) return setErr("Enter your 4-digit PIN.");
        setErr(""); setLoading(true);
        try {
            const ok = await verifyPin(phone.trim(), pin);
            if (!ok) return setErr("Incorrect PIN. Try again.");
            saveLocalProfile(name, phone.trim());
            onSave(name, phone.trim());
            onClose();
        } catch { setErr("Network error. Try again."); }
        finally { setLoading(false); }
    };

    // Reset PIN: verify old PIN first
    const verifyOldPin = async () => {
        if (!/^\d{4}$/.test(pin)) return setErr("Enter your current 4-digit PIN.");
        setErr(""); setLoading(true);
        try {
            const ok = await verifyPin(phone.trim(), pin);
            if (!ok) return setErr("Incorrect PIN. Try again.");
            setPin(""); setPinConf("");
            setStep("reset_new");
        } catch { setErr("Network error. Try again."); }
        finally { setLoading(false); }
    };

    // Reset PIN: save new PIN
    const saveNewPin = async () => {
        if (!/^\d{4}$/.test(pin)) return setErr("New PIN must be 4 digits.");
        if (pin !== pinConf) return setErr("PINs do not match.");
        setErr(""); setLoading(true);
        try {
            await registerPlayer(name, phone.trim(), pin);
            saveLocalProfile(name, phone.trim());
            onSave(name, phone.trim());
            onClose();
        } catch { setErr("Failed to save. Try again."); }
        finally { setLoading(false); }
    };

    return (
        <div className="pnm-overlay" onClick={onClose}>
            <div className="pnm-modal" onClick={e => e.stopPropagation()}>
                <div className="pnm-emoji">{step === "login" ? "🔐" : step === "new" ? "🆕" : step === "reset_old" || step === "reset_new" ? "🔑" : "👤"}</div>
                <h2 className="pnm-title">
                    {step === "phone" ? "Who are you?" : step === "login" ? `Welcome back, ${name}!` : step === "new" ? "Create Account" : step === "reset_old" ? "Reset PIN" : "Choose New PIN"}
                </h2>
                <p className="pnm-sub">
                    {step === "phone" ? "Enter your phone number to continue." :
                     step === "login" ? "Enter your 4-digit PIN to sign in." :
                     step === "new" ? "Choose a 4-digit PIN for your account." :
                     step === "reset_old" ? "Enter your current PIN to verify it's you." :
                     "Enter and confirm your new 4-digit PIN."}
                </p>

                {step === "phone" && <>
                    <input className="pnm-input" value={phone} maxLength={10}
                        placeholder="Phone number (07XXXXXXXX)" autoFocus
                        onChange={e => setPhone(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && checkPhone()} />
                </>}

                {step === "new" && <>
                    <input className="pnm-input" value={name} maxLength={20}
                        placeholder="Your name…" autoFocus
                        onChange={e => setName(e.target.value)} />
                    <input className="pnm-input" value={pin} maxLength={4} type="password"
                        placeholder="Choose a 4-digit PIN"
                        onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                        style={{ marginTop: 10 }} />
                    <input className="pnm-input" value={pinConf} maxLength={4} type="password"
                        placeholder="Confirm PIN"
                        onChange={e => setPinConf(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={e => e.key === "Enter" && register()}
                        style={{ marginTop: 10 }} />
                </>}

                {step === "login" && <>
                    <input className="pnm-input" value={name} maxLength={20}
                        placeholder="Your name…"
                        onChange={e => setName(e.target.value)} />
                    <input className="pnm-input" value={pin} maxLength={4} type="password"
                        placeholder="Enter your 4-digit PIN"
                        onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={e => e.key === "Enter" && login()}
                        style={{ marginTop: 10 }} />
                    {!hasPin && (
                        <p style={{ color: "#f59e0b", fontSize: "0.78rem", margin: "6px 0 0", textAlign: "left" }}>
                            💡 You don't have a PIN yet. Your default PIN is <strong>0000</strong>. We recommend resetting it below.
                        </p>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <button style={{ background: "none", border: "none", color: "#aaa", fontSize: "0.75rem", cursor: "pointer" }}
                            onClick={() => { setStep("phone"); setPin(""); setErr(""); }}>
                            Not you? Change number
                        </button>
                        <button style={{ background: "none", border: "none", color: "#f59e0b", fontSize: "0.75rem", cursor: "pointer" }}
                            onClick={() => { setPin(""); setPinConf(""); setErr(""); setStep("reset_old"); }}>
                            🔑 Reset PIN
                        </button>
                    </div>
                </>}

                {(step === "reset_old") && <>
                    <input className="pnm-input" value={pin} maxLength={4} type="password"
                        placeholder="Current PIN (default: 0000)" autoFocus
                        onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={e => e.key === "Enter" && verifyOldPin()} />
                </>}

                {step === "reset_new" && <>
                    <input className="pnm-input" value={pin} maxLength={4} type="password"
                        placeholder="New 4-digit PIN" autoFocus
                        onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                        style={{ marginTop: 10 }} />
                    <input className="pnm-input" value={pinConf} maxLength={4} type="password"
                        placeholder="Confirm new PIN"
                        onChange={e => setPinConf(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={e => e.key === "Enter" && saveNewPin()}
                        style={{ marginTop: 10 }} />
                </>}

                {err && <p style={{ color: "#e53e3e", fontSize: "0.8rem", margin: "6px 0 0" }}>{err}</p>}

                <div className="pnm-actions">
                    {step === "phone"     && <button className="pnm-btn pnm-btn--save" onClick={checkPhone}    disabled={loading}>{loading ? "Checking…"   : "Continue →"}</button>}
                    {step === "new"       && <button className="pnm-btn pnm-btn--save" onClick={register}      disabled={loading}>{loading ? "Saving…"      : "✅ Create Account"}</button>}
                    {step === "login"     && <button className="pnm-btn pnm-btn--save" onClick={login}         disabled={loading}>{loading ? "Verifying…"   : "🔓 Sign In"}</button>}
                    {step === "reset_old" && <button className="pnm-btn pnm-btn--save" onClick={verifyOldPin}  disabled={loading}>{loading ? "Verifying…"   : "Verify →"}</button>}
                    {step === "reset_new" && <button className="pnm-btn pnm-btn--save" onClick={saveNewPin}    disabled={loading}>{loading ? "Saving…"      : "🔑 Save New PIN"}</button>}
                    <button className="pnm-btn pnm-btn--cancel" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};
