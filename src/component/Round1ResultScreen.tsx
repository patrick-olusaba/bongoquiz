// Round1ResultScreen.tsx
import type { FC } from "react";
import type { PrizeItem } from "../types/bongotypes.ts";
import '../styles/style.css';

interface Props {
    power: PrizeItem;
    rawScore: number;
    finalScore: number;
    correct: number;
    totalQuestions: number;
    onContinue: () => void;
}

export const Round1ResultScreen: FC<Props> = ({ power, rawScore, finalScore, correct, totalQuestions, onContinue }) => (
    <div className="game-root">
        <div className="game-card game-card--center">
            <div className="game-result-icon">⚡</div>
            <h2 className="game-result-title">Round 1 Complete!</h2>
            <p className="game-result-sub">{correct} / {totalQuestions} correct answers</p>
            <div className="game-big-score">{finalScore} pts</div>

            {power.name === "Double Points" && (
                <p className="game-modifier-note game-modifier-note--red">✨ Double Points applied: {rawScore} × 2</p>
            )}

            <p className="game-power-note">
                Power <strong>{power.name}</strong> is still active for Round 2!
            </p>
            <button className="btn btn--gold" onClick={onContinue}>🗂️ Go to Round 2</button>
        </div>
    </div>
);