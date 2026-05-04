import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentName: string;
    currentPhone: string;
    onSave: (name: string, phone: string) => void;
    onStartGame?: (name: string, phone: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
    isOpen, onClose, currentName, currentPhone, onSave, onStartGame,
}) => {
    const [phone,    setPhone]    = useState(currentPhone);
    const [name,     setName]     = useState(currentName);
    const [pin,      setPin]      = useState("");
    const [pinConf,  setPinConf]  = useState("");
    const [step,     setStep]     = useState<"phone"|"new"|"login"|"reset_old"|"reset_new">(currentPhone ? "login" : "phone");
    const [err,      setErr]      = useState("");
    const [loading,  setLoading]  = useState(false);
    const [hasPin,   setHasPin]   = useState(true);

    useEffect(() => {
        if (isOpen) { setPhone(currentPhone); setName(currentName); setPin(""); setPinConf(""); setStep(currentPhone ? "login" : "phone"); setErr(""); }
    }, [isOpen, currentName, currentPhone]);

    const checkPhone = async () => {
        const p = phone.trim();
        if (!/^07\d{8}$/.test(p)) return setErr("Enter a valid phone (07XXXXXXXX).");
        setErr(""); setLoading(true);
        try {
            const { lookupPlayer } = await import("../../../utils/playerAuth.ts");
            const player = await lookupPlayer(p);
            if (player) { setName(player.name); setHasPin(player.hasPin); setStep("login"); }
            else setStep("new");
        } catch { setErr("Network error. Try again."); }
        finally { setLoading(false); }
    };

    const register = async () => {
        const n = name.trim().slice(0, 20);
        if (!n) return setErr("Enter your name.");
        if (!/^\d{4}$/.test(pin)) return setErr("PIN must be 4 digits.");
        if (pin !== pinConf) return setErr("PINs do not match.");
        setErr(""); setLoading(true);
        try {
            const { registerPlayer, saveLocalProfile } = await import("../../../utils/playerAuth.ts");
            await registerPlayer(n, phone.trim(), pin);
            saveLocalProfile(n, phone.trim());
            onSave(n, phone.trim());
            onClose();
            onStartGame?.(n, phone.trim());
        } catch { setErr("Failed to save. Try again."); }
        finally { setLoading(false); }
    };

    const login = async () => {
        if (!/^\d{4}$/.test(pin)) return setErr("Enter your 4-digit PIN.");
        setErr(""); setLoading(true);
        try {
            const { verifyPin, saveLocalProfile } = await import("../../../utils/playerAuth.ts");
            const ok = await verifyPin(phone.trim(), pin);
            if (!ok) return setErr("Incorrect PIN. Try again.");
            saveLocalProfile(name, phone.trim());
            onSave(name, phone.trim());
            onClose();
            onStartGame?.(name, phone.trim());
        } catch { setErr("Network error. Try again."); }
        finally { setLoading(false); }
    };

    const verifyOldPin = async () => {
        if (!/^\d{4}$/.test(pin)) return setErr("Enter your current 4-digit PIN.");
        setErr(""); setLoading(true);
        try {
            const { verifyPin } = await import("../../../utils/playerAuth.ts");
            const ok = await verifyPin(phone.trim(), pin);
            if (!ok) return setErr("Incorrect PIN. Try again.");
            setPin(""); setPinConf(""); setStep("reset_new");
        } catch { setErr("Network error. Try again."); }
        finally { setLoading(false); }
    };

    const saveNewPin = async () => {
        if (!/^\d{4}$/.test(pin)) return setErr("New PIN must be 4 digits.");
        if (pin !== pinConf) return setErr("PINs do not match.");
        setErr(""); setLoading(true);
        try {
            const { registerPlayer, saveLocalProfile } = await import("../../../utils/playerAuth.ts");
            await registerPlayer(name, phone.trim(), pin);
            saveLocalProfile(name, phone.trim());
            onSave(name, phone.trim()); onClose();
        } catch { setErr("Failed to save. Try again."); }
        finally { setLoading(false); }
    };

    const titles: Record<string, string> = {
        phone: "Who are you?", new: "Create Account", login: `Welcome back, ${name}!`,
        reset_old: "Reset PIN", reset_new: "Choose New PIN",
    };
    const subtitles: Record<string, string> = {
        phone: "Enter your phone number to continue.", new: "Choose a 4-digit PIN for your account.",
        login: "Enter your 4-digit PIN to sign in.", reset_old: "Enter your current PIN to verify it's you.",
        reset_new: "Enter and confirm your new 4-digit PIN.",
    };
    const inputStyle: React.CSSProperties = {
        width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 12, color: "#fff", fontSize: "1rem", padding: "12px 16px",
        marginBottom: 10, boxSizing: "border-box", fontFamily: "inherit",
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", padding: "1rem" }}
                    onClick={onClose}>
                    <motion.div initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }}
                        onClick={e => e.stopPropagation()}
                        style={{ background: "#0f0a21", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1.5rem",
                            width: "100%", maxWidth: "400px", padding: "2rem", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "0.5rem",
                                width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1", cursor: "pointer" }}>
                                <X size={16} />
                            </button>
                        </div>
                        <div style={{ fontSize: "2rem", marginBottom: 8 }}>{step === "login" ? "🔐" : step === "new" ? "🆕" : (step === "reset_old" || step === "reset_new") ? "🔑" : "👤"}</div>
                        <h2 style={{ color: "#fff", margin: "0 0 6px", fontSize: "1.4rem", fontWeight: 900 }}>{titles[step]}</h2>
                        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", margin: "0 0 20px" }}>{subtitles[step]}</p>

                        {step === "phone" && (
                            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (07XXXXXXXX)"
                                maxLength={10} autoFocus onKeyDown={e => e.key === "Enter" && checkPhone()} style={inputStyle} />
                        )}
                        {step === "new" && (<>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name…" maxLength={20} autoFocus style={inputStyle} />
                            <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,""))} placeholder="Choose a 4-digit PIN"
                                maxLength={4} type="password" style={inputStyle} />
                            <input value={pinConf} onChange={e => setPinConf(e.target.value.replace(/\D/g,""))} placeholder="Confirm PIN"
                                maxLength={4} type="password" onKeyDown={e => e.key === "Enter" && register()} style={inputStyle} />
                        </>)}
                        {step === "login" && (<>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name…" maxLength={20} autoFocus style={inputStyle} />
                            <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,""))} placeholder="Enter your 4-digit PIN"
                                maxLength={4} type="password" onKeyDown={e => e.key === "Enter" && login()} style={inputStyle} />
                            {!hasPin && (
                                <p style={{ color: "#f59e0b", fontSize: "0.78rem", margin: "-4px 0 8px", textAlign: "left" }}>
                                    💡 Your default PIN is <strong>0000</strong>. We recommend resetting it.
                                </p>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <button onClick={() => { setStep("phone"); setPin(""); setErr(""); }}
                                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", cursor: "pointer" }}>
                                    Not you? Change number
                                </button>
                                <button onClick={() => { setPin(""); setPinConf(""); setErr(""); setStep("reset_old"); }}
                                    style={{ background: "none", border: "none", color: "#f59e0b", fontSize: "0.75rem", cursor: "pointer" }}>
                                    🔑 Reset PIN
                                </button>
                            </div>
                        </>)}
                        {step === "reset_old" && (
                            <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,""))} placeholder="Current PIN (default: 0000)"
                                maxLength={4} type="password" autoFocus onKeyDown={e => e.key === "Enter" && verifyOldPin()} style={inputStyle} />
                        )}
                        {step === "reset_new" && (<>
                            <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,""))} placeholder="New 4-digit PIN"
                                maxLength={4} type="password" autoFocus style={inputStyle} />
                            <input value={pinConf} onChange={e => setPinConf(e.target.value.replace(/\D/g,""))} placeholder="Confirm new PIN"
                                maxLength={4} type="password" onKeyDown={e => e.key === "Enter" && saveNewPin()} style={inputStyle} />
                        </>)}

                        {err && <p style={{ color: "#ff6b6b", fontSize: "0.8rem", margin: "0 0 10px" }}>{err}</p>}

                        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                            <button onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: 50, color: "rgba(255,255,255,0.6)", padding: "12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                                Cancel
                            </button>
                            <button disabled={loading}
                                onClick={step === "phone" ? checkPhone : step === "new" ? register : step === "login" ? login : step === "reset_old" ? verifyOldPin : saveNewPin}
                                style={{ flex: 1, background: "linear-gradient(135deg,#11998e,#38ef7d)", border: "none",
                                    borderRadius: 50, color: "#fff", padding: "12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }}>
                                {loading ? "…" : step === "phone" ? "Continue →" : step === "new" ? "✅ Create Account" : step === "login" ? "🔓 Sign In" : step === "reset_old" ? "Verify →" : "🔑 Save New PIN"}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
