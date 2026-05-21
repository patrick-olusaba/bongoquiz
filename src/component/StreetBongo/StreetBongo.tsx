import {useEffect, useMemo, useRef, useState} from "react";
import confetti from "canvas-confetti";
import {addDoc, collection, getDocs, serverTimestamp} from "firebase/firestore";
import {ArrowLeft, Check, ChevronRight, RotateCw, Square, Volume2, X} from "lucide-react";
import {db} from "../../firebase";
import correctSfx from "../../assets/sounds/correct.mp3";
import wrongSfx from "../../assets/sounds/wrong.mp3";
import victorySfx from "../../assets/sounds/victory.mp3";
import "./StreetBongo.css";
import {
    DEFAULT_STREET_BONGO_QUESTIONS,
    STREET_BONGO_CATEGORIES,
    StreetBongoCategory,
    StreetBongoDifficulty,
    StreetBongoQuestion,
} from "./streetBongoQuestions";

type Phase = "start" | "category" | "level" | "question" | "result";
type AnswerResult = "correct" | "wrong";

interface SessionAnswer {
    questionId: string;
    prompt: string;
    category: string;
    difficulty: string;
    answer: string;
    result: AnswerResult;
}

const playSound = (src: string) => {
    const audio = new Audio(src);
    audio.volume = 0.85;
    audio.play().catch(() => {});
};

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const STREET_BONGO_LEVELS: Array<{id: StreetBongoDifficulty; label: string; description: string}> = [
    {id: "easy", label: "Easy", description: "Warm-up questions"},
    {id: "medium", label: "Medium", description: "Balanced street challenge"},
    {id: "hard", label: "Hard", description: "Tough questions"},
];

