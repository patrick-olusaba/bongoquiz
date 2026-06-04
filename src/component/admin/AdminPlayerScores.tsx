import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../firebase.ts";
import { writeAdminAudit } from "./auditLog.ts";

const GAMES = [
    { key: "bongo", label: "Bongo Quiz", collection: "leaderboard" },
    { key: "bible", label: "Bible Quiz", collection: "bibleQuizLeaderboard" },
    { key: "math", label: "Math Quiz", collection: "mathQuizLeaderboard" },
    { key: "biology", label: "Biology Quiz", collection: "bioQuizLeaderboard" },
    { key: "general", label: "General Knowledge", collection: "genQuizLeaderboard" },
    { key: "sudoku", label: "Sudoku", collection: "sudokuLeaderboard" },
    { key: "connectDots", label: "Connect Dots", collection: "connectDotsLeaderboard" },
] as const;

const SESSION_COLLECTIONS = [
    { collection: "gameSessions", scoreField: "total" },
    { collection: "bibleQuizSessions", scoreField: "score" },
    { collection: "mathQuizSessions", scoreField: "score" },
    { collection: "bioQuizSessions", scoreField: "score" },
    { collection: "genQuizSessions", scoreField: "score" },
    { collection: "sudokuSessions", scoreField: "score" },
    { collection: "connectDotsSessions", scoreField: "score" },
] as const;

type GameKey = typeof GAMES[number]["key"];
type ScoreMap = Record<GameKey, number>;
type PlayerScoreRow = { phone: string; name: string; scores: ScoreMap; totalPoints: number; lifetimePoints: number; sessionCount: number; calculatedCoins: number; reconciledCoins: number | null; spentCoins: number; balanceCoins: number };

const emptyScores = (): ScoreMap => ({ bongo: 0, bible: 0, math: 0, biology: 0, general: 0, sudoku: 0, connectDots: 0 });
const normalizePhone = (value: unknown) => {
    const digits = String(value ?? "").replace(/\D/g, "");
    if (digits.startsWith("254") && digits.length === 12) return "0" + digits.slice(3);
    return digits.length === 9 ? "0" + digits : digits;
};
const scoreToCoins = (points: number) => Math.max(Math.floor(points / 250), 0);
const sessionCoinPoints = (collectionName: string, data: Record<string, any>) => {
    if (typeof data.pointsEarned === "number") return Math.max(0, data.pointsEarned);
    if (collectionName === "sudokuSessions") return data.difficulty === "Hard" ? 400 : data.difficulty === "Medium" ? 200 : 100;
    if (collectionName === "connectDotsSessions") return Math.max(100 - Math.max(0, Number(data.hintsUsed || 0)) * 25, 0);
    const config = SESSION_COLLECTIONS.find(item => item.collection === collectionName);
    return Math.max(0, Number(data[config?.scoreField || "score"] || 0));
};

