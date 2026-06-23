import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Bell, CalendarDays, Clock3, Coins, Gift, Headset, Medal, Rocket, Search, Share2, Star, Trophy, User, Users, Zap } from "lucide-react";
import { db } from "../../firebase.ts";
import { buildWhatsAppShareUrl, getReferralLink } from "../../utils/referral.ts";
import { ensureReferralCode } from "../../utils/playerAuth.ts";
import { BottomNav } from "./BottomNav.tsx";
import type { MainNavTab } from "../../types/gametypes.ts";
import brandLogo from "../../assets/logo.png";
import {
    countdownParts,
    initials,
    quizTypeIcons,
    quizTypeLabels,
    normalizeTournamentQuizType,
    toDate,
    writeActiveTournamentSession,
    type QuizTournament,
    type TournamentEntry,
} from "../../utils/tournaments.ts";
import "../../styles/CommunityPage.css";

interface Props {
    onBack: () => void;
    onEnterTournament: (tournament: QuizTournament) => void;
    onLeaderboard: () => void;
    onNavigate: (tab: MainNavTab) => void;
}

function rewardAt(tournament: QuizTournament, index: number) {
    return tournament.rewards?.[index] || tournament.rewards?.[tournament.rewards.length - 1] || { rank: "Top Players", title: "Rewards", items: ["Bonus Coins"] };
}

function formatStartDate(value: unknown) {
    const date = toDate(value);
    if (!date) return { day: "TBA", time: "" };
    return {
        day: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
        time: date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase(),
    };
}

const playerTitle = (rank: number) =>
    rank === 1 ? "Quiz Master" : rank === 2 ? "Knowledge King" : rank === 3 ? "Top Player" : "Active Member";

