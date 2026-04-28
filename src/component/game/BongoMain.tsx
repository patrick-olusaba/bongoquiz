// BongoMain.tsx — top-level game orchestrator
import { type FC, useState, useEffect, useRef } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, collection, query, where, limit, getDocs } from "firebase/firestore";
import type { PrizeItem }    from "../../types/bongotypes.ts";
import { type GameScreen, type Category } from "../../types/gametypes.ts";

import { HomeScreen }              from "./HomeScreen.tsx";
import { BoxSelectScreen }         from "./BoxSelectScreen.tsx";
import { PowerRevealScreen }       from "./PowerRevealScreen.tsx";
import { RoundTransitionScreen }   from "./RoundTransitionScreen.tsx";
import { Round1Screen }            from "./Round1Screen.tsx";
import { Round1ResultScreen }      from "./Round1ResultScreen.tsx";
import { Round2QuestionScreen }    from "./Round2QuestionScreen.tsx";
import { Round2ResultScreen }      from "./Round2ResultScreen.tsx";
import { Round3SpinScreen }        from "./Round3SpinScreen.tsx";
import { FinalResultScreen }       from "./FinalResultScreen.tsx";
import { LeaderboardScreen }       from "./Leaderboardscreen.tsx";
import { DeductionModal }          from "./DeductionModal.tsx";

// ─── R1 score modifier ────────────────────────────────────────────────────────
function applyR1Power(rawScore: number, correct: number, total: number, power: PrizeItem): number {
    let s = rawScore;
    switch (power.name) {
        case "Disqualified":               return 0;
        case "Double Points":              s *= 2; break;
        case "Double Or Nothing":          s = correct === total ? s * 2 : 0; break;
        case "Point Gamble":               s = Math.random() > 0.5 ? s * 2 : Math.floor(s / 2); break;
        case "Point Chance Brain":         s = Math.random() > 0.5 ? s * 2 : s; break;
        case "Insurance":                  if (correct > 0) s = Math.max(s, 500); break;
        case "Mirror Effect":              s = Math.floor(s * 1.5); break;
        case "Sudden Death Disqualified":  if (correct < total) s = Math.floor(s / 2); break;
        case "Steal A Point":              s += 200; break;
        case "Swap Fate":                  s = Math.floor(s * 1.25); break;
        default: break;
    }
    return Math.round(s);
}

// ─── R2 score modifier ────────────────────────────────────────────────────────
// rawScore already includes correct/wrong/pass deltas from the screen
function applyR2Power(rawScore: number, correct: number, total: number, power: PrizeItem): number {
    let s = rawScore; // Allow negative scores
    switch (power.name) {
        case "Disqualified":               return 0;
        // Double Points already handled in screen (ptsCorrect × 2)
        case "Double Or Nothing":          s = correct === total ? s * 2 : 0; break;
        case "Point Gamble":               s = Math.random() > 0.5 ? s * 2 : Math.floor(s / 2); break;
        case "Point Chance Brain":         s = Math.random() > 0.5 ? s * 2 : s; break;
        case "Insurance":                  if (correct > 0) s = Math.max(s, 1000); break;
        case "Mirror Effect":              s = Math.floor(s * 1.5); break;
        case "Sudden Death Disqualified":  if (correct < total) s = 0; break;
        case "Steal A Point":              s += 500; break;
        case "Swap Fate":                  s = Math.floor(s * 1.25); break;
        default: break;
    }
    return Math.round(s);
}