const s: Record<string, CSSProperties> = {
    card: { background: "#fff", borderRadius: 10, padding: "20px 24px", border: "1px solid #e8eaf0", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
    title: { color: "#1a1a2e", fontSize: "1.05rem", margin: 0 },
    input: { padding: "8px 11px", borderRadius: 7, border: "1px solid #d8dce8", fontSize: "0.85rem", outline: "none", minWidth: 240 },
    btn: { padding: "7px 13px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 },
    th: { background: "#f5f5ff", color: "#4361ee", padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e0e0f0", whiteSpace: "nowrap", fontSize: "0.78rem" },
    td: { padding: "10px 12px", borderBottom: "1px solid #f0f0f8", color: "#333", whiteSpace: "nowrap", fontSize: "0.82rem" },
};

export function AdminPlayerScores() {
    const [rows, setRows] = useState<PlayerScoreRow[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [reconciling, setReconciling] = useState(false);
    const [message, setMessage] = useState("");
    const autoBackfillStarted = useRef(false);

    const load = async () => {
        setLoading(true);
        setMessage("");
        try {
            const [playersSnap, balancesSnap, ...gameData] = await Promise.all([
                getDocs(collection(db, "players")),
                getDocs(collection(db, "playerCoinBalances")),
                ...GAMES.map(game => getDocs(collection(db, game.collection))),
                ...SESSION_COLLECTIONS.map(config => getDocs(collection(db, config.collection))),
            ]);
            const leaderboards = gameData.slice(0, GAMES.length);
            const sessions = gameData.slice(GAMES.length);
            const names = new Map<string, string>();
            playersSnap.docs.forEach(player => {
                const data = player.data();
                const phone = normalizePhone(data.phone || player.id);
                if (phone) names.set(phone, String(data.name || "Player"));
            });
            const balances = new Map<string, { earned: number; spent: number; balance: number }>();
            balancesSnap.docs.forEach(balance => {
                const data = balance.data();
                balances.set(normalizePhone(balance.id), { earned: Number(data.earnedCoins || 0), spent: Number(data.spentCoins || 0), balance: Number(data.balanceCoins ?? data.earnedCoins ?? 0) });
            });
            const players = new Map<string, { name: string; scores: ScoreMap }>();
            leaderboards.forEach((snapshot, index) => {
                const game = GAMES[index];
                snapshot.docs.forEach(entry => {
                    const data = entry.data();
                    const phone = normalizePhone(data.phone || entry.id);
                    if (!phone) return;
                    const current = players.get(phone) || { name: names.get(phone) || String(data.name || "Player"), scores: emptyScores() };
                    current.name = names.get(phone) || current.name || String(data.name || "Player");
                    current.scores[game.key] = Math.max(current.scores[game.key], Number(data.score || 0));
                    players.set(phone, current);
                });
            });
            const lifetime = new Map<string, { points: number; coins: number; sessions: number }>();
            sessions.forEach((snapshot, index) => snapshot.docs.forEach(session => {
                const data = session.data();
                const phone = normalizePhone(data.phone);
                if (!phone) return;
                const points = sessionCoinPoints(SESSION_COLLECTIONS[index].collection, data);
                const current = lifetime.get(phone) || { points: 0, coins: 0, sessions: 0 };
                current.points += points;
                current.sessions += 1;
                lifetime.set(phone, current);
                if (!players.has(phone)) players.set(phone, { name: names.get(phone) || String(data.name || "Player"), scores: emptyScores() });
            }));
            setRows([...players.entries()].map(([phone, player]) => {
                const totalPoints = Object.values(player.scores).reduce((sum, score) => sum + score, 0);
                const totals = lifetime.get(phone) || { points: 0, coins: 0, sessions: 0 };
                const saved = balances.get(phone);
                return { phone, name: player.name, scores: player.scores, totalPoints, lifetimePoints: totals.points, sessionCount: totals.sessions, calculatedCoins: scoreToCoins(totals.points), reconciledCoins: saved?.earned ?? null, spentCoins: saved?.spent ?? 0, balanceCoins: saved?.balance ?? scoreToCoins(totals.points) };
            }).sort((a, b) => b.lifetimePoints - a.lifetimePoints));
        } catch (error) {
            setMessage("Could not load player scores: " + error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const reconcileOne = async (row: PlayerScoreRow) => {
        setReconciling(true);
        try {
            const reconcile = httpsCallable<{ phone: string }, { success: boolean; reconciled: number }>(getFunctions(), "reconcileAllPlayerCoins");
            await reconcile({ phone: row.phone });
            await writeAdminAudit({ action: "Player BongoCoins reconciled", target: row.phone, details: { earnedCoins: row.calculatedCoins, lifetimeSessionPoints: row.lifetimePoints } });
            setMessage(row.name + "s BongoCoins were reconciled.");
            await load();
        } catch (error) { setMessage("Reconciliation failed: " + error); }
        finally { setReconciling(false); }
    };

    const reconcileAll = async () => {
        if (!rows.length || !confirm(`Reconcile BongoCoins for ${rows.length} players from all completed sessions?`)) return;
        setReconciling(true);
        try {
            const reconcile = httpsCallable<object, { success: boolean; reconciled: number }>(getFunctions(), "reconcileAllPlayerCoins");
            const result = await reconcile({});
            setMessage(`Reconciled ${result.data.reconciled} players successfully.`);
            await load();
        } catch (error) { setMessage("Reconciliation failed: " + error); }
        finally { setReconciling(false); }
    };

    const filtered = useMemo(() => rows.filter(row => row.name.toLowerCase().includes(search.toLowerCase()) || row.phone.includes(search)), [rows, search]);
    const outOfSync = rows.filter(row => row.reconciledCoins !== row.calculatedCoins).length;

    useEffect(() => {
        if (loading || !rows.length || outOfSync === 0 || autoBackfillStarted.current) return;
        autoBackfillStarted.current = true;
        setReconciling(true);
        const reconcile = httpsCallable<object, { success: boolean; reconciled: number }>(getFunctions(), "reconcileAllPlayerCoins");
        reconcile({})
            .then(result => { setMessage(`Automatically reconciled ${result.data.reconciled} existing players.`); return load(); })
            .catch(error => setMessage("Automatic reconciliation failed: " + error))
            .finally(() => setReconciling(false));
    }, [loading, outOfSync, rows.length]);

    return <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <div><h2 style={s.title}>Player Scores & BongoCoins</h2><p style={{ margin: "6px 0 0", color: "#667085", fontSize: "0.84rem" }}>All positive net session points accumulate. Every 250 points earns 1 BongoCoin; market spending is deducted from the available balance. Street Bongo is excluded because it has no player phone or points counter.</p></div>
            <button style={{ ...s.btn, background: "#4361ee", color: "#fff" }} disabled={reconciling || loading} onClick={reconcileAll}>{reconciling ? "Reconciling..." : `Reconcile All (${outOfSync})`}</button>
        </div>
        {message && <div style={{ padding: "9px 12px", borderRadius: 7, background: "#eef2ff", color: "#3730a3", fontSize: "0.82rem", margin: "12px 0" }}>{message}</div>}
        <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "14px 0" }}><input style={s.input} placeholder="Search name or phone" value={search} onChange={e => setSearch(e.target.value)}/><span style={{ color: "#667085", fontSize: "0.82rem" }}>{filtered.length} players, {outOfSync} out of sync</span></div>
        <div style={{ overflowX: "auto", border: "1px solid #e8eaf0", borderRadius: 8 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>
            {['Player', 'Phone', ...GAMES.map(game => game.label), 'Highest-score total', 'Lifetime points', 'Sessions', 'Earned coins', 'Reconciled earned', 'Spent', 'Available balance', 'Action'].map(head => <th key={head} style={s.th}>{head}</th>)}
        </tr></thead><tbody>
            {filtered.map(row => <tr key={row.phone} style={{ background: row.reconciledCoins !== row.calculatedCoins ? "#fffaf0" : "#fff" }}>
                <td style={{ ...s.td, fontWeight: 700 }}>{row.name}</td><td style={s.td}>{row.phone}</td>
                {GAMES.map(game => <td key={game.key} style={s.td}>{row.scores[game.key].toLocaleString()}</td>)}
                <td style={{ ...s.td, fontWeight: 700 }}>{row.totalPoints.toLocaleString()}</td><td style={s.td}>{row.lifetimePoints.toLocaleString()}</td><td style={s.td}>{row.sessionCount}</td><td style={{ ...s.td, color: "#059669", fontWeight: 800 }}>{row.calculatedCoins.toLocaleString()}</td><td style={s.td}>{row.reconciledCoins === null ? "Not synced" : row.reconciledCoins.toLocaleString()}</td><td style={s.td}>{row.spentCoins.toLocaleString()}</td><td style={{ ...s.td, fontWeight: 800 }}>{row.balanceCoins.toLocaleString()}</td>
                <td style={s.td}><button style={{ ...s.btn, background: row.reconciledCoins === row.calculatedCoins ? "#f1f5f9" : "#fef3c7", color: "#92400e" }} disabled={reconciling || row.reconciledCoins === row.calculatedCoins} onClick={() => reconcileOne(row)}>Reconcile</button></td>
            </tr>)}
            {!loading && !filtered.length && <tr><td colSpan={17} style={{ ...s.td, textAlign: "center", color: "#94a3b8" }}>No player scores found.</td></tr>}
            {loading && <tr><td colSpan={17} style={{ ...s.td, textAlign: "center", color: "#94a3b8" }}>Loading player scores...</td></tr>}
        </tbody></table></div>
    </div>;
}
