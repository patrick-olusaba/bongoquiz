import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Award, BarChart3, CalendarClock, Coins, FileUp, Gift, ListChecks, Medal, Plus, RefreshCw, Save, Search, Settings, Shirt, Star, Trophy, Users } from "lucide-react";
import { db, storage, auth } from "../../firebase.ts";
import { writeAdminAudit } from "./auditLog.ts";
import {
    countdownParts,
    dateInputValue,
    defaultTournamentRewards,
    emptyTournament,
    initials,
    quizTypeIcons,
    quizTypeLabels,
    tournamentQuizTypes,
    TOURNAMENT_QUESTION_BANK,
    toDate,
    type QuizTournament,
    type TournamentEntry,
    type TournamentQuestion,
    type TournamentQuizType,
    type TournamentReward,
} from "../../utils/tournaments.ts";
import "../../styles/AdminTournament.css";

type EditableTournament = Omit<QuizTournament, "id"> & { id?: string };
type TournamentTab = "overview" | "tournaments" | "leaderboard" | "settings" | "questions" | "rewards";
type TournamentDifficulty = "easy" | "medium" | "hard";
type LeaderboardScope = "daily" | "weekly";
type TournamentEvent = TournamentEntry & { game?: TournamentQuizType; score?: number; createdAt?: any };

const ADMIN_TOURNAMENT_TAB_KEY = "bongo_admin_tournament_tab";
const ADMIN_TOURNAMENT_SELECTED_KEY = "bongo_admin_tournament_selected_id";

const TOURNAMENT_TABS: Array<{ id: TournamentTab; label: string; icon: typeof BarChart3 }> = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "tournaments", label: "Tournaments", icon: Trophy },
    { id: "leaderboard", label: "Leaderboard", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "questions", label: "Questions", icon: ListChecks },
    { id: "rewards", label: "Rewards", icon: Gift },
];

function defaultEndsAt() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(20, 0, 0, 0);
    return dateInputValue(date.toISOString());
}

function normalizeTournamentQuizType(value: unknown): TournamentQuizType {
    return tournamentQuizTypes.includes(value as TournamentQuizType) ? value as TournamentQuizType : "generalKnowledge";
}

function makeDraft(seed?: Partial<QuizTournament>): EditableTournament {
    return {
        ...emptyTournament(),
        ...seed,
        quizType: normalizeTournamentQuizType(seed?.quizType),
        entryFeeCoins: 0,
        durationSeconds: 80,
        dailyStartTime: seed?.dailyStartTime || "08:00",
        tournamentCycle: seed?.tournamentCycle || "daily",
        rewards: seed?.rewards?.length ? seed.rewards : defaultTournamentRewards,
    };
}

function safeAccuracy(entry: TournamentEntry) {
    if (entry.totalQuestions) return Math.round((Number(entry.correct || 0) / Math.max(Number(entry.totalQuestions || 0), 1)) * 1000) / 10;
    const bonus = (entry.perfectBonus || 0) + (entry.streakBonus || 0);
    const base = Math.max(Math.abs(entry.quizPoints || entry.points || 1), 1);
    return Math.min(99, Math.max(0, Math.round(((base - bonus * 0.25) / base) * 1000) / 10));
}

function dateFromFirestore(value: any): Date | null {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
    return null;
}

function isSameNairobiDay(date: Date, now = new Date()) {
    return date.toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" }) === now.toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" });
}

function isSameNairobiWeek(date: Date, now = new Date()) {
    const localDate = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
    const localNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
    const day = localNow.getDay() || 7;
    localNow.setHours(0, 0, 0, 0);
    localNow.setDate(localNow.getDate() - day + 1);
    const weekStart = localNow.getTime();
    const weekEnd = weekStart + 7 * 86400000;
    return localDate.getTime() >= weekStart && localDate.getTime() < weekEnd;
}

type CsvRow = Record<string, string>;

function parseCsvLine(line: string) {
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];
        if (char === '"' && quoted && next === '"') {
            cell += '"';
            i += 1;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === "," && !quoted) {
            cells.push(cell.trim());
            cell = "";
        } else {
            cell += char;
        }
    }
    cells.push(cell.trim());
    return cells;
}

