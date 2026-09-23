import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.ts";
import type { Agent } from "./AgentLogin.tsx";

interface AgentStats { uid: string; name: string; chatsHandled: number; messagesCount: number; avgResponseMin: number; }

export function SupportDashboard({ agent }: { agent: Agent }) {
    const [stats, setStats] = useState<AgentStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const [agentsSnap, chatsSnap] = await Promise.all([
                getDocs(collection(db, "agents")),
                getDocs(collection(db, "supportChats")),
            ]);

            const agentList = agentsSnap.docs.map(d => ({ uid: d.id, name: d.data().name }));
            const result: AgentStats[] = [];

            for (const ag of agentList) {
                const agentChats = chatsSnap.docs.filter(d => d.data().assignedAgent === ag.uid);
                let totalMsgs = 0, totalResponseTime = 0, responseCount = 0;

                for (const chatDoc of agentChats) {
                    const msgsSnap = await getDocs(collection(db, "supportChats", chatDoc.id, "messages"));
                    const msgs = msgsSnap.docs.map(d => d.data()).sort((a: any, b: any) => a.timestamp - b.timestamp);
                    totalMsgs += msgs.filter((m: any) => m.sender === "admin").length;
                    const firstPlayer = msgs.find((m: any) => m.sender === "player");
                    const firstAdmin  = msgs.find((m: any) => m.sender === "admin");
                    if (firstPlayer && firstAdmin && firstAdmin.timestamp > firstPlayer.timestamp) {
                        totalResponseTime += (firstAdmin.timestamp - firstPlayer.timestamp) / 60000;
                        responseCount++;
                    }
                }

                result.push({ uid: ag.uid, name: ag.name, chatsHandled: agentChats.length, messagesCount: totalMsgs, avgResponseMin: responseCount > 0 ? totalResponseTime / responseCount : 0 });
            }

            setStats(result.sort((a, b) => b.chatsHandled - a.chatsHandled));
        } finally { setLoading(false); }
    };

    const totalChats = stats.reduce((s, a) => s + a.chatsHandled, 0);
    const totalMsgs = stats.reduce((s, a) => s + a.messagesCount, 0);

    return (
        <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: "#f4f5fb", minHeight: "100vh", padding: 24 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1a1a2e", margin: 0 }}>Support Dashboard</h1>
                    <p style={{ color: "#888", fontSize: "0.85rem", marginTop: 4 }}>Today's performance</p>
                </div>

                {/* Summary cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
                    <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>
                        <div style={{ fontSize: "0.75rem", color: "#888", fontWeight: 600, marginBottom: 6 }}>TOTAL CHATS</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#4361ee" }}>{totalChats}</div>
                    </div>
                    <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>
                        <div style={{ fontSize: "0.75rem", color: "#888", fontWeight: 600, marginBottom: 6 }}>TOTAL MESSAGES</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#7209b7" }}>{totalMsgs}</div>
                    </div>
                    <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>
                        <div style={{ fontSize: "0.75rem", color: "#888", fontWeight: 600, marginBottom: 6 }}>ACTIVE AGENTS</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#22c55e" }}>{stats.filter(s => s.chatsHandled > 0).length}</div>
                    </div>
                </div>

                {/* Per-agent table */}
                <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>Agent Performance</h2>
                    {loading ? (
                        <p style={{ color: "#aaa", fontSize: "0.85rem" }}>Loading…</p>
                    ) : stats.length === 0 ? (
                        <p style={{ color: "#aaa", fontSize: "0.85rem" }}>No agents found</p>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "2px solid #e8eaf0" }}>
                                    <th style={{ textAlign: "left", padding: "10px 0", fontSize: "0.75rem", fontWeight: 700, color: "#888" }}>AGENT</th>
                                    <th style={{ textAlign: "right", padding: "10px 0", fontSize: "0.75rem", fontWeight: 700, color: "#888" }}>CHATS</th>
                                    <th style={{ textAlign: "right", padding: "10px 0", fontSize: "0.75rem", fontWeight: 700, color: "#888" }}>MESSAGES</th>
                                    <th style={{ textAlign: "right", padding: "10px 0", fontSize: "0.75rem", fontWeight: 700, color: "#888" }}>AVG RESPONSE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map(s => (
                                    <tr key={s.uid} style={{ borderBottom: "1px solid #f0f0f8" }}>
                                        <td style={{ padding: "12px 0", fontSize: "0.88rem", fontWeight: 600, color: "#1a1a2e" }}>{s.name}</td>
                                        <td style={{ padding: "12px 0", fontSize: "0.88rem", color: "#1a1a2e", textAlign: "right" }}>{s.chatsHandled}</td>
                                        <td style={{ padding: "12px 0", fontSize: "0.88rem", color: "#1a1a2e", textAlign: "right" }}>{s.messagesCount}</td>
                                        <td style={{ padding: "12px 0", fontSize: "0.88rem", color: "#1a1a2e", textAlign: "right" }}>
                                            {s.avgResponseMin > 0 ? `${s.avgResponseMin.toFixed(1)}m` : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
