// BongoMain.tsx — top-level game orchestrator
import { type FC, useState } from "react";
import type { PrizeItem }    from "../types/bongotypes.ts";
import { type GameScreen, type Category, type WheelSegment } from "../types/gametypes.ts";

import { HomeScreen }              from "./HomeScreen.tsx";
import { BoxSelectScreen }         from "./BoxSelectScreen.tsx";
import { PowerRevealScreen }       from "./PowerRevealScreen.tsx";
import { RoundTransitionScreen }   from "./RoundTransitionScreen.tsx";
import { Round1Screen }            from "./Round1Screen.tsx";
import { Round1ResultScreen }      from "./Round1ResultScreen.tsx";
import { Round2CategoryScreen }    from "./Round2CategoryScreen.tsx";
import { Round2QuestionScreen }    from "./Round2QuestionScreen.tsx";
import { Round2ResultScreen }      from "./Round2ResultScreen.tsx";
import { Round3SpinScreen }        from "./Round3SpinScreen.tsx";
import { Round3QuestionScreen }    from "./Round3QuestionScreen.tsx";
import { FinalResultScreen }       from "./FinalResultScreen.tsx";
import { LeaderboardScreen }       from "./Leaderboardscreen.tsx";

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
    return Math.max(0, Math.round(s));
}

// ─── R2 score modifier ────────────────────────────────────────────────────────
function applyR2Power(correct: number, total: number, power: PrizeItem): number {
    // Double Points gives 2 000 pts per correct answer instead of 1 000
    const ptsEach = power.name === "Double Points" ? 2000 : 1000;
    let base = correct * ptsEach;

    switch (power.name) {
        case "Disqualified":               return 0;
        case "Double Or Nothing":          base = correct === total ? base * 2 : 0; break;
        case "Point Gamble":               base = Math.random() > 0.5 ? base * 2 : Math.floor(base / 2); break;
        case "Point Chance Brain":         base = Math.random() > 0.5 ? base * 2 : base; break;
        case "Insurance":                  if (correct > 0) base = Math.max(base, 1000); break;
        case "Mirror Effect":              base = Math.floor(base * 1.5); break;
        case "Sudden Death Disqualified":  if (correct < total) base = 0; break;
        case "Steal A Point":              base += 500; break;
        case "Swap Fate":                  base = Math.floor(base * 1.25); break;
        // Double Points already handled via ptsEach — no extra case needed
        default: break;
    }
    return Math.max(0, Math.round(base));
}

