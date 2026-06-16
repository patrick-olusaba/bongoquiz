export type TournamentQuizType = "generalKnowledge" | "sports" | "carLogos" | "brandLogos" | "trickQuestions" | "kenyaTrivia";

export type TournamentReward = {
    rank: string;
    title: string;
    items: string[];
};

export type QuizTournament = {
    id: string;
    title: string;
    subtitle: string;
    quizType: TournamentQuizType;
    status: "active" | "scheduled" | "completed";
    active: boolean;
    entryFeeCoins: number;
    durationSeconds?: number;
    dailyStartTime?: string;
    tournamentCycle?: "daily" | "weekly";
    startsAt?: any;
    endsAt?: any;
    rewards: TournamentReward[];
    createdAt?: any;
    updatedAt?: any;
};

export type TournamentQuestion = {
    id: string;
    question: string;
    options: string[];
    answer: number;
    quizType?: TournamentQuizType;
    difficulty?: "easy" | "medium" | "hard";
    visual?: string | null;
    visualImageUrl?: string | null;
    active?: boolean;
    order?: number;
    createdAt?: any;
    updatedAt?: any;
};

export type TournamentEntry = {
    id: string;
    name: string;
    phone: string;
    points: number;
    quizPoints?: number;
    perfectBonus?: number;
    streakBonus?: number;
    participationBonus?: number;
    sessions?: number;
    correct?: number;
    wrong?: number;
    totalQuestions?: number;
    createdAt?: any;
    updatedAt?: any;
};

export const quizTypeLabels: Record<TournamentQuizType, string> = {
    generalKnowledge: "General Knowledge",
    sports: "Sports",
    carLogos: "Car Logos",
    brandLogos: "Brand Logos",
    trickQuestions: "Trick Questions",
    kenyaTrivia: "Kenya Trivia",
};

export const quizTypeIcons: Record<TournamentQuizType, string> = {
    generalKnowledge: "🧠",
    sports: "⚽",
    carLogos: "🚗",
    brandLogos: "🏷️",
    trickQuestions: "😂",
    kenyaTrivia: "🇰🇪",
};

export const tournamentQuizTypes = Object.keys(quizTypeLabels) as TournamentQuizType[];

// Shared, global question bank — questions are keyed by `quizType` and reused
// across every tournament of that game type (no more per-tournament silos).
export const TOURNAMENT_QUESTION_BANK = "tournamentQuestionBank";

export function normalizeTournamentQuizType(value: unknown): TournamentQuizType {
    return tournamentQuizTypes.includes(value as TournamentQuizType) ? value as TournamentQuizType : "generalKnowledge";
}

export const defaultTournamentRewards: TournamentReward[] = [
    { rank: "1st Place", title: "Champion Pack", items: ["2,000 Coins", "Exclusive Shirt", "Winner Badge"] },
    { rank: "2nd Place", title: "Silver Pack", items: ["1,000 Coins", "Exclusive Shirt", "Silver Medal"] },
    { rank: "3rd Place", title: "Bronze Pack", items: ["500 Coins", "Exclusive Shirt", "Bronze Medal"] },
    { rank: "Top 10", title: "Community Recognition", items: ["Badge", "200 Coins"] },
];

export function emptyTournament(): Omit<QuizTournament, "id"> {
    return {
        title: "Weekly BongoQuiz Cup",
        subtitle: "Answer the tournament questions and climb the leaderboard.",
        quizType: "generalKnowledge",
        status: "active",
        active: true,
        entryFeeCoins: 0,
        durationSeconds: 80,
        dailyStartTime: "08:00",
        tournamentCycle: "daily",
        rewards: defaultTournamentRewards,
    };
}

export function toDate(value: any): Date | null {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
    if (typeof value === "string") {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
}

export function dateInputValue(value: any) {
    const date = toDate(value);
    if (!date) return "";
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function countdownParts(end: Date | null) {
    if (!end) return { days: "--", hours: "--", minutes: "--", seconds: "--" };
    const diff = Math.max(end.getTime() - Date.now(), 0);
    return {
        days: String(Math.floor(diff / 86400000)).padStart(2, "0"),
        hours: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0"),
        minutes: String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0"),
        seconds: String(Math.floor((diff % 60000) / 1000)).padStart(2, "0"),
    };
}

export function initials(name = "Player") {
    return name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "BQ";
}

// ─── In-progress tournament session (survives a page refresh) ───────────────────
// Persisted while a player is mid-quiz so a refresh can resume in place instead of
// dropping back to home. Cleared on submit (success or failure) or when abandoned.
export interface ActiveTournamentSession {
    tournament: QuizTournament;        // restores activeTournament + props on reload
    questions: TournamentQuestion[];   // finalized shuffled+sliced set — locks order
    answers: Record<string, number>;   // answers chosen so far (keyed by question id)
    currentIndex: number;              // which question the player is on
    deadline: number;                  // epoch ms when the timer hits 0 (0 = not started)
}

const ACTIVE_TOURNAMENT_SESSION_KEY = "bongo_active_tournament_session";

export function readActiveTournamentSession(): ActiveTournamentSession | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(ACTIVE_TOURNAMENT_SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ActiveTournamentSession;
        if (!parsed || typeof parsed !== "object" || !parsed.tournament?.id) return null;
        return {
            tournament: parsed.tournament,
            questions: Array.isArray(parsed.questions) ? parsed.questions : [],
            answers: parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {},
            currentIndex: Number.isInteger(parsed.currentIndex) ? parsed.currentIndex : 0,
            deadline: typeof parsed.deadline === "number" ? parsed.deadline : 0,
        };
    } catch {
        return null;
    }
}

export function writeActiveTournamentSession(session: ActiveTournamentSession): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(ACTIVE_TOURNAMENT_SESSION_KEY, JSON.stringify(session));
    } catch {
        // ignore quota / serialization errors
    }
}

export function patchActiveTournamentSession(patch: Partial<ActiveTournamentSession>): void {
    const current = readActiveTournamentSession();
    if (!current) return;
    writeActiveTournamentSession({ ...current, ...patch });
}

export function clearActiveTournamentSession(): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(ACTIVE_TOURNAMENT_SESSION_KEY);
        // Drop the obsolete breadcrumb keys that were written on join but never read.
        window.localStorage.removeItem("bongo_active_tournament_id");
        window.localStorage.removeItem("bongo_active_tournament_quiz");
    } catch {
        // ignore
    }
}
