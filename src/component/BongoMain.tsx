// BongoMain.tsx — top-level game orchestrator
// App.tsx is unchanged: it still just renders <BongoMain />
import { type FC, useState } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import { type GameScreen, type Category, type WheelSegment } from "../types/gametypes.ts";


import { HomeScreen }           from "./HomeScreen.tsx";
import { BoxSelectScreen }      from "./BoxSelectScreen.tsx";
import { PowerRevealScreen }    from "./PowerRevealScreen.tsx";
import { Round1Screen }         from "./Round1Screen.tsx";
import { Round1ResultScreen }   from "./Round1ResultScreen.tsx";
import { Round2CategoryScreen } from "./Round2CategoryScreen.tsx";
import { Round2QuestionScreen } from "./Round2QuestionScreen.tsx";
import { Round2ResultScreen }   from "./Round2ResultScreen.tsx";
import { Round3SpinScreen }     from "./Round3SpinScreen.tsx";
import { Round3QuestionScreen } from "./Round3QuestionScreen.tsx";
import { FinalResultScreen }    from "./FinalResultScreen.tsx";

// ─── Power score helpers ──────────────────────────────────────────────────────

function applyR1Power(rawScore: number, power: PrizeItem): number {
    let s = rawScore;
    if (power.name === "Double Points") s *= 2;
    return s;
}

function applyR2Power(correct: number, total: number, power: PrizeItem): number {
    let base = correct * 1000;
    if (power.name === "Double Or Nothing")  base = correct === total ? base * 2 : 0;
    if (power.name === "Point Gamble")       base = Math.random() > 0.5 ? base * 2 : Math.floor(base / 2);
    return base;
}

// ─── Main component ───────────────────────────────────────────────────────────

export const BongoMain: FC = () => {
    const [screen,   setScreen]   = useState<GameScreen>("home");
    const [power,    setPower]    = useState<PrizeItem | null>(null);
    const [r1Raw,    setR1Raw]    = useState(0);
    const [r1Score,  setR1Score]  = useState(0);
    const [r1Correct,setR1Correct]= useState(0);
    const [r1Total,  setR1Total]  = useState(0);
    const [category, setCategory] = useState<Category>("Sport");
    const [r2Score,  setR2Score]  = useState(0);
    const [r2Correct,setR2Correct]= useState(0);
    const [r2Total,  setR2Total]  = useState(0);
    const [segment,  setSegment]  = useState<WheelSegment | null>(null);
    const [r3Bonus,  setR3Bonus]  = useState(0);

    const resetGame = () => {
        setPower(null);
        setR1Raw(0); setR1Score(0); setR1Correct(0); setR1Total(0);
        setCategory("Sport");
        setR2Score(0); setR2Correct(0); setR2Total(0);
        setSegment(null); setR3Bonus(0);
        setScreen("home");
    };

    if (screen === "home")
        return <HomeScreen onStart={() => setScreen("box_select")} />;

    if (screen === "box_select")
        return <BoxSelectScreen onPowerSelected={p => { setPower(p); setScreen("power_reveal"); }} />;

    if (screen === "power_reveal" && power)
        return <PowerRevealScreen power={power} onContinue={() => setScreen("round1")} />;

    if (screen === "round1" && power)
        return (
            <Round1Screen
                power={power}
                onComplete={(rawScore, correct, total) => {
                    const final = applyR1Power(rawScore, power);
                    setR1Raw(rawScore); setR1Score(final);
                    setR1Correct(correct); setR1Total(total);
                    setScreen("round1_result");
                }}
            />
        );

    if (screen === "round1_result" && power)
        return (
            <Round1ResultScreen
                power={power} rawScore={r1Raw} finalScore={r1Score}
                correct={r1Correct} totalQuestions={r1Total}
                onContinue={() => setScreen("round2_category")}
            />
        );

    if (screen === "round2_category" && power)
        return (
            <Round2CategoryScreen
                power={power}
                onSelect={cat => { setCategory(cat); setScreen("round2_question"); }}
            />
        );

    if (screen === "round2_question" && power)
        return (
            <Round2QuestionScreen
                power={power} category={category} r1Score={r1Score}
                onComplete={(correct, total) => {
                    const final = applyR2Power(correct, total, power);
                    setR2Score(final); setR2Correct(correct); setR2Total(total);
                    setScreen("round2_result");
                }}
            />
        );

    if (screen === "round2_result" && power)
        return (
            <Round2ResultScreen
                power={power} category={category}
                r1Score={r1Score} r2Score={r2Score}
                correct={r2Correct} total={r2Total}
                onContinue={() => setScreen("round3_spin")}
            />
        );

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
        // If segment was ×3 or Double Up, r3Bonus already equals the new total
        const isMultiplier = segment?.label === "×3" || segment?.label === "Double Up";
        const finalTotal   = isMultiplier && r3Bonus > 0
            ? r3Bonus                             // r3Bonus holds the new total score
            : r1Score + r2Score + r3Bonus;
        return (
            <FinalResultScreen
                power={power} r1Score={r1Score} r2Score={r2Score} r3Bonus={r3Bonus}
                segment={segment}
                total={finalTotal}
                onPlayAgain={resetGame}
            />
        );
    }

    return <HomeScreen onStart={() => setScreen("box_select")} />;
};