// ─── Component ────────────────────────────────────────────────────────────────
export const BongoMain: FC = () => {
    const [screen,      setScreen]      = useState<GameScreen>("home");
    const [playerName,  setPlayerName]  = useState(() => localStorage.getItem("bongo_player_name") ?? "Player");
    const [power,       setPower]       = useState<PrizeItem | null>(null);
    const [r1Score,     setR1Score]     = useState(0);
    const [r1TimeLeft,  setR1TimeLeft]  = useState(0);
    const [r1MaxStreak, setR1MaxStreak] = useState(0);
    const [r1Correct,   setR1Correct]   = useState(0);
    const [r1Total,     setR1Total]     = useState(0);
    const [category,    setCategory]    = useState<Category>("Sport");
    const [r2Score,     setR2Score]     = useState(0);
    const [r2Correct,   setR2Correct]   = useState(0);
    const [r2Total,     setR2Total]     = useState(0);
    const [segment,     setSegment]     = useState<WheelSegment | null>(null);
    const [r3Bonus,     setR3Bonus]     = useState(0);

    const resetGame = () => {
        const savedName = localStorage.getItem("bongo_player_name") ?? "Player";
        setPlayerName(savedName);
        setPower(null);
        setR1Score(0); setR1TimeLeft(0); setR1MaxStreak(0);
        setR1Correct(0); setR1Total(0);
        setCategory("Sport");
        setR2Score(0); setR2Correct(0); setR2Total(0);
        setSegment(null); setR3Bonus(0);
        setScreen("home");
    };

    if (screen === "home")
        return <HomeScreen
            onStart={(name: string) => { setPlayerName(name); setScreen("box_select"); }}
            onLeaderboard={() => setScreen("leaderboard")}
        />;

    if (screen === "box_select")
        return <BoxSelectScreen onPowerSelected={p => { setPower(p); setScreen("power_reveal"); }} />;

    if (screen === "power_reveal" && power)
        return <PowerRevealScreen power={power} onContinue={() => setScreen("transition_r1")} />;

    if (screen === "transition_r1")
        return <RoundTransitionScreen
            roundNum={1} title="Quickfire" icon="⚡"
            subtitle="90 seconds · 100 pts per answer"
            color="#7B61FF"
            onDone={() => setScreen("round1")}
        />;

    if (screen === "transition_r2")
        return <RoundTransitionScreen
            roundNum={2} title="Categories" icon="🗂️"
            subtitle="Pick your topic · 1,000 pts each"
            color="#FF6B6B"
            onDone={() => setScreen("round2_category")}
        />;

    if (screen === "transition_r3")
        return <RoundTransitionScreen
            roundNum={3} title="Spin & Win" icon="🎡"
            subtitle="Spin the wheel · claim your bonus"
            color="#FFD700"
            onDone={() => setScreen("round3_spin")}
        />;

    if (screen === "round1" && power)
        return <Round1Screen
            power={power}
            onComplete={(rawScore, correct, total, timeLeft, maxStreak) => {
                const final = applyR1Power(rawScore, correct, total, power);
                setR1Score(final); setR1TimeLeft(timeLeft);
                setR1MaxStreak(maxStreak);
                setR1Correct(correct); setR1Total(total);
                setScreen("round1_result");
            }}
        />;

    if (screen === "round1_result" && power)
        return <Round1ResultScreen
            power={power} rawScore={r1Score} finalScore={r1Score}
            correct={r1Correct} totalQuestions={r1Total}
            onContinue={() => setScreen("transition_r2")}
        />;

    if (screen === "round2_category" && power)
        return <Round2CategoryScreen
            power={power}
            onSelect={cat => { setCategory(cat); setScreen("round2_question"); }}
        />;

    if (screen === "round2_question" && power)
        return <Round2QuestionScreen
            power={power} category={category} r1Score={r1Score}
            onComplete={(correct, total) => {
                const final = applyR2Power(correct, total, power);
                setR2Score(final); setR2Correct(correct); setR2Total(total);
                setScreen("round2_result");
            }}
        />;

    if (screen === "round2_result" && power)
        return <Round2ResultScreen
            power={power} category={category}
            r1Score={r1Score} r2Score={r2Score}
            correct={r2Correct} total={r2Total}
            onContinue={() => setScreen("transition_r3")}
        />;

    if (screen === "round3_spin")
        return <Round3SpinScreen
            currentScore={r1Score + r2Score}
            onResult={seg => { setSegment(seg); setScreen("round3_question"); }}
        />;

    if (screen === "round3_question" && segment)
        return <Round3QuestionScreen
            segment={segment}
            currentScore={r1Score + r2Score}
            onComplete={bonus => { setR3Bonus(bonus); setScreen("final_result"); }}
        />;

    if (screen === "final_result" && power) {
        const isMultiplier = segment?.label === "×3" || segment?.label === "Double Up";
        const finalTotal   = isMultiplier && r3Bonus > 0 ? r3Bonus : r1Score + r2Score + r3Bonus;
        return <FinalResultScreen
            power={power} r1Score={r1Score} r2Score={r2Score} r3Bonus={r3Bonus}
            segment={segment} total={finalTotal}
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
        onStart={(name: string) => { setPlayerName(name); setScreen("box_select"); }}
        onLeaderboard={() => setScreen("leaderboard")}
    />;
};