export default function StreetBongo() {
    const [phase, setPhase] = useState<Phase>("start");
    const [category, setCategory] = useState<StreetBongoCategory>("general");
    const [difficulty, setDifficulty] = useState<StreetBongoDifficulty>("easy");
    const [questions, setQuestions] = useState<StreetBongoQuestion[]>([]);
    const [questionBank, setQuestionBank] = useState<StreetBongoQuestion[]>(DEFAULT_STREET_BONGO_QUESTIONS);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<SessionAnswer[]>([]);
    const [answerVisible, setAnswerVisible] = useState(false);
    const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
    const [saving, setSaving] = useState(false);
    const sessionSavedRef = useRef(false);

    const correctCount = answers.filter(a => a.result === "correct").length;
    const wrongCount = answers.filter(a => a.result === "wrong").length;
    const currentQuestion = questions.length > 0 ? questions[index % questions.length] : undefined;
    const selectedCategory = STREET_BONGO_CATEGORIES.find(c => c.id === category) ?? STREET_BONGO_CATEGORIES[0];
    const selectedLevel = STREET_BONGO_LEVELS.find(level => level.id === difficulty) ?? STREET_BONGO_LEVELS[0];
    const hasWon = correctCount >= 10;
    const questionNumber = questions.length > 0 ? (index % questions.length) + 1 : 0;

    const recentResults = useMemo(() => {
        return answers.slice(-5).map(answer => answer.result);
    }, [answers]);

    const fetchQuestionBank = async () => {
        const snap = await getDocs(collection(db, "streetBongoQuestions"));
        const remote = snap.docs.map(d => {
            const data = d.data() as StreetBongoQuestion;
            return {...data, id: data.id || d.id};
        });
        setQuestionBank(remote);
        return remote;
    };

    useEffect(() => {
        fetchQuestionBank().catch(() => setQuestionBank(DEFAULT_STREET_BONGO_QUESTIONS));
    }, []);

    const buildQuestionLoop = (pool: StreetBongoQuestion[], nextCategory: StreetBongoCategory, nextDifficulty: StreetBongoDifficulty) => {
        const storageKey = "street_bongo_recent_" + nextCategory + "_" + nextDifficulty;
        const recent = JSON.parse(localStorage.getItem(storageKey) || "[]") as string[];
        const fresh = pool.filter(q => !recent.includes(q.id));
        const repeated = pool.filter(q => recent.includes(q.id));
        const selected = [...shuffle(fresh), ...shuffle(repeated)];
        localStorage.setItem(storageKey, JSON.stringify([...selected.map(q => q.id), ...recent].slice(0, 30)));
        return selected.length > 0 ? selected : shuffle(pool);
    };

    const chooseCategory = (nextCategory: StreetBongoCategory) => {
        setCategory(nextCategory);
        setDifficulty("easy");
        setPhase("level");
    };

    const startChallenge = async (nextDifficulty: StreetBongoDifficulty) => {
        const latestQuestions = await fetchQuestionBank().catch(() => questionBank);
        const pool = latestQuestions.filter(q => {
            const matchesCategory = category === "random" ? true : q.category === category;
            return matchesCategory && (q.difficulty ?? "easy") === nextDifficulty;
        });
        if (pool.length < 1) {
            alert("Add at least 1 " + nextDifficulty + " Street Bongo question in this category before starting.");
            return;
        }
        setDifficulty(nextDifficulty);
        setQuestions(buildQuestionLoop(pool, category, nextDifficulty));
        setIndex(0);
        setAnswers([]);
        sessionSavedRef.current = false;
        setAnswerVisible(false);
        setLastResult(null);
        setPhase("question");
    };
    const saveSession = async (finalAnswers: SessionAnswer[]) => {
        if (sessionSavedRef.current) return;
        sessionSavedRef.current = true;
        const won = finalAnswers.filter(a => a.result === "correct").length >= 10;
        setSaving(true);
        try {
            await addDoc(collection(db, "streetBongoSessions"), {
                category,
                categoryLabel: selectedCategory.label,
                difficulty,
                difficultyLabel: selectedLevel.label,
                correct: finalAnswers.filter(a => a.result === "correct").length,
                wrong: finalAnswers.filter(a => a.result === "wrong").length,
                won,
                prize: won ? {meal: "Chicken Meal", drink: "Soda"} : null,
                mealsGiven: won ? 1 : 0,
                answers: finalAnswers,
                stoppedByHost: true,
                playedAt: serverTimestamp(),
            });
        } catch (error) {
            console.warn("Street Bongo session was not saved", error);
        } finally {
            setSaving(false);
        }
    };

    const markAnswer = (result: AnswerResult) => {
        if (!currentQuestion || lastResult) return;
        const nextAnswers = [
            ...answers,
            {
                questionId: currentQuestion.id,
                prompt: currentQuestion.prompt,
                category: currentQuestion.category,
                difficulty: currentQuestion.difficulty ?? "easy",
                answer: currentQuestion.answer,
                result,
            },
        ];
        setAnswers(nextAnswers);
        setLastResult(result);
        setAnswerVisible(true);
        playSound(result === "correct" ? correctSfx : wrongSfx);

        const nextCorrect = nextAnswers.filter(a => a.result === "correct").length;
        window.setTimeout(() => {
            if (nextCorrect >= 10 && correctCount < 10) {
                playSound(victorySfx);
                confetti({particleCount: 160, spread: 80, origin: {y: 0.62}});
            }
            setIndex(i => questions.length > 0 ? (i + 1) % questions.length : 0);
            setAnswerVisible(false);
            setLastResult(null);
        }, 650);
    };

    const stopChallenge = () => {
        if (hasWon) {
            playSound(victorySfx);
            confetti({particleCount: 160, spread: 80, origin: {y: 0.62}});
        }
        setPhase("result");
        saveSession(answers);
    };

    const nextContestant = () => {
        setPhase("category");
        setDifficulty("easy");
        setQuestions([]);
        setIndex(0);
        setAnswers([]);
        sessionSavedRef.current = false;
        setAnswerVisible(false);
        setLastResult(null);
    };

    if (phase === "start") {
        return (
            <main className="street-bongo">
                <button className="sb-back" onClick={() => window.location.href = "/"}><ArrowLeft size={18}/> Back</button>
                <section className="sb-start">
                    <div className="sb-start-copy">
                        <span className="sb-kicker">Street game format</span>
                        <h1>Bongo Street Challenge</h1>
                        <div className="sb-prize">🍗 Free Chicken Meal + 🥤 Soda</div>
                        <ul className="sb-rules">
                            <li><Check size={18}/> Questions loop inside the chosen category</li>
                            <li><Check size={18}/> Host chooses when to stop</li>
                            <li><Check size={18}/> No help from friends</li>
                        </ul>
                        <button className="sb-primary" onClick={() => setPhase("category")}>
                            Start Game <ChevronRight size={20}/>
                        </button>
                    </div>
                    <div className="sb-stage" aria-hidden="true">
                        <div className="sb-mic">🎤</div>
                        <div className="sb-score-pill">Host stops the challenge</div>
                    </div>
                </section>
            </main>
        );
    }

    if (phase === "category") {
        return (
            <main className="street-bongo">
                <button className="sb-back" onClick={() => setPhase("start")}><ArrowLeft size={18}/> Back</button>
                <section className="sb-panel sb-select-panel">
                    <span className="sb-kicker">Host setup</span>
                    <h1>Choose Challenge</h1>
                    <div className="sb-category-grid sb-game-grid">
                        {STREET_BONGO_CATEGORIES.map(cat => (
                            <button className="sb-category" key={cat.id} onClick={() => chooseCategory(cat.id)}>
                                <span>{cat.icon}</span>
                                <strong>{cat.label}</strong>
                                <small>{cat.description}</small>
                            </button>
                        ))}
                    </div>
                </section>
            </main>
        );
    }

    if (phase === "level") {
        return (
            <main className="street-bongo">
                <button className="sb-back" onClick={() => setPhase("category")}><ArrowLeft size={18}/> Categories</button>
                <section className="sb-panel sb-select-panel">
                    <span className="sb-kicker">{selectedCategory.icon} {selectedCategory.label}</span>
                    <h1>Choose Level</h1>
                    <div className="sb-category-grid sb-level-grid">
                        {STREET_BONGO_LEVELS.map(level => (
                            <button className="sb-category sb-level-card" key={level.id} onClick={() => startChallenge(level.id)}>
                                <span>{level.id === "easy" ? "1" : level.id === "medium" ? "2" : "3"}</span>
                                <strong>{level.label}</strong>
                                <small>{level.description}</small>
                            </button>
                        ))}
                    </div>
                </section>
            </main>
        );
    }

    if (phase === "result") {
        return (
            <main className={`street-bongo ${hasWon ? "winner" : "loser"}`}>
                <section className="sb-result">
                    <div className="sb-result-icon">{hasWon ? "🎉" : "😅"}</div>
                    <h1>{hasWon ? "CONGRATULATIONS!" : "Almost!"}</h1>
                    <p>You answered {correctCount} correctly out of {answers.length} questions.</p>
                    {hasWon ? (
                        <div className="sb-prize-card">
                            <span>Prize Won</span>
                            <strong>🍗 Chicken Meal</strong>
                            <strong>🥤 Soda</strong>
                        </div>
                    ) : (
                        <div className="sb-prize-card muted">Try again next time!</div>
                    )}
                    <div className="sb-actions">
                        <button className="sb-primary" onClick={nextContestant}><RotateCw size={18}/> Next Contestant</button>
                    </div>
                    {saving && <span className="sb-saving">Saving session...</span>}
                </section>
            </main>
        );
    }

    return (
        <main className="street-bongo">
            <button className="sb-back" onClick={() => setPhase("level")}><ArrowLeft size={18}/> Level</button>
            <section className="sb-question-shell">
                <div className="sb-question-top">
                    <div>
                        <span className="sb-kicker">Question {questionNumber} of {questions.length} · {answers.length} answered</span>
                        <h1>{selectedCategory.icon} {selectedCategory.label}</h1>
                        <div className="sb-question-level">{selectedLevel.label}</div>
                    </div>
                    <div className="sb-score">
                        <span>✅ Correct: {correctCount}</span>
                        <span>❌ Wrong: {wrongCount}</span>
                    </div>
                </div>

                <div className="sb-progress" aria-label="Challenge progress">
                    {recentResults.map((dot, i) => (
                        <span key={i} className={`sb-dot ${dot}`}>{dot === "correct" ? "✓" : dot === "wrong" ? "×" : ""}</span>
                    ))}
                    <strong>{selectedLevel.label} questions</strong>
                </div>

                {currentQuestion && (
                    <div className={`sb-question-card ${lastResult ?? ""}`}>
                        {currentQuestion.visualImageUrl ? (
                            <div className="sb-visual image"><img src={currentQuestion.visualImageUrl} alt={currentQuestion.visual || "Question visual"}/></div>
                        ) : currentQuestion.visual && <div className="sb-visual">{currentQuestion.visual}</div>}
                        <div className="sb-level">{currentQuestion.difficulty ?? "easy"}</div>
                        <h2>{currentQuestion.prompt}</h2>
                        {answerVisible && (
                            <div className="sb-answer">
                                <Volume2 size={18}/>
                                Answer: <strong>{currentQuestion.answer}</strong>
                            </div>
                        )}
                    </div>
                )}

                <div className="sb-host-controls">
                    <button className="sb-secondary" onClick={() => setAnswerVisible(v => !v)}>{answerVisible ? "Hide Answer" : "Show Answer"}</button>
                    <button className="sb-correct" onClick={() => markAnswer("correct")} disabled={!!lastResult}>
                        <Check size={18}/> Correct
                    </button>
                    <button className="sb-wrong" onClick={() => markAnswer("wrong")} disabled={!!lastResult}>
                        <X size={18}/> Wrong
                    </button>
                    <button className="sb-stop" onClick={stopChallenge} disabled={!!lastResult && answerVisible}>
                        <Square size={18}/> Stop Challenge
                    </button>
                </div>
            </section>
        </main>
    );
}
