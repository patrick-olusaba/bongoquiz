import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { CalendarDays, Clock3, Coins, Gamepad2, Gift, Home, Info, Medal, Share2, Star, Trophy, User, Users } from "lucide-react";
import { db } from "../../firebase.ts";
import { buildWhatsAppShareUrl, getReferralLink } from "../../utils/referral.ts";
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

export const CommunityPage: FC<Props> = ({ onBack, onEnterTournament, onLeaderboard, onNavigate }) => {
    const [tournaments, setTournaments] = useState<QuizTournament[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [leaders, setLeaders] = useState<TournamentEntry[]>([]);
    const [referrals, setReferrals] = useState<any[]>([]);
    const [tab, setTab] = useState<"ongoing" | "upcoming" | "past" | "referrals">("ongoing");
    const [rewardsOpen, setRewardsOpen] = useState(false);
    const [tick, setTick] = useState(0);
    const howRef = useRef<HTMLDivElement>(null);

    const playerName = localStorage.getItem("bongo_player_name") || "Player";
    const currentPhone = localStorage.getItem("bongo_player_phone") ?? "";

    useEffect(() => {
        const q = query(collection(db, "quizTournaments"), orderBy("updatedAt", "desc"), limit(30));
        return onSnapshot(q, snap => {
            const rows = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as QuizTournament & { deleted?: boolean }))
                .filter(t => t.active !== false && !t.deleted)
                .map(t => ({ ...t, quizType: normalizeTournamentQuizType(t.quizType) } as QuizTournament));
            setTournaments(rows);
            setSelectedId(current => current || rows.find(t => t.status === "active")?.id || rows[0]?.id || "");
        }, () => setTournaments([]));
    }, []);

    useEffect(() => {
        if (!selectedId) { setLeaders([]); return; }
        const q = query(collection(db, "quizTournaments", selectedId, "entries"), orderBy("points", "desc"), limit(30));
        return onSnapshot(q, snap => setLeaders(snap.docs.map(d => ({ id: d.id, ...d.data() } as TournamentEntry))), () => setLeaders([]));
    }, [selectedId]);

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

    const grouped = useMemo(() => ({
        ongoing: tournaments.filter(t => t.status === "active"),
        upcoming: tournaments.filter(t => t.status === "scheduled"),
        past: tournaments.filter(t => t.status === "completed"),
    }), [tournaments]);

    const tournamentTab = tab === "referrals" ? "ongoing" : tab;
    const currentList = grouped[tournamentTab];
    const selected = currentList.find(t => t.id === selectedId) || currentList[0] || tournaments.find(t => t.id === selectedId) || tournaments[0];

    const upNext = useMemo(() => {
        const pool = grouped.upcoming.length ? grouped.upcoming : grouped.ongoing.filter(t => t.id !== selected?.id);
        return pool.slice(0, 6);
    }, [grouped, selected?.id]);

    const alreadyPlayed = !!currentPhone && leaders.some(entry => entry.phone === currentPhone);
    const currentRank = leaders.findIndex(entry => entry.phone === currentPhone) + 1;
    const parts = useMemo(() => countdownParts(toDate(selected?.endsAt)), [selected?.endsAt, tick]); // eslint-disable-line react-hooks/exhaustive-deps

    const topScore = leaders[0]?.points ? Math.round(leaders[0].points) : 0;
    const stats = [
        { icon: <Users size={20} />, value: grouped.ongoing.length, label: "Live Now", cls: "stat-purple" },
        { icon: <Trophy size={20} />, value: tournaments.length, label: "Tournaments", cls: "stat-blue" },
        { icon: <Star size={20} />, value: leaders.length, label: "Players", cls: "stat-green" },
        { icon: <Medal size={20} />, value: topScore.toLocaleString(), label: "Top Score", cls: "stat-gold" },
    ];

    const isLive = !!selected && selected.status === "active";

    const handleReferAndEarn = () => {
        const link = getReferralLink(currentPhone);
        const text = `You are invited to join BongoQuiz at bongoquiz.com. Play trivia games, climb the leaderboard, and earn BongoCoins with every qualifying score. Join here: ${link}`;
        window.open(buildWhatsAppShareUrl(text), "_blank", "noopener,noreferrer");
    };

    const chooseTournament = (tournament: QuizTournament) => {
        setSelectedId(tournament.id);
        setTab(tournament.status === "scheduled" ? "upcoming" : tournament.status === "completed" ? "past" : "ongoing");
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

    const navItems: { icon: typeof Home; label: string; onClick: () => void; active?: boolean }[] = [
        { icon: Trophy, label: "Tournaments", onClick: () => setTab("ongoing"), active: true },
        { icon: Medal, label: "Leaderboard", onClick: onLeaderboard },
        { icon: Home, label: "Home", onClick: () => onNavigate("home") },
        { icon: Gamepad2, label: "Games", onClick: () => onNavigate("games") },
        { icon: User, label: "My Profile", onClick: () => onNavigate("profile") },
        { icon: Info, label: "How It Works", onClick: () => howRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) },
    ];

    return (
        <div className="cm-root">
            {/* ── Desktop sidebar ─────────────────────────────────────────── */}
            <aside className="cm-sidebar">
                <div className="cm-brand">
                    <img src={brandLogo} alt="BongoQuiz" />
                    <div><strong>BongoQuiz</strong><span>Community</span></div>
                </div>
                <nav className="cm-nav">
                    {navItems.map(item => (
                        <button key={item.label} className={item.active ? "active" : ""} onClick={item.onClick}>
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>
                <div className="cm-sidebar-cta">
                    <div className="cm-sidebar-cta-icon"><Trophy size={26} /></div>
                    <strong>Play a Tournament</strong>
                    <p>Pick a live cup and climb the leaderboard.</p>
                    <button onClick={() => setTab("ongoing")}>Browse Live <span>›</span></button>
                </div>
                <div className="cm-profile-chip">
                    <span className="cm-avatar">{initials(playerName)}</span>
                    <div><strong>{playerName}</strong><span>{currentPhone || "Not signed in"}</span></div>
                </div>
            </aside>

            {/* ── Mobile top bar ──────────────────────────────────────────── */}
            <header className="cm-mobile-top">
                <button className="cm-mobile-back" onClick={onBack} aria-label="Back">‹</button>
                <div className="cm-brand">
                    <img src={brandLogo} alt="BongoQuiz" />
                    <div><strong>BongoQuiz</strong><span>Community</span></div>
                </div>
            </header>

            {/* ── Main column ─────────────────────────────────────────────── */}
            <main className="cm-main">
                <div className="cm-head">
                    <h1>{tab === "referrals" ? "Refer & Earn" : "🏆 Tournaments"}</h1>
                    <p>{tab === "referrals" ? "Invite friends and track the BongoCoins you earn from referrals." : "Compete, learn and win with the BongoQuiz community."}</p>
                </div>

                <div className="cm-tabs">
                    <button className={tab === "ongoing" ? "active" : ""} onClick={() => setTab("ongoing")}><Trophy size={16} /> Ongoing</button>
                    <button className={tab === "upcoming" ? "active" : ""} onClick={() => setTab("upcoming")}><CalendarDays size={16} /> Upcoming</button>
                    <button className={tab === "past" ? "active" : ""} onClick={() => setTab("past")}><Clock3 size={16} /> Past Results</button>
                    <button className={tab === "referrals" ? "active" : ""} onClick={() => setTab("referrals")}><Share2 size={16} /> Refer & Earn</button>
                </div>

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
                ) : (
                    <>
                {currentList.length > 1 && (
                    <div className="cm-picker">
                        {currentList.map(t => (
                            <button key={t.id} className={selected?.id === t.id ? "active" : ""} onClick={() => chooseTournament(t)}>
                                <span className="cm-picker-icon">{quizTypeIcons[normalizeTournamentQuizType(t.quizType)]}</span>
                                <span className="cm-picker-text"><b>{t.title}</b><small>{quizTypeLabels[normalizeTournamentQuizType(t.quizType)]}</small></span>
                            </button>
                        ))}
                    </div>
                )}

                {!selected ? (
                    <section className="cm-empty"><Trophy size={44} /><strong>No tournaments yet</strong><span>New tournaments appear here once an admin makes them visible.</span></section>
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
                                                : <button className="cm-enter" onClick={joinTournament}>{quizTypeIcons[normalizeTournamentQuizType(selected.quizType)]} Enter Now</button>}
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
                    <h4><Trophy size={16} /> Top Players <button className="cm-card-link" onClick={onLeaderboard}>View All</button></h4>
                    <div className="cm-top-players">
                        {leaders.length ? leaders.slice(0, 5).map((entry, index) => (
                            <div className={`cm-tp-row ${entry.phone === currentPhone ? "me" : ""}`} key={entry.id}>
                                <span className={`cm-tp-rank rank-${index + 1}`}>{index + 1}</span>
                                <span className="cm-avatar sm">{initials(entry.name)}</span>
                                <div className="cm-tp-name"><b>{entry.name}</b><small>{playerTitle(index + 1)}</small></div>
                                <span className="cm-tp-score"><Star size={13} /> {Math.round(entry.points || 0).toLocaleString()}</span>
                            </div>
                        )) : <div className="cm-tp-empty">No scores yet. Be the first to play!</div>}
                        {currentRank > 5 && leaders[currentRank - 1] && (
                            <div className="cm-tp-row me sticky">
                                <span className="cm-tp-rank">{currentRank}</span>
                                <span className="cm-avatar sm">{initials(playerName)}</span>
                                <div className="cm-tp-name"><b>You</b><small>{playerTitle(currentRank)}</small></div>
                                <span className="cm-tp-score"><Star size={13} /> {Math.round(leaders[currentRank - 1].points || 0).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="cm-card cm-contact">
                    <strong>Have questions or feedback?</strong>
                    <span>We'd love to hear from you!</span>
                    <button onClick={() => onNavigate("home")}>Back to Home</button>
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

            <BottomNav active="community" onNavigate={onNavigate} />
        </div>
    );
};
