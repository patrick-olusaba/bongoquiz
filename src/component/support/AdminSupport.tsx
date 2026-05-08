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
        <div style={{ display: "flex", height: "calc(100vh - 120px)", border: "1px solid #e8eaf0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>

            {/* ── Chat list ── */}
            <div style={{ width: 260, borderRight: "1px solid #e8eaf0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid #e8eaf0" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1a1a2e", marginBottom: 8 }}>
                        💬 Chats
                        {totalUnread > 0 && <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: "0.7rem" }}>{totalUnread}</span>}
                    </div>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search name or phone…"
                        style={{ width: "100%", padding: "6px 10px", borderRadius: 7, border: "1px solid #e0e0f0", fontSize: "0.78rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                        {(["open", "resolved", "all"] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                style={{ flex: 1, padding: "4px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, fontFamily: "inherit", background: filter === f ? "#4361ee" : "#f0f0f8", color: filter === f ? "#fff" : "#888" }}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                    {visible.length === 0 && <p style={{ padding: 14, color: "#aaa", fontSize: "0.8rem" }}>No chats found</p>}
                    {visible.map(c => {
                        const u = unread[c.id] ?? 0;
                        return (
                            <button key={c.id} onClick={() => setSel(c)}
                                style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: sel?.id === c.id ? "#f0f4ff" : "transparent", border: "none", borderBottom: "1px solid #f0f0f8", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: c.status === "open" ? (u > 0 ? "#ef4444" : "#4361ee") : "#ccc" }} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: u > 0 ? 700 : 600, fontSize: "0.82rem", color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.playerName}</div>
                                    <div style={{ fontSize: "0.7rem", color: "#aaa" }}>{waitTime(c.createdAt)}</div>
                                </div>
                                {u > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: "0.68rem", fontWeight: 700, flexShrink: 0 }}>{u}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Conversation ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {!sel ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: "0.85rem" }}>
                        Select a conversation to reply
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ padding: "10px 16px", borderBottom: "1px solid #e8eaf0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
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
                                <div style={{ padding: 10, display: "flex", gap: 8, alignItems: "flex-end" }}>
                                    <button onClick={() => setShowQuick(s => !s)} title="Quick replies"
                                        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e0e0f0", background: showQuick ? "#eef0ff" : "#fff", cursor: "pointer", fontSize: "0.85rem", flexShrink: 0 }}>
                                        ⚡
                                    </button>
                                    <textarea value={reply} onChange={e => handleReplyChange(e.target.value)} onKeyDown={onKey}
                                        placeholder="Type a reply… (Enter to send)" rows={2}
                                        style={{ flex: 1, resize: "none", border: "1px solid #ddd", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem", fontFamily: "inherit", outline: "none" }} />
                                    <button onClick={() => sendReply()} disabled={!reply.trim() || sending}
                                        style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#4361ee,#7209b7)", color: "#fff", cursor: "pointer", fontSize: "1rem", opacity: !reply.trim() ? 0.4 : 1, flexShrink: 0 }}>
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
