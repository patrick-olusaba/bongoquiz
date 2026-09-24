import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Gamepad2 } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../../firebase.ts";

export interface StaffMember {
  uid: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "support";
}

const OWNER_EMAILS = ["waruchojanen@gmail.com", "greatech1ltd@gmail.com"];
const F = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const PURPLE = "#6d28d9";
const PURPLE_LIGHT = "#7c3aed";

// ── Scattered decorative shapes ────────────────────────────────────────────────
function BgShapes() {
  const stroke = "rgba(139,92,246,0.35)";
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} xmlns="http://www.w3.org/2000/svg">
      {/* plus signs */}
      <text x="8%" y="42%" fill={stroke} fontSize="22" fontWeight="300" fontFamily="monospace">+</text>
      <text x="72%" y="18%" fill={stroke} fontSize="18" fontWeight="300" fontFamily="monospace">+</text>
      {/* play triangles */}
      <polygon points="148,295 162,302 148,309" fill="none" stroke={stroke} strokeWidth="1.5" />
      {/* circles */}
      <circle cx="17%" cy="67%" r="10" fill="none" stroke={stroke} strokeWidth="1.5" />
      <circle cx="88%" cy="33%" r="8" fill="none" stroke={stroke} strokeWidth="1.5" />
      <circle cx="93%" cy="62%" r="12" fill="none" stroke={stroke} strokeWidth="1.5" />
      {/* triangles */}
      <polygon points="400,565 414,590 386,590" fill="none" stroke={stroke} strokeWidth="1.5" />
      <polygon points="1100,195 1108,210 1092,210" fill="none" stroke={stroke} strokeWidth="1.5" />
      {/* dot grid — top right */}
      {[0,1,2,3,4].map(col => [0,1,2,3,4].map(row => (
        <circle key={`${col}-${row}`} cx={1340 + col * 18} cy={60 + row * 18} r="2" fill={stroke} />
      )))}
      {/* dot grid — bottom left */}
      {[0,1,2,3,4].map(col => [0,1,2,3].map(row => (
        <circle key={`bl-${col}-${row}`} cx={60 + col * 18} cy={620 + row * 18} r="2" fill={stroke} />
      )))}
    </svg>
  );
}

