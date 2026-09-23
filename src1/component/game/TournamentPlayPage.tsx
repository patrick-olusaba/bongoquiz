import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, limit, onSnapshot, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ArrowLeft, ArrowRight, Clock3, Heart, Lightbulb, LogOut, SkipForward, Star, Trophy } from "lucide-react";
import { db } from "../../firebase.ts";
import { DesktopSidebar, type SidebarKey } from "./DesktopSidebar.tsx";
import { clearActiveTournamentSession, normalizeTournamentQuizType, patchActiveTournamentSession, quizTypeIcons, quizTypeLabels, readActiveTournamentSession, TOURNAMENT_QUESTION_BANK, writeActiveTournamentSession, type QuizTournament, type TournamentQuestion, type TournamentQuizType } from "../../utils/tournaments.ts";
import "../../styles/TournamentPlayPage.css";

interface Props {
    tournament: QuizTournament;
    onBack: () => void;
    onDone: () => void;
    onNavigate?: (key: SidebarKey) => void;
}

const DURATION_SECONDS = 80;
const POINTS_PER_CORRECT = 10;
const MAX_SKIPS = 3;

function shuffleQuestions<T>(items: T[]) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
}

const fallbackQuestionCollections: Partial<Record<TournamentQuizType, string[]>> = {
    generalKnowledge: ["generalKnowledgeQuestions", "genQuizQuestions"],
};

