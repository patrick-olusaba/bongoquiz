import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase.ts";

export interface Agent { uid: string; name: string; email: string; role: string; }

const ADMIN_EMAIL = "waruchojanen@gmail.com";

export function AgentLogin({ onLogin }: { onLogin: (agent: Agent) => void }) {
    const [email,    setEmail]    = useState(ADMIN_EMAIL);
    const [password, setPassword] = useState("");
    const [err,      setErr]      = useState("");
    const [loading,  setLoading]  = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(""); setLoading(true);
        try {
            const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
            const agentRef = doc(db, "agents", cred.user.uid);
            let snap = await getDoc(agentRef);
            // Auto-provision the primary admin as an agent on first login
            if (!snap.exists() && cred.user.email === ADMIN_EMAIL) {
                await setDoc(agentRef, { name: "Admin", email: ADMIN_EMAIL, role: "supervisor", createdAt: Date.now() });
                snap = await getDoc(agentRef);
            }
            if (!snap.exists()) {
                await auth.signOut();
                setErr("Access denied. You are not registered as a support agent.");
                return;
            }
            const data = snap.data();
            onLogin({ uid: cred.user.uid, name: data.name, email: data.email, role: data.role ?? "agent" });
        } catch (e: any) {
            const code = e?.code ?? "unknown";
            setErr(code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found"
                ? "Invalid email or password."
                : `Login failed (${code})`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#1a1a2e,#16213e)", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 360, boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                    <div style={{ fontSize: "2rem", marginBottom: 6 }}>💬</div>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#1a1a2e" }}>Support Portal</div>
                    <div style={{ color: "#888", fontSize: "0.8rem", marginTop: 4 }}>Sign in with your agent account</div>
                </div>
                {err && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "8px 12px", fontSize: "0.82rem", marginBottom: 16 }}>{err}</div>}
                <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
                        style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: "0.88rem", fontFamily: "inherit", outline: "none" }} />
                    <div style={{ position: "relative" }}>
                        <input type={showPwd ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
                            style={{ width: "100%", padding: "10px 40px 10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                        <button type="button" onClick={() => setShowPwd(s => !s)}
                            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>
                            {showPwd ? "🙈" : "👁️"}
                        </button>
                    </div>
                    <button type="submit" disabled={loading}
                        style={{ padding: "11px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#4361ee,#7209b7)", color: "#fff", fontWeight: 700, fontSize: "0.95rem", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit" }}>
                        {loading ? "Signing in…" : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
}