function parseCsv(text: string): CsvRow[] {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]).map(header => header.trim().toLowerCase());
    return lines.slice(1).map(line => {
        const values = parseCsvLine(line);
        return headers.reduce<CsvRow>((row, header, index) => ({ ...row, [header]: values[index] || "" }), {});
    });
}
function csvEscape(value: string) {
    return value.includes(",") || value.includes('"') || value.includes("\n") ? '"' + value.replace(/"/g, '""') + '"' : value;
}
function normalizeDifficulty(value: string): TournamentDifficulty {
    return value === "medium" || value === "hard" ? value : "easy";
}

function answerIndexFromCsv(value: string, options: string[]) {
    const raw = value.trim();
    const normalized = raw.toLowerCase().replace(/^answer\s+/, "");
    const letterIndex = ["a", "b", "c", "d"].indexOf(normalized);
    if (letterIndex >= 0 && letterIndex < options.length) return letterIndex;
    const numericIndex = Number(normalized);
    if (Number.isInteger(numericIndex) && numericIndex >= 1 && numericIndex <= options.length) return numericIndex - 1;
    const matchIndex = options.findIndex(option => option.toLowerCase() === raw.toLowerCase());
    return matchIndex >= 0 ? matchIndex : 0;
}

function csvCategoryMatches(category: string, quizType: TournamentQuizType) {
    if (!category.trim()) return true;
    const aliases: Record<TournamentQuizType, string[]> = {
        generalKnowledge: ["general", "generalknowledge", "general knowledge"],
        sports: ["sports", "sport"],
        carLogos: ["carlogos", "car logos", "cars", "car"],
        brandLogos: ["brandlogos", "brand logos", "brands", "brand"],
        trickQuestions: ["trickquestions", "trick questions", "trick"],
        kenyaTrivia: ["kenyatrivia", "kenya trivia", "kenya"],
    };
    const normalized = category.toLowerCase().replace(/[\s_-]+/g, "").trim();
    return aliases[quizType].some(alias => alias.replace(/[\s_-]+/g, "") === normalized);
}

export function AdminTournament() {
    const [activeTab, setActiveTab] = useState<TournamentTab>(() => {
        const saved = typeof window !== "undefined" ? window.localStorage.getItem(ADMIN_TOURNAMENT_TAB_KEY) : "";
        return TOURNAMENT_TABS.some(tab => tab.id === saved) ? saved as TournamentTab : "overview";
    });
    const [tournaments, setTournaments] = useState<QuizTournament[]>([]);
    const [selectedId, setSelectedId] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem(ADMIN_TOURNAMENT_SELECTED_KEY) || "" : "");
    const [draft, setDraft] = useState<EditableTournament>(() => makeDraft());
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState(defaultEndsAt());
    const [entries, setEntries] = useState<TournamentEntry[]>([]);
    const [allTournamentEntries, setAllTournamentEntries] = useState<TournamentEntry[]>([]);
    const [allTournamentEvents, setAllTournamentEvents] = useState<TournamentEvent[]>([]);
    const [leaderboardScope, setLeaderboardScope] = useState<LeaderboardScope>("daily");
    const [saving, setSaving] = useState(false);
    const [rebuilding, setRebuilding] = useState(false);
    const [awarding, setAwarding] = useState(false);
    const [message, setMessage] = useState("");
    const [queryText, setQueryText] = useState("");
    const [questions, setQuestions] = useState<TournamentQuestion[]>([]);
    const blankQuestion = { question: "", options: ["", "", "", ""], answer: 0 };
    const [questionDraft, setQuestionDraft] = useState<Omit<TournamentQuestion, "id">>({...blankQuestion, difficulty: "easy"});
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState("");
    const [draggingImage, setDraggingImage] = useState(false);
    const [uploadingQuestion, setUploadingQuestion] = useState(false);
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const [bulkImporting, setBulkImporting] = useState(false);
    const [difficultyFilter, setDifficultyFilter] = useState<"all" | TournamentDifficulty | "duplicates">("all");
    const [pendingDelete, setPendingDelete] = useState<QuizTournament | null>(null);
    const [deletingTournament, setDeletingTournament] = useState(false);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [questionPage, setQuestionPage] = useState(1);
    const PAGE_SIZE = 20;

    useEffect(() => {
        const q = query(collection(db, "quizTournaments"), orderBy("updatedAt", "desc"), limit(30));
        return onSnapshot(q, snap => {
            const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as QuizTournament & { deleted?: boolean })).filter(tournament => !tournament.deleted);
            setTournaments(rows);
            setSelectedId(current => rows.some(tournament => tournament.id === current) ? current : rows[0]?.id || "");
        }, () => setTournaments([]));
    }, []);

    useEffect(() => {
        window.localStorage.setItem(ADMIN_TOURNAMENT_TAB_KEY, activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (selectedId) window.localStorage.setItem(ADMIN_TOURNAMENT_SELECTED_KEY, selectedId);
        else window.localStorage.removeItem(ADMIN_TOURNAMENT_SELECTED_KEY);
    }, [selectedId]);

    // Seed the editable draft from the selected tournament — but ONLY when the
    // selection actually changes. The tournaments snapshot re-fires on any field
    // change (e.g. lastEntryAt when a player submits), and re-seeding on every
    // snapshot was wiping the admin's unsaved edits (rewards "resetting back").
    const seededIdRef = useRef<string>("");
    useEffect(() => {
        const selected = tournaments.find(tournament => tournament.id === selectedId);
        if (!selected) return;
        if (seededIdRef.current === selectedId) return; // already editing this one — keep edits
        seededIdRef.current = selectedId;
        setDraft(makeDraft(selected));
        setStartsAt(dateInputValue(selected.startsAt));
        setEndsAt(dateInputValue(selected.endsAt) || defaultEndsAt());
    }, [selectedId, tournaments]);

    useEffect(() => {
        if (!selectedId) {
            setEntries([]);
            return;
        }
        const q = query(collection(db, "quizTournaments", selectedId, "entries"), orderBy("points", "desc"), limit(100));
        return onSnapshot(q, snap => setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as TournamentEntry))), () => setEntries([]));
    }, [selectedId]);

    // Questions now live in a shared bank keyed by quizType (the selected game
    // tab), not per-tournament. We sort client-side so docs missing `order` are
    // never excluded (a Firestore orderBy would silently drop them).
    useEffect(() => {
        const type = normalizeTournamentQuizType(draft.quizType);
        const q = query(collection(db, TOURNAMENT_QUESTION_BANK), where("quizType", "==", type));
        return onSnapshot(q, snap => {
            const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as TournamentQuestion));
            rows.sort((a, b) => (Number((b as { order?: number }).order) || 0) - (Number((a as { order?: number }).order) || 0));
            setQuestions(rows);
        }, () => setQuestions([]));
    }, [draft.quizType]);

    // Aggregate entries + events across ALL tournaments via per-tournament reads.
    // A collection-group query (the old approach) is blocked by the security
    // rules, which left the All-Tournaments Leaderboard and Recent Plays empty.
    // Re-fetches whenever a tournament records a new entry / is rebuilt.
    const tournamentsActivityKey = tournaments
        .map(t => `${t.id}:${(t as any).lastEntryAt?.seconds ?? 0}:${(t as any).lastRebuiltAt?.seconds ?? 0}`)
        .join("|");
    useEffect(() => {
        if (!tournaments.length) { setAllTournamentEntries([]); setAllTournamentEvents([]); return; }
        let cancelled = false;
        (async () => {
            const [entriesSnaps, eventsSnaps] = await Promise.all([
                Promise.all(tournaments.map(t => getDocs(query(collection(db, "quizTournaments", t.id, "entries"), limit(200))).catch(() => null))),
                Promise.all(tournaments.map(t => getDocs(query(collection(db, "quizTournaments", t.id, "events"), orderBy("createdAt", "desc"), limit(100))).catch(() => null))),
            ]);
            if (cancelled) return;
            const entryRows: TournamentEntry[] = [];
            entriesSnaps.forEach((snapshot, idx) => {
                const t = tournaments[idx];
                snapshot?.docs.forEach(d => entryRows.push({
                    id: d.id, ...d.data(),
                    _tournamentTitle: t?.title || "",
                    _quizType: normalizeTournamentQuizType(t?.quizType),
                } as unknown as TournamentEntry));
            });
            const eventRows: TournamentEvent[] = [];
            eventsSnaps.forEach(snapshot => snapshot?.docs.forEach(d => eventRows.push({ id: d.id, ...d.data() } as TournamentEvent)));
            setAllTournamentEntries(entryRows);
            setAllTournamentEvents(eventRows);
        })();
        return () => { cancelled = true; };
    }, [tournamentsActivityKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredEntries = entries.filter(entry => `${entry.name || ""} ${entry.phone || ""}`.toLowerCase().includes(queryText.toLowerCase()));

    const scopedEvents = useMemo(() => allTournamentEvents.filter(event => {
        const createdAt = dateFromFirestore(event.createdAt);
        if (!createdAt) return false;
        return leaderboardScope === "daily" ? isSameNairobiDay(createdAt) : isSameNairobiWeek(createdAt);
    }), [allTournamentEvents, leaderboardScope]);
    const generalLeaderboard = useMemo(() => {
        const source = scopedEvents.length ? scopedEvents : allTournamentEntries;
        const totals = new Map<string, TournamentEntry>();
        source.forEach(entry => {
            const key = entry.phone || entry.id || entry.name || "unknown";
            const current = totals.get(key) || { ...entry, points: 0, quizPoints: 0, perfectBonus: 0, streakBonus: 0, participationBonus: 0, sessions: 0, correct: 0, totalQuestions: 0 };
            current.name = entry.name || current.name || "Player";
            current.phone = entry.phone || current.phone || key;
            current.points = Number(current.points || 0) + Number(entry.points || 0);
            current.quizPoints = Number(current.quizPoints || 0) + Number(entry.quizPoints || (entry as TournamentEvent).score || 0);
            current.perfectBonus = Number(current.perfectBonus || 0) + Number(entry.perfectBonus || 0);
            current.streakBonus = Number(current.streakBonus || 0) + Number(entry.streakBonus || 0);
            current.participationBonus = Number(current.participationBonus || 0) + Number(entry.participationBonus || 0);
            current.correct = Number(current.correct || 0) + Number(entry.correct || 0);
            current.totalQuestions = Number(current.totalQuestions || 0) + Number(entry.totalQuestions || 0);
            current.sessions = Number(current.sessions || 0) + 1;
            totals.set(key, current);
        });
        return [...totals.values()]
            .filter(entry => `${entry.name || ""} ${entry.phone || ""}`.toLowerCase().includes(queryText.toLowerCase()))
            .sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
    }, [scopedEvents, allTournamentEntries, queryText]);

    // All-time: every tournament player, the games/tournaments they played, and points.
    const allPlayersLeaderboard = useMemo(() => {
        const totals = new Map<string, any>();
        allTournamentEntries.forEach((entry: any) => {
            const key = String(entry.phone || entry.id || entry.name || "unknown");
            const current = totals.get(key) || { phone: entry.phone || key, name: entry.name || "Player", points: 0, tournaments: 0, correct: 0, totalQuestions: 0, games: new Set<string>(), titles: new Set<string>() };
            current.name = entry.name || current.name;
            current.points += Number(entry.points || 0);
            current.tournaments += 1;
            current.correct += Number(entry.correct || 0);
            current.totalQuestions += Number(entry.totalQuestions || 0);
            if (entry._quizType) current.games.add(quizTypeLabels[entry._quizType as TournamentQuizType] || String(entry._quizType));
            if (entry._tournamentTitle) current.titles.add(entry._tournamentTitle);
            totals.set(key, current);
        });
        return [...totals.values()]
            .map(p => ({ ...p, accuracy: p.totalQuestions ? Math.round((p.correct / p.totalQuestions) * 100) : 0, gamesList: [...p.games], titlesList: [...p.titles] }))
            .filter(p => `${p.name || ""} ${p.phone || ""}`.toLowerCase().includes(queryText.toLowerCase()))
            .sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
    }, [allTournamentEntries, queryText]);

    const activeCount = tournaments.filter(tournament => tournament.active && tournament.status !== "completed").length;
    const totalPoints = allTournamentEntries.reduce((sum, entry) => sum + Math.round(entry.points || 0), 0);
    const rewardSlots = draft.rewards.slice(0, Math.min(draft.rewards.length, Math.max(entries.length, 1)));
    const totalCoinsAwarded = rewardSlots.reduce((sum, reward) => sum + reward.items.reduce((itemSum, item) => {
        const match = item.replace(/,/g, "").match(/(\d+)\s*Coins?/i);
        return itemSum + (match ? Number(match[1]) : 0);
    }, 0), 0);
    const shirtsAwarded = rewardSlots.filter(reward => reward.items.some(item => /shirt/i.test(item))).length;
    const parts = useMemo(() => countdownParts(toDate(draft.endsAt) || (endsAt ? new Date(endsAt) : null)), [draft.endsAt, endsAt]);
    const currentQuizType = normalizeTournamentQuizType(draft.quizType);
    const selectedGameQuestions = questions.filter(question => !question.quizType || normalizeTournamentQuizType(question.quizType) === currentQuizType);
    const duplicateGroups = useMemo(() => {
        const groups = new Map<string, TournamentQuestion[]>();
        selectedGameQuestions.forEach(question => {
            const key = [question.question, question.visual || "", question.visualImageUrl || ""].join("|").toLowerCase().replace(/\s+/g, " ").trim();
            if (!key) return;
            groups.set(key, [...(groups.get(key) || []), question]);
        });
        return [...groups.values()].filter(group => group.length > 1);
    }, [selectedGameQuestions]);
    const duplicateDocIds = useMemo(() => new Set(duplicateGroups.flatMap(group => group.slice(1).map(question => question.id))), [duplicateGroups]);
    const levelCounts = {
        all: selectedGameQuestions.length,
        easy: selectedGameQuestions.filter(question => (question.difficulty || "easy") === "easy").length,
        medium: selectedGameQuestions.filter(question => (question.difficulty || "easy") === "medium").length,
        hard: selectedGameQuestions.filter(question => (question.difficulty || "easy") === "hard").length,
        duplicates: duplicateDocIds.size,
    };
    const visibleQuestions = selectedGameQuestions.filter(question => difficultyFilter === "all" ? true : difficultyFilter === "duplicates" ? duplicateDocIds.has(question.id) : (question.difficulty || "easy") === difficultyFilter);
    const totalPages = Math.max(1, Math.ceil(visibleQuestions.length / PAGE_SIZE));
    const pagedQuestions = visibleQuestions.slice((questionPage - 1) * PAGE_SIZE, questionPage * PAGE_SIZE);
    const logoQuestionGame = currentQuizType === "carLogos" || currentQuizType === "brandLogos";
    const csvTemplateRows = [
        ["category", "question", "answerA", "answerB", "answerC", "answerD", "correctAnswer", "difficulty", "visual", "visualImageUrl"],
        [currentQuizType, "Sample " + quizTypeLabels[currentQuizType] + " question", "Answer A", "Answer B", "Answer C", "Answer D", "Answer A", "easy", "", ""],
    ];
    const csvTemplateHref = "data:text/csv;charset=utf-8," + encodeURIComponent(csvTemplateRows.map(row => row.map(csvEscape).join(",")).join("\n"));

    const createTournament = () => {
        const next = makeDraft({
            title: "Weekly BongoQuiz Cup",
            subtitle: "Answer tournament-only questions and climb the leaderboard.",
            quizType: "generalKnowledge",
            status: "scheduled",
            active: true,
        });
        setSelectedId("");
        setDraft(next);
        setStartsAt(dateInputValue(new Date().toISOString()));
        setEndsAt(defaultEndsAt());
        setEntries([]);
        setActiveTab("settings");
        setMessage("Creating a new tournament. Save when ready.");
        setDifficultyFilter("all");
    };

    const saveTournament = async () => {
        setSaving(true);
        setMessage("");
        try {
            const payload: Record<string, unknown> = {
                title: draft.title,
                subtitle: draft.subtitle,
                quizType: currentQuizType,
                status: draft.status,
                active: draft.active,
                entryFeeCoins: 0,
                durationSeconds: 80,
                dailyStartTime: draft.dailyStartTime || "08:00",
                tournamentCycle: draft.tournamentCycle || "daily",
                startsAt: startsAt ? new Date(startsAt).toISOString() : null,
                endsAt: endsAt ? new Date(endsAt).toISOString() : null,
                rewards: draft.rewards.map(reward => ({ ...reward, items: reward.items.map(item => item.trim()).filter(Boolean) })),
            };
            const payloadId = draft.id || selectedId;
            if (payloadId) payload.id = payloadId;
            const fn = httpsCallable(getFunctions(), "saveQuizTournament");
            const result = await fn(payload);
            const id = (result.data as any)?.id || payloadId;
            if (id) setSelectedId(id);
            await writeAdminAudit({ action: "Quiz tournament saved", target: id || draft.title, details: payload });
            setMessage("Tournament saved.");
        } catch (error) {
            setMessage("Failed to save tournament: " + String(error));
        } finally {
            setSaving(false);
        }
    };

    const rebuildStandings = async () => {
        if (!selectedId) return;
        setRebuilding(true);
        setMessage("");
        try {
            const fn = httpsCallable(getFunctions(), "rebuildQuizTournament");
            const result = await fn({ tournamentId: selectedId });
            await writeAdminAudit({ action: "Quiz tournament standings rebuilt", target: selectedId, details: result.data as any });
            setMessage("Tournament standings rebuilt.");
        } catch (error) {
            setMessage("Failed to rebuild standings: " + String(error));
        } finally {
            setRebuilding(false);
        }
    };

    const awardBadges = async () => {
        if (!selectedId) return;
        setAwarding(true);
        setMessage("");
        try {
            const fn = httpsCallable(getFunctions(), "awardTournamentBadgesNow");
            const result = await fn({ tournamentId: selectedId });
            await writeAdminAudit({ action: "Tournament badges awarded", target: selectedId, details: result.data as any });
            setMessage(`Badges awarded to top players (${(result.data as any)?.awarded ?? 0} badge${(result.data as any)?.awarded === 1 ? "" : "s"}).`);
        } catch (error) {
            setMessage("Failed to award badges: " + String(error));
        } finally {
            setAwarding(false);
        }
    };

    const updateReward = (index: number, field: keyof TournamentReward, value: string) => {
        setDraft(prev => ({
            ...prev,
            rewards: prev.rewards.map((reward, i) => i === index ? { ...reward, [field]: field === "items" ? value.split("\n") : value } : reward),
        }));
    };

    const addReward = () => setDraft(prev => ({ ...prev, rewards: [...prev.rewards, { rank: "New Reward", title: "Reward Pack", items: ["Bonus Coins"] }] }));
    const removeReward = (index: number) => setDraft(prev => ({ ...prev, rewards: prev.rewards.filter((_reward, i) => i !== index) }));

    const updateQuestionOption = (index: number, value: string) => {
        setQuestionDraft(prev => ({ ...prev, options: prev.options.map((option, optionIndex) => optionIndex === index ? value : option) }));
    };

    const setSelectedImage = (file: File | null) => {
        setImageFile(file);
        setImagePreview(file ? URL.createObjectURL(file) : String(questionDraft.visualImageUrl || ""));
    };

    const uploadQuestionImage = async () => {
        if (!imageFile) return questionDraft.visualImageUrl || null;
        if (auth.currentUser) await auth.currentUser.getIdToken(true);
        const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const imageRef = ref(storage, "tournamentQuestionImages/" + currentQuizType + "/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext);
        await uploadBytes(imageRef, imageFile, { contentType: imageFile.type });
        return getDownloadURL(imageRef);
    };

    const saveQuestion = async () => {
        const selectedType = normalizeTournamentQuizType(draft.quizType);
        const options = questionDraft.options.map(option => option.trim()).filter(Boolean);
        if (!questionDraft.question.trim() || options.length < 2) { setMessage("Add a question and at least two answers."); return; }
        if (questionDraft.answer < 0 || questionDraft.answer >= options.length) { setMessage("Choose a correct answer that exists in the answers."); return; }
        if (logoQuestionGame && !imageFile && !questionDraft.visualImageUrl) { setMessage("Upload a logo image for Car Logos and Brand Logos questions."); return; }
        setUploadingQuestion(true);
        setMessage("");
        try {
            const visualImageUrl = logoQuestionGame ? await uploadQuestionImage() : (questionDraft.visualImageUrl || null);
            const payload = {
                question: questionDraft.question.trim(),
                options,
                answer: questionDraft.answer,
                active: true,
                quizType: selectedType,
                difficulty: questionDraft.difficulty || "easy",
                visual: questionDraft.visual?.toString().trim() || null,
                visualImageUrl,
                updatedAt: serverTimestamp(),
            };
            if (editingQuestionId) {
                await updateDoc(doc(db, TOURNAMENT_QUESTION_BANK, editingQuestionId), payload);
                setMessage(quizTypeLabels[selectedType] + " question updated.");
            } else {
                await addDoc(collection(db, TOURNAMENT_QUESTION_BANK), { ...payload, order: questions.length + 1, createdAt: serverTimestamp() });
                setMessage(quizTypeLabels[selectedType] + " question added to the shared bank.");
            }
            setQuestionDraft({...blankQuestion, difficulty: "easy"});
            setImageFile(null);
            setImagePreview("");
            setEditingQuestionId(null);
        } catch (error) {
            setMessage("Failed to save question: " + String(error));
        } finally {
            setUploadingQuestion(false);
        }
    };

    const importCsvFile = (file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async event => {
            const selectedType = normalizeTournamentQuizType(draft.quizType);
            setBulkImporting(true);
            setMessage("");
            try {
                const rows = parseCsv(String(event.target?.result || ""));
                const parsed = rows.map(row => {
                    const question = (row.question || row.q || "").trim();
                    const category = (row.category || row.quizgame || row.game || "").trim();
                    const answersText = row.answers || row.options || "";
                    const options = [
                        row.answera || row.optiona,
                        row.answerb || row.optionb,
                        row.answerc || row.optionc,
                        row.answerd || row.optiond,
                    ].filter(Boolean).map(option => option.trim());
                    const expandedOptions = options.length ? options : answersText.split(/[|;]/).map(option => option.trim()).filter(Boolean);
                    const correctAnswer = row.correctanswer || row.correct || row.answer || row.correct_answer || "";
                    return {
                        question,
                        category,
                        options: expandedOptions,
                        answer: answerIndexFromCsv(correctAnswer, expandedOptions),
                        difficulty: normalizeDifficulty((row.difficulty || "easy").trim().toLowerCase()),
                        visual: (row.visual || "").trim() || null,
                        visualImageUrl: (row.visualimageurl || row.imageurl || "").trim() || null,
                    };
                }).filter(row => {
                    return csvCategoryMatches(row.category, selectedType) && row.question && row.options.length >= 2 && row.answer >= 0 && row.answer < row.options.length;
                });

                if (!parsed.length) { setMessage("No valid " + quizTypeLabels[selectedType] + " CSV questions found."); return; }
                const batch = writeBatch(db);
                parsed.forEach((row, index) => {
                    const questionRef = doc(collection(db, TOURNAMENT_QUESTION_BANK));
                    batch.set(questionRef, {
                        question: row.question,
                        options: row.options,
                        answer: row.answer,
                        active: true,
                        quizType: selectedType,
                        difficulty: row.difficulty,
                        visual: row.visual,
                        visualImageUrl: row.visualImageUrl,
                        order: questions.length + index + 1,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                });
                await batch.commit();
                await writeAdminAudit({ action: "Tournament CSV questions imported", target: selectedType, details: { quizType: selectedType, imported: parsed.length } });
                setMessage("Imported " + parsed.length + " " + quizTypeLabels[selectedType] + " question" + (parsed.length === 1 ? "." : "s."));
            } catch (error) {
                setMessage("Failed to import CSV questions: " + String(error));
            } finally {
                setBulkImporting(false);
            }
        };
        reader.readAsText(file);
    };

    const removeQuestion = async (question: TournamentQuestion) => {
        if (!question.id) return;
        await deleteDoc(doc(db, TOURNAMENT_QUESTION_BANK, question.id));
        setMessage("Tournament question removed.");
    };

    const deleteAllInSelectedGame = async () => {
        if (!selectedGameQuestions.length) return;
        const batch = writeBatch(db);
        selectedGameQuestions.forEach(question => batch.delete(doc(db, TOURNAMENT_QUESTION_BANK, question.id)));
        await batch.commit();
        setShowDeleteAllModal(false);
        setMessage("Deleted all questions in " + quizTypeLabels[currentQuizType] + ".");
    };

    const deleteDuplicateQuestions = async () => {
        if (!duplicateDocIds.size) return;
        if (!window.confirm(`Delete ${duplicateDocIds.size} duplicate question(s)? The first copy in each group will be kept.`)) return;
        const batch = writeBatch(db);
        duplicateDocIds.forEach(questionId => batch.delete(doc(db, TOURNAMENT_QUESTION_BANK, questionId)));
        await batch.commit();
        setMessage("Deleted duplicate questions.");
    };

    const selectTournament = (id: string) => {
        setSelectedId(id);
        setActiveTab("overview");
    };

    const editTournament = (tournament: QuizTournament) => {
        setSelectedId(tournament.id);
        setDraft(makeDraft(tournament));
        setStartsAt(dateInputValue(tournament.startsAt));
        setEndsAt(dateInputValue(tournament.endsAt) || defaultEndsAt());
        setQuestionDraft({...blankQuestion, difficulty: "easy"});
        setImageFile(null);
        setImagePreview("");
        setEditingQuestionId(null);
        setActiveTab("settings");
        setMessage("Editing " + tournament.title + ". Save when ready.");
    };

    const deleteTournament = (tournament: QuizTournament) => {
        setPendingDelete(tournament);
    };

    const confirmDeleteTournament = async () => {
        if (!pendingDelete?.id) return;
        setDeletingTournament(true);
        setMessage("");
        try {
            await updateDoc(doc(db, "quizTournaments", pendingDelete.id), {
                deleted: true,
                active: false,
                status: "completed",
                deletedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            if (selectedId === pendingDelete.id) {
                const nextTournament = tournaments.find(row => row.id !== pendingDelete.id);
                setSelectedId(nextTournament?.id || "");
                setDraft(makeDraft(nextTournament));
            }
            await writeAdminAudit({ action: "Quiz tournament archived", target: pendingDelete.id, details: { title: pendingDelete.title, questionsKept: true } });
            setPendingDelete(null);
            setMessage("Tournament deleted from the active list. Its questions were kept.");
        } catch (error) {
            setMessage("Failed to delete tournament: " + String(error));
        } finally {
            setDeletingTournament(false);
        }
    };

    return (
        <div className="adm-tournament">
            <div className="adm-tournament-head">
                <div>
                    <h1>Quiz Tournaments</h1>
                    <span>Create standalone tournament games with their own 1-15 questions and 1:20 play timer.</span>
                </div>
                <label className="adm-tournament-search"><Search size={17} /><input value={queryText} onChange={event => setQueryText(event.target.value)} placeholder="Search players..." /></label>
            </div>

            {message && <div className={message.startsWith("Failed") ? "adm-tournament-alert error" : "adm-tournament-alert"}>{message}</div>}

            <nav className="adm-tournament-tabs" aria-label="Tournament admin sections">
                {TOURNAMENT_TABS.map(tab => {
                    const Icon = tab.icon;
                    return <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}><Icon size={16} /> {tab.label}</button>;
                })}
            </nav>

            {pendingDelete && <div className="adm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-tournament-title">
                <div className="adm-confirm-modal">
                    <h2 id="delete-tournament-title">Delete tournament?</h2>
                    <p><strong>{pendingDelete.title}</strong> will be removed from the active tournament list. Its questions will be kept.</p>
                    <div className="adm-confirm-actions"><button type="button" className="secondary" onClick={() => setPendingDelete(null)} disabled={deletingTournament}>Cancel</button><button type="button" className="danger" onClick={confirmDeleteTournament} disabled={deletingTournament}>{deletingTournament ? "Deleting..." : "Delete Tournament"}</button></div>
                </div>
            </div>}

            {showDeleteAllModal && <div className="adm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-all-questions-title">
                <div className="adm-confirm-modal">
                    <h2 id="delete-all-questions-title">Delete all questions?</h2>
                    <p>This will permanently delete all <strong>{selectedGameQuestions.length} {quizTypeLabels[currentQuizType]}</strong> question{selectedGameQuestions.length === 1 ? "" : "s"}. This cannot be undone.</p>
                    <div className="adm-confirm-actions"><button type="button" className="secondary" onClick={() => setShowDeleteAllModal(false)}>Cancel</button><button type="button" className="danger" onClick={deleteAllInSelectedGame}>Delete All</button></div>
                </div>
            </div>}

            {activeTab === "overview" && <section className="adm-tournament-tab-panel">
                <div className="adm-tournament-kpis">
                    <div><Users /><span>Participants</span><strong>{entries.length.toLocaleString()}</strong><em>{draft.title}</em></div>
                    <div><Trophy /><span>Active Tournaments</span><strong>{activeCount}</strong><em>{tournaments.length} total</em></div>
                    <div><Star /><span>Points Awarded</span><strong>{totalPoints.toLocaleString()}</strong><em>selected tournament</em></div>
                    <div><Coins /><span>Reward Coins</span><strong>{totalCoinsAwarded.toLocaleString()}</strong><em>configured rewards</em></div>
                    <div><Shirt /><span>Shirts Awarded</span><strong>{shirtsAwarded}</strong><em>top performers</em></div>
                </div>

                <div className="adm-tournament-overview-grid">
                    <div className="adm-tournament-card overview-card">
                        <h2>Tournament Overview</h2>
                        <div className="timer-box"><span>{draft.title} ends in</span><strong>{parts.days} : {parts.hours} : {parts.minutes}</strong><small>DAYS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; HRS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; MIN</small></div>
                        <dl>
                            <dt><CalendarClock size={15} /> End Date</dt><dd>{endsAt ? new Date(endsAt).toLocaleString("en-KE") : "Not set"}</dd>
                            <dt><CalendarClock size={15} /> Question Timer</dt><dd>1 min 20 sec</dd>
                            <dt><CalendarClock size={15} /> Daily Start</dt><dd>{draft.dailyStartTime || "08:00"}</dd>
                            <dt><Star size={15} /> Questions</dt><dd>{questions.length}/15</dd>
                            <dt><Coins size={15} /> Entry Fee</dt><dd>Free</dd>
                            <dt><Users size={15} /> Participants</dt><dd>{entries.length.toLocaleString()}</dd>
                            <dt><Star size={15} /> Quiz Game</dt><dd>{quizTypeLabels[currentQuizType]}</dd>
                            <dt><Award size={15} /> Status</dt><dd className="live-text">{draft.active ? draft.status : "Hidden"}</dd>
                        </dl>
                    </div>

                    <div className="adm-tournament-card rewards-card"><h2>Reward Snapshot</h2>{draft.rewards.map((reward, index) => <div key={`${reward.rank}-${index}`} className="reward-row"><Medal className={`medal-${index + 1}`} /><strong>{reward.rank}</strong><span>{reward.items.join(" + ")}</span></div>)}</div>
                </div>
            </section>}

            {activeTab === "tournaments" && <section className="adm-tournament-tab-panel">
                <div className="adm-tournament-card">
                    <div className="adm-tournament-card-head"><h2>Tournaments</h2><button onClick={createTournament}><Plus size={15} /> Create Tournament</button></div>
                    <div className="adm-tournament-table compact tournament-list-table">
                        <div className="thead"><span>Tournament</span><span>Quiz</span><span>Status</span><span>Ends In</span><span>Players</span><span>Action</span></div>
                        {tournaments.length ? tournaments.map(tournament => {
                            const isSelected = tournament.id === selectedId;
                            const count = isSelected ? entries.length : "--";
                            const time = countdownParts(toDate(tournament.endsAt));
                            return <div className={isSelected ? "trow current" : "trow"} key={tournament.id}>
                                <span className="tour-title"><Trophy size={18} /><strong>{tournament.title}</strong><small>{tournament.subtitle}</small></span>
                                <span>{quizTypeLabels[normalizeTournamentQuizType(tournament.quizType)]}</span>
                                <span><em className={tournament.status === "active" ? "status live" : "status ongoing"}>{tournament.active ? tournament.status : "hidden"}</em></span>
                                <span className="countdown-mini">{tournament.status === "completed" ? "DONE" : `${time.days}:${time.hours}:${time.minutes}`}</span>
                                <span>{count}</span>
                                <span className="tournament-row-actions"><button className="manage-btn" onClick={() => editTournament(tournament)}>Edit</button><button className="delete-btn" onClick={() => deleteTournament(tournament)}>Delete</button></span>
                            </div>;
                        }) : <div className="admin-empty-row">No tournaments yet. Create one from admin.</div>}
                    </div>
                </div>
            </section>}

            {activeTab === "leaderboard" && <section className="adm-tournament-tab-panel">
                <div className="adm-tournament-card">
                    <div className="adm-tournament-card-head">
                        <div><h2>Per-Tournament Entries</h2><span>{tournaments.find(t => t.id === selectedId)?.title || "Selected tournament"} · {filteredEntries.length} players</span></div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button className="secondary" disabled={!selectedId || awarding} onClick={awardBadges} title="Give the reward badges to the current top players (added to their profile)"><Award size={15} /> {awarding ? "Awarding..." : "Award Badges"}</button>
                            <button className="secondary" disabled={!selectedId || rebuilding} onClick={rebuildStandings}><RefreshCw size={15} /> {rebuilding ? "Rebuilding..." : "Rebuild Standings"}</button>
                        </div>
                    </div>
                    <div className="adm-tournament-table leaderboard">
                        <div className="thead"><span>Rank</span><span>Player</span><span>Points</span><span>Correct</span><span>Accuracy</span></div>
                        {filteredEntries.length ? filteredEntries.map((entry, index) => <div className="trow" key={entry.phone || entry.id}>
                            <span className={`rank rank-${Math.min(index + 1, 4)}`}>{index + 1}</span>
                            <span className="player-cell"><b>{initials(entry.name)}</b><strong>{entry.name || "Player"}</strong><small>{entry.phone}</small></span>
                            <span>{Math.round(entry.points || 0).toLocaleString()}</span>
                            <span>{entry.correct || 0}/{entry.totalQuestions || 0}</span>
                            <span className="accuracy">{safeAccuracy(entry)}%</span>
                        </div>) : <div className="admin-empty-row">No entries for the selected tournament yet.</div>}
                    </div>
                </div>
                <div className="adm-tournament-card">
                    <div className="adm-tournament-card-head"><h2>{leaderboardScope === "daily" ? "Daily" : "Weekly"} All-Tournaments Leaderboard</h2><div className="leaderboard-scope-tabs"><button className={leaderboardScope === "daily" ? "active" : ""} onClick={() => setLeaderboardScope("daily")}>Daily</button><button className={leaderboardScope === "weekly" ? "active" : ""} onClick={() => setLeaderboardScope("weekly")}>Weekly</button></div></div>
                    <div className="adm-tournament-table leaderboard">
                        <div className="thead"><span>Rank</span><span>Player</span><span>Points</span><span>Sessions</span><span>Accuracy</span><span>Quiz</span></div>
                        {generalLeaderboard.length ? generalLeaderboard.slice(0, 50).map((entry, index) => <div className="trow" key={entry.phone || entry.id}>
                            <span className={`rank rank-${Math.min(index + 1, 4)}`}>{index + 1}</span>
                            <span className="player-cell"><b>{initials(entry.name)}</b><strong>{entry.name || "Player"}</strong><small>{entry.phone}</small></span>
                            <span>{Math.round(entry.points || 0).toLocaleString()}</span>
                            <span>{entry.sessions || 0}</span>
                            <span className="accuracy">{safeAccuracy(entry)}%</span>
                            <span>All tournaments</span>
                        </div>) : <div className="admin-empty-row">No tournament entries yet. Players appear here after entering and playing any tournament.</div>}
                    </div>
                </div>
                <div className="adm-tournament-card">
                    <div className="adm-tournament-card-head"><h2>All Tournament Players</h2><span>Every player across all tournaments (all-time) · {allPlayersLeaderboard.length} players</span></div>
                    <div className="adm-tournament-table leaderboard">
                        <div className="thead"><span>Rank</span><span>Player</span><span>Points</span><span>Tournaments</span><span>Accuracy</span><span>Games played</span></div>
                        {allPlayersLeaderboard.length ? allPlayersLeaderboard.slice(0, 200).map((entry, index) => <div className="trow" key={entry.phone || index}>
                            <span className={`rank rank-${Math.min(index + 1, 4)}`}>{index + 1}</span>
                            <span className="player-cell"><b>{initials(entry.name)}</b><strong>{entry.name || "Player"}</strong><small>{entry.phone}</small></span>
                            <span>{Math.round(entry.points || 0).toLocaleString()}</span>
                            <span>{entry.tournaments || 0}</span>
                            <span className="accuracy">{entry.accuracy}%</span>
                            <span title={entry.titlesList.join(", ")}>{entry.gamesList.length ? entry.gamesList.join(", ") : "—"}</span>
                        </div>) : <div className="admin-empty-row">No tournament players yet.</div>}
                    </div>
                </div>
                <div className="adm-tournament-card recent-plays-card">
                    <div className="adm-tournament-card-head"><h2>Recent Tournament Plays</h2><span>Players who have finished a tournament session.</span></div>
                    <div className="adm-tournament-table leaderboard recent-plays-table">
                            <div className="thead"><span>Player</span><span>Points</span><span>Correct</span><span>Quiz</span><span>Played At</span></div>
                            {scopedEvents.length ? scopedEvents.slice(0, 50).map(event => {
                                const playedAt = dateFromFirestore(event.createdAt);
                                return <div className="trow" key={event.id}>
                                    <span className="player-cell"><b>{initials(event.name)}</b><strong>{event.name || "Player"}</strong><small>{event.phone}</small></span>
                                    <span>{Math.round(event.points || event.score || 0).toLocaleString()}</span>
                                    <span>{event.correct || 0}/{event.totalQuestions || 0}</span>
                                    <span>{event.game ? quizTypeLabels[normalizeTournamentQuizType(event.game)] : "Tournament"}</span>
                                    <span>{playedAt ? playedAt.toLocaleString("en-KE") : "--"}</span>
                                </div>;
                            }) : <div className="admin-empty-row">No tournament play events for this {leaderboardScope === "daily" ? "day" : "week"} yet.</div>}
                    </div>
                </div>
            </section>}

            {activeTab === "settings" && <section className="adm-tournament-tab-panel">
                <div className="adm-tournament-card settings-card">
                    <div className="adm-tournament-card-head"><h2>Tournament Settings</h2><button disabled={saving} onClick={saveTournament}><Save size={15} /> {saving ? "Saving..." : "Save Tournament"}</button></div>
                    <div className="settings-grid">
                        <label>Title<input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
                        <label>Quiz Game<select value={currentQuizType} onChange={e => setDraft({ ...draft, quizType: e.target.value as TournamentQuizType })}>{tournamentQuizTypes.map(type => <option key={type} value={type}>{quizTypeIcons[type]} {quizTypeLabels[type]}</option>)}</select></label>
                        <label>Status<select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as QuizTournament["status"] })}><option value="active">Active</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option></select></label>
                        <label>Tournament Cycle<select value={draft.tournamentCycle || "daily"} onChange={e => setDraft({ ...draft, tournamentCycle: e.target.value as "daily" | "weekly" })}><option value="daily">Daily Tournament</option><option value="weekly">Weekly Tournament</option></select></label>
                        <label>Daily Start Time<input type="time" value={draft.dailyStartTime || "08:00"} onChange={e => setDraft({ ...draft, dailyStartTime: e.target.value })} /></label>
                        <label>Starts At<input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} /></label>
                        <label>Ends At<input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} /></label>
                        <label>Entry Fee<input value="Free" disabled /></label>
                        <label>Visibility<select value={draft.active ? "yes" : "no"} onChange={e => setDraft({ ...draft, active: e.target.value === "yes" })}><option value="yes">Visible to players</option><option value="no">Paused / hidden</option></select></label>
                        <label className="wide">Subtitle<textarea value={draft.subtitle} onChange={e => setDraft({ ...draft, subtitle: e.target.value })} /></label>
                    </div>
                </div>
            </section>}

            {activeTab === "questions" && <section className="adm-tournament-tab-panel">
                <div className="adm-tournament-card tournament-question-card-admin">
                    <div className="adm-tournament-card-head"><h2>Tournament Questions ({selectedGameQuestions.length} in bank)</h2><span>Add many questions. Players receive a shuffled set of up to 15 per tournament.</span></div>
                    <div className="question-game-selector" aria-label="Tournament question game">
                        {tournamentQuizTypes.map(type => <button key={type} type="button" className={currentQuizType === type ? "active" : ""} onClick={() => { setDraft({ ...draft, quizType: type }); setDifficultyFilter("all"); setQuestionPage(1); }}><span>{quizTypeIcons[type]}</span>{quizTypeLabels[type]}</button>)}
                    </div>
                    <div className="question-context-bar">
                        <strong>{quizTypeIcons[currentQuizType]} {quizTypeLabels[currentQuizType]}</strong>
                        <span>Shared bank — these questions are reused by every {quizTypeLabels[currentQuizType]} tournament. No need to re-add them per tournament.</span>
                        <button type="button" disabled={saving} onClick={saveTournament}><Save size={15} /> {saving ? "Saving..." : "Save Game"}</button>
                    </div>
                    <div className="csv-upload-card">
                        <div><h3><FileUp size={18} /> CSV Upload Questions</h3><p>Upload a CSV for {quizTypeLabels[currentQuizType]} with columns: <code>category</code>, <code>question</code>, <code>answerA</code>, <code>answerB</code>, <code>answerC</code>, <code>answerD</code>, <code>correctAnswer</code>, <code>difficulty</code>, <code>visual</code>, <code>visualImageUrl</code>. Difficulty can be easy, medium, or hard.</p></div>
                        <label className="csv-drop-zone">
                            <input type="file" accept=".csv,text/csv" disabled={bulkImporting || !selectedId} onChange={event => { importCsvFile(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
                            <span>{bulkImporting ? "Importing..." : "Choose CSV file"}</span>
                            <small>{selectedGameQuestions.length} saved. Up to 15 are shuffled into each play.</small>
                        </label>
                        <a href={csvTemplateHref} download={`tournament_${currentQuizType}_questions_template.csv`}>Download CSV template</a>
                    </div>
                    <div className="tournament-question-admin-grid">
                        <div className="question-form-admin">
                            <label>Quiz Game<select value={currentQuizType} onChange={e => setDraft({ ...draft, quizType: e.target.value as TournamentQuizType })}>{tournamentQuizTypes.map(type => <option key={type} value={type}>{quizTypeLabels[type]}</option>)}</select></label>
                            <label>Difficulty<select value={questionDraft.difficulty || "easy"} onChange={e => setQuestionDraft({ ...questionDraft, difficulty: e.target.value as TournamentDifficulty })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
                            {logoQuestionGame && <label className="wide">Visual label, optional<input value={String(questionDraft.visual || "")} onChange={e => setQuestionDraft({ ...questionDraft, visual: e.target.value })} placeholder="Visual label, optional" /></label>}
                            {logoQuestionGame && <label className="wide image-drop-label">Logo image
                                <div className={draggingImage ? "question-image-drop dragging" : "question-image-drop"}
                                    onDragOver={event => { event.preventDefault(); setDraggingImage(true); }}
                                    onDragLeave={() => setDraggingImage(false)}
                                    onDrop={event => { event.preventDefault(); setDraggingImage(false); setSelectedImage(event.dataTransfer.files?.[0] ?? null); }}>
                                    <input type="file" accept="image/*" onChange={event => setSelectedImage(event.target.files?.[0] ?? null)} />
                                    {imagePreview ? <img src={imagePreview} alt="Logo preview" /> : <div><strong>Drag and drop image here</strong><span>or click to browse</span></div>}
                                </div>
                            </label>}
                            <label className="wide">Question<textarea value={questionDraft.question} onChange={e => setQuestionDraft({ ...questionDraft, question: e.target.value })} placeholder={`Enter ${quizTypeLabels[currentQuizType]} question`} /></label>
                            {questionDraft.options.map((option, index) => <label key={index}>Answer {String.fromCharCode(65 + index)}<input value={option} onChange={e => updateQuestionOption(index, e.target.value)} placeholder={`Answer ${String.fromCharCode(65 + index)}`} /></label>)}
                            <label>Correct Answer<select value={questionDraft.answer} onChange={e => setQuestionDraft({ ...questionDraft, answer: Number(e.target.value) })}>{questionDraft.options.map((_option, index) => <option key={index} value={index}>Answer {String.fromCharCode(65 + index)}</option>)}</select></label>
                            <button type="button" disabled={!selectedId || uploadingQuestion} onClick={saveQuestion}><Plus size={15} /> {uploadingQuestion ? "Saving..." : editingQuestionId ? `Save Changes` : `Add ${quizTypeLabels[currentQuizType]} Question`}</button>
                            {editingQuestionId && <button type="button" className="secondary" onClick={() => { setQuestionDraft({...blankQuestion, difficulty: "easy"}); setImageFile(null); setImagePreview(""); setEditingQuestionId(null); }}>Cancel Edit</button>}
                        </div>
                        <div className="question-bank-admin">
                            <div className="question-bank-head">
                                <div><h3>{quizTypeLabels[currentQuizType]} Question Bank</h3><p>{selectedGameQuestions.length} total questions. {duplicateDocIds.size ? duplicateDocIds.size + " duplicate" + (duplicateDocIds.size === 1 ? "" : "s") + " found." : "No duplicates found."}</p></div>
                                <div><button type="button" className="delete-all-btn" disabled={!selectedGameQuestions.length} onClick={() => setShowDeleteAllModal(true)}>Delete All in Category</button><button type="button" className="delete-dupes-btn" disabled={!duplicateDocIds.size} onClick={deleteDuplicateQuestions}>Delete All Duplicates</button></div>
                            </div>
                            <div className="question-bank-filters">
                                {(["all", "easy", "medium", "hard", "duplicates"] as Array<"all" | TournamentDifficulty | "duplicates">).map(filter => <button key={filter} type="button" className={difficultyFilter === filter ? "active" : ""} onClick={() => { setDifficultyFilter(filter); setQuestionPage(1); }}>{filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)} ({levelCounts[filter]})</button>)}
                            </div>
                            <div className="question-table-wrap">
                                <table className="question-table">
                                    <thead><tr><th>#</th><th>Question</th><th>Options</th><th>Correct</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {pagedQuestions.length ? pagedQuestions.map((question, index) => {
                                            const globalIndex = (questionPage - 1) * PAGE_SIZE + index + 1;
                                            const correctLetter = String.fromCharCode(65 + question.answer);
                                            return <tr key={question.id}>
                                                <td className="qt-num">{globalIndex}</td>
                                                <td className="qt-question">{question.question}{question.visualImageUrl && <img src={question.visualImageUrl} alt={question.visual || ""} className="qt-img" />}</td>
                                                <td className="qt-options">{question.options.map((opt, i) => <span key={i} className={i === question.answer ? "qt-correct-opt" : ""}>{String.fromCharCode(65 + i)}. {opt}</span>)}</td>
                                                <td className="qt-correct">{correctLetter}</td>
                                                <td className="qt-category">{question.quizType ? quizTypeLabels[normalizeTournamentQuizType(question.quizType)] : "—"}</td>
                                                <td><span className="qt-status">active</span></td>
                                                <td className="qt-actions"><button type="button" className="qt-edit-btn" onClick={() => { setQuestionDraft({ question: question.question, options: question.options, answer: question.answer, difficulty: question.difficulty || "easy", visual: question.visual || "", visualImageUrl: question.visualImageUrl || "" }); setImagePreview(question.visualImageUrl || ""); setImageFile(null); setEditingQuestionId(question.id); }}>Edit</button><button type="button" className="qt-del-btn" onClick={() => removeQuestion(question)}>Del</button></td>
                                            </tr>;
                                        }) : <tr><td colSpan={7} className="admin-empty-row">No questions match this filter.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            {visibleQuestions.length > 0 && <div className="question-pagination">
                                <button disabled={questionPage <= 1} onClick={() => setQuestionPage(p => p - 1)}>← Prev</button>
                                <span>Page {questionPage} of {totalPages} · {visibleQuestions.length} questions</span>
                                <button disabled={questionPage >= totalPages} onClick={() => setQuestionPage(p => p + 1)}>Next →</button>
                            </div>}
                        </div>
                    </div>
                </div>
            </section>}

            {activeTab === "rewards" && <section className="adm-tournament-tab-panel">
                <div className="adm-tournament-card settings-card">
                    <div className="adm-tournament-card-head"><h2>Rewards</h2><div><button type="button" className="secondary" onClick={addReward}><Gift size={15} /> Add Reward</button><button disabled={saving} onClick={saveTournament}><Save size={15} /> {saving ? "Saving..." : "Save Rewards"}</button></div></div>
                    <div className="reward-edit-grid">
                        {draft.rewards.map((reward, index) => <div key={index}><button type="button" className="remove-reward" onClick={() => removeReward(index)}>Remove</button><label>Rank<input value={reward.rank} onChange={e => updateReward(index, "rank", e.target.value)} /></label><label>Pack Title<input value={reward.title} onChange={e => updateReward(index, "title", e.target.value)} /></label><label>Items<textarea value={reward.items.join("\n")} onChange={e => updateReward(index, "items", e.target.value)} /></label></div>)}
                    </div>
                </div>
            </section>}
        </div>
    );
}
