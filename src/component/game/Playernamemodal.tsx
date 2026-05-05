// PlayerNameModal.tsx — name + phone + PIN auth, shared across all games
import { type FC, useState, useEffect, useRef } from "react";
import { lookupPlayer, verifyPin, registerPlayer, saveLocalProfile } from "../../utils/playerAuth.ts";
import '../../styles/Playernamemodal.css';

interface Props {
    currentName:  string;
    currentPhone: string;
    onSave: (name: string, phone: string) => void;
    onClose: () => void;
}

/** 4 individual square boxes for PIN entry */
const PinBoxes: FC<{ value: string; onChange: (v: string) => void; onComplete?: () => void }> = ({ value, onChange, onComplete }) => {
    const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
    const [show, setShow] = useState(false);

    const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !value[i] && i > 0) refs[i - 1].current?.focus();
    };

    const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const digit = e.target.value.replace(/\D/g, "").slice(-1);
        const arr = (value + "    ").slice(0, 4).split("");
        arr[i] = digit;
        const next = arr.join("").replace(/ /g, "");
        onChange(next);
        if (digit && i < 3) refs[i + 1].current?.focus();
        if (next.length === 4 && onComplete) onComplete();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
        if (pasted) { onChange(pasted); refs[Math.min(pasted.length, 3)].current?.focus(); }
        e.preventDefault();
    };

    return (
        <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
            <div className="pnm-pin-boxes">
                {[0, 1, 2, 3].map(i => (
                    <input
                        key={i}
                        ref={refs[i]}
                        className={`pnm-pin-box${value[i] ? " filled" : ""}`}
                        type={show ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={1}
                        value={value[i] || ""}
                        autoFocus={i === 0}
                        onChange={e => handleChange(i, e)}
                        onKeyDown={e => handleKey(i, e)}
                        onPaste={handlePaste}
                    />
                ))}
            </div>
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="pnm-pin-eye"
                tabIndex={-1}
                aria-label={show ? "Hide PIN" : "Show PIN"}
            >
                {show ? "🙈" : "👁️"}
            </button>
        </div>
    );
};