// ─── Component ────────────────────────────────────────────────────────────────
export const BongoMain: FC = () => {
    const [screen,      setScreen]      = useState<GameScreen>("home");
    const [playerName,  setPlayerName]  = useState(() => localStorage.getItem("bongo_player_name") ?? "Player");
    const [playerPhone, setPlayerPhone] = useState(() => localStorage.getItem("bongo_player_phone") ?? "");
    const [power,       setPower]       = useState<PrizeItem | null>(null);
    const [hasPaidSession, setHasPaidSession] = useState(false);
    const hasPaidSessionRef = useRef(false);

    // Check on mount if this phone has a paid R1R2 session that was never played
    useEffect(() => {
        const phone = localStorage.getItem("bongo_player_phone");
        if (!phone || !/^07\d{8}$/.test(phone)) return;
        const phone254 = phone.replace(/^0/, "254");
        const db = getFirestore();
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        getDocs(
            query(
                collection(db, "payments"),
                where("phone", "==", phone254),
                where("status", "==", "paid"),
                where("amount", "==", 20),
                limit(5)
            )
        ).then(async snap => {
            if (snap.empty) return;

            const sorted = snap.docs
                .map(d => ({ ...d.data(), _paidAt: d.data().createdAt?.toDate?.() ?? new Date(0) }))
                .sort((a, b) => b._paidAt.getTime() - a._paidAt.getTime());

            const paidAt: Date = sorted[0]._paidAt;
            if (paidAt < since) return;

            // Confirm no game session was already played after this payment
            const sessionSnap = await getDocs(
                query(
                    collection(db, "gameSessions"),
                    where("phone", "==", phone),
                    limit(10)
                )
            );
            const alreadyPlayed = sessionSnap.docs.some(d => {
                const playedAt: Date = d.data().playedAt?.toDate?.() ?? new Date(0);
                return playedAt > paidAt;
            });
            if (!alreadyPlayed) {
                hasPaidSessionRef.current = true;
                setHasPaidSession(true);
            }
        }).catch((e) => { console.error("hasPaidSession check failed:", e); });
    }, []);

    // R1
    const [r1Score,     setR1Score]     = useState(0);
    const [r1TimeLeft,  setR1TimeLeft]  = useState(0);
    const [r1MaxStreak, setR1MaxStreak] = useState(0);
    const [r1Correct,   setR1Correct]   = useState(0);
    const [r1Total,     setR1Total]     = useState(0);

    // R2 — category is random, picked just before round2 starts
    const [r2Category,  setR2Category]  = useState<Category>("Sport");
    const [r2Score,     setR2Score]     = useState(0);
    const [r2Correct,   setR2Correct]   = useState(0);
    const [r2Total,     setR2Total]     = useState(0);

    // R3
    const [r3Bonus,     setR3Bonus]     = useState(0);

    const saveSession = async (r1: number, r2: number, r3: number, powerName: string) => {
        try {
            const save = httpsCallable(getFunctions(), "saveGameSession");
            await save({
                name:    playerName,
                phone:   localStorage.getItem("bongo_player_phone") ?? "",
                power:   powerName,
                r1Score: r1,
                r2Score: r2,
                r3Bonus: r3,
            });
        } catch {
            // Non-fatal — game still completes for the player
        }
    };

    const resetGame = () => {
        localStorage.removeItem("bongo_session_score");
        const savedName = localStorage.getItem("bongo_player_name") ?? "Player";
        setPlayerName(savedName);
        setPower(null);
        setR1Score(0); setR1TimeLeft(0); setR1MaxStreak(0); setR1Correct(0); setR1Total(0);
        setR2Category("Sport"); setR2Score(0); setR2Correct(0); setR2Total(0);
        setR3Bonus(0);
        setScreen("home");
    };

    if (screen === "home")
        return <HomeScreen
            hasPaidSession={hasPaidSession}
            onStart={(name: string) => {
                setPlayerName(name);
                setPlayerPhone(localStorage.getItem("bongo_player_phone") ?? "");
                setScreen("box_select");
            }}
            onLeaderboard={() => setScreen("leaderboard")}
        />;

    if (screen === "box_select")
        return <BoxSelectScreen onPowerSelected={p => { setPower(p); setScreen("power_reveal"); }} />;

    if (screen === "power_reveal" && power)
        return <PowerRevealScreen power={power} onContinue={() => {
            if (hasPaidSessionRef.current) {
                hasPaidSessionRef.current = false;
                setHasPaidSession(false);
                setScreen("transition_r1");
            } else {
                setScreen("deduct_r1r2");
            }
        }} />;

    // ── Deduction confirmations ────────────────────────────────────────────────
    if (screen === "deduct_r1r2")
        return <DeductionModal
            amount={20}
            roundLabel="Rounds 1 & 2"
            phone={playerPhone}
            playerName={playerName}
            onAccept={async () => {
                try {
                    const push = httpsCallable(getFunctions(), "initiateStkPush");
                    await push({ name: playerName, phone: playerPhone, amount: 20, ref: `${playerPhone}_R1R2` });
                } catch { /* non-fatal — proceed anyway */ }
                setScreen("transition_r1");
            }}
            onDecline={resetGame}
        />;

    if (screen === "deduct_r3")
        return <DeductionModal
            amount={10}
            roundLabel="Round 3"
            phone={playerPhone}
            playerName={playerName}
            onAccept={async () => {
                try {
                    const push = httpsCallable(getFunctions(), "initiateStkPush");
                    await push({ name: playerName, phone: playerPhone, amount: 10, ref: `${playerPhone}_R3` });
                } catch { /* non-fatal — proceed anyway */ }
                setScreen("transition_r3");
            }}
            onDecline={() => setScreen("round2_result")}
        />;

    // ── Transitions ────────────────────────────────────────────────────────────
    if (screen === "transition_r1")
        return <RoundTransitionScreen
            roundNum={1} title="Quickfire" icon="⚡"
            subtitle="75s · +100 correct · −50 wrong/pass"
            color="#7B61FF"
            onDone={() => setScreen("round1")}
        />;

    if (screen === "transition_r2")
        return <RoundTransitionScreen
            roundNum={2} title="Category Rush" icon="🗂️"
            subtitle="40s · 10 questions · +500 correct · −250 wrong/pass"
            color="#FF6B6B"
            onDone={() => setScreen("round2_question")}
        />;

    if (screen === "transition_r3")
        return <RoundTransitionScreen
            roundNum={3} title="Risk Spins" icon="🎡"
            subtitle="3 spins · answer to bank · wrong = lose all"
            color="#FFD700"
            onDone={() => setScreen("round3_spin")}
        />;

    // ── Round 1 ────────────────────────────────────────────────────────────────
    if (screen === "round1" && power)
        return <Round1Screen
            power={power}
            onComplete={(rawScore, correct, total, timeLeft, maxStreak) => {
                const final = applyR1Power(rawScore, correct, total, power);
                setR1Score(final); setR1TimeLeft(timeLeft);
                setR1MaxStreak(maxStreak); setR1Correct(correct); setR1Total(total);
                setScreen("round1_result");
            }}
        />;

    if (screen === "round1_result" && power)
        return <Round1ResultScreen
            power={power} rawScore={r1Score} finalScore={r1Score}
            correct={r1Correct} totalQuestions={r1Total}
            onContinue={() => setScreen("transition_r2")}
        />;

    // ── Round 2 — random category, no selection screen ─────────────────────────
    if (screen === "round2_question" && power)
        return <Round2QuestionScreen
            power={power}
            r1Score={r1Score}
            onComplete={(rawScore, correct, total) => {
                const final = applyR2Power(rawScore, correct, total, power);
                setR2Score(final); setR2Correct(correct); setR2Total(total);
                setScreen("round2_result");
            }}
        />;

    if (screen === "round2_result" && power)
        return <Round2ResultScreen
            power={power} category={r2Category}
            r1Score={r1Score} r2Score={r2Score}
            correct={r2Correct} total={r2Total}
            onContinue={() => setScreen("deduct_r3")}
        />;

    // ── Round 3 — self-contained spin + question flow ──────────────────────────
    if (screen === "round3_spin")
        return <Round3SpinScreen
            currentScore={r1Score + r2Score}
            onComplete={r3Score => {
                setR3Bonus(r3Score);
                saveSession(r1Score, r2Score, r3Score, power?.name ?? "");
                setScreen("final_result");
            }}
        />;

    // ── Final ──────────────────────────────────────────────────────────────────
    if (screen === "final_result" && power) {
        const finalTotal = r1Score + r2Score + r3Bonus;
        return <FinalResultScreen
            power={power} r1Score={r1Score} r2Score={r2Score} r3Bonus={r3Bonus}
            segment={null} total={finalTotal}
            playerName={playerName}
            r1TimeLeft={r1TimeLeft} r2Correct={r2Correct}
            r2Total={r2Total}       maxStreak={r1MaxStreak}
            onPlayAgain={() => setScreen("leaderboard")}
        />;
    }

    if (screen === "leaderboard")
        return <LeaderboardScreen
            playerScore={r1Score + r2Score + r3Bonus}
            playerName={playerName}
            onPlayAgain={resetGame}
            onClose={resetGame}
        />;

    return <HomeScreen
        hasPaidSession={hasPaidSession}
        onStart={(name: string) => { setPlayerName(name); setScreen("box_select"); }}
        onLeaderboard={() => setScreen("leaderboard")}
    />;
};