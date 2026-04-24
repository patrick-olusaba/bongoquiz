// AdminLogin.tsx — temporary hardcoded login gate
import { useState } from "react";

// TODO: replace with real /api/admin/login endpoint
const ADMIN_USER = "admin";
const ADMIN_PASS = "bongo2026";

const CSS = `
.al-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.al-box {
  background: #fff;
  border-radius: 14px;
  padding: 40px 36px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.3);
}
.al-logo { color: #ffd200; font-size: 1.4rem; font-weight: 800; margin-bottom: 4px; }
.al-sub  { color: #888; font-size: 0.82rem; margin-bottom: 28px; }
.al-label { display: block; font-size: 0.8rem; font-weight: 600; color: #444; margin-bottom: 6px; }
.al-input {
  width: 100%; padding: 10px 12px; border-radius: 8px;
  border: 1px solid #ddd; font-size: 0.9rem; font-family: inherit;
  outline: none; margin-bottom: 16px; box-sizing: border-box;
}
.al-input:focus { border-color: #4361ee; }
.al-btn {
  width: 100%; padding: 11px; border-radius: 8px; border: none;
  background: #4361ee; color: #fff; font-size: 0.95rem;
  font-weight: 700; cursor: pointer; font-family: inherit;
}
.al-btn:hover { background: #3451d1; }
.al-err { color: #991b1b; font-size: 0.82rem; margin-bottom: 12px; background: #fee2e2; padding: 8px 12px; border-radius: 6px; }
.al-back { display: block; text-align: center; margin-top: 16px; color: #888; font-size: 0.8rem; text-decoration: none; }
.al-back:hover { color: #4361ee; }
`;

export function AdminLogin({ onLogin }: { onLogin: () => void }) {
    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const [err,  setErr]  = useState("");

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (user === ADMIN_USER && pass === ADMIN_PASS) {
            sessionStorage.setItem("adm_auth", "1");
            onLogin();
        } else {
            setErr("Invalid username or password.");
        }
    };

    return (
        <>
        <style>{CSS}</style>
        <div className="al-wrap">
            <div className="al-box">
                <div className="al-logo">🛠️ Bongo Quiz</div>
                <div className="al-sub">Admin Panel — sign in to continue</div>
                {err && <div className="al-err">{err}</div>}
                <form onSubmit={submit}>
                    <label className="al-label">Username</label>
                    <input className="al-input" value={user} onChange={e => setUser(e.target.value)} autoFocus />
                    <label className="al-label">Password</label>
                    <input className="al-input" type="password" value={pass} onChange={e => setPass(e.target.value)} />
                    <button className="al-btn" type="submit">Sign In</button>
                </form>
                <a className="al-back" href="#/">← Back to Game</a>
            </div>
        </div>
        </>
    );
}