export const PlayerNameModal: FC<Props> = ({ currentName, currentPhone, onSave, onClose }) => {
    const [name,    setName]    = useState(currentName === "Player" ? "" : currentName);
    const [phone,   setPhone]   = useState(currentPhone);
    const [pin,     setPin]     = useState("");
    const [pinConf, setPinConf] = useState("");
    const [step,    setStep]    = useState<"phone" | "new" | "login" | "reset_old" | "reset_new">(currentPhone ? "login" : "phone");
    const [err,     setErr]     = useState("");
    const [loading, setLoading] = useState(false);
    const [hasPin,  setHasPin]  = useState(true);

    useEffect(() => {
        if (!currentPhone) return;
        lookupPlayer(currentPhone).then(player => {
            if (player) { setName(player.name); setHasPin(player.hasPin); }
            else setStep("phone");
        }).catch(() => {});
    }, [currentPhone]);

    const checkPhone = async () => {
        const p = phone.trim();
        if (!/^07\d{8}$/.test(p)) return setErr("Enter a valid phone number (07XXXXXXXX).");
        setErr(""); setLoading(true);
        try {
            const player = await lookupPlayer(p);
            if (player) { setName(player.name); setHasPin(player.hasPin); setStep("login"); }
            else setStep("new");
        } catch { setErr("Network error. Try again."); }
        finally { setLoading(false); }
    };

    const register = async () => {
        const n = name.trim().slice(0, 20);
        if (!n) return setErr("Enter your name.");
        if (pin.length !== 4) return setErr("PIN must be exactly 4 digits.");
        if (pin !== pinConf) return setErr("PINs do not match.");
        setErr(""); setLoading(true);
        try {
            await registerPlayer(n, phone.trim(), pin);
            saveLocalProfile(n, phone.trim());
            onSave(n, phone.trim()); onClose();
        } catch { setErr("Failed to save. Try again."); }
        finally { setLoading(false); }
    };

    const login = async () => {
        if (pin.length !== 4) return setErr("Enter your 4-digit PIN.");
        setErr(""); setLoading(true);
        try {
            const ok = await verifyPin(phone.trim(), pin);
            if (!ok) { setErr("Incorrect PIN. Try again."); return; }
            saveLocalProfile(name, phone.trim());
            onSave(name, phone.trim()); onClose();
        } catch { setErr("Network error. Try again."); }
        finally { setLoading(false); }
    };

    const verifyOldPin = async () => {
        if (pin.length !== 4) return setErr("Enter your current 4-digit PIN.");
        setErr(""); setLoading(true);
        try {
            const ok = await verifyPin(phone.trim(), pin);
            if (!ok) { setErr("Incorrect PIN. Try again."); return; }
            setPin(""); setPinConf(""); setStep("reset_new");
        } catch { setErr("Network error. Try again."); }
        finally { setLoading(false); }
    };

    const saveNewPin = async () => {
        if (pin.length !== 4) return setErr("New PIN must be 4 digits.");
        if (pin !== pinConf) return setErr("PINs do not match.");
        setErr(""); setLoading(true);
        try {
            await registerPlayer(name, phone.trim(), pin);
            saveLocalProfile(name, phone.trim());
            onSave(name, phone.trim()); onClose();
        } catch { setErr("Failed to save. Try again."); }
        finally { setLoading(false); }
    };

    const isPinStep = step === "login" || step === "reset_old" || step === "reset_new" || step === "new";

    return (
        <div className="pnm-overlay" onClick={onClose}>
            <div className="pnm-modal" onClick={e => e.stopPropagation()}>
                <div className="pnm-emoji">{step === "login" ? "🔐" : step === "new" ? "🆕" : isPinStep ? "🔑" : "👤"}</div>
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

                {step === "phone" && (
                    <input className="pnm-input" value={phone} maxLength={10}
                        placeholder="Phone number (07XXXXXXXX)" autoFocus
                        inputMode="numeric"
                        onChange={e => setPhone(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && checkPhone()} />
                )}

                {step === "new" && <>
                    <input className="pnm-input" value={name} maxLength={20}
                        placeholder="Your name…" autoFocus
                        onChange={e => setName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))} />
                    <p className="pnm-pin-label">Choose PIN</p>
                    <PinBoxes value={pin} onChange={v => { setPin(v); setErr(""); }} />
                    <p className="pnm-pin-label" style={{ marginTop: 14 }}>Confirm PIN</p>
                    <PinBoxes value={pinConf} onChange={v => { setPinConf(v); setErr(""); }} onComplete={register} />
                </>}

                {step === "login" && <>
                    <div className="pnm-name-display">
                        <div className="pnm-name-avatar">{name.charAt(0).toUpperCase()}</div>
                        <span className="pnm-name-text">{name}</span>
                    </div>
                    <p className="pnm-pin-label">Enter PIN</p>
                    <PinBoxes value={pin} onChange={v => { setPin(v); setErr(""); }} onComplete={login} />
                    {!hasPin && (
                        <p style={{ color: "#f59e0b", fontSize: "0.78rem", margin: "8px 0 0", textAlign: "left" }}>
                            💡 No PIN set yet. Default is <strong>0000</strong>. Reset it below.
                        </p>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                        <button className="pnm-link" onClick={() => { setStep("phone"); setPin(""); setErr(""); }}>Not you? Change number</button>
                        <button className="pnm-link pnm-link--gold" onClick={() => { setPin(""); setPinConf(""); setErr(""); setStep("reset_old"); }}>🔑 Reset PIN</button>
                    </div>
                </>}

                {step === "reset_old" && <>
                    <p className="pnm-pin-label">Current PIN</p>
                    <PinBoxes value={pin} onChange={v => { setPin(v); setErr(""); }} onComplete={verifyOldPin} />
                </>}

                {step === "reset_new" && <>
                    <p className="pnm-pin-label">New PIN</p>
                    <PinBoxes value={pin} onChange={v => { setPin(v); setErr(""); }} />
                    <p className="pnm-pin-label" style={{ marginTop: 14 }}>Confirm New PIN</p>
                    <PinBoxes value={pinConf} onChange={v => { setPinConf(v); setErr(""); }} onComplete={saveNewPin} />
                </>}

                {err && <p style={{ color: "#e53e3e", fontSize: "0.8rem", margin: "8px 0 0" }}>{err}</p>}

                <div className="pnm-actions">
                    {step === "phone"     && <button className="pnm-btn pnm-btn--save" onClick={checkPhone}   disabled={loading}>{loading ? "Checking…"  : "Continue →"}</button>}
                    {step === "new"       && <button className="pnm-btn pnm-btn--save" onClick={register}     disabled={loading}>{loading ? "Saving…"     : "✅ Create Account"}</button>}
                    {step === "login"     && <button className="pnm-btn pnm-btn--save" onClick={login}        disabled={loading}>{loading ? "Verifying…"  : "🔓 Sign In"}</button>}
                    {step === "reset_old" && <button className="pnm-btn pnm-btn--save" onClick={verifyOldPin} disabled={loading}>{loading ? "Verifying…"  : "Verify →"}</button>}
                    {step === "reset_new" && <button className="pnm-btn pnm-btn--save" onClick={saveNewPin}   disabled={loading}>{loading ? "Saving…"     : "🔑 Save New PIN"}</button>}
                    <button className="pnm-btn pnm-btn--cancel" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};
