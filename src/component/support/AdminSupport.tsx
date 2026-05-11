// AdminSupport.tsx — full support panel
import { useState, useEffect, useRef } from "react";
import {
    collection, onSnapshot, query, orderBy,
    addDoc, doc, updateDoc, getDoc, setDoc, writeBatch, getDocs,
} from "firebase/firestore";
import { db } from "../../firebase.ts";

interface Chat { id: string; playerId: string; playerName: string; status: "open" | "resolved"; createdAt: any; lastMsgAt?: number; unreadCount?: number; }
interface Msg  { id: string; sender: "player" | "admin"; text: string; timestamp: number; seenByAdmin?: boolean; isAutoReply?: boolean; }

const QUICK_REPLIES = [
    "Thanks for reaching out! Let me look into this for you.",
    "Could you please provide more details about the issue?",
    "Your payment has been received and is being processed.",
    "Please try restarting the app and try again.",
    "This issue has been escalated to our technical team.",
    "Your account has been updated successfully.",
];

function fmtTime(ts: number) {
    if (!ts) return "";
    const d = new Date(ts), now = new Date();
    return d.toDateString() === now.toDateString()
        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString([], { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function waitTime(ts: any): string {
    if (!ts) return "";
    const ms = Date.now() - (ts?.toMillis?.() ?? ts);
    const m = Math.floor(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
}

export function AdminSupport() {
    const [chats, setChats]         = useState<Chat[]>([]);
    const [unread, setUnread]       = useState<Record<string, number>>({}); // chatId -> unread count
    const [filter, setFilter]       = useState<"all" | "open" | "resolved">("open");
    const [search, setSearch]       = useState("");
    const [sel, setSel]             = useState<Chat | null>(null);
    const [msgs, setMsgs]           = useState<Msg[]>([]);
    const [reply, setReply]         = useState("");
    const [sending, setSending]     = useState(false);
    const [copied, setCopied]       = useState(false);
    const [points, setPoints]       = useState<number | null>(null);
    const [playerTyping, setPlayerTyping] = useState(false);
    const [showQuick, setShowQuick] = useState(false);
    const bottomRef   = useRef<HTMLDivElement>(null);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const notifPerm   = useRef(false);

    // Request browser notification permission once
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().then(p => { notifPerm.current = p === "granted"; });
        } else {
            notifPerm.current = Notification.permission === "granted";
        }
    }, []);

    // Load all chats + track unread per chat
    useEffect(() => {
        const q = query(collection(db, "supportChats"), orderBy("createdAt", "desc"));
        return onSnapshot(q, snap => {
            setChats(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat)));
        });
    }, []);

    // Per-chat unread: watch messages subcollection for each open chat
    useEffect(() => {
        const unsubs: (() => void)[] = [];
        chats.filter(c => c.status === "open").forEach(c => {
            const q = query(collection(db, "supportChats", c.id, "messages"), orderBy("timestamp", "asc"));
            const unsub = onSnapshot(q, snap => {
                const unreadCount = snap.docs.filter(d => d.data().sender === "player" && !d.data().seenByAdmin).length;
                setUnread(prev => ({ ...prev, [c.id]: unreadCount }));
                // Browser notification for new player message in non-selected chat
                const latest = snap.docs[snap.docs.length - 1];
                if (latest && latest.data().sender === "player" && !latest.data().seenByAdmin && sel?.id !== c.id) {
                    if (notifPerm.current) {
                        new Notification(`💬 ${c.playerName}`, { body: latest.data().text, icon: "/favicon.ico" });
                    }
                }
            });
            unsubs.push(unsub);
        });
        return () => unsubs.forEach(u => u());
    }, [chats, sel?.id]);

    // Load messages for selected chat + mark all player msgs as seen
    useEffect(() => {
        if (!sel) return;
        setMsgs([]);
        const q = query(collection(db, "supportChats", sel.id, "messages"), orderBy("timestamp", "asc"));
        const unsub = onSnapshot(q, async snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Msg));
            setMsgs(list);
            // Mark unseen player messages as seen
            const unseen = snap.docs.filter(d => d.data().sender === "player" && !d.data().seenByAdmin);
            if (unseen.length > 0) {
                const batch = writeBatch(db);
                unseen.forEach(d => batch.update(d.ref, { seenByAdmin: true }));
                await batch.commit();
                setUnread(prev => ({ ...prev, [sel.id]: 0 }));
            }
        });
        return unsub;
    }, [sel?.id]);

    // Player typing indicator
    useEffect(() => {
        if (!sel) return;
        return onSnapshot(doc(db, "supportChats", sel.id, "meta", "typing"), d => {
            const isTyping = !!(d.data()?.playerTyping);
            setPlayerTyping(isTyping);
            if (isTyping) {
                if (typingTimer.current) clearTimeout(typingTimer.current);
                typingTimer.current = setTimeout(() => setPlayerTyping(false), 3500);
            }
        });
    }, [sel?.id]);

    // Player points
    useEffect(() => {
        if (!sel?.playerId) return;
        setPoints(null);
        getDoc(doc(db, "leaderboard", sel.playerId)).then(d =>
            setPoints(d.exists() ? (d.data().score ?? 0) : 0)
        );
    }, [sel?.playerId]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, playerTyping]);

    const handleReplyChange = async (val: string) => {
        setReply(val);
        if (!sel) return;
        await setDoc(doc(db, "supportChats", sel.id, "meta", "typing"), { adminTyping: val.length > 0 }, { merge: true });
    };

    const sendReply = async (msg?: string) => {
        const text = (msg ?? reply).trim();
        if (!text || !sel || sending) return;
        setSending(true);
        setReply("");
        setShowQuick(false);
        setDoc(doc(db, "supportChats", sel.id, "meta", "typing"), { adminTyping: false }, { merge: true });
        try {
            await addDoc(collection(db, "supportChats", sel.id, "messages"), {
                sender: "admin", text, timestamp: Date.now(),
            });
        } finally { setSending(false); }
    };

    const resolve = async () => {
        if (!sel) return;
        await updateDoc(doc(db, "supportChats", sel.id), { status: "resolved" });
        setSel(prev => prev ? { ...prev, status: "resolved" } : null);
    };

    const copyPhone = () => {
        if (!sel) return;
        navigator.clipboard.writeText(sel.playerId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } };

    const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

    const visible = chats
        .filter(c => filter === "all" || c.status === filter)
        .filter(c => !search || c.playerName.toLowerCase().includes(search.toLowerCase()) || c.playerId.includes(search));

    return (
        <div style={{ display: "flex", height: "calc(100vh - 120px)", border: "1px solid #e8eaf0", borderRadius: 10, overflow: "hidden", background: "#fff", position: "relative" }}>
        <style>{`
          @media (max-width: 639px) {
            .sa-list  { width: 100% !important; border-right: none !important; display: flex !important; flex-direction: column; position: absolute; inset: 0; z-index: 1; transition: transform .25s; }
            .sa-list.hidden  { transform: translateX(-100%); }
            .sa-convo { position: absolute; inset: 0; z-index: 2; display: flex !important; flex-direction: column; transition: transform .25s; }
            .sa-convo.hidden { transform: translateX(100%); }
            .sa-back  { display: flex !important; }
          }
          .sa-back { display: none; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; font-size: .82rem; color: #4361ee; font-family: inherit; padding: 0; }
        `}</style>

            {/* ── Chat list ── */}
            <div className={`sa-list${sel ? " hidden" : ""}`} style={{ width: 280, borderRight: "1px solid #e8eaf0", display: "flex", flexDirection: "column", flexShrink: 0, background: "#fafafa" }}>
                {/* Header */}
                <div style={{ padding: "14px 16px 10px", background: "linear-gradient(135deg,#4361ee,#7209b7)", color: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: "1rem" }}>Support Chats</span>
                        {totalUnread > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 10, padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700 }}>{totalUnread} new</span>}
                    </div>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone…"
                        style={{ width: "100%", padding: "7px 12px", borderRadius: 20, border: "none", fontSize: "0.8rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "rgba(255,255,255,0.95)", color: "#1a1a2e" }} />
                </div>
                {/* Filter tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid #e8eaf0", background: "#fff" }}>
                    {(["open", "resolved", "all"] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            style={{ flex: 1, padding: "8px 0", border: "none", borderBottom: filter === f ? "2px solid #4361ee" : "2px solid transparent", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, fontFamily: "inherit", background: "transparent", color: filter === f ? "#4361ee" : "#999", transition: "color .15s" }}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                    {visible.length === 0 && <p style={{ padding: 16, color: "#bbb", fontSize: "0.8rem", textAlign: "center" }}>No chats found</p>}
                    {visible.map(c => {
                        const u = unread[c.id] ?? 0;
                        const initials = c.playerName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
                        const isActive = sel?.id === c.id;
                        return (
                            <button key={c.id} onClick={() => setSel(c)}
                                style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: isActive ? "#ede9fe" : "transparent", border: "none", borderBottom: "1px solid #f0f0f8", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "background .15s" }}>
                                {/* Avatar */}
                                <div style={{ width: 40, height: 40, borderRadius: "50%", background: c.status === "open" ? "linear-gradient(135deg,#4361ee,#7209b7)" : "#e0e0e0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700, flexShrink: 0, position: "relative" }}>
                                    {initials}
                                    {c.status === "open" && <span style={{ position: "absolute", bottom: 1, right: 1, width: 9, height: 9, borderRadius: "50%", background: u > 0 ? "#ef4444" : "#22c55e", border: "1.5px solid #fff" }} />}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontWeight: u > 0 ? 700 : 600, fontSize: "0.84rem", color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.playerName}</span>
                                        <span style={{ fontSize: "0.65rem", color: "#bbb", flexShrink: 0, marginLeft: 4 }}>{waitTime(c.createdAt)}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                                        <span style={{ fontSize: "0.72rem", color: c.status === "open" ? "#7209b7" : "#aaa", fontWeight: 500 }}>{c.status === "open" ? "● Open" : "✓ Resolved"}</span>
                                        {u > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: "0.65rem", fontWeight: 700 }}>{u}</span>}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Conversation ── */}
            <div className={`sa-convo${!sel ? " hidden" : ""}`} style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff" }}>
                {!sel ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: "0.85rem" }}>
                        Select a conversation to reply
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ padding: "10px 16px", borderBottom: "1px solid #e8eaf0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                <button className="sa-back" onClick={() => setSel(null)}>← Back</button>
                                <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1a1a2e" }}>{sel.playerName}</div>
                                <div style={{ display: "flex", gap: 12, marginTop: 2, flexWrap: "wrap" }}>
                                    <button onClick={copyPhone} title="Click to copy"
                                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.72rem", color: "#4361ee", fontFamily: "inherit" }}>
                                        📞 {sel.playerId}{copied ? " ✓ Copied" : ""}
                                    </button>
                                    <span style={{ fontSize: "0.72rem", color: "#888" }}>🏆 {points === null ? "…" : `${points.toLocaleString()} pts`}</span>
                                    <span style={{ fontSize: "0.72rem", color: "#aaa" }}>⏱ Waiting {waitTime(sel.createdAt)}</span>
                                </div>
                                </div>
                            </div>
                            {sel.status === "open" ? (
                                <button onClick={resolve} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#dcfce7", color: "#166534", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, fontFamily: "inherit" }}>
                                    ✓ Mark Resolved
                                </button>
                            ) : (
                                <span style={{ fontSize: "0.78rem", color: "#166534" }}>✅ Resolved</span>
                            )}
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                            {msgs.map((m, i) => {
                                const isLast = i === msgs.length - 1;
                                return (
                                    <div key={m.id} style={{ alignSelf: m.sender === "admin" ? "flex-end" : "flex-start", maxWidth: "72%", display: "flex", flexDirection: "column", gap: 2 }}>
                                        <div style={{
                                            background: m.sender === "admin" ? "linear-gradient(135deg,#4361ee,#7209b7)" : "#f0f4ff",
                                            color: m.sender === "admin" ? "#fff" : "#1a1a2e",
                                            borderRadius: m.sender === "admin" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                                            padding: "8px 12px", fontSize: "0.85rem", lineHeight: 1.4,
                                            opacity: m.isAutoReply ? 0.75 : 1, fontStyle: m.isAutoReply ? "italic" : "normal",
                                        }}>
                                            <div style={{ fontSize: "0.68rem", opacity: 0.6, marginBottom: 2 }}>
                                                {m.sender === "admin" ? (m.isAutoReply ? "Auto-reply" : "Support") : sel.playerName}
                                            </div>
                                            {m.text}
                                        </div>
                                        <div style={{ display: "flex", gap: 6, alignSelf: m.sender === "admin" ? "flex-end" : "flex-start", paddingInline: 4 }}>
                                            <span style={{ fontSize: "0.65rem", color: "#bbb" }}>{fmtTime(m.timestamp)}</span>
                                            {/* Seen indicator on last admin message */}
                                            {isLast && m.sender === "admin" && (
                                                <span style={{ fontSize: "0.65rem", color: "#bbb" }}>· Sent</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {playerTyping && (
                                <div style={{ alignSelf: "flex-start", background: "#f0f4ff", borderRadius: "12px 12px 12px 2px", padding: "8px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                                    {[0,1,2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#4361ee", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: `${i*0.2}s` }} />)}
                                    <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input + quick replies */}
                        {sel.status === "open" ? (
                            <div style={{ borderTop: "1px solid #e8eaf0" }}>
                                {/* Quick replies panel */}
                                {showQuick && (
                                    <div style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0f8", display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {QUICK_REPLIES.map((q, i) => (
                                            <button key={i} onClick={() => sendReply(q)}
                                                style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #e0e0f0", background: "#f8f8ff", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit", color: "#4361ee", textAlign: "left" }}>
                                                {q.length > 40 ? q.slice(0, 40) + "…" : q}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div style={{ padding: "10px 12px", display: "flex", gap: 8, alignItems: "center", background: "#f8f8ff" }}>
                                    <button onClick={() => setShowQuick(s => !s)} title="Quick replies"
                                        style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: showQuick ? "linear-gradient(135deg,#4361ee,#7209b7)" : "#ede9fe", cursor: "pointer", fontSize: "1rem", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s" }}>
                                        ⚡
                                    </button>
                                    <div style={{ flex: 1, display: "flex", alignItems: "center", background: "#fff", borderRadius: 24, border: "1px solid #e0e0f0", padding: "6px 14px", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
                                        <textarea value={reply} onChange={e => handleReplyChange(e.target.value)} onKeyDown={onKey}
                                            placeholder="Type a reply…" rows={1}
                                            style={{ flex: 1, resize: "none", border: "none", background: "transparent", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", lineHeight: 1.5, maxHeight: 96, overflowY: "auto" }} />
                                    </div>
                                    <button onClick={() => sendReply()} disabled={!reply.trim() || sending}
                                        style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: reply.trim() ? "linear-gradient(135deg,#4361ee,#7209b7)" : "#e0e0f0", color: reply.trim() ? "#fff" : "#aaa", cursor: reply.trim() ? "pointer" : "default", fontSize: "1rem", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s" }}>
                                        ➤
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: 10, textAlign: "center", color: "#aaa", fontSize: "0.78rem", borderTop: "1px solid #f0f0f8" }}>
                                Chat resolved — read only
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
