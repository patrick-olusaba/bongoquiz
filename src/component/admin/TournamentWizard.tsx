import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ArrowLeft, ArrowRight, Check, Gift, Medal, Minus, Plus, Search, Zap } from "lucide-react";
import { db } from "../../firebase.ts";
import {
    dateInputValue,
    defaultTournamentRewards,
    normalizeTournamentQuizType,
    quizTypeIcons,
    quizTypeLabels,
    tournamentQuizTypes,
    TOURNAMENT_QUESTION_BANK,
    type QuizTournament,
    type TournamentQuestion,
    type TournamentQuizType,
    type TournamentReward,
} from "../../utils/tournaments.ts";
import "../../styles/TournamentWizard.css";

export type WizardAction = "draft" | "schedule" | "publish";

export interface WizardResult {
    title: string;
    subtitle: string;
    quizType: TournamentQuizType;
    tournamentCycle: "daily" | "weekly";
    dailyStartTime: string;
    startsAt: string;
    endsAt: string;
    entryFeeCoins: number;
    active: boolean;
    rewards: TournamentReward[];
    questionIds: string[];
    id?: string;
    action: WizardAction;
}

interface Props {
    seed?: QuizTournament | null;
    onSave: (result: WizardResult) => Promise<void>;
    onClose: () => void;
    saving: boolean;
}

const STEPS = ["Details", "Questions", "Rewards"] as const;

function defaultEndsAt() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(20, 0, 0, 0);
    return dateInputValue(date.toISOString());
}

