// SupportChat.tsx — player-side floating chat widget
import { useState, useEffect, useRef } from "react";
import {
    collection, addDoc, onSnapshot, query, orderBy,
    doc, onSnapshot as docSnap, serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase.ts";
import { PlayerNameModal } from "../game/Playernamemodal.tsx";

interface Msg { id: string; sender: "player" | "admin"; text: string; timestamp: number; seenByAdmin?: boolean; }

const AUTO_REPLY_DELAY = 10_000; // 10s — if no admin reply, send auto-message

export function SupportChat() {
    const playerName = useRef(localStorage.getItem("bongo_player_name") || "");
    const playerId   = useRef(localStorage.getItem("bongo_player_phone") || "");
    const [isLoggedIn, setIsLoggedIn] = useState(!!playerName.current && !!playerId.current);
    const [showLogin, setShowLogin]   = useState(false);
    const [open, setOpen]               = useState(false);

    // Re-check login state whenever widget opens
    useEffect(() => {
        if (open) {
            playerName.current = localStorage.getItem("bongo_player_name") || "";
            playerId.current   = localStorage.getItem("bongo_player_phone") || "";
            setIsLoggedIn(!!playerName.current && !!playerId.current);
        }
    }, [open]);

    // Allow ContactSupport page to open the chat via custom event
    useEffect(() => {
        const handler = () => setOpen(true);
        window.addEventListener("bongo:open-chat", handler);
        return () => window.removeEventListener("bongo:open-chat", handler);
    }, []);
    const [chatId, setChatId]           = useState<string | null>(() => localStorage.getItem(`bq_chat_${playerId.current}`));
    const [msgs, setMsgs]               = useState<Msg[]>([]);
    const [text, setText]               = useState("");
    const [resolved, setResolved]       = useState(false);
    const [sending, setSending]         = useState(false);
    const [adminTyping, setAdminTyping] = useState(false);
    const [hasUnread, setHasUnread]     = useState(false); // new admin msg while widget closed
    const bottomRef   = useRef<HTMLDivElement>(null);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevMsgCount = useRef(0);

    useEffect(() => {
        if (!chatId) return;
        const q = query(collection(db, "supportChats", chatId, "messages"), orderBy("timestamp", "asc"));
        const unsubMsgs = onSnapshot(q, snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Msg));
            setMsgs(list);
            // Unread badge: new admin message while widget is closed
            const newAdminMsgs = list.filter(m => m.sender === "admin").length;
            if (!open && newAdminMsgs > prevMsgCount.current) setHasUnread(true);
            prevMsgCount.current = newAdminMsgs;
        });
        const unsubChat = docSnap(doc(db, "supportChats", chatId), d => {
            if (d.exists()) setResolved(d.data().status === "resolved");
        });
        const unsubTyping = docSnap(doc(db, "supportChats", chatId, "meta", "typing"), d => {
            const isTyping = !!(d.data()?.adminTyping);
            setAdminTyping(isTyping);
            if (isTyping) {
                if (typingTimer.current) clearTimeout(typingTimer.current);
                typingTimer.current = setTimeout(() => setAdminTyping(false), 3500);
            }
        });
        return () => { unsubMsgs(); unsubChat(); unsubTyping(); };
    }, [chatId, open]);

    // Mark seen when widget opens
    useEffect(() => {
        if (open) setHasUnread(false);
    }, [open]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, adminTyping]);

    const handleTextChange = async (val: string) => {
        setText(val);
        if (!chatId) return;
        await setDoc(doc(db, "supportChats", chatId, "meta", "typing"), { playerTyping: val.length > 0 }, { merge: true });
    };

    const send = async () => {
        const msg = text.trim();
        if (!msg || sending) return;
        setSending(true);
        setText("");
        try {
            let id = chatId;
            const isFirstMsg = !id;
            if (!id) {
                const ref = await addDoc(collection(db, "supportChats"), {
                    playerId: playerId.current, playerName: playerName.current,
                    status: "open", createdAt: serverTimestamp(),
                });
                id = ref.id;
                setChatId(id);
                localStorage.setItem(`bq_chat_${playerId.current}`, id);
            }
            await addDoc(collection(db, "supportChats", id, "messages"), {
                sender: "player", text: msg, timestamp: Date.now(), seenByAdmin: false,
            });
            // Auto-reply if first message and no admin reply within 10s
            if (isFirstMsg) {
                const cid = id;
                autoTimer.current = setTimeout(async () => {
                    // Check if admin has replied yet
                    const snap = await import("firebase/firestore").then(({ getDocs, collection: col, query: q2, where }) =>
                        getDocs(q2(col(db, "supportChats", cid, "messages"), where("sender", "==", "admin")))
                    );
                    if (snap.empty) {
                        await addDoc(collection(db, "supportChats", cid, "messages"), {
                            sender: "admin",
                            text: "👋 Thanks for reaching out! An agent will get back to you shortly.",
                            timestamp: Date.now(),
                            isAutoReply: true,
                        });
                    }
                }, AUTO_REPLY_DELAY);
            }
        } catch (err) {
            console.error("Support send error:", err);
            setText(msg);
        } finally { setSending(false); }
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    };

    const lastMsg = msgs[msgs.length - 1];
    const seenByAdmin = lastMsg?.sender === "player" && lastMsg?.seenByAdmin;

    return (
        <>
            {/* Floating button with unread dot */}
            <button onClick={() => setOpen(o => !o)}
                style={{ position: "fixed", bottom: 80, right: 20, zIndex: 9000, width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#4361ee,#7209b7)", color: "#fff", border: "none", cursor: "pointer", fontSize: "1.4rem", boxShadow: "0 4px 16px rgba(67,97,238,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
                aria-label="Support chat">
                {open ? "✕" : "💬"}
                {hasUnread && !open && (
                    <span style={{ position: "absolute", top: 4, right: 4, width: 12, height: 12, borderRadius: "50%", background: "#ff4444", border: "2px solid #fff" }} />
                )}
            </button>

            {/* Widget */}
            {open && (
                <div style={{ position: "fixed", bottom: 144, right: 12, left: 12, zIndex: 8999, width: "auto", maxWidth: 360, marginLeft: "auto", height: 460, background: "#1a1a2e", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>

                    {/* Header */}
                    <div style={{ background: "linear-gradient(135deg,#4361ee,#7209b7)", padding: "12px 16px", flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>💬 Support</div>
                        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
                            {resolved ? "✅ Chat resolved" : "We reply within minutes"}
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        {msgs.length === 0 && (
                            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textAlign: "center", marginTop: 20 }}>
                                👋 Hi {playerName.current}! How can we help?
                            </p>
                        )}
                        {msgs.map((m, i) => {
                            const isLast = i === msgs.length - 1;
                            return (
                                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.sender === "player" ? "flex-end" : "flex-start", gap: 2 }}>
                                    <div style={{
                                        maxWidth: "82%",
                                        background: m.sender === "player" ? "linear-gradient(135deg,#4361ee,#7209b7)" : "rgba(255,255,255,0.08)",
                                        color: "#fff", borderRadius: m.sender === "player" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                                        padding: "8px 12px", fontSize: "0.83rem", lineHeight: 1.4,
                                        opacity: (m as any).isAutoReply ? 0.75 : 1,
                                        fontStyle: (m as any).isAutoReply ? "italic" : "normal",
                                    }}>
                                        {m.text}
                                    </div>
                                    {/* Seen indicator on last player message */}
                                    {isLast && m.sender === "player" && (
                                        <span style={{ fontSize: "0.65rem", color: seenByAdmin ? "#7dd3fc" : "rgba(255,255,255,0.3)", paddingRight: 2 }}>
                                            {seenByAdmin ? "✓✓ Seen" : "✓ Sent"}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                        {adminTyping && (
                            <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.08)", borderRadius: "12px 12px 12px 2px", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                                {[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#aaa", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: `${i*0.2}s` }} />)}
                                <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}`}</style>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    {!isLoggedIn ? (
                        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, textAlign: "center" }}>
                            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.82rem", marginBottom: 10 }}>
                                🔒 Please log in to send a message
                            </p>
                            <button onClick={() => { setShowLogin(true); setOpen(false); }}
                                style={{ background: "linear-gradient(135deg,#4361ee,#7209b7)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                Log In
                            </button>
                        </div>
                    ) : resolved ? (
                        <div style={{ padding: 10, textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", marginBottom: 8 }}>✅ This chat has been resolved</p>
                            <button onClick={async () => { if (!chatId) return; await updateDoc(doc(db, "supportChats", chatId), { status: "open" }); setResolved(false); }}
                                style={{ background: "linear-gradient(135deg,#4361ee,#7209b7)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, fontFamily: "inherit" }}>
                                Continue Chat
                            </button>
                        </div>
                    ) : (
                        <div style={{ padding: 8, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 6, flexShrink: 0, background: "#1a1a2e" }}>
                            <textarea value={text} onChange={e => handleTextChange(e.target.value)} onKeyDown={onKey}
                                placeholder="Type your message…" rows={2}
                                style={{ flex: 1, resize: "none", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 10px", fontSize: "16px", color: "#fff", fontFamily: "inherit", outline: "none" }} />
                            <button onClick={send} disabled={sending}
                                style={{ background: "linear-gradient(135deg,#4361ee,#7209b7)", color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", cursor: "pointer", fontSize: "1.1rem", flexShrink: 0, opacity: sending ? 0.5 : 1 }}>
                                {sending ? "…" : "➤"}
                            </button>
                        </div>
                    )}
                </div>
            )}
            {showLogin && (
                <PlayerNameModal
                    currentName=""
                    currentPhone=""
                    onSave={(name, phone) => {
                        playerName.current = name;
                        playerId.current   = phone;
                        setIsLoggedIn(true);
                        setShowLogin(false);
                        setOpen(true);
                    }}
                    onClose={() => setShowLogin(false)}
                />
            )}
        </>
    );
}
