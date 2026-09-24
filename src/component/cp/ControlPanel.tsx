import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, orderBy, limit,
} from "firebase/firestore";
import {
  ChevronDown, ClipboardList, CreditCard, Gamepad2, LayoutDashboard,
  LogOut, Mail, MessageSquare, Settings, User, Users,
} from "lucide-react";
import { auth, db } from "../../firebase.ts";
import { AdminView } from "../admin/AdminView.tsx";
import { AdminSupport } from "../support/AdminSupport.tsx";
import { SupportDashboard } from "../support/SupportDashboard.tsx";
import { CPLogin, type StaffMember } from "./CPLogin.tsx";

// ── Design tokens ─────────────────────────────────────────────────────────────
const F     = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const DARK  = "#1a1a2e";
const BLUE  = "#4361ee";
const GREEN = "#10b981";
const AMBER = "#f59e0b";
const RED   = "#ef4444";
const PURPLE = "#7c3aed";

const ROLE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  owner:   { bg: PURPLE, color: "#fff", label: "OWNER"   },
  admin:   { bg: BLUE,   color: "#fff", label: "ADMIN"   },
  support: { bg: GREEN,  color: "#fff", label: "SUPPORT" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function Sparkline({ color }: { color: string }) {
  return (
    <svg width="80" height="28" viewBox="0 0 80 28" style={{ display: "block" }}>
      <polyline points="0,22 12,16 24,19 36,10 48,14 60,6 72,9 80,4"
        fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" opacity={0.65} />
    </svg>
  );
}

function auditActionStyle(action: string): { bg: string; color: string } {
  const a = action.toLowerCase();
  if (a.includes("delete") || a.includes("remove")) return { bg: "#fee2e2", color: "#991b1b" };
  if (a.includes("add") || a.includes("create") || a.includes("grant")) return { bg: "#dcfce7", color: "#166534" };
  if (a.includes("edit") || a.includes("update") || a.includes("set")) return { bg: "#ede9fe", color: "#5b21b6" };
  if (a.includes("download") || a.includes("export")) return { bg: "#d1fae5", color: "#065f46" };
  if (a.includes("dismiss") || a.includes("revoke")) return { bg: "#fff7ed", color: "#9a3412" };
  return { bg: "#dbeafe", color: "#1e40af" };
}

function initials(name: string) {
  return name.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";
}

function Avatar({ name, size = 30, bg = "#eef0ff", color = BLUE }: { name: string; size?: number; bg?: string; color?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

// ── Support Portal (support role, or owner's support sub-view) ────────────────
function SupportPortal({ staff, onLogout, onBack }: { staff: StaffMember; onLogout?: () => void; onBack?: () => void }) {
  const [tab, setTab] = useState<"chats" | "dashboard">("chats");
  const agent = { uid: staff.uid, name: staff.name, email: staff.email, role: staff.role === "owner" ? "supervisor" : "agent" };
  const btn = (active: boolean): React.CSSProperties => ({
    background: active ? BLUE : "transparent", border: "none", borderRadius: 6,
    padding: "5px 14px", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontFamily: F,
  });
  return (
    <div style={{ fontFamily: F, background: "#f4f5fb", minHeight: "100vh" }}>
      <style>{`html,body{overflow:auto!important;height:auto!important;display:block!important;place-items:unset!important}`}</style>
      <div style={{ background: DARK, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        {onBack && <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", color: "#aaa", fontFamily: F }}>← Console</button>}
        <span style={{ fontWeight: 800, fontSize: "1rem", color: "#ffd200", flex: 1 }}>💬 Support Center</span>
        <button onClick={() => setTab("chats")} style={btn(tab === "chats")}>Chats</button>
        <button onClick={() => setTab("dashboard")} style={btn(tab === "dashboard")}>Dashboard</button>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.82rem" }}>{staff.name}</span>
        {onLogout && <button onClick={onLogout} style={{ background: RED, border: "none", borderRadius: 6, padding: "5px 12px", color: "#fff", cursor: "pointer", fontSize: "0.78rem", fontFamily: F }}>Logout</button>}
      </div>
      <div style={{ padding: 20 }}>
        {tab === "chats" ? <AdminSupport agent={agent} /> : <SupportDashboard agent={agent} />}
      </div>
    </div>
  );
}

// ── Staff Manager ─────────────────────────────────────────────────────────────
interface StaffDoc { uid: string; name: string; email: string; role: "owner" | "admin" | "support"; isActive: boolean; createdAt: number; }
interface InviteDoc { email: string; name: string; role: "admin" | "support"; createdAt: number; }

function StaffManager({ ownerUid }: { ownerUid: string }) {
  const [staffList, setStaffList] = useState<StaffDoc[]>([]);
  const [invites,   setInvites]   = useState<InviteDoc[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);
  const [newEmail,  setNewEmail]  = useState("");
  const [newName,   setNewName]   = useState("");
  const [newRole,   setNewRole]   = useState<"admin" | "support">("admin");
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [sSnap, iSnap] = await Promise.all([
        getDocs(collection(db, "staff")),
        getDocs(collection(db, "staffInvites")),
      ]);
      setStaffList(sSnap.docs.map(d => ({ uid: d.id, ...d.data() } as StaffDoc)));
      setInvites(iSnap.docs.map(d => ({ email: d.id, ...d.data() } as InviteDoc)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const addInvite = async () => {
    if (!newEmail.trim() || !newName.trim()) { setMsg("Email and name are required."); return; }
    setSaving(true); setMsg("");
    try {
      await setDoc(doc(db, "staffInvites", newEmail.trim().toLowerCase()), {
        name: newName.trim(), email: newEmail.trim().toLowerCase(),
        role: newRole, addedBy: ownerUid, createdAt: Date.now(),
      });
      setShowAdd(false); setNewEmail(""); setNewName(""); setNewRole("admin");
      setMsg(`✅ Invite sent for ${newName}. They can now sign in at /cp.`);
      load();
    } catch { setMsg("Failed to add invite."); }
    finally { setSaving(false); }
  };

  const toggleActive = async (s: StaffDoc) => {
    if (s.role === "owner") return;
    await updateDoc(doc(db, "staff", s.uid), { isActive: !s.isActive });
    load();
  };

  const removeInvite = async (email: string) => {
    await deleteDoc(doc(db, "staffInvites", email)); load();
  };

  if (loading) return <p style={{ color: "#888", padding: 20 }}>Loading staff…</p>;

  const activeCount   = staffList.filter(s => s.isActive).length;
  const inactiveCount = staffList.filter(s => !s.isActive).length;
  const inp: React.CSSProperties = { padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: "0.85rem", fontFamily: F, width: "100%", boxSizing: "border-box" };

  return (
    <div>
      {msg && (
        <div style={{ background: msg.startsWith("✅") ? "#f0fdf4" : "#fee2e2", color: msg.startsWith("✅") ? "#166534" : "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: "0.83rem", marginBottom: 14 }}>
          {msg}
        </div>
      )}

      {/* ─ Stats header card ─ */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e8eaf0", marginBottom: 20, display: "flex", alignItems: "center", gap: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={22} color={PURPLE} strokeWidth={2} />
            </div>
          <div>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, color: DARK, lineHeight: 1 }}>{staffList.length}</div>
            <div style={{ fontSize: "0.78rem", color: "#888", marginTop: 2 }}>Total Staff Members</div>
          </div>
          <div style={{ display: "flex", gap: 18, marginLeft: 20 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.82rem", color: "#444" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, display: "inline-block" }} />
              {activeCount} Active
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.82rem", color: "#888" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d1d5db", display: "inline-block" }} />
              {inactiveCount} Inactive
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, opacity: 0.08, marginRight: 12 }}>
          <Users size={48} color={PURPLE} strokeWidth={1.5} />
          <User  size={36} color={PURPLE} strokeWidth={1.5} style={{ alignSelf: "flex-end" }} />
        </div>
        <button onClick={() => setShowAdd(s => !s)}
          style={{ background: PURPLE, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: F }}>
          {showAdd ? "Cancel" : "+ Add Staff"}
        </button>
      </div>

      {/* ─ Add form ─ */}
      {showAdd && (
        <div style={{ background: "#f8f9ff", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #e0e4ff" }}>
          <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#666" }}>
            The staff member must already have a Firebase Auth account with this email. They'll receive their role on next login at <code>/cp</code>.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 8, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: "0.74rem", color: "#888", display: "block", marginBottom: 4 }}>Email</label>
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="staff@email.com" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: "0.74rem", color: "#888", display: "block", marginBottom: 4 }}>Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: "0.74rem", color: "#888", display: "block", marginBottom: 4 }}>Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value as "admin" | "support")}
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: "0.85rem", fontFamily: F }}>
                <option value="admin">Admin</option>
                <option value="support">Support</option>
              </select>
            </div>
            <button onClick={addInvite} disabled={saving}
              style={{ padding: "8px 18px", background: BLUE, border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: F }}>
              {saving ? "…" : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* ─ Staff table ─ */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaf0", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f8" }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: DARK }}>Staff Members</span>
        </div>
        <div style={{ overflowX: "auto" as const }}>
          <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "#fafafe" }}>
                {["Name", "Email", "Role", "Status", "Action"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left" as const, borderBottom: "1px solid #f0f0f8", color: "#999", fontWeight: 600, fontSize: "0.73rem", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffList.map(s => {
                const rb = ROLE_BADGE[s.role] ?? { bg: "#eee", color: "#333", label: s.role.toUpperCase() };
                return (
                  <tr key={s.uid}>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f8f8fc" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={s.name} size={34} bg="#f5f3ff" color={PURPLE} />
                        <span style={{ fontWeight: 600, color: DARK }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f8f8fc" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#666", fontSize: "0.82rem" }}>
                        <Mail size={13} color="#bbb" strokeWidth={2} /> {s.email}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f8f8fc" }}>
                      <span style={{ background: rb.bg, color: rb.color, padding: "3px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px" }}>{rb.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f8f8fc" }}>
                      <span style={{ background: s.isActive ? "#dcfce7" : "#fee2e2", color: s.isActive ? "#166534" : "#991b1b", padding: "3px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700 }}>
                        ● {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #f8f8fc" }}>
                      {s.role !== "owner" && (
                        <button onClick={() => toggleActive(s)}
                          style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 12px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600, color: s.isActive ? RED : GREEN, fontFamily: F }}>
                          {s.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─ Pending invites ─ */}
      {invites.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaf0", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: DARK }}>Pending Invites</span>
            <span style={{ background: "#fff7ed", color: "#9a3412", padding: "2px 8px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700 }}>{invites.length}</span>
          </div>
          <p style={{ margin: "10px 20px", fontSize: "0.8rem", color: "#888" }}>
            These are invited staff members. They will get access once they sign in at <code>/cp</code>.
          </p>
          <div style={{ overflowX: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#fafafe" }}>
                  {["Name", "Email", "Role", "Action"].map(h => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left" as const, borderBottom: "1px solid #f0f0f8", color: "#999", fontWeight: 600, fontSize: "0.73rem", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invites.map(inv => {
                  const rb = ROLE_BADGE[inv.role] ?? { bg: "#eee", color: "#333", label: inv.role.toUpperCase() };
                  return (
                    <tr key={inv.email}>
                      <td style={{ padding: "11px 16px", borderBottom: "1px solid #f8f8fc" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#f0f0f8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <User size={14} color="#aaa" strokeWidth={2} />
                          </div>
                          {inv.name}
                        </div>
                      </td>
                      <td style={{ padding: "11px 16px", borderBottom: "1px solid #f8f8fc", color: "#666", fontSize: "0.82rem" }}>{inv.email}</td>
                      <td style={{ padding: "11px 16px", borderBottom: "1px solid #f8f8fc" }}>
                        <span style={{ background: rb.bg, color: rb.color, padding: "3px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700 }}>{rb.label}</span>
                      </td>
                      <td style={{ padding: "11px 16px", borderBottom: "1px solid #f8f8fc" }}>
                        <button onClick={() => removeInvite(inv.email)}
                          style={{ background: "#fee2e2", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 700, color: "#991b1b", fontFamily: F }}>
                          Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Owner Console ─────────────────────────────────────────────────────────────
type OwnerTab = "overview" | "staff" | "audit";
interface AuditEntry { id: string; action: string; target: string; adminEmail: string; createdAt: { seconds: number } | number; details?: unknown; }

type NavItem = { id: OwnerTab; label: string; Icon: typeof LayoutDashboard };
const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview",  Icon: LayoutDashboard },
  { id: "staff",    label: "Staff",     Icon: Users           },
  { id: "audit",    label: "Audit Log", Icon: ClipboardList   },
];

type StatCard = { key: string; label: string; Icon: typeof Gamepad2; iconBg: string; iconColor: string; lineColor: string };
const STAT_CARDS: StatCard[] = [
  { key: "players",  label: "Total Players",  Icon: Gamepad2,      iconBg: "#eef0ff", iconColor: BLUE,      lineColor: BLUE      },
  { key: "payments", label: "Total Payments", Icon: CreditCard,    iconBg: "#f0fdf4", iconColor: GREEN,     lineColor: GREEN     },
  { key: "chats",    label: "Support Chats",  Icon: MessageSquare, iconBg: "#fff1f2", iconColor: "#f43f5e", lineColor: "#f43f5e" },
  { key: "staff",    label: "Staff Members",  Icon: Users,         iconBg: "#f5f3ff", iconColor: PURPLE,    lineColor: PURPLE    },
];

function OwnerConsole({ staff, onLogout, onOpenAdmin, onOpenSupport }: {
  staff: StaffMember; onLogout: () => void;
  onOpenAdmin: () => void; onOpenSupport: () => void;
}) {
  const [tab,          setTab]          = useState<OwnerTab>("overview");
  const [stats,        setStats]        = useState({ players: 0, payments: 0, chats: 0, staff: 0 });
  const [audit,        setAudit]        = useState<AuditEntry[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [pSnap, paySnap, cSnap, sSnap] = await Promise.all([
          getDocs(collection(db, "players")),
          getDocs(collection(db, "payments")),
          getDocs(collection(db, "supportChats")),
          getDocs(collection(db, "staff")),
        ]);
        setStats({ players: pSnap.size, payments: paySnap.size, chats: cSnap.size, staff: sSnap.size });
      } catch (e) { console.warn("[OwnerConsole stats]", e); }
      finally { setLoadingStats(false); }
    })();
  }, []);

  useEffect(() => {
    if (tab !== "audit") return;
    getDocs(query(collection(db, "adminAudit"), orderBy("createdAt", "desc"), limit(100)))
      .then(snap => setAudit(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditEntry))))
      .catch(e => console.warn("[audit]", e));
  }, [tab]);

  const fmtTime = (ts: { seconds: number } | number | undefined) => {
    if (!ts) return "—";
    const ms = typeof ts === "number" ? ts : ts.seconds * 1000;
    return new Date(ms).toLocaleString();
  };

  const sideNavBtn = (item: NavItem) => {
    const active = tab === item.id;
    return (
      <button key={item.id} onClick={() => setTab(item.id)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "11px 20px", border: "none", cursor: "pointer",
          background: active ? "rgba(67,97,238,0.18)" : "transparent",
          color: active ? "#a5b4fc" : "rgba(255,255,255,0.45)",
          fontSize: "0.88rem", fontWeight: active ? 700 : 400,
          fontFamily: F, textAlign: "left" as const,
          borderLeft: `3px solid ${active ? BLUE : "transparent"}`,
        }}>
        <item.Icon size={15} strokeWidth={2} />
        <span>{item.label}</span>
      </button>
    );
  };

  const contentTabBtn = (item: NavItem) => {
    const active = tab === item.id;
    return (
      <button key={item.id} onClick={() => setTab(item.id)}
        style={{
          padding: "8px 22px", border: "none", background: "transparent",
          color: active ? BLUE : "#999", fontWeight: active ? 700 : 400,
          fontSize: "0.88rem", cursor: "pointer", fontFamily: F,
          borderBottom: `2px solid ${active ? BLUE : "transparent"}`,
          marginBottom: -2, display: "flex", alignItems: "center", gap: 6,
        }}>
        <item.Icon size={13} strokeWidth={2} color={active ? BLUE : "#bbb"} />
        {item.label}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: F }}>
      <style>{`html,body{overflow:hidden!important;height:100%!important;margin:0;padding:0;display:block!important;place-items:unset!important}`}</style>

      {/* ─── Sidebar ─────────────────────────────── */}
      <div style={{ width: 220, background: DARK, display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Logo */}
        <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(67,97,238,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Gamepad2 size={18} color="#a5b4fc" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontWeight: 900, color: "#fff", fontSize: "0.92rem", letterSpacing: "0.5px" }}>BONGOQUIZ</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.58rem", letterSpacing: "2px", textTransform: "uppercase" }}>Control Center</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 10 }}>
          {NAV_ITEMS.map(sideNavBtn)}
        </nav>

        {/* Settings */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingBottom: 4 }}>
          <button style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 20px", border: "none", background: "transparent", color: "rgba(255,255,255,0.32)", fontSize: "0.88rem", cursor: "pointer", fontFamily: F }}>
            <Settings size={15} strokeWidth={2} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* ─── Main column ──────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#f4f5fb" }}>

        {/* Topbar */}
        <div style={{ background: DARK, padding: "0 24px", height: 54, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.78rem" }}>Open panel:</span>
          <button onClick={onOpenAdmin}
            style={{ background: BLUE, border: "none", borderRadius: 6, padding: "6px 14px", color: "#fff", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", fontFamily: F, display: "flex", alignItems: "center", gap: 6 }}>
            <LayoutDashboard size={13} strokeWidth={2} /> Admin Panel <ChevronDown size={12} strokeWidth={2.5} style={{ opacity: 0.7 }} />
          </button>
          <button onClick={onOpenSupport}
            style={{ background: GREEN, border: "none", borderRadius: 6, padding: "6px 14px", color: "#fff", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", fontFamily: F, display: "flex", alignItems: "center", gap: 6 }}>
            <MessageSquare size={13} strokeWidth={2} /> Support Center <ChevronDown size={12} strokeWidth={2.5} style={{ opacity: 0.7 }} />
          </button>

          <div style={{ flex: 1 }} />

          <button style={{ background: AMBER, border: "none", borderRadius: 6, padding: "5px 12px", color: "#fff", fontWeight: 800, fontSize: "0.68rem", cursor: "pointer", fontFamily: F, letterSpacing: "0.5px" }}>
            DONATE
          </button>

          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.12)", margin: "0 2px" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#4361ee,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.68rem" }}>
              {initials(staff.name)}
            </div>
            <span style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.82rem" }}>{staff.name}</span>
          </div>

          <button onClick={onLogout}
            style={{ background: RED, border: "none", borderRadius: 6, padding: "5px 14px", color: "#fff", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", fontFamily: F, display: "flex", alignItems: "center", gap: 6 }}>
            <LogOut size={13} strokeWidth={2} /> Logout
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>

          {/* Secondary tab row */}
          <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e8eaf0" }}>
            {NAV_ITEMS.map(contentTabBtn)}
          </div>

          {/* ─── Overview ─── */}
          {tab === "overview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
                {STAT_CARDS.map(sc => (
                  <div key={sc.key} style={{ background: "#fff", borderRadius: 12, padding: "20px 20px 16px", border: "1px solid #e8eaf0", boxShadow: "0 1px 3px rgba(0,0,0,.04)", position: "relative", overflow: "hidden" }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: sc.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <sc.Icon size={20} color={sc.iconColor} strokeWidth={2} />
                    </div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: DARK, lineHeight: 1, marginTop: 14 }}>
                      {loadingStats ? "…" : stats[sc.key as keyof typeof stats]}
                    </div>
                    <div style={{ fontSize: "0.77rem", color: "#999", marginTop: 4 }}>{sc.label}</div>
                    <div style={{ position: "absolute", bottom: 12, right: 12 }}>
                      <Sparkline color={sc.lineColor} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "#fff", borderRadius: 12, padding: "22px 24px", border: "1px solid #e8eaf0", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: "0.95rem", fontWeight: 700, color: DARK }}>Quick Access</h3>
                <p style={{ margin: "0 0 18px", fontSize: "0.83rem", color: "#777", lineHeight: 1.65 }}>
                  Use the buttons above to open the Admin Panel (game data, players, payments, questions) or the Support Center (player chats, agent dashboard). Both run in full-screen mode — hit ← Back to return here.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={onOpenAdmin}
                    style={{ background: BLUE, border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: F, display: "flex", alignItems: "center", gap: 8 }}>
                    <LayoutDashboard size={15} strokeWidth={2} /> Open Admin Panel →
                  </button>
                  <button onClick={onOpenSupport}
                    style={{ background: GREEN, border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: F, display: "flex", alignItems: "center", gap: 8 }}>
                    <MessageSquare size={15} strokeWidth={2} /> Open Support Center →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Staff ─── */}
          {tab === "staff" && <StaffManager ownerUid={staff.uid} />}

          {/* ─── Audit Log ─── */}
          {tab === "audit" && (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaf0", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: DARK }}>Audit Logs</div>
                  <div style={{ fontSize: "0.75rem", color: "#aaa", marginTop: 2 }}>
                    Track all actions performed by admins and the support team in this panel.
                  </div>
                </div>
                <span style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 12px", fontSize: "0.74rem", color: "#666", fontWeight: 600 }}>
                  Last 100 entries
                </span>
              </div>
              <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "0.83rem" }}>
                  <thead>
                    <tr style={{ background: "#fafafe" }}>
                      {["Time", "Actor", "Action", "Target", "Details"].map(h => (
                        <th key={h} style={{ padding: "11px 16px", textAlign: "left" as const, borderBottom: "1px solid #f0f0f8", color: "#999", fontWeight: 600, fontSize: "0.73rem", textTransform: "uppercase" as const, letterSpacing: "0.5px", whiteSpace: "nowrap" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {audit.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: 32, textAlign: "center" as const, color: "#bbb" }}>No audit entries found.</td></tr>
                    ) : audit.map((a, i) => {
                      const as_ = auditActionStyle(a.action);
                      return (
                        <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafe" }}>
                          <td style={{ padding: "10px 16px", borderBottom: "1px solid #f0f0f8", color: "#888", whiteSpace: "nowrap" as const, fontSize: "0.8rem" }}>{fmtTime(a.createdAt)}</td>
                          <td style={{ padding: "10px 16px", borderBottom: "1px solid #f0f0f8" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Avatar name={a.adminEmail || "?"} size={26} bg="#eef0ff" color={BLUE} />
                              <span style={{ color: "#666", fontSize: "0.8rem" }}>{a.adminEmail}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 16px", borderBottom: "1px solid #f0f0f8" }}>
                            <span style={{ background: as_.bg, color: as_.color, padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" as const }}>{a.action}</span>
                          </td>
                          <td style={{ padding: "10px 16px", borderBottom: "1px solid #f0f0f8" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#555" }}>
                              <ClipboardList size={13} color="#bbb" strokeWidth={2} />
                              <span style={{ fontSize: "0.82rem" }}>{a.target}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 16px", borderBottom: "1px solid #f0f0f8", color: "#888", fontSize: "0.78rem", maxWidth: 280 }}>
                            {a.details == null ? "—" : typeof a.details === "object" ? JSON.stringify(a.details) : String(a.details)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Owner Shell ───────────────────────────────────────────────────────────────
type OwnerView = "console" | "admin" | "support";

function OwnerShell({ staff, onLogout }: { staff: StaffMember; onLogout: () => void }) {
  const [view, setView] = useState<OwnerView>("console");

  if (view === "admin")   return <AdminView preAuthed onBack={() => setView("console")} />;
  if (view === "support") return <SupportPortal staff={staff} onBack={() => setView("console")} />;

  return (
    <OwnerConsole
      staff={staff}
      onLogout={onLogout}
      onOpenAdmin={() => setView("admin")}
      onOpenSupport={() => setView("support")}
    />
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
const SESSION_KEY = "cp_login_at";
const MAX_SESSION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function ControlPanel() {
  const [staff,    setStaff]    = useState<StaffMember | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (!user) {
        setStaff(null);
        setChecking(false);
        return;
      }

      // Enforce 24-hour session limit
      const loginAt = parseInt(localStorage.getItem(SESSION_KEY) ?? "0", 10);
      if (loginAt && Date.now() - loginAt > MAX_SESSION_MS) {
        await signOut(auth);
        localStorage.removeItem(SESSION_KEY);
        setStaff(null);
        setChecking(false);
        return;
      }

      // Restore staff record from Firestore on refresh
      try {
        const snap = await getDoc(doc(db, "staff", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.isActive) {
            setStaff({ uid: user.uid, name: d.name, email: d.email, role: d.role });
          } else {
            await signOut(auth);
          }
        } else {
          await signOut(auth);
        }
      } catch (e) {
        console.warn("[CP session restore]", e);
      }
      setChecking(false);
    });
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem(SESSION_KEY);
    setStaff(null);
  };

  if (checking) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#0a0520,#160b35,#1e1040)" }}>
      <div style={{ textAlign: "center" as const }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(167,139,250,0.2)", borderTopColor: "#a78bfa", borderRadius: "50%", animation: "cp-spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes cp-spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ color: "rgba(167,139,250,0.6)", fontSize: "0.82rem", fontFamily: F }}>Restoring session…</span>
      </div>
    </div>
  );

  if (!staff) return <CPLogin onLogin={(s) => { setStaff(s); }} />;

  if (staff.role === "admin")   return <AdminView preAuthed />;
  if (staff.role === "support") return <SupportPortal staff={staff} onLogout={handleLogout} />;
  if (staff.role === "owner")   return <OwnerShell staff={staff} onLogout={handleLogout} />;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F }}>
      <div style={{ textAlign: "center" as const }}>
        <p style={{ color: RED, fontWeight: 700 }}>⚠ Unknown role: {(staff as StaffMember).role}</p>
        <button onClick={handleLogout} style={{ marginTop: 12, padding: "8px 16px", background: RED, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontFamily: F }}>
          Logout
        </button>
      </div>
    </div>
  );
}
