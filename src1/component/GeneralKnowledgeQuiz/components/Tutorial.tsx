import React from 'react';
import "../style/howtoplay.css";

interface TutorialProps {
    onStartGame: () => void;
    onBack: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onStartGame, onBack }) => {
    return (
        <div className="htp-root">
            {/* Header */}
            <div className="htp-header">
                <button className="htp-back-btn" onClick={onBack}>← Back</button>
                <h1 className="htp-title">❓ How to Play</h1>
                <div className="htp-header-spacer" />
            </div>

            <div className="htp-body">

                {/* Quick summary bar */}
                <div className="htp-summary">
                    <div className="htp-summary-item">
                        <span className="htp-summary-icon">⏱️</span>
                        <span className="htp-summary-label">60s per round</span>
                    </div>
                    <div className="htp-summary-divider" />
                    <div className="htp-summary-item">
                        <span className="htp-summary-icon">🎯</span>
                        <span className="htp-summary-label">4 answer choices</span>
                    </div>
                    <div className="htp-summary-divider" />
                    <div className="htp-summary-item">
                        <span className="htp-summary-icon">📈</span>
                        <span className="htp-summary-label">3 difficulty levels</span>
                    </div>
                    <div className="htp-summary-divider" />
                    <div className="htp-summary-item">
                        <span className="htp-summary-icon">🏆</span>
                        <span className="htp-summary-label">Score as high as you can</span>
                    </div>
                </div>

                <div className="htp-grid">

                    {/* Card 1 — Objective */}
                    <div className="htp-card htp-card--blue">
                        <div className="htp-card-icon">🎯</div>
                        <h3 className="htp-card-title">Objective</h3>
                        <p className="htp-card-text">
                            Answer as many general knowledge questions as you can before the timer runs out.
                            Each correct answer earns <strong>+100 points</strong>. Wrong answers cost
                            <strong> −50 points</strong>. Keep your score climbing!
                        </p>
                    </div>

                    {/* Card 2 — Timer */}
                    <div className="htp-card htp-card--orange">
                        <div className="htp-card-icon">⏱️</div>
                        <h3 className="htp-card-title">The Timer</h3>
                        <p className="htp-card-text">
                            You have a <strong>60-second countdown</strong> for the whole round.
                            The timer bar turns orange below 20s and red below 10s.
                            When it hits zero the round ends automatically — answer fast!
                        </p>
                        <div className="htp-timer-demo">
                            <div className="htp-timer-bar htp-timer-bar--green"><span>🟢 Plenty of time</span></div>
                            <div className="htp-timer-bar htp-timer-bar--orange"><span>🟠 Hurry up!</span></div>
                            <div className="htp-timer-bar htp-timer-bar--red"><span>🔴 Almost out!</span></div>
                        </div>
                    </div>

                    {/* Card 3 — Scoring */}
                    <div className="htp-card htp-card--green">
                        <div className="htp-card-icon">⭐</div>
                        <h3 className="htp-card-title">Scoring</h3>
                        <div className="htp-score-rows">
                            <div className="htp-score-row">
                                <span className="htp-score-label">✅ Correct answer</span>
                                <span className="htp-score-val htp-score-val--pos">+100 pts</span>
                            </div>
                            <div className="htp-score-row">
                                <span className="htp-score-label">❌ Wrong answer</span>
                                <span className="htp-score-val htp-score-val--neg">−50 pts</span>
                            </div>
                            <div className="htp-score-row">
                                <span className="htp-score-label">⏭️ Pass question</span>
                                <span className="htp-score-val htp-score-val--neg">−50 pts</span>
                            </div>
                            <div className="htp-score-row">
                                <span className="htp-score-label">⏰ Time runs out</span>
                                <span className="htp-score-val htp-score-val--neg">Round ends</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 4 — Levels */}
                    <div className="htp-card htp-card--purple">
                        <div className="htp-card-icon">📈</div>
                        <h3 className="htp-card-title">Difficulty Levels</h3>
                        <p className="htp-card-text">Answer <strong>3 correct in a row</strong> to level up to harder questions.</p>
                        <div className="htp-levels">
                            <div className="htp-level htp-level--1">
                                <span className="htp-level-badge">Lv 1</span>
                                <span className="htp-level-name">Easy</span>
                                <span className="htp-level-desc">Basic general knowledge</span>
                            </div>
                            <div className="htp-level-arrow">→</div>
                            <div className="htp-level htp-level--2">
                                <span className="htp-level-badge">Lv 2</span>
                                <span className="htp-level-name">Medium</span>
                                <span className="htp-level-desc">Intermediate topics</span>
                            </div>
                            <div className="htp-level-arrow">→</div>
                            <div className="htp-level htp-level--3">
                                <span className="htp-level-badge">Lv 3</span>
                                <span className="htp-level-name">Hard</span>
                                <span className="htp-level-desc">Expert knowledge</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 5 — Streak */}
                    <div className="htp-card htp-card--red">
                        <div className="htp-card-icon">🔥</div>
                        <h3 className="htp-card-title">Streak</h3>
                        <p className="htp-card-text">
                            Every consecutive correct answer builds your streak counter.
                            A wrong answer or pass <strong>resets your streak to zero</strong>.
                            Keep it going to show off your best streak on the results screen!
                        </p>
                        <div className="htp-streak-demo">
                            <span className="htp-streak-bubble">🔥 ×1</span>
                            <span className="htp-streak-bubble">🔥 ×2</span>
                            <span className="htp-streak-bubble htp-streak-bubble--hot">🔥 ×3</span>
                            <span className="htp-streak-bubble htp-streak-bubble--fire">🔥 ×4+</span>
                        </div>
                    </div>

                    {/* Card 6 — Pass */}
                    <div className="htp-card htp-card--teal">
                        <div className="htp-card-icon">⏭️</div>
                        <h3 className="htp-card-title">Pass Button</h3>
                        <p className="htp-card-text">
                            Stuck on a question? Hit <strong>Pass</strong> to skip it and move on.
                            Passing costs <strong>−50 points</strong> and resets your streak,
                            so use it wisely — only when you're truly unsure.
                        </p>
                    </div>

                </div>

                {/* Entry fee note */}
                <div className="htp-fee-note">
                    <span className="htp-fee-icon">💸</span>
                    <div>
                        <strong>Entry Fee:</strong> Each game requires a small KSh 20 deduction to start.
                        Win big by answering correctly and keeping your streak alive!
                    </div>
                </div>

                {/* CTA */}
                <div className="htp-actions">
                    <button className="htp-btn htp-btn--play" onClick={onStartGame}>
                        🎮 Start Playing!
                    </button>
                    <button className="htp-btn htp-btn--back" onClick={onBack}>
                        ← Back to Menu
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Tutorial;
