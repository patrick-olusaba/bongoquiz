// LeaderboardScreen.tsx
import { type FC, useEffect, useMemo, useState } from "react";
import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "../../firebase.ts";
import { Bell, ChevronDown, Coins, Gift, Menu, Share2, Star, Trophy, UserPlus, Wallet, X } from "lucide-react";
import { BrowseGames } from "./BrowseGames.tsx";
import { getBongoCoinBalance } from "../../utils/bongoWallet.ts";
import { buildWhatsAppShareUrl, getReferralLink, referralCodeForPhone } from "../../utils/referral.ts";
import { ensureReferralCode } from "../../utils/playerAuth.ts";
import '../../styles/Leaderboardscreen.css';

interface FriendRow {
    phone: string;        // 07XXXXXXXX
    name: string;
    points: number;
    kind: "referred" | "referrer" | "added"; // referred=I invited them (I earn); referrer=they invited me; added=manual (no earn)
    exists: boolean;      // is this number registered on BongoQuiz?
}

interface LeaderboardEntry {
    rank: number;
    name: string;
    phone?: string;
    score: number;
    badge: string;
    isCurrentPlayer?: boolean;
}

interface Props {
    playerScore: number;
    playerName?: string;
    onPlayAgain: () => void;
    onClose: () => void;
}