function questionFromBank(collectionName: string, id: string, data: any, quizType: TournamentQuizType): TournamentQuestion | null {
    const question = String(data.question || data.q || "").trim();
    const options = Array.isArray(data.options) ? data.options.map((option: unknown) => String(option).trim()).filter(Boolean) : [];
    const answer = Number(data.answer ?? data.correctAnswer ?? data.correct ?? 0);
    if (!question || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
    return {
        id: collectionName + ":" + id,
        question, options, answer,
        active: data.active !== false,
        quizType,
        difficulty: data.difficulty || "easy",
        visual: data.category || data.visual || quizTypeLabels[quizType],
        visualImageUrl: data.visualImageUrl || data.imageUrl || null,
    };
}

async function loadFallbackQuestions(quizType: TournamentQuizType) {
    const collectionNames = fallbackQuestionCollections[quizType] || [];
    for (const collectionName of collectionNames) {
        const snap = await getDocs(query(collection(db, collectionName), limit(100)));
        const rows = snap.docs
            .map(docSnap => questionFromBank(collectionName, docSnap.id, docSnap.data(), quizType))
            .filter((question): question is TournamentQuestion => Boolean(question && question.active !== false));
        if (rows.length) return rows;
    }
    return [];
}

export const TournamentPlayPage: FC<Props> = ({ tournament, onBack, onDone, onNavigate }) => {
    const tournamentQuizType = normalizeTournamentQuizType(tournament.quizType);
    const durationSeconds = tournament.durationSeconds || DURATION_SECONDS;
    const savedSession = useMemo(() => {
        const saved = readActiveTournamentSession();
        return saved && saved.tournament.id === tournament.id && saved.questions.length > 0 ? saved : null;
    }, [tournament.id]);
    const resuming = !!savedSession;
    const [questions, setQuestions] = useState<TournamentQuestion[]>(() => savedSession?.questions ?? []);
    const [answers, setAnswers] = useState<Record<string, number>>(() => savedSession?.answers ?? {});
    const [currentIndex, setCurrentIndex] = useState(() => savedSession?.currentIndex ?? 0);
    const [skipsLeft, setSkipsLeft] = useState(MAX_SKIPS);
    const deadlineRef = useRef<number>(savedSession?.deadline || 0);
    const submittingRef = useRef(false);
    const advanceLockRef = useRef(false); // ensures one advance per question
    const [secondsLeft, setSecondsLeft] = useState(() =>
        savedSession?.deadline ? Math.max(0, Math.round((savedSession.deadline - Date.now()) / 1000)) : durationSeconds
    );
    const [submitted, setSubmitted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(null);
    const [error, setError] = useState("");

    const playerName = localStorage.getItem("bongo_player_name") || "Player";
    const totalPoints = parseInt(localStorage.getItem("bongo_total_points") ?? "0", 10) || 0;

    useEffect(() => {
        if (resuming) return;
        let cancelled = false;
        let started = false;
        const startSession = (finalized: TournamentQuestion[]) => {
            if (cancelled || started) return;
            started = true;
            setQuestions(finalized);
            const existing = readActiveTournamentSession();
            const deadline = existing?.deadline || Date.now() + durationSeconds * 1000;
            deadlineRef.current = deadline;
            writeActiveTournamentSession({ tournament, questions: finalized, answers: {}, currentIndex: 0, deadline });
        };
        const q = query(collection(db, TOURNAMENT_QUESTION_BANK), where("quizType", "==", tournamentQuizType), limit(200));
        const unsubscribe = onSnapshot(q, async snap => {
            const pool = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as TournamentQuestion))
                .filter(question => question.active !== false && Array.isArray(question.options));
            const fallbackPool = pool.length ? [] : await loadFallbackQuestions(tournamentQuizType).catch(() => []);
            startSession(shuffleQuestions(pool.length ? pool : fallbackPool).slice(0, 15));
        }, async () => {
            const fallbackPool = await loadFallbackQuestions(tournamentQuizType).catch(() => []);
            startSession(shuffleQuestions(fallbackPool).slice(0, 15));
        });
        return () => { cancelled = true; unsubscribe(); };
    }, [tournament, tournamentQuizType, resuming, durationSeconds]);

    // Preload every question's logo/visual image up front so they appear
    // instantly when each question shows — no mid-question loading flash on the
    // timed quiz (matters most for Car Logos / Brand Logos where the image IS
    // the question).
    useEffect(() => {
        questions.forEach(question => {
            if (question.visualImageUrl) {
                const img = new Image();
                img.decoding = "async";
                img.src = question.visualImageUrl;
            }
        });
    }, [questions]);

    useEffect(() => {
        if (submitted) return;
        const tick = () => {
            const deadline = deadlineRef.current;
            if (!deadline) return;
            setSecondsLeft(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
        };
        tick();
        const timer = window.setInterval(tick, 500);
        return () => window.clearInterval(timer);
    }, [submitted]);

    const currentQuestion = questions[currentIndex];
    const answeredCount = Object.keys(answers).length;
    const correctCount = questions.reduce((sum, q) => sum + (answers[q.id] === q.answer ? 1 : 0), 0);
    const wrongCount = answeredCount - correctCount;
    const currentScore = (correctCount * POINTS_PER_CORRECT) - (wrongCount * 2);
    const localResult = useMemo(() => {
        const correct = questions.reduce((sum, q) => sum + (answers[q.id] === q.answer ? 1 : 0), 0);
        const answered = Object.keys(answers).length;
        const wrong = answered - correct;
        return { correct, wrong, unanswered: questions.length - answered, total: questions.length, score: (correct * POINTS_PER_CORRECT) - (wrong * 2) };
    }, [answers, questions]);

    const timerProgress = Math.max(0, Math.min(1, secondsLeft / durationSeconds));
    const timerStyle = { "--timer-progress": String(timerProgress * 360) + "deg" } as React.CSSProperties;
    const categoryName = currentQuestion?.visual || quizTypeLabels[tournamentQuizType];
    const isLogoQuiz = tournamentQuizType === "carLogos" || tournamentQuizType === "brandLogos";
    const chipLabel = isLogoQuiz ? "Identify the Logo" : categoryName;

    const answeredIndex = currentQuestion ? answers[currentQuestion.id] : undefined;
    const isAnswered = answeredIndex !== undefined;
    const isLast = currentIndex >= questions.length - 1;

    useEffect(() => {
        if (secondsLeft === 0 && !submitted && questions.length) submitAnswers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [secondsLeft, submitted, questions.length]);

    const submitAnswers = async (answersOverride?: Record<string, number>) => {
        if (submitted || submittingRef.current || !questions.length) return;
        submittingRef.current = true;
        setSaving(true);
        setError("");
        try {
            const phone = localStorage.getItem("bongo_player_phone") || "";
            const name = localStorage.getItem("bongo_player_name") || "Player";
            const submit = httpsCallable(getFunctions(), "submitQuizTournamentAnswers");
            const response = await submit({ tournamentId: tournament.id, name, phone, answers: answersOverride || answers, questionIds: questions.map(q => q.id) });
            const data = response.data as { score?: number; correct?: number; total?: number };
            setResult({ score: Number(data.score ?? localResult.score), correct: Number(data.correct ?? localResult.correct), total: Number(data.total ?? localResult.total) });
            setSubmitted(true);
        } catch (err) {
            const fallbackAnswers = answersOverride || answers;
            const fallbackCorrect = questions.reduce((sum, q) => sum + (fallbackAnswers[q.id] === q.answer ? 1 : 0), 0);
            setResult({ correct: fallbackCorrect, total: questions.length, score: (fallbackCorrect * POINTS_PER_CORRECT) - ((questions.length - fallbackCorrect) * 2) });
            setSubmitted(true);
            const message = String((err as any)?.message || "");
            setError(message.toLowerCase().includes("already") ? "You have already played this tournament. You can join another tournament when it is available." : "Saved locally, but the leaderboard update failed. Try again from Community if needed.");
            console.error("submitQuizTournamentAnswers failed:", err);
        } finally {
            setSaving(false);
            clearActiveTournamentSession();
        }
    };

    // Re-arm the advance guard whenever we land on a new question.
    useEffect(() => { advanceLockRef.current = false; }, [currentIndex]);

    const advance = (nextAnswers: Record<string, number>) => {
        if (advanceLockRef.current) return; // already advancing this question
        advanceLockRef.current = true;
        if (isLast) { window.setTimeout(() => submitAnswers(nextAnswers), 60); return; }
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        patchActiveTournamentSession({ answers: nextAnswers, currentIndex: nextIndex });
    };

    // Select an answer — reveal correct/wrong briefly, then auto-advance.
    const chooseAnswer = (optionIndex: number) => {
        if (!currentQuestion || submitted || saving || isAnswered) return;
        const nextAnswers = { ...answers, [currentQuestion.id]: optionIndex };
        setAnswers(nextAnswers);
        patchActiveTournamentSession({ answers: nextAnswers, currentIndex });
        window.setTimeout(() => advance(nextAnswers), 850);
    };

    const nextQuestion = () => {
        if (!currentQuestion || saving || !isAnswered) return;
        advance(answers); // lets impatient players skip the reveal delay
    };

    const skipQuestion = () => {
        if (!currentQuestion || saving || isAnswered || skipsLeft <= 0) return;
        setSkipsLeft(s => s - 1);
        advance(answers);
    };

    const [questionsLoaded, setQuestionsLoaded] = useState(resuming);
    useEffect(() => { if (questions.length > 0) setQuestionsLoaded(true); }, [questions.length]);
    useEffect(() => {
        if (resuming && questions.length && Object.keys(answers).length >= questions.length) {
            const timer = window.setTimeout(() => submitAnswers(), 220);
            return () => window.clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const optionClass = (i: number) => {
        if (!isAnswered) return "";
        if (i === currentQuestion!.answer) return "correct";
        if (i === answeredIndex) return "wrong";
        return "dim";
    };

    const playersCount = Math.max(Number((tournament as { entriesCount?: number }).entriesCount) || 0, 0);
    const sidebar = <DesktopSidebar active="tournaments" onNavigate={k => onNavigate?.(k)} playerName={playerName} points={totalPoints} />;

    return (
        <div className="tp-root">
            {sidebar}

            <div className="tp-body">
                {submitted && result ? (
                    <main className="tp-center">
                        <div className="tp-result">
                            <div className="tp-result-trophy"><Trophy size={56} /></div>
                            <p className="tp-result-label">Your Score</p>
                            <div className="tp-result-score">{result.score.toLocaleString()}</div>
                            <p className="tp-result-correct"><strong>{result.correct}</strong> of {result.total} correct</p>
                            <div className="tp-result-breakdown">
                                <div><strong className="green">{localResult.correct}</strong><span>Correct</span></div>
                                <div><strong className="red">{localResult.wrong}</strong><span>Wrong</span></div>
                                <div><strong>{localResult.unanswered}</strong><span>Skipped</span></div>
                            </div>
                            {error && <div className="tp-result-error">{error}</div>}
                            <div className="tp-result-actions">
                                <button className="tp-btn-primary" onClick={onDone}>View Leaderboard</button>
                                <button className="tp-btn-ghost" onClick={onBack}>Back to Tournaments</button>
                            </div>
                        </div>
                    </main>
                ) : !questionsLoaded ? (
                    <main className="tp-center"><div className="tp-spinner" /><strong>Loading Questions…</strong><span className="tp-muted">Fetching tournament questions</span></main>
                ) : !questions.length ? (
                    <main className="tp-center"><Trophy size={42} /><strong>No questions yet</strong><span className="tp-muted">An admin must add questions for this game before it can be played.</span><button className="tp-btn-ghost" onClick={onBack}>Back</button></main>
                ) : currentQuestion ? (
                    <>
                        {/* Desktop top bar */}
                        <header className="tp-topbar">
                            <button className="tp-back" onClick={onBack}><ArrowLeft size={18} /> Back to Tournament</button>
                            <div className="tp-topbar-title">
                                <Trophy size={20} />
                                <div><strong>{tournament.title}</strong><span>Entry Fee: FREE{playersCount ? ` · Players: ${playersCount}` : ""}</span></div>
                            </div>
                            <button className="tp-leave" onClick={onBack}>Leave Tournament <LogOut size={16} /></button>
                        </header>

                        {/* Mobile top bar */}
                        <header className="tp-mtop">
                            <button onClick={onBack} aria-label="Back"><ArrowLeft size={22} /></button>
                            <div className="tp-mtop-title"><span className="tp-cat-emoji">{quizTypeIcons[tournamentQuizType]}</span> {tournament.title}</div>
                            <div className={`tp-score-ring ${secondsLeft <= 15 ? "warn" : ""}`}>{Math.max(0, currentScore)}</div>
                        </header>

                        <div className="tp-stage">
                            <main className="tp-card">
                                <div className="tp-progress-row">
                                    <span className="tp-qcount">QUESTION <b>{currentIndex + 1}</b> OF {questions.length}</span>
                                    <div className="tp-dots">
                                        {questions.map((q, i) => (
                                            <span key={q.id} className={`tp-dot ${i < currentIndex ? "done" : ""} ${i === currentIndex ? "now" : ""} ${answers[q.id] !== undefined ? "answered" : ""}`} />
                                        ))}
                                    </div>
                                    <div className="tp-yourscore">
                                        <small>YOUR SCORE</small>
                                        <span className="tp-score-ring sm">{Math.max(0, currentScore)}</span>
                                    </div>
                                </div>

                                <div className="tp-question">
                                    <span className="tp-chip">📚 {chipLabel}</span>
                                    <h1>{currentQuestion.question}</h1>
                                    {currentQuestion.visualImageUrl && (
                                        <div className="tp-visual"><img src={currentQuestion.visualImageUrl} alt={currentQuestion.visual || currentQuestion.question} loading="eager" decoding="async" /></div>
                                    )}
                                    <p className="tp-hint"><Lightbulb size={15} /> Hint: {currentQuestion.difficulty === "hard" ? "Take your time on this one." : "Trust your first instinct."}</p>

                                    <div className="tp-options">
                                        {currentQuestion.options.map((option, optionIndex) => (
                                            <button
                                                key={`${currentQuestion.id}-${optionIndex}`}
                                                type="button"
                                                className={`tp-option ${optionIndex === answeredIndex ? "selected" : ""} ${optionClass(optionIndex)}`}
                                                onClick={() => chooseAnswer(optionIndex)}
                                                disabled={saving || isAnswered}
                                            >
                                                <span className="tp-radio" />
                                                <span className="tp-option-text">{option}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="tp-mobile-meta">
                                        <span>Your Score: {Math.max(0, currentScore)}</span>
                                        <span className="tp-muted">{answeredCount}/{questions.length} answered</span>
                                    </div>
                                </div>

                                <div className="tp-actions">
                                    <button className="tp-skip" onClick={skipQuestion} disabled={isAnswered || skipsLeft <= 0}>
                                        <SkipForward size={16} /> Skip Question
                                    </button>
                                    <button className="tp-next" onClick={nextQuestion} disabled={!isAnswered || saving}>
                                        {isLast ? "Finish" : "Next Question"} <ArrowRight size={16} />
                                    </button>
                                </div>
                            </main>

                            {/* Desktop right rail */}
                            <aside className="tp-rail">
                                <div className="tp-rail-block">
                                    <small>TIME LEFT</small>
                                    <div className={`tp-timer-ring ${secondsLeft <= 15 ? "urgent" : ""}`} style={timerStyle}>
                                        <b>{secondsLeft}</b><span>SEC</span>
                                    </div>
                                </div>
                                <div className="tp-rail-divider" />
                                <div className="tp-rail-block">
                                    <small>QUESTION POINTS</small>
                                    <div className="tp-points"><Star size={20} /> {POINTS_PER_CORRECT} pts</div>
                                </div>
                                <div className="tp-rail-divider" />
                                <div className="tp-rail-block">
                                    <small>LIFELINE</small>
                                    <div className="tp-lifeline"><Heart size={22} /> <b>{skipsLeft}</b></div>
                                    <span className="tp-muted">Use to skip a question</span>
                                </div>
                                <div className="tp-rail-tip">
                                    <strong><Lightbulb size={15} /> Tip</strong>
                                    <span>Each correct answer earns you more points!</span>
                                </div>
                            </aside>
                        </div>

                        {/* Mobile time chip */}
                        <div className={`tp-mtimer ${secondsLeft <= 15 ? "urgent" : ""}`}><Clock3 size={14} /> {secondsLeft}s left</div>
                    </>
                ) : null}
            </div>
        </div>
    );
};