export function TournamentWizard({ seed, onSave, onClose, saving }: Props) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [error, setError] = useState("");
    const [tipMsg, setTipMsg] = useState("");

    // Step 1
    const [title, setTitle] = useState(seed?.title || "Weekly BongoQuiz Cup");
    const [subtitle, setSubtitle] = useState(seed?.subtitle || "Answer tournament questions and climb the leaderboard.");
    const [quizType, setQuizType] = useState<TournamentQuizType>(normalizeTournamentQuizType(seed?.quizType));
    const cycle = "weekly" as const;
    const dailyStartTime = seed?.dailyStartTime || "08:00";
    const [startsAt, setStartsAt] = useState(seed?.startsAt ? dateInputValue(seed.startsAt) : "");
    const [endsAt, setEndsAt] = useState(seed?.endsAt ? dateInputValue(seed.endsAt) : defaultEndsAt());
    const [active, setActive] = useState(seed ? seed.active : true);

    // Step 2
    const [bankQuestions, setBankQuestions] = useState<TournamentQuestion[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>(seed?.questionIds || []);
    const [questionSearch, setQuestionSearch] = useState("");
    const [diffFilter, setDiffFilter] = useState<"all" | "easy" | "medium" | "hard">("all");
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // Step 3
    const [rewards, setRewards] = useState<TournamentReward[]>(
        seed?.rewards?.length ? seed.rewards : defaultTournamentRewards
    );
    const [launchAction, setLaunchAction] = useState<"schedule" | "publish">("schedule");

    const dragIdx = useRef<number | null>(null);

    useEffect(() => {
        setLoadingQuestions(true);
        const q = query(collection(db, TOURNAMENT_QUESTION_BANK), where("quizType", "==", quizType));
        const unsub = onSnapshot(q, snap => {
            const rows = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as TournamentQuestion))
                .sort((a, b) => (Number((b as any).order) || 0) - (Number((a as any).order) || 0));
            setBankQuestions(rows);
            setLoadingQuestions(false);
        }, () => { setBankQuestions([]); setLoadingQuestions(false); });
        return unsub;
    }, [quizType]);

    const selectedQuestions = selectedIds
        .map(id => bankQuestions.find(q => q.id === id))
        .filter((q): q is TournamentQuestion => Boolean(q));

    const filteredBank = bankQuestions.filter(q => {
        const matchSearch = !questionSearch || q.question.toLowerCase().includes(questionSearch.toLowerCase());
        const matchDiff = diffFilter === "all" || (q.difficulty || "easy") === diffFilter;
        return matchSearch && matchDiff && !selectedIds.includes(q.id);
    });

    const toggleQuestion = (id: string) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const updateReward = (i: number, field: keyof TournamentReward, value: string) =>
        setRewards(prev => prev.map((r, idx) =>
            idx === i ? { ...r, [field]: field === "items" ? value.split("\n") : value } : r
        ));

    const handleNext = () => {
        setTipMsg("");
        if (step === 1) {
            if (!title.trim()) { setError("Tournament title is required."); return; }
            if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
                setError("End date must be after start date."); return;
            }
        }
        if (step === 2) {
            if (!selectedIds.length) { setError("Select at least 1 question from the bank."); return; }
            if (selectedIds.length < 5) setTipMsg("Tip: Tournaments with fewer than 5 questions may feel too short.");
        }
        setError("");
        setStep(s => (s + 1) as 1 | 2 | 3);
    };

    const handleBack = () => { setError(""); setTipMsg(""); setStep(s => (s - 1) as 1 | 2 | 3); };

    const handleSave = async (action: WizardAction) => {
        await onSave({
            title: title.trim(),
            subtitle: subtitle.trim(),
            quizType,
            tournamentCycle: cycle,
            dailyStartTime,
            startsAt,
            endsAt,
            entryFeeCoins: 0,
            active: action === "publish" ? true : active,
            rewards,
            questionIds: selectedIds,
            id: seed?.id,
            action,
        });
    };

    // HTML5 drag-to-reorder for selected questions
    const handleDragStart = (_e: React.DragEvent, idx: number) => { dragIdx.current = idx; };
    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragIdx.current === null || dragIdx.current === idx) return;
        const next = [...selectedIds];
        const [moved] = next.splice(dragIdx.current, 1);
        next.splice(idx, 0, moved);
        dragIdx.current = idx;
        setSelectedIds(next);
    };
    const handleDragEnd = () => { dragIdx.current = null; };

    return (
        <div className="wiz-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="wiz-panel" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="wiz-header">
                    <button type="button" className="wiz-close" onClick={onClose} aria-label="Close">×</button>
                    <h2>{seed?.id ? "Edit Tournament" : "Create Tournament"}</h2>
                    <div className="wiz-progress">
                        {STEPS.map((label, i) => (
                            <span key={label} className={`wiz-step ${step === i + 1 ? "active" : ""} ${step > i + 1 ? "done" : ""}`}>
                                <i>{step > i + 1 ? <Check size={11} /> : i + 1}</i>
                                <span>{label}</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="wiz-body">
                    {error && <div className="wiz-alert error">{error}</div>}
                    {tipMsg && <div className="wiz-alert tip">{tipMsg}</div>}

                    {/* ── Step 1: Details ─────────────────────────────── */}
                    {step === 1 && (
                        <div className="wiz-form">
                            <label className="wiz-wide">
                                Title <span className="req">*</span>
                                <input value={title} onChange={e => setTitle(e.target.value)} required />
                            </label>
                            <label>
                                Game Type
                                <select value={quizType} onChange={e => {
                                    setQuizType(e.target.value as TournamentQuizType);
                                    setSelectedIds([]);
                                }}>
                                    {tournamentQuizTypes.map(t => (
                                        <option key={t} value={t}>{quizTypeIcons[t]} {quizTypeLabels[t]}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Starts At
                                <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
                            </label>
                            <label>
                                Ends At <span className="req">*</span>
                                <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
                            </label>
                            <label>
                                Visibility
                                <select value={active ? "yes" : "no"} onChange={e => setActive(e.target.value === "yes")}>
                                    <option value="yes">Visible to players</option>
                                    <option value="no">Paused / hidden</option>
                                </select>
                            </label>
                            <label className="wiz-wide">
                                Subtitle
                                <textarea value={subtitle} onChange={e => setSubtitle(e.target.value)} rows={2} />
                            </label>
                        </div>
                    )}

                    {/* ── Step 2: Questions ───────────────────────────── */}
                    {step === 2 && (
                        <div className="wiz-questions">
                            <div className="wiz-q-left">
                                <div className="wiz-q-head">
                                    <strong>{quizTypeIcons[quizType]} {quizTypeLabels[quizType]} Bank ({bankQuestions.length})</strong>
                                    <label className="wiz-q-search">
                                        <Search size={13} />
                                        <input value={questionSearch} onChange={e => setQuestionSearch(e.target.value)} placeholder="Search..." />
                                    </label>
                                </div>
                                <div className="wiz-q-filters">
                                    {(["all", "easy", "medium", "hard"] as const).map(f => (
                                        <button key={f} type="button" className={diffFilter === f ? "active" : ""} onClick={() => setDiffFilter(f)}>
                                            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                                        </button>
                                    ))}
                                    <button type="button" className="wiz-addall" onClick={() =>
                                        setSelectedIds(prev => [...new Set([...prev, ...filteredBank.map(q => q.id)])])
                                    }>+ Add Filtered</button>
                                </div>
                                <div className="wiz-q-list">
                                    {loadingQuestions ? (
                                        <div className="wiz-q-empty">Loading questions…</div>
                                    ) : filteredBank.length ? filteredBank.map(q => (
                                        <button key={q.id} type="button" className="wiz-q-row" onClick={() => toggleQuestion(q.id)}>
                                            <span className="wiz-q-text">{q.question}</span>
                                            <span className={`wiz-q-diff diff-${q.difficulty || "easy"}`}>{q.difficulty || "easy"}</span>
                                            <Plus size={14} className="wiz-q-add" />
                                        </button>
                                    )) : (
                                        <div className="wiz-q-empty">No questions match this filter.</div>
                                    )}
                                </div>
                            </div>
                            <div className="wiz-q-right">
                                <strong>Selected ({selectedIds.length} / 15)</strong>
                                <div className="wiz-q-selected">
                                    {selectedQuestions.length ? selectedQuestions.map((q, idx) => (
                                        <div
                                            key={q.id}
                                            className="wiz-q-sel-row"
                                            draggable
                                            onDragStart={e => handleDragStart(e, idx)}
                                            onDragOver={e => handleDragOver(e, idx)}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <span className="wiz-drag">⠿</span>
                                            <span className="wiz-sel-text">{q.question}</span>
                                            <button type="button" className="wiz-q-remove" onClick={() =>
                                                setSelectedIds(prev => prev.filter(x => x !== q.id))
                                            }><Minus size={12} /></button>
                                        </div>
                                    )) : (
                                        <div className="wiz-q-empty-r">No questions selected.<br />Pick from the left panel.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Rewards ─────────────────────────────── */}
                    {step === 3 && (
                        <div className="wiz-rewards">
                            <div className="wiz-rewards-list">
                                {rewards.map((r, i) => (
                                    <div key={i} className="wiz-reward-item">
                                        <div className="wiz-reward-left">
                                            <Medal className={`medal-${Math.min(i + 1, 4)}`} size={22} />
                                            <button type="button" className="wiz-reward-rm" onClick={() =>
                                                setRewards(prev => prev.filter((_, idx) => idx !== i))
                                            }>×</button>
                                        </div>
                                        <div className="wiz-reward-fields">
                                            <label>Rank <input value={r.rank} onChange={e => updateReward(i, "rank", e.target.value)} /></label>
                                            <label>Title <input value={r.title} onChange={e => updateReward(i, "title", e.target.value)} /></label>
                                            <label className="wiz-wide">
                                                Items (one per line)
                                                <textarea value={r.items.join("\n")} onChange={e => updateReward(i, "items", e.target.value)} rows={2} />
                                            </label>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" className="wiz-add-reward" onClick={() =>
                                    setRewards(prev => [...prev, { rank: "Top 20", title: "Reward Pack", items: ["Bonus Coins"] }])
                                }><Gift size={14} /> Add Reward Tier</button>
                            </div>

                            <div className="wiz-launch">
                                <h4>How should this tournament launch?</h4>
                                <label className={`wiz-radio ${launchAction === "schedule" ? "chosen" : ""}`}>
                                    <input type="radio" name="launch" value="schedule" checked={launchAction === "schedule"} onChange={() => setLaunchAction("schedule")} />
                                    <div>
                                        <strong>Schedule</strong>
                                        <span>Goes live automatically at the start date/time</span>
                                    </div>
                                </label>
                                <label className={`wiz-radio ${launchAction === "publish" ? "chosen" : ""}`}>
                                    <input type="radio" name="launch" value="publish" checked={launchAction === "publish"} onChange={() => setLaunchAction("publish")} />
                                    <div>
                                        <strong>Publish now</strong>
                                        <span>Immediately sets status to active</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="wiz-footer">
                    <div className="wiz-footer-left">
                        {step > 1 && (
                            <button type="button" className="wiz-btn secondary" onClick={handleBack}>
                                <ArrowLeft size={14} /> Back
                            </button>
                        )}
                    </div>
                    <div className="wiz-footer-right">
                        {step < 3 ? (
                            <button type="button" className="wiz-btn primary" onClick={handleNext}>
                                {step === 1 ? "Next: Questions" : "Next: Rewards"} <ArrowRight size={14} />
                            </button>
                        ) : (
                            <>
                                <button type="button" className="wiz-btn secondary" disabled={saving} onClick={() => handleSave("draft")}>
                                    Save as Draft
                                </button>
                                <button type="button" className="wiz-btn primary" disabled={saving} onClick={() => handleSave(launchAction)}>
                                    {saving ? "Saving…" : <><Zap size={14} /> Publish Tournament</>}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
