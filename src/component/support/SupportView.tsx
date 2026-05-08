// SupportView.tsx — standalone support portal (separate from admin)
import { useState, useRef } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { auth } from "../../firebase.ts";
import { AdminSupport } from "./AdminSupport.tsx";

// Create this user in Firebase Auth console:
//   Email: support@bongoquiz.com
//   Password: bongo_admin_XXXX  (where XXXX is the support team's PIN)
const SUPPORT_EMAIL = "waruchojanen@gmail.com";

const CSS = `
.sp-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.sp-box{background:#fff;border-radius:14px;padding:40px 36px;width:100%;max-width:340px;box-shadow:0 8px 40px rgba(0,0,0,0.3);text-align:center}
.sp-logo{font-size:1.4rem;font-weight:800;margin-bottom:4px;color:#4361ee}
.sp-sub{color:#888;font-size:0.82rem;margin-bottom:28px}
.sp-pin-row{display:flex;gap:12px;justify-content:center;margin-bottom:24px}
.sp-pin-input{width:56px;height:64px;border-radius:10px;border:2px solid #ddd;font-size:1.6rem;font-weight:700;text-align:center;outline:none;color:#1a1a2e;transition:border-color 0.15s}
.sp-pin-input:focus{border-color:#4361ee}
.sp-pin-input.filled{border-color:#4361ee;background:#eef0ff}
.sp-btn{width:100%;padding:11px;border-radius:8px;border:none;background:linear-gradient(135deg,#4361ee,#7209b7);color:#fff;font-size:0.95rem;font-weight:700;cursor:pointer;font-family:inherit}
.sp-btn:disabled{background:#aaa;cursor:not-allowed}
.sp-err{color:#991b1b;font-size:0.82rem;margin-bottom:16px;background:#fee2e2;padding:8px 12px;border-radius:6px}
.sp-back{display:block;text-align:center;margin-top:16px;color:#888;font-size:0.8rem;text-decoration:none}
.sp-back:hover{color:#4361ee}
`;

let attempts = 0;
let lockedUntil = 0;

function SupportLogin({ onLogin }: { onLogin: () => void }) {
    const [pins, setPins]       = useState(["", "", "", ""]);
    const [err, setErr]         = useState("");
    const [loading, setLoading] = useState(false);
    const inputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

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
        const now = Date.now();
        if (now < lockedUntil) {
            const mins = Math.ceil((lockedUntil - now) / 60000);
            setErr(`Too many attempts. Try again in ${mins} minute${mins > 1 ? "s" : ""}.`);
            return;
        }
        setErr(""); setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, SUPPORT_EMAIL, `bongo_admin_${pin}`);
            attempts = 0;
            onLogin();
        } catch {
            attempts++;
            const remaining = 5 - attempts;
            if (attempts >= 5) { lockedUntil = Date.now() + 5 * 60 * 1000; attempts = 0; setErr("Too many failed attempts. Locked for 5 minutes."); }
            else setErr(`Incorrect PIN. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`);
            reset();
        } finally { setLoading(false); }
    };

    return (
        <>
        <style>{CSS}</style>
        <div className="sp-wrap">
            <div className="sp-box">
                <div className="sp-logo">💬 Support Portal</div>
                <div className="sp-sub">Bongo Quiz — Customer Care</div>
                {err && <div className="sp-err">{err}</div>}
                <form onSubmit={submit}>
                    <div className="sp-pin-row">
                        {pins.map((p, i) => (
                            <input key={i} ref={inputs[i]}
                                className={`sp-pin-input${p ? " filled" : ""}`}
                                type="password" inputMode="numeric" maxLength={1} value={p}
                                disabled={Date.now() < lockedUntil}
                                onChange={e => handleChange(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e)}
                                autoFocus={i === 0}
                            />
                        ))}
                    </div>
                    <button className="sp-btn" type="submit" disabled={pins.join("").length < 4 || loading || Date.now() < lockedUntil}>
                        {loading ? "Verifying…" : "Enter"}
                    </button>
                </form>
                <a className="sp-back" href="/">← Back to Game</a>
            </div>
        </div>
        </>
    );
}

export function SupportView() {
    const [authed, setAuthed] = useState<boolean | null>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, user => {
            // Only allow the support email — not the main admin
            setAuthed(!!user && user.email === SUPPORT_EMAIL);
        });
        return unsub;
    }, []);

    if (authed === null) return null;
    if (!authed) return <SupportLogin onLogin={() => {}} />;

    return (
        <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: "#f4f5fb", minHeight: "100vh" }}>
            <style>{`html,body{overflow:auto!important;height:auto!important;display:block!important;place-items:unset!important}`}</style>
            {/* Top bar */}
            <div style={{ background: "#1a1a2e", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <a href="/" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "#aaa", textDecoration: "none" }}>← Back</a>
                    <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#4361ee" }}>💬 Support Portal</h2>
                </div>
                <button onClick={() => signOut(auth)}
                    style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,100,100,0.3)", background: "rgba(255,80,80,0.12)", color: "#ff8080", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit" }}>
                    Logout
                </button>
            </div>
            <div style={{ padding: 24 }}>
                <AdminSupport />
            </div>
        </div>
    );
}
