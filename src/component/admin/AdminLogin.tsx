// AdminLogin.tsx — Firebase Auth email + PIN, with brute-force lockout
import { useState, useRef } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase.ts";

const CSS = `
.al-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.al-box{background:#fff;border-radius:14px;padding:40px 36px;width:100%;max-width:340px;box-shadow:0 8px 40px rgba(0,0,0,0.3);text-align:center}
.al-logo{color:#ffd200;font-size:1.4rem;font-weight:800;margin-bottom:4px}
.al-sub{color:#888;font-size:0.82rem;margin-bottom:28px}
.al-pin-row{display:flex;gap:12px;justify-content:center;margin-bottom:24px}
.al-pin-input{width:56px;height:64px;border-radius:10px;border:2px solid #ddd;font-size:1.6rem;font-weight:700;text-align:center;outline:none;color:#1a1a2e;transition:border-color 0.15s}
.al-pin-input:focus{border-color:#4361ee}
.al-pin-input.filled{border-color:#4361ee;background:#eef0ff}
.al-btn{width:100%;padding:11px;border-radius:8px;border:none;background:#4361ee;color:#fff;font-size:0.95rem;font-weight:700;cursor:pointer;font-family:inherit}
.al-btn:disabled{background:#aaa;cursor:not-allowed}
.al-btn:hover:not(:disabled){background:#3451d1}
.al-err{color:#991b1b;font-size:0.82rem;margin-bottom:16px;background:#fee2e2;padding:8px 12px;border-radius:6px}
.al-back{display:block;text-align:center;margin-top:16px;color:#888;font-size:0.8rem;text-decoration:none}
.al-back:hover{color:#4361ee}
`;

// Admin Firebase Auth email — PIN maps to password via convention:
// password = "bongo_admin_" + PIN  (set this in Firebase Auth console)
const ADMIN_EMAIL = "waruchojanen@gmail.com";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000; // 5 minutes

// Module-level so it survives re-renders but resets on page reload
let attempts = 0;
let lockedUntil = 0;

export function AdminLogin({ onLogin }: { onLogin: () => void }) {
    const [pins,    setPins]    = useState(["", "", "", ""]);
    const [err,     setErr]     = useState("");
    const [loading, setLoading] = useState(false);
    const inputs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];

    const handleChange = (i: number, val: string) => {
        const digit = val.replace(/\D/g, "").slice(-1);
        const next = [...pins]; next[i] = digit; setPins(next);
        if (digit && i < 3) inputs[i + 1].current?.focus();
    };

    const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !pins[i] && i > 0) inputs[i - 1].current?.focus();
    };

    const reset = () => { setPins(["", "", "", ""]); inputs[0].current?.focus(); };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const pin = pins.join("");
        if (pin.length < 4) return;

        // Lockout check
        const now = Date.now();
        if (now < lockedUntil) {
            const mins = Math.ceil((lockedUntil - now) / 60000);
            setErr(`Too many attempts. Try again in ${mins} minute${mins > 1 ? "s" : ""}.`);
            return;
        }

        setErr(""); setLoading(true);
        try {
            // Password convention: "bongo_admin_" + PIN
            // Create this user in Firebase Auth console with that password
            await signInWithEmailAndPassword(auth, ADMIN_EMAIL, `bongo_admin_${pin}`);
            attempts = 0;
            onLogin();
        } catch {
            attempts += 1;
            const remaining = MAX_ATTEMPTS - attempts;
            if (attempts >= MAX_ATTEMPTS) {
                lockedUntil = Date.now() + LOCKOUT_MS;
                attempts = 0;
                setErr("Too many failed attempts. Locked for 5 minutes.");
            } else {
                setErr(`Incorrect PIN. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`);
            }
            reset();
        } finally {
            setLoading(false);
        }
    };

    const filled = pins.join("").length === 4;
    const locked = Date.now() < lockedUntil;

    return (
        <>
        <style>{CSS}</style>
        <div className="al-wrap">
            <div className="al-box">
                <div className="al-logo">🛠️ Bongo Quiz</div>
                <div className="al-sub">Enter your 4-digit admin PIN</div>
                {err && <div className="al-err">{err}</div>}
                <form onSubmit={submit}>
                    <div className="al-pin-row">
                        {pins.map((p, i) => (
                            <input
                                key={i}
                                ref={inputs[i]}
                                className={`al-pin-input${p ? " filled" : ""}`}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={p}
                                disabled={locked}
                                onChange={e => handleChange(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e)}
                                autoFocus={i === 0}
                            />
                        ))}
                    </div>
                    <button className="al-btn" type="submit" disabled={!filled || loading || locked}>
                        {loading ? "Verifying…" : "Enter"}
                    </button>
                </form>
                <a className="al-back" href="#/">← Back to Game</a>
            </div>
        </div>
        </>
    );
}