export const LeaderboardScreen: FC<Props> = ({ playerScore, playerName = "You", onPlayAgain, onClose }) => {
    const [visible, setVisible] = useState(false);
    const [highlightRow, setHighlightRow] = useState(-1);
    const [dbLeaders, setDbLeaders] = useState<LeaderboardEntry[]>([]);
    const [leaderMap, setLeaderMap] = useState<Map<string, { name: string; score: number }>>(new Map());
    const [board, setBoard] = useState<"global" | "friends">("global");
    const [referred, setReferred] = useState<{ phone: string; name: string }[]>([]);
    const [myReferrer, setMyReferrer] = useState<{ phone: string; name: string } | null>(null);
    const [added, setAdded] = useState<string[]>([]);
    const [addedInfo, setAddedInfo] = useState<Record<string, { name: string; exists: boolean }>>({});
    const [friendInput, setFriendInput] = useState("");
    const [friendError, setFriendError] = useState("");

    const myPhone = localStorage.getItem("bongo_player_phone") ?? "";
    const myPhoneValid = /^07\d{8}$/.test(myPhone);

    useEffect(() => {
        // Score is already saved by saveGameSession cloud function — no client write needed

        // Fetch from both sources and merge
        const sqlFetch = fetch("https://us-central1-bongoquiz-23ad4.cloudfunctions.net/getLeaderboard")
            .then(r => r.json())
            .catch(() => []); // Fallback for HTTPS mixed content blocking

        const fbFetch = getDocs(collection(db, "leaderboard"))
            .then(snap => snap.docs.map(d => ({ ...d.data(), id: d.id })))
            .catch(() => []);

        Promise.all([sqlFetch, fbFetch]).then(([sqlRaw, fbRaw]) => {
            const byPhone = new Map<string, { name: string; phone: string; score: number }>();
            // Normalize all phones to 254... as the canonical map key
            const toKey = (p: string) => String(p).replace(/^0/, "254");

            // SQL data — msisdn is 254..., no name — mask as player label
            (Array.isArray(sqlRaw) ? sqlRaw : []).forEach((d: any) => {
                const phone = toKey(String(d.msisdn ?? ""));
                const score = d.score ?? 0;
                const phone07 = phone.replace(/^254/, "0");
                const maskedName = phone07.slice(0, 3) + "*******";
                const existing = byPhone.get(phone);
                if (!existing || score > existing.score)
                    byPhone.set(phone, { name: maskedName, phone, score });
            });

            // Firebase data — may have name, phone stored as 07... or 254...
            // Firebase name takes priority over masked SQL name
            (Array.isArray(fbRaw) ? fbRaw : []).forEach((d: any) => {
                const phone = toKey(d.phone || d.id || "");
                const score = d.score ?? 0;
                const existing = byPhone.get(phone);
                const name = d.name && !/^\d/.test(d.name) ? d.name : existing?.name ?? d.name;
                if (!existing || score > existing.score)
                    byPhone.set(phone, { name, phone, score });
                else if (existing && name && !/^\d/.test(name))
                    byPhone.set(phone, { ...existing, name }); // update name even if score not higher
            });

            // Full phone→{name,score} map (254-keyed) so we can look up any
            // friend's points even when they're outside the global top 30.
            setLeaderMap(new Map(Array.from(byPhone.values()).map(d => [d.phone, { name: d.name, score: d.score }])));

            const sorted = Array.from(byPhone.values())
                .sort((a, b) => b.score - a.score)
                .slice(0, 30)
                .map((d, i) => ({
                    rank: i + 1,
                    name: d.name,
                    phone: d.phone,
                    score: d.score,
                    badge: i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐",
                }));
            setDbLeaders(sorted);
        });
    }, [playerScore, playerName]); // eslint-disable-line react-hooks/exhaustive-deps

    // Friends who joined via MY referral link — resolved from the players
    // collection (referrals collection is admin-only). Covers both already-
    // attributed (referredBy) and pending invites (pendingReferrer / code).
    useEffect(() => {
        if (!myPhoneValid) { setReferred([]); return; }
        const myCode = referralCodeForPhone(myPhone);
        const queries = [
            query(collection(db, "players"), where("referredBy", "==", myPhone)),
            query(collection(db, "players"), where("pendingReferrer", "==", myPhone)),
            ...(myCode ? [query(collection(db, "players"), where("pendingReferralCode", "==", myCode))] : []),
        ];
        let cancelled = false;
        Promise.all(queries.map(q => getDocs(q).catch(() => null))).then(snaps => {
            if (cancelled) return;
            const map = new Map<string, string>();
            snaps.forEach(snapshot => snapshot?.docs.forEach(d => {
                const info = d.data() as any;
                const phone = String(info.phone || d.id);
                if (/^07\d{8}$/.test(phone) && phone !== myPhone) map.set(phone, String(info.name || ""));
            }));
            setReferred(Array.from(map, ([phone, name]) => ({ phone, name })));
        });
        return () => { cancelled = true; };
    }, [myPhone, myPhoneValid]);

    // My own player doc: manually-added friends + who referred ME (so they show
    // up in my friends list too — friendships are mutual).
    useEffect(() => {
        if (!myPhoneValid) { setAdded([]); setMyReferrer(null); return; }
        let cancelled = false;
        (async () => {
            const snapshot = await getDoc(doc(db, "players", myPhone)).catch(() => null);
            if (cancelled) return;
            const data = (snapshot?.exists() ? snapshot.data() : {}) as any;
            const list = data.friends || [];
            setAdded(Array.isArray(list) ? list.filter((p: any) => /^07\d{8}$/.test(p)) : []);

            // Resolve who referred me: phone (referredBy/pendingReferrer) or masked code.
            let refPhone = "";
            if (/^07\d{8}$/.test(String(data.referredBy || ""))) refPhone = String(data.referredBy);
            else if (/^07\d{8}$/.test(String(data.pendingReferrer || ""))) refPhone = String(data.pendingReferrer);
            else if (data.pendingReferralCode) {
                const owners = await getDocs(query(collection(db, "players"), where("referralCode", "==", String(data.pendingReferralCode)))).catch(() => null);
                const owner = owners?.docs[0];
                if (owner) refPhone = String((owner.data() as any).phone || owner.id);
            }
            if (cancelled) return;
            if (refPhone && refPhone !== myPhone) {
                const known = await getDoc(doc(db, "players", refPhone)).catch(() => null);
                setMyReferrer({ phone: refPhone, name: known?.exists() ? String((known.data() as any).name || "") : "" });
            } else setMyReferrer(null);
        })();
        return () => { cancelled = true; };
    }, [myPhone, myPhoneValid]);

    // Resolve added friends' names / existence from the system.
    useEffect(() => {
        if (!added.length) { setAddedInfo({}); return; }
        let cancelled = false;
        Promise.all(added.map(async phone => {
            try {
                const snapshot = await getDoc(doc(db, "players", phone));
                return [phone, { name: snapshot.exists() ? String((snapshot.data() as any).name || "") : "", exists: snapshot.exists() }] as const;
            } catch { return [phone, { name: "", exists: false }] as const; }
        })).then(pairs => { if (!cancelled) setAddedInfo(Object.fromEntries(pairs)); });
        return () => { cancelled = true; };
    }, [added.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

    // Mark current player in the fetched list
    const playerPhone254 = (localStorage.getItem("bongo_player_phone") ?? "").replace(/^0/, "254");
    const entries: LeaderboardEntry[] = dbLeaders.map(e => ({
        ...e,
        isCurrentPlayer: !!playerPhone254 && e.phone === playerPhone254,
    }));

    useEffect(() => {
        const t1 = setTimeout(() => setVisible(true), 50);
        const t2 = setTimeout(() => {
            const idx = entries.findIndex(e => e.isCurrentPlayer);
            if (idx !== -1) setHighlightRow(idx);
        }, 800);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [dbLeaders]); // re-run once data loads

    const podium = entries.slice(0, 3);
    const rankRows = entries.slice(3, 10);
    const balance = useMemo(() => getBongoCoinBalance(), []);
    const podiumOrder = [podium[1], podium[0], podium[2]];
    const podiumMeta = [
        { place: "2nd", cls: "second", rank: 2 },
        { place: "1st", cls: "first", rank: 1 },
        { place: "3rd", cls: "third", rank: 3 },
    ];

    // ── Friends board ────────────────────────────────────────────────────────
    const pointsFor = (phone07: string) => leaderMap.get(phone07.replace(/^0/, "254"))?.score ?? 0;
    const nameFor = (phone07: string, preferred?: string) => {
        const fromLeader = leaderMap.get(phone07.replace(/^0/, "254"))?.name;
        const resolved = (preferred && !/^\d/.test(preferred) ? preferred : "")
            || addedInfo[phone07]?.name
            || (fromLeader && !/^\d/.test(fromLeader) ? fromLeader : "");
        return resolved || (phone07.slice(0, 3) + "*******");
    };
    // Build a de-duplicated, mutual friends list. Priority: referred > referrer > added.
    const seen = new Set<string>();
    const friends: FriendRow[] = [];
    referred.forEach(f => {
        if (seen.has(f.phone)) return;
        seen.add(f.phone);
        friends.push({ phone: f.phone, name: nameFor(f.phone, f.name), points: pointsFor(f.phone), kind: "referred", exists: true });
    });
    if (myReferrer && !seen.has(myReferrer.phone)) {
        seen.add(myReferrer.phone);
        friends.push({ phone: myReferrer.phone, name: nameFor(myReferrer.phone, myReferrer.name), points: pointsFor(myReferrer.phone), kind: "referrer", exists: true });
    }
    added.forEach(p => {
        if (seen.has(p)) return;
        seen.add(p);
        friends.push({ phone: p, name: nameFor(p), points: pointsFor(p), kind: "added", exists: addedInfo[p]?.exists ?? true });
    });
    friends.sort((a, b) => b.points - a.points);

    const addFriend = async () => {
        const phone = friendInput.trim();
        setFriendError("");
        if (!myPhoneValid) { setFriendError("Sign in first to add friends."); return; }
        if (!/^07\d{8}$/.test(phone)) { setFriendError("Enter a valid number like 0712345678."); return; }
        if (phone === myPhone) { setFriendError("That's your own number."); return; }
        if (seen.has(phone)) { setFriendInput(""); return; }
        setAdded(prev => [...prev, phone]);
        setFriendInput("");
        try {
            // Mutual: add them to my list AND add me to theirs so they see me too.
            await Promise.all([
                setDoc(doc(db, "players", myPhone), { friends: arrayUnion(phone) }, { merge: true }),
                setDoc(doc(db, "players", phone), { friends: arrayUnion(myPhone) }, { merge: true }),
            ]);
        } catch { /* keep optimistic local copy */ }
    };
    const removeFriend = async (phone: string) => {
        setAdded(prev => prev.filter(p => p !== phone));
        try {
            await Promise.all([
                setDoc(doc(db, "players", myPhone), { friends: arrayRemove(phone) }, { merge: true }),
                setDoc(doc(db, "players", phone), { friends: arrayRemove(myPhone) }, { merge: true }),
            ]);
        } catch { /* ignore */ }
    };

    const referAndEarn = () => {
        if (!myPhoneValid) { setBoard("friends"); setFriendError("Sign in with your phone number to get your referral link."); return; }
        void ensureReferralCode(myPhone);
        const link = getReferralLink(myPhone);
        const text = `Join me on BongoQuiz! Play trivia, climb the leaderboard, and earn BongoCoins when you score. Use my invite link to get started: ${link}`;
        window.open(buildWhatsAppShareUrl(text), "_blank", "noopener,noreferrer");
    };

    return (
        <div className={`lb-root lb-page ${visible ? "lb-root--visible" : ""}`}>
            <div className="lb-particles">
                {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} className="lb-particle" style={{
                        left: `36.25309837696273%`,
                        animationDelay: `3.1296407923685408s`,
                        animationDuration: `3.66115557928269s`,
                        width: `6.738549569296059px`,
                        height: `6.140285736750638px`,
                    }} />
                ))}
            </div>

            <header className="lb-topbar">
                <div className="lb-brand">BONGO<br/><span>QUIZ</span></div>
                <div className="lb-balance"><Coins size={28}/><strong>{balance.toLocaleString()}</strong></div>
                <div className="lb-top-actions">
                    <button type="button"><Wallet size={28}/><span>Wallet</span></button>
                    <button type="button"><Gift size={28}/><em>1</em><span>Rewards</span></button>
                    <button type="button"><Bell size={28}/><span>Alerts</span></button>
                    <button type="button"><Menu size={30}/><span>Menu</span></button>
                </div>
            </header>

            <main className="lb-content">
                <section className="lb-page-head">
                    <div className="lb-head-copy">
                        <div className="lb-head-icon"><Trophy size={42}/></div>
                        <div>
                            <h1>Leaderboard</h1>
                            <p>Top players this season</p>
                        </div>
                    </div>
                    <button type="button" className="lb-season-btn">Season 1 <ChevronDown size={18}/></button>
                </section>

                <section className="lb-podium-cards" aria-label="Top players">
                    {podiumOrder.map((entry, index) => {
                        const meta = podiumMeta[index];
                        return (
                            <article key={meta.place} className={`lb-podium-card ${meta.cls}`}>
                                <div className="lb-place-badge">{meta.rank}</div>
                                {meta.rank === 1 && <div className="lb-card-crown">👑</div>}
                                <div className="lb-card-avatar">{entry?.name.slice(0, 2).toUpperCase() || "--"}</div>
                                <strong>{entry?.name || "Player"}</strong>
                                <span><Coins size={19}/>{(entry?.score ?? 0).toLocaleString()}</span>
                                <b>{meta.place}</b>
                            </article>
                        );
                    })}
                </section>

                <section className="lb-board-card">
                    <div className="lb-tabs">
                        <button type="button" className={board === "global" ? "active" : ""} onClick={() => setBoard("global")}>🌐 Global</button>
                        <button type="button" className={board === "friends" ? "active" : ""} onClick={() => setBoard("friends")}>👥 Friends{friends.length ? ` (${friends.length})` : ""}</button>
                    </div>

                    {board === "global" ? (
                        <div className="lb-board-table">
                            <div className="lb-board-header"><span>Rank</span><span>Player</span><span>Points</span><span>Trend</span></div>
                            {rankRows.map((entry, i) => {
                                const trend = ["↑ 2", "↓ 1", "—", "↑ 3", "↓ 2", "—", "↑ 1"][i] || "—";
                                const maskedPhone = entry.phone ? entry.phone.replace(/^254/, "0").slice(0, 3) + "*******" : "";
                                return (
                                    <div key={entry.rank} className={`lb-board-row ${entry.isCurrentPlayer ? "is-player" : ""}`}>
                                        <span className="lb-board-rank">{entry.rank}</span>
                                        <span className="lb-board-player"><i>{entry.name.slice(0, 2).toUpperCase()}</i><b>{entry.name}</b>{maskedPhone && <small>{maskedPhone}</small>}</span>
                                        <span className="lb-board-points">{entry.score.toLocaleString()}</span>
                                        <span className={`lb-board-trend ${trend.includes("↓") ? "down" : trend.includes("↑") ? "up" : ""}`}>{trend}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="lb-friends">
                            <div className="lb-refer-cta">
                                <div className="lb-refer-copy">
                                    <strong><Coins size={16} /> Want to earn? Refer & Earn</strong>
                                    <span>Earn BongoCoins when friends join with your link and play. Adding a number below is for tracking only.</span>
                                </div>
                                <button type="button" className="lb-refer-btn" onClick={referAndEarn}><Share2 size={16} /> Refer &amp; Earn</button>
                            </div>

                            <div className="lb-friend-add-block">
                                <label className="lb-friend-add-label"><UserPlus size={14} /> Add a friend to track (you don't earn from added friends)</label>
                                <div className="lb-friend-add">
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        placeholder="Friend's phone e.g. 0712345678"
                                        value={friendInput}
                                        onChange={e => { setFriendInput(e.target.value.replace(/[^\d]/g, "").slice(0, 10)); setFriendError(""); }}
                                        onKeyDown={e => { if (e.key === "Enter") addFriend(); }}
                                    />
                                    <button type="button" onClick={addFriend}><UserPlus size={18} /> Add</button>
                                </div>
                            </div>
                            {friendError && <p className="lb-friend-error">{friendError}</p>}

                            {!myPhoneValid ? (
                                <div className="lb-friends-empty">Sign in with your phone number to see and add friends.</div>
                            ) : friends.length === 0 ? (
                                <div className="lb-friends-empty">No friends yet. Share your referral link or add a friend by phone to track their points.</div>
                            ) : (
                                <div className="lb-friend-list">
                                    {friends.map((friend, index) => {
                                        const maskedPhone = friend.phone.slice(0, 3) + "*******";
                                        return (
                                            <div key={friend.phone} className={`lb-friend-row ${friend.phone === myPhone ? "is-player" : ""}`}>
                                                <span className="lb-friend-rank">{index + 1}</span>
                                                <span className="lb-friend-avatar">{friend.name.slice(0, 2).toUpperCase()}</span>
                                                <div className="lb-friend-main">
                                                    <b>{friend.name}</b>
                                                    <small>{friend.exists ? maskedPhone : "Not on BongoQuiz yet"}</small>
                                                    {friend.kind === "referred"
                                                        ? <em className="lb-friend-tag referred" title="Joined via your referral link — you earn from their scores"><Star size={11} /> Referred</em>
                                                    : friend.kind === "referrer"
                                                        ? <em className="lb-friend-tag referrer" title="They invited you to BongoQuiz">Invited you</em>
                                                        : <em className="lb-friend-tag added" title="Manually added — tracking only, you don't earn">Added · tracking</em>}
                                                </div>
                                                <div className="lb-friend-right">
                                                    <span className="lb-friend-points">{friend.points.toLocaleString()}<small>pts</small></span>
                                                    {friend.kind === "added" && (
                                                        <button type="button" className="lb-friend-remove" title="Remove friend" onClick={() => removeFriend(friend.phone)}><X size={14} /></button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <p className="lb-friends-note">⭐ <b>Referred</b> = joined with your link — you earn BongoCoins from their scores. <b>Invited you</b> = the friend who referred you. <b>Added</b> = manually tracked — you earn nothing from added friends. When you add someone, they'll see you in their friends list too.</p>
                        </div>
                    )}
                </section>

                <section className="lb-more-games"><BrowseGames exclude="Bongo Quiz" /></section>
            </main>
        </div>
    );
};