// ── Main login component ───────────────────────────────────────────────────────
export function CPLogin({ onLogin }: { onLogin: (s: StaffMember) => void }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [err,      setErr]      = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const cred      = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid       = cred.user.uid;
      const userEmail = (cred.user.email ?? "").toLowerCase();

      let snap = await getDoc(doc(db, "staff", uid));

      if (!snap.exists()) {
        const inviteSnap = await getDoc(doc(db, "staffInvites", userEmail));
        if (inviteSnap.exists()) {
          const inv = inviteSnap.data();
          await setDoc(doc(db, "staff", uid), {
            name: inv.name, email: userEmail, role: inv.role,
            isActive: true, addedBy: inv.addedBy, createdAt: Date.now(),
          });
          await deleteDoc(doc(db, "staffInvites", userEmail));
          snap = await getDoc(doc(db, "staff", uid));
        }
      }

      if (!snap.exists() && OWNER_EMAILS.includes(userEmail)) {
        await setDoc(doc(db, "staff", uid), {
          name: "Jane Warucho", email: userEmail, role: "owner",
          isActive: true, createdAt: Date.now(),
        });
        snap = await getDoc(doc(db, "staff", uid));
      }

      if (!snap.exists()) {
        await auth.signOut();
        setErr("Access denied. Ask the platform owner to add you as staff.");
        return;
      }
      const d = snap.data();
      if (!d.isActive) {
        await auth.signOut();
        setErr("Your account is deactivated. Contact the platform owner.");
        return;
      }
      localStorage.setItem("cp_login_at", String(Date.now()));
      onLogin({ uid, name: d.name, email: d.email, role: d.role });
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? "";
      setErr(
        ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(code)
          ? "Invalid email or password."
          : `Login failed (${code})`
      );
    } finally { setLoading(false); }
  };

  const fieldWrap: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    background: "#f4f0ff", borderRadius: 10,
    border: "1.5px solid #e2d9ff", padding: "11px 14px",
  };
  const fieldInput: React.CSSProperties = {
    flex: 1, border: "none", background: "transparent", outline: "none",
    fontSize: "0.9rem", fontFamily: F, color: "#1a1a2e",
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "linear-gradient(135deg,#0a0520 0%,#160b35 45%,#1e1040 100%)", fontFamily: F }}>
      <style>{`
        html,body{overflow:auto!important;height:auto!important;display:block!important;place-items:unset!important}
        .cp-field-wrap:focus-within{border-color:#7c3aed!important;background:#f0e9ff!important}
        .cp-submit:hover{filter:brightness(1.1)}
        .cp-submit:active{transform:scale(0.98)}
      `}</style>

      {/* Decorative scattered shapes */}
      <BgShapes />

      {/* Large gamepad — top left */}
      <div style={{ position: "absolute", top: -60, left: -80, opacity: 0.11, pointerEvents: "none" }}>
        <Gamepad2 size={320} color="#a78bfa" strokeWidth={0.8} />
      </div>

      {/* Large gamepad — bottom right */}
      <div style={{ position: "absolute", bottom: -50, right: -70, opacity: 0.1, pointerEvents: "none" }}>
        <Gamepad2 size={260} color="#a78bfa" strokeWidth={0.8} />
      </div>

      {/* Card */}
      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 20, padding: "44px 40px 36px", width: "100%", maxWidth: 420, boxShadow: "0 32px 80px rgba(109,40,217,0.35), 0 0 0 1px rgba(109,40,217,0.08)" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#1a1a2e,#2e1065)", marginBottom: 14, boxShadow: "0 8px 24px rgba(109,40,217,0.3)" }}>
            <Gamepad2 size={34} color="#ffffff" />
          </div>
          <div style={{ fontWeight: 900, fontSize: "1.6rem", color: "#1a1a2e", letterSpacing: "-0.5px", lineHeight: 1 }}>
            Bongo<span style={{ color: PURPLE_LIGHT }}>Quiz</span>
          </div>
          {/* CONTROL CENTER with decorative lines */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", margin: "8px 0 6px" }}>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(to left,#c4b5fd,transparent)" }} />
            <span style={{ color: PURPLE_LIGHT, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase" }}>CONTROL CENTER</span>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(to right,#c4b5fd,transparent)" }} />
          </div>
          <div style={{ color: "#9ca3af", fontSize: "0.82rem" }}>Staff access only</div>
        </div>

        {/* Error */}
        {err && (
          <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem", marginBottom: 16 }}>
            {err}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Email */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email Address</label>
            <div className="cp-field-wrap" style={{ ...fieldWrap }}>
              <Mail size={16} color="#7c3aed" strokeWidth={2} />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                style={fieldInput}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>Password</label>
            <div className="cp-field-wrap" style={{ ...fieldWrap }}>
              <Lock size={16} color="#7c3aed" strokeWidth={2} />
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={fieldInput}
              />
              <button type="button" onClick={() => setShowPwd(s => !s)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#9ca3af" }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ textAlign: "right", marginTop: 6 }}>
              <span style={{ fontSize: "0.78rem", color: PURPLE_LIGHT, fontWeight: 600, cursor: "default" }}>Forgot password?</span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="cp-submit"
            style={{
              padding: "13px", borderRadius: 10, border: "none",
              background: loading ? "#c4b5fd" : `linear-gradient(135deg,${PURPLE},${PURPLE_LIGHT})`,
              color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer",
              fontFamily: F, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: loading ? "none" : "0 8px 20px rgba(109,40,217,0.35)",
              transition: "filter 0.15s, transform 0.1s",
            }}>
            {loading ? "Signing in…" : <><span>Sign In</span><ArrowRight size={18} /></>}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#9ca3af", fontSize: "0.76rem" }}>
          <Lock size={13} color="#9ca3af" />
          <span>Authorised personnel only</span>
        </div>
      </div>
    </div>
  );
}