export const CommunityPage: FC<Props> = ({ onBack, onEnterTournament, onNavigate }) => {
    const navigate = useNavigate();
    const [tournaments, setTournaments] = useState<QuizTournament[]>([]);
    const [recordTournaments, setRecordTournaments] = useState<QuizTournament[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [leaders, setLeaders] = useState<TournamentEntry[]>([]);
    const [allLeaders, setAllLeaders] = useState<TournamentEntry[]>([]);
    const [referrals, setReferrals] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<"ongoing" | "upcoming" | "past" | "activity" | "referrals">("ongoing");
    const [ongoingSub, setOngoingSub] = useState<"daily" | "weekly">("daily");
    const [playedIds, setPlayedIds] = useState<Set<string>>(new Set());
    const [rewardsOpen, setRewardsOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [myEntries, setMyEntries] = useState<{ tournament: QuizTournament; entry: TournamentEntry; rank: number; field: number }[]>([]);
    const [tick, setTick] = useState(0);
    const howRef = useRef<HTMLDivElement>(null);

    const playerName = localStorage.getItem("bongo_player_name") || "Player";
    const currentPhone = localStorage.getItem("bongo_player_phone") ?? "";

    useEffect(() => {
        const q = query(collection(db, "quizTournaments"), orderBy("updatedAt", "desc"), limit(30));
        return onSnapshot(q, snap => {
            const allRows = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as QuizTournament))
                .map(t => ({ ...t, quizType: normalizeTournamentQuizType(t.quizType) } as QuizTournament));
            const rows = allRows.filter(t => t.active !== false && !t.deleted);
            setRecordTournaments(allRows);
            setTournaments(rows);
            setSelectedId(current => current || rows.find(t => t.status === "active")?.id || rows[0]?.id || "");
        }, () => {
            setRecordTournaments([]);
            setTournaments([]);
        });
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => setTick(value => value + 1), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!/^07\d{8}$/.test(currentPhone)) {
            setReferrals([]);
            return;
        }
        const q = query(collection(db, "referrals"), where("referrerPhone", "==", currentPhone), limit(50));
        return onSnapshot(q, snap => {
            setReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, () => setReferrals([]));
    }, [currentPhone]);

    // Which tournaments has this player already finished? (entries/{phone} exists)
    const tournamentIdsKey = recordTournaments.map(t => t.id).join(",");
    useEffect(() => {
        if (!/^07\d{8}$/.test(currentPhone) || !recordTournaments.length) { setPlayedIds(new Set()); return; }
        let cancelled = false;
        Promise.all(recordTournaments.map(async t => {
            try { return (await getDoc(doc(db, "quizTournaments", t.id, "entries", currentPhone))).exists() ? t.id : null; }
            catch { return null; }
        })).then(ids => { if (!cancelled) setPlayedIds(new Set(ids.filter(Boolean) as string[])); });
        return () => { cancelled = true; };
    }, [tournamentIdsKey, currentPhone]); // eslint-disable-line react-hooks/exhaustive-deps

    const cycleOf = (t: QuizTournament) => (t.tournamentCycle === "weekly" ? "weekly" : "daily");

    // A tournament hasn't begun yet if it's scheduled or its start time is in the future.
    const notStarted = (t: QuizTournament) => {
        if (t.status === "scheduled") return true;
        const start = toDate(t.startsAt)?.getTime() ?? 0;
        return start > Date.now();
    };

    const grouped = useMemo(() => {
        const ongoing = tournaments.filter(t => t.status === "active");
        const openToPlay = ongoing.filter(t => !playedIds.has(t.id));
        return {
            ongoing,
            upcoming: tournaments.filter(t => t.status === "scheduled"),
            past: tournaments.filter(t => t.status === "completed"),
            // Ongoing sub-lists: only tournaments the player has NOT finished yet,
            // split by cycle, so they can go attend the ones still open to them.
            daily: openToPlay.filter(t => cycleOf(t) === "daily"),
            weekly: openToPlay.filter(t => cycleOf(t) === "weekly"),
            // Tournaments the player already finished — but never future/scheduled
            // ones (a rescheduled tournament keeps the old entry; it isn't "played").
            participated: recordTournaments.filter(t => playedIds.has(t.id) && !notStarted(t)),
        };
    }, [tournaments, recordTournaments, playedIds]); // eslint-disable-line react-hooks/exhaustive-deps

    const showUpcomingTab = grouped.upcoming.length > 0;

    // If the active tab loses all its content (e.g. last upcoming/past one cleared),
    // fall back to Ongoing so the user never lands on an empty hidden tab.
    // "upcoming" is an internal state reached only by tapping an Up Next card;
    // if its tournament disappears, fall back to Ongoing. Past Results / My
    // Activity are always-visible tabs that show their own empty states.
    useEffect(() => {
        if (tab === "upcoming" && !showUpcomingTab) setTab("ongoing");
    }, [tab, showUpcomingTab]);

    const currentList =
        tab === "upcoming" ? grouped.upcoming
        : tab === "past" ? grouped.past
        : tab === "activity" ? grouped.participated
        : ongoingSub === "weekly" ? grouped.weekly
        : grouped.daily;

    // Desktop search narrows the current list by title; an empty query is a no-op.
    const searchTerm = search.trim().toLowerCase();
    const visibleList = searchTerm
        ? currentList.filter(t => (t.title || "").toLowerCase().includes(searchTerm))
        : currentList;

    // Selection is scoped to the current (visible) list only — never bleed an
    // ongoing tournament into the Upcoming / Past tabs.
    const selected = visibleList.find(t => t.id === selectedId) || visibleList[0] || (searchTerm ? undefined : currentList[0]);

    const upNext = useMemo(() => {
        const pool = grouped.upcoming.length ? grouped.upcoming : [...grouped.daily, ...grouped.weekly].filter(t => t.id !== selected?.id);
        return pool.slice(0, 6);
    }, [grouped, selected?.id]);

    // Leaderboard for whatever tournament is actually shown.
    const selectedTournamentId = selected?.id ?? "";
    useEffect(() => {
        if (!selectedTournamentId) { setLeaders([]); return; }
        const q = query(collection(db, "quizTournaments", selectedTournamentId, "entries"), orderBy("points", "desc"), limit(30));
        return onSnapshot(q, snap => setLeaders(snap.docs.map(d => ({ id: d.id, ...d.data() } as TournamentEntry))), () => setLeaders([]));
    }, [selectedTournamentId]);

    // Top Players across ALL tournaments — points summed per player — so the
    // panel always reflects everyone playing tournaments, regardless of which
    // tab/tournament is selected. Aggregated from per-tournament reads (a
    // collection-group query is blocked by the current security rules).
    useEffect(() => {
        if (!recordTournaments.length) { setAllLeaders([]); return; }
        let cancelled = false;
        Promise.all(recordTournaments.map(t =>
            getDocs(query(collection(db, "quizTournaments", t.id, "entries"), limit(200))).catch(() => null)
        )).then(snaps => {
            if (cancelled) return;
            const totals = new Map<string, TournamentEntry>();
            snaps.forEach(snapshot => snapshot?.docs.forEach(d => {
                const data = d.data() as any;
                const phone = String(data.phone || d.id);
                if (!/^0\d{9}$/.test(phone)) return;
                const current = totals.get(phone) || ({ id: phone, phone, name: data.name || "Player", points: 0 } as TournamentEntry);
                current.points = Number(current.points || 0) + Number(data.points || 0);
                if (data.name) current.name = data.name;
                totals.set(phone, current);
            }));
            setAllLeaders(Array.from(totals.values()).sort((a, b) => Number(b.points || 0) - Number(a.points || 0)).slice(0, 30));
        });
        return () => { cancelled = true; };
    }, [tournamentIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // Current player's entry + rank in every tournament they've finished — powers
    // the My Activity dashboard (score, placement and accuracy per tournament).
    const participatedKey = grouped.participated.map(t => t.id).join(",");
    useEffect(() => {
        if (!/^07\d{8}$/.test(currentPhone) || !grouped.participated.length) { setMyEntries([]); return; }
        let cancelled = false;
        Promise.all(grouped.participated.map(async t => {
            try {
                const snap = await getDocs(query(collection(db, "quizTournaments", t.id, "entries"), orderBy("points", "desc"), limit(200)));
                const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as TournamentEntry));
                const idx = rows.findIndex(e => e.phone === currentPhone || e.id === currentPhone);
                return idx < 0 ? null : { tournament: t, entry: rows[idx], rank: idx + 1, field: rows.length };
            } catch { return null; }
        })).then(rows => { if (!cancelled) setMyEntries(rows.filter(Boolean) as { tournament: QuizTournament; entry: TournamentEntry; rank: number; field: number }[]); });
        return () => { cancelled = true; };
    }, [participatedKey, currentPhone]); // eslint-disable-line react-hooks/exhaustive-deps

    const isMe = (e: TournamentEntry) => e.phone === currentPhone || e.id === currentPhone;

    const myTotals = useMemo(() => {
        const points = myEntries.reduce((sum, m) => sum + Number(m.entry.points || 0), 0);
        const correct = myEntries.reduce((sum, m) => sum + Number(m.entry.correct || 0), 0);
        const answered = myEntries.reduce((sum, m) => sum + Number(m.entry.totalQuestions || 0), 0);
        const bestRank = myEntries.reduce((best, m) => Math.min(best, m.rank), Infinity);
        return {
            played: myEntries.length,
            points,
            accuracy: answered ? Math.round((correct / answered) * 100) : 0,
            podiums: myEntries.filter(m => m.rank <= 3).length,
            bestRank: Number.isFinite(bestRank) ? bestRank : 0,
        };
    }, [myEntries]);

    // Live + soon tournaments for the notification bell popover.
    const notifItems = useMemo(() => [
        ...grouped.ongoing.map(t => ({ t, kind: "live" as const })),
        ...grouped.upcoming.map(t => ({ t, kind: "soon" as const })),
    ], [grouped]);

    const alreadyPlayed = !!currentPhone && (playedIds.has(selected?.id ?? "") || leaders.some(entry => entry.phone === currentPhone));
    const currentRank = allLeaders.findIndex(entry => entry.phone === currentPhone) + 1;
    const parts = useMemo(() => countdownParts(toDate(selected?.endsAt)), [selected?.endsAt, tick]); // eslint-disable-line react-hooks/exhaustive-deps

    const topScore = allLeaders[0]?.points ? Math.round(allLeaders[0].points) : 0;
    const stats = [
        { icon: <Users size={20} />, value: grouped.ongoing.length, label: "Live Now", cls: "stat-purple" },
        { icon: <Trophy size={20} />, value: tournaments.length, label: "Tournaments", cls: "stat-blue" },
        { icon: <Star size={20} />, value: allLeaders.length, label: "Players Online", cls: "stat-green" },
        { icon: <Medal size={20} />, value: topScore.toLocaleString(), label: "Top Score", cls: "stat-gold" },
    ];

    const isLive = !!selected && selected.status === "active";

    const handleReferAndEarn = () => {
        void ensureReferralCode(currentPhone);
        const link = getReferralLink(currentPhone);
        const text = `You are invited to join BongoQuiz at bongoquiz.com. Play trivia games, climb the leaderboard, and earn BongoCoins with every qualifying score. Join here: ${link}`;
        window.open(buildWhatsAppShareUrl(text), "_blank", "noopener,noreferrer");
    };

    const chooseTournament = (tournament: QuizTournament) => {
        setSelectedId(tournament.id);
        if (tournament.status === "scheduled") { setTab("upcoming"); return; }
        if (tournament.status === "completed") { setTab("past"); return; }
        if (playedIds.has(tournament.id)) { setTab("activity"); return; }
        setTab("ongoing");
        setOngoingSub(cycleOf(tournament));
    };

    const joinTournament = async () => {
        if (!selected) return;
        const phone = localStorage.getItem("bongo_player_phone") || "";
        const name = localStorage.getItem("bongo_player_name") || "";
        if (!/^07\d{8}$/.test(phone) || !name.trim()) {
            window.alert("Please sign in with your player name and phone number before entering a tournament.");
            return;
        }
        const played = await getDoc(doc(db, "quizTournaments", selected.id, "entries", phone));
        if (played.exists()) {
            window.alert("You have already played this tournament. Please join a different tournament when one is available.");
            return;
        }
        writeActiveTournamentSession({ tournament: selected, questions: [], answers: {}, currentIndex: 0, deadline: 0 });
        onEnterTournament(selected);
    };

    return (
        <div className="cm-root">
            {/* ── Mobile top bar ──────────────────────────────────────────── */}
            <header className="cm-mobile-top">
                <button className="cm-mobile-back" onClick={onBack} aria-label="Back">‹</button>
                <div className="cm-brand">
                    <img src={brandLogo} alt="BongoQuiz" />
                    <div><strong>BongoQuiz</strong><span>Tournaments</span></div>
                </div>
                <button className="cm-bell" aria-label="Notifications" onClick={() => setNotifOpen(o => !o)}>
                    <Bell size={18} />
                    {grouped.ongoing.length > 0 && <i>{grouped.ongoing.length}</i>}
                </button>
            </header>

            {/* ── Main column ─────────────────────────────────────────────── */}
            <main className="cm-main">
                <div className="cm-head">
                    <div className="cm-head-titles">
                        <h1>{tab === "referrals" ? "Refer & Earn" : "🏆 Tournaments"}</h1>
                        <p>{tab === "referrals" ? "Invite friends and track the BongoCoins you earn from referrals." : "Compete, learn and win with the BongoQuiz community."}</p>
                    </div>
                    <div className="cm-head-actions">
                        <label className="cm-search">
                            <Search size={16} />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tournaments..." aria-label="Search tournaments" />
                        </label>
                        <button className="cm-bell" aria-label="Notifications" onClick={() => setNotifOpen(o => !o)}>
                            <Bell size={18} />
                            {grouped.ongoing.length > 0 && <i>{grouped.ongoing.length}</i>}
                        </button>
                    </div>
                </div>

                <div className="cm-tabs-row">
                    <div className="cm-tabs">
                        <button className={tab === "ongoing" ? "active" : ""} onClick={() => setTab("ongoing")}><Zap size={16} /> Ongoing</button>
                        <button className={tab === "past" ? "active" : ""} onClick={() => setTab("past")}><Clock3 size={16} /> Past Results</button>
                        <button className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}><User size={16} /> My Activity</button>
                    </div>
                    <button className={`cm-refer-btn ${tab === "referrals" ? "active" : ""}`} onClick={() => setTab("referrals")}><Gift size={16} /> Refer &amp; Earn</button>
                </div>

                {tab === "ongoing" && (
                    <div className="cm-tabs cm-subtabs">
                        <button className={ongoingSub === "daily" ? "active" : ""} onClick={() => setOngoingSub("daily")}>Daily{grouped.daily.length ? ` (${grouped.daily.length})` : ""}</button>
                        <button className={ongoingSub === "weekly" ? "active" : ""} onClick={() => setOngoingSub("weekly")}>Weekly{grouped.weekly.length ? ` (${grouped.weekly.length})` : ""}</button>
                    </div>
                )}

                {tab === "referrals" ? (
                    <section className="cm-referrals-panel">
                        <div className="cm-referrals-head">
                            <div>
                                <span>Refer & Earn</span>
                                <strong>Invite friends to BongoQuiz</strong>
                                <p>Earn 1 BongoCoin for every 700 points your invited friend scores in their first qualifying non-tournament game, capped at 10 coins.</p>
                            </div>
                            <button type="button" onClick={handleReferAndEarn}><Share2 size={16} /> Invite</button>
                        </div>
                        <div className="cm-referrals-summary">
                            <div><small>Invites</small><b>{referrals.length}</b></div>
                            <div><small>Coins earned</small><b>{referrals.reduce((sum, item) => sum + Number(item.referrerCoins || 0), 0)}</b></div>
                            <div><small>Best score</small><b>{referrals.length ? Math.max(...referrals.map(item => Number(item.score || 0))) : 0}</b></div>
                        </div>
                        <div className="cm-referrals-list">
                            {referrals.length ? referrals.map((item, index) => (
                                <article key={item.id ?? index} className="cm-referral-item">
                                    <div className="cm-avatar sm">{initials(String(item.newUserPhone || "Guest"))}</div>
                                    <div className="cm-referral-copy">
                                        <strong>{item.newUserPhone || "Invited friend"}</strong>
                                        <span>{item.game || "Game"} · {item.score ? String(Number(item.score).toLocaleString()) + " pts" : "Score pending"}</span>
                                    </div>
                                    <div className="cm-referral-earnings"><Coins size={14} /><b>{Number(item.referrerCoins || 0)}</b></div>
                                </article>
                            )) : <div className="cm-referrals-empty">No invites redeemed yet.</div>}
                        </div>
                    </section>
                ) : tab === "activity" ? (
                    <section className="cm-activity">
                        {!/^07\d{8}$/.test(currentPhone) ? (
                            <div className="cm-empty">
                                <User size={44} />
                                <strong>Sign in to see your activity</strong>
                                <span>Your tournament history and stats will appear here.</span>
                            </div>
                        ) : (
                            <>
                                <div className="cm-activity-stats">
                                    <div className="cm-stat stat-purple"><Trophy size={20} /><strong>{myTotals.played}</strong><span>Played</span></div>
                                    <div className="cm-stat stat-gold"><Star size={20} /><strong>{myTotals.points.toLocaleString()}</strong><span>Total Points</span></div>
                                    <div className="cm-stat stat-green"><Medal size={20} /><strong>{myTotals.accuracy}%</strong><span>Accuracy</span></div>
                                    <div className="cm-stat stat-blue"><Medal size={20} /><strong>{myTotals.bestRank ? `#${myTotals.bestRank}` : "—"}</strong><span>Best Rank</span></div>
                                </div>
                                {myTotals.podiums > 0 && (
                                    <div className="cm-activity-badge"><Medal size={18} /> You've finished on the podium {myTotals.podiums} time{myTotals.podiums > 1 ? "s" : ""}! 🎉</div>
                                )}
                                <div className="cm-section-head"><h3>Your Tournaments</h3></div>
                                {myEntries.length ? (
                                    <div className="cm-activity-list">
                                        {myEntries.map(({ tournament, entry, rank, field }) => {
                                            const acc = entry.totalQuestions ? Math.round((Number(entry.correct || 0) / Number(entry.totalQuestions)) * 100) : 0;
                                            return (
                                                <button key={tournament.id} className="cm-activity-item" onClick={() => chooseTournament(tournament)}>
                                                    <span className="cm-activity-icon">{quizTypeIcons[normalizeTournamentQuizType(tournament.quizType)]}</span>
                                                    <div className="cm-activity-meta">
                                                        <b>{tournament.title}</b>
                                                        <small>{quizTypeLabels[normalizeTournamentQuizType(tournament.quizType)]} · {acc}% accuracy</small>
                                                    </div>
                                                    <div className="cm-activity-score">
                                                        <span className={`cm-activity-rank ${rank <= 3 ? `rank-${rank}` : ""}`}>#{rank}<i>/{field}</i></span>
                                                        <b><Star size={12} /> {Math.round(Number(entry.points || 0)).toLocaleString()}</b>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="cm-empty">
                                        <Trophy size={44} />
                                        <strong>No tournaments played yet</strong>
                                        <span>Join a live tournament to start building your history.</span>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                ) : (
                    <>
                {visibleList.length > 1 && (
                    <div className="cm-picker">
                        {visibleList.map(t => (
                            <button key={t.id} className={selected?.id === t.id ? "active" : ""} onClick={() => chooseTournament(t)}>
                                <span className="cm-picker-icon">{quizTypeIcons[normalizeTournamentQuizType(t.quizType)]}</span>
                                <span className="cm-picker-text"><b>{t.title}</b><small>{quizTypeLabels[normalizeTournamentQuizType(t.quizType)]}</small></span>
                            </button>
                        ))}
                    </div>
                )}

                {!selected ? (
                    <section className="cm-empty">
                        <Trophy size={44} />
                        {searchTerm
                            ? <><strong>No tournaments match "{search.trim()}"</strong><span>Try a different search term.</span></>
                        : tab === "ongoing" && ongoingSub === "weekly"
                            ? <><strong>No weekly tournaments open</strong><span>You're all caught up — check the Daily tab or come back later.</span></>
                        : tab === "ongoing"
                            ? <><strong>No daily tournaments open</strong><span>You're all caught up — try the Weekly tab or come back later.</span></>
                        : tab === "upcoming"
                            ? <><strong>No upcoming tournaments</strong><span>Scheduled tournaments will appear here.</span></>
                            : <><strong>No past results</strong><span>Completed tournaments will appear here.</span></>}
                    </section>
                ) : (
                    <>
                        {/* Featured tournament */}
                        <section className={`cm-feature ${isLive ? "is-live" : ""}`}>
                            {isLive && <div className="cm-live-pill"><i /> LIVE NOW</div>}
                            <div className="cm-feature-grid">
                                <div className="cm-feature-art">{quizTypeIcons[normalizeTournamentQuizType(selected.quizType)]}</div>
                                <div className="cm-feature-body">
                                    <h2>{selected.title} <Star size={20} /></h2>
                                    <p>{selected.subtitle}</p>
                                    <div className="cm-feature-chips">
                                        <span><Gift size={16} /><small>Entry Fee</small><b>Free</b></span>
                                        <span><Users size={16} /><small>Players</small><b>{leaders.length.toLocaleString()}</b></span>
                                        <span><CalendarDays size={16} /><small>Quiz</small><b>{quizTypeLabels[normalizeTournamentQuizType(selected.quizType)]}</b></span>
                                    </div>
                                </div>
                                <div className="cm-feature-action">
                                    {isLive ? (
                                        <>
                                            <span className="cm-time-label">TIME LEFT</span>
                                            <div className="cm-countdown">
                                                <div><b>{parts.hours}</b><small>HRS</small></div><i>:</i>
                                                <div><b>{parts.minutes}</b><small>MIN</small></div><i>:</i>
                                                <div><b>{parts.seconds}</b><small>SEC</small></div>
                                            </div>
                                            {alreadyPlayed
                                                ? <div className="cm-enter played">✓ Played</div>
                                                : <button className="cm-enter" onClick={joinTournament}><Rocket size={18} /> Join Now</button>}
                                            <small className="cm-enter-note">{alreadyPlayed ? "Score updates after each session" : "Join before time runs out!"}</small>
                                        </>
                                    ) : (
                                        <div className="cm-feature-status">
                                            {tab === "upcoming" ? <><CalendarDays size={30} /><strong>Scheduled</strong><span>Check back when it goes live.</span></>
                                                : <><Clock3 size={30} /><strong>Ended</strong><span>This tournament has finished.</span></>}
                                            <button className="cm-rewards-link" onClick={() => setRewardsOpen(true)}><Gift size={16} /> View prizes</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isLive && (
                                <button className="cm-feature-rewards" onClick={() => setRewardsOpen(true)}>
                                    <Gift size={18} /> <span>Rewards</span> <small>View prizes ›</small>
                                </button>
                            )}
                        </section>

                        {/* Live standings / final results for the selected tournament */}
                        {(selected.status === "active" || selected.status === "completed") && leaders.length > 0 && (
                            <section className="cm-section cm-standings">
                                <div className="cm-section-head">
                                    <h3>{selected.status === "completed" ? "🏁 Final Results" : "📊 Live Standings"}</h3>
                                    <span className="cm-standings-count">{leaders.length.toLocaleString()} {leaders.length === 1 ? "player" : "players"}</span>
                                </div>

                                {selected.status === "completed" && leaders.length >= 3 && (
                                    <div className="cm-podium">
                                        {[1, 0, 2].map(slot => {
                                            const e = leaders[slot];
                                            if (!e) return <div key={slot} className="cm-podium-spot empty" />;
                                            const place = slot + 1;
                                            return (
                                                <div key={e.id} className={`cm-podium-spot place-${place} ${isMe(e) ? "me" : ""}`}>
                                                    <span className="cm-avatar">{initials(e.name)}</span>
                                                    <Medal className={`medal-${place}`} size={20} />
                                                    <b>{isMe(e) ? "You" : e.name}</b>
                                                    <small><Star size={11} /> {Math.round(Number(e.points || 0)).toLocaleString()}</small>
                                                    <i className="cm-podium-num">{place}</i>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="cm-standings-list">
                                    {leaders.slice(0, 8).map((e, i) => (
                                        <div className={`cm-st-row ${isMe(e) ? "me" : ""}`} key={e.id}>
                                            <span className={`cm-st-rank rank-${i + 1}`}>{i + 1}</span>
                                            <span className="cm-avatar sm">{initials(e.name)}</span>
                                            <div className="cm-st-name"><b>{isMe(e) ? "You" : e.name}</b></div>
                                            <span className="cm-st-score"><Star size={12} /> {Math.round(Number(e.points || 0)).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {(() => {
                                        const myIdx = leaders.findIndex(isMe);
                                        if (myIdx < 8) return null;
                                        const e = leaders[myIdx];
                                        return (
                                            <div className="cm-st-row me sticky">
                                                <span className="cm-st-rank">{myIdx + 1}</span>
                                                <span className="cm-avatar sm">{initials(e.name)}</span>
                                                <div className="cm-st-name"><b>You</b></div>
                                                <span className="cm-st-score"><Star size={12} /> {Math.round(Number(e.points || 0)).toLocaleString()}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </section>
                        )}

                        {/* Mobile-only stats strip */}
                        <section className="cm-stats-strip">
                            {stats.map(s => (
                                <div key={s.label} className={`cm-stat ${s.cls}`}>
                                    {s.icon}
                                    <strong>{s.value}</strong>
                                    <span>{s.label}</span>
                                </div>
                            ))}
                        </section>

                        {/* Up Next */}
                        {upNext.length > 0 && (
                            <section className="cm-section">
                                <div className="cm-section-head"><h3>Up Next</h3><button onClick={() => setTab(grouped.upcoming.length ? "upcoming" : "ongoing")}>View all ›</button></div>
                                <div className="cm-upnext">
                                    {upNext.map(t => {
                                        const d = formatStartDate(t.startsAt);
                                        return (
                                            <button key={t.id} className="cm-upnext-card" onClick={() => chooseTournament(t)}>
                                                <div className="cm-upnext-top">
                                                    <span className="cm-upnext-icon">{quizTypeIcons[normalizeTournamentQuizType(t.quizType)]}</span>
                                                    <div><b>{t.title}</b><small>{t.subtitle}</small></div>
                                                </div>
                                                <div className="cm-upnext-meta"><span><CalendarDays size={13} /> {d.day}</span><span><Clock3 size={13} /> {d.time || "—"}</span></div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* How it works */}
                        <section className="cm-section cm-how" ref={howRef}>
                            <h3>How It Works</h3>
                            <div className="cm-how-steps">
                                {[
                                    { n: 1, icon: <Gift size={20} />, t: "Join a Tournament", d: "Browse and join any open quiz tournament." },
                                    { n: 2, icon: <Star size={20} />, t: "Answer Questions", d: "Answer 1–15 questions in real-time." },
                                    { n: 3, icon: <Trophy size={20} />, t: "Score Points", d: "Get points for correct answers and speed." },
                                    { n: 4, icon: <Medal size={20} />, t: "Win Rewards", d: "Top players win exciting rewards!" },
                                ].map((step, i) => (
                                    <div key={step.n} className="cm-how-step">
                                        <span className="cm-how-n">{step.n}</span>
                                        <span className="cm-how-icon">{step.icon}</span>
                                        <b>{step.t}</b>
                                        <small>{step.d}</small>
                                        {i < 3 && <i className="cm-how-arrow">›</i>}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Community banner */}
                        <section className="cm-banner">
                            <div className="cm-banner-emoji">🎉</div>
                            <div className="cm-banner-text"><strong>Be Part of the BongoQuiz Community!</strong><span>Compete, connect and celebrate knowledge together.</span></div>
                            <button onClick={() => onNavigate("home")}><Users size={16} /> Start Playing</button>
                        </section>
                    </>
                )}
                    </>
                )}
            </main>

            {/* ── Right rail ──────────────────────────────────────────────── */}
            <aside className="cm-rail">
                <div className="cm-card cm-stats-card">
                    <h4><Users size={16} /> Community Stats</h4>
                    <div className="cm-stats-grid">
                        {stats.map(s => (
                            <div key={s.label} className={`cm-stat ${s.cls}`}>{s.icon}<strong>{s.value}</strong><span>{s.label}</span></div>
                        ))}
                    </div>
                </div>

                <div className="cm-card">
                    <h4><Trophy size={16} /> Top Players</h4>
                    <div className="cm-top-players">
                        {allLeaders.length ? allLeaders.slice(0, 5).map((entry, index) => (
                            <div className={`cm-tp-row ${entry.phone === currentPhone ? "me" : ""}`} key={entry.id}>
                                <span className={`cm-tp-rank rank-${index + 1}`}>{index + 1}</span>
                                <span className="cm-avatar sm">{initials(entry.name)}</span>
                                <div className="cm-tp-name"><b>{entry.name}</b><small>{playerTitle(index + 1)}</small></div>
                                <span className="cm-tp-score"><Star size={13} /> {Math.round(entry.points || 0).toLocaleString()}</span>
                            </div>
                        )) : <div className="cm-tp-empty">No scores yet. Be the first to play!</div>}
                        {currentRank > 5 && allLeaders[currentRank - 1] && (
                            <div className="cm-tp-row me sticky">
                                <span className="cm-tp-rank">{currentRank}</span>
                                <span className="cm-avatar sm">{initials(playerName)}</span>
                                <div className="cm-tp-name"><b>You</b><small>{playerTitle(currentRank)}</small></div>
                                <span className="cm-tp-score"><Star size={13} /> {Math.round(allLeaders[currentRank - 1].points || 0).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="cm-card cm-contact">
                    <strong>Have questions or feedback?</strong>
                    <span>We'd love to hear from you!</span>
                    <button className="cm-contact-btn" onClick={() => navigate("/contact")}><Headset size={16} /> Contact Support</button>
                </div>
            </aside>

            {selected && rewardsOpen && (
                <div className="cm-rewards-backdrop" role="dialog" aria-modal="true" onClick={() => setRewardsOpen(false)}>
                    <div className="cm-rewards-modal" onClick={e => e.stopPropagation()}>
                        <button type="button" className="cm-rewards-close" onClick={() => setRewardsOpen(false)} aria-label="Close">×</button>
                        <h2><Gift size={20} /> {selected.title} Rewards</h2>
                        <div className="cm-rewards-list">
                            {[0, 1, 2, 3].map(index => {
                                const reward = rewardAt(selected, index);
                                return (
                                    <div key={`${reward.rank}-${index}`} className="cm-reward-item">
                                        <Medal className={`medal-${index + 1}`} size={26} />
                                        <div><strong>{reward.rank}</strong><span>{reward.items.join(" + ")}</span></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {notifOpen && (
                <>
                    <div className="cm-notif-backdrop" onClick={() => setNotifOpen(false)} />
                    <div className="cm-notif" role="dialog" aria-label="Notifications">
                        <div className="cm-notif-head">
                            <strong><Bell size={15} /> Notifications</strong>
                            <button type="button" onClick={() => setNotifOpen(false)} aria-label="Close">×</button>
                        </div>
                        {notifItems.length ? (
                            <div className="cm-notif-list">
                                {notifItems.map(({ t, kind }) => (
                                    <button key={t.id} className="cm-notif-item" onClick={() => { chooseTournament(t); setNotifOpen(false); }}>
                                        <span className="cm-notif-icon">{quizTypeIcons[normalizeTournamentQuizType(t.quizType)]}</span>
                                        <div className="cm-notif-meta"><b>{t.title}</b><small>{t.subtitle}</small></div>
                                        <span className={`cm-notif-tag ${kind}`}>{kind === "live" ? "LIVE" : "SOON"}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="cm-notif-empty">No live or upcoming tournaments right now.</div>
                        )}
                    </div>
                </>
            )}

            <BottomNav active="community" onNavigate={onNavigate} />
        </div>
    );
};
