// Enhanced Player type with level details
export type Player = {
    id: string | number;
    name: string;
    score: number;
    level: number;
    correctAnswers: number;
    totalQuestions: number;
    currentStreak: number;
    bestStreak: number;
    lives?: number;
    currentDifficultyLevel: 'easy' | 'medium' | 'hard'; // Changed to string
    progressToNextLevel: number; // Keep as number (0-100 for percentage)
    points: number;
    maxPoints: number;
}

// Question type with optional level assignment
export type BibleQuestion = {
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    scripture: string;
    explanation: string;
    points: number;
    assignedLevel?: 1 | 2 | 3;          // Optional: Force question to specific level
}

// Enhanced AnswerResult with more details
export type AnswerResult = {
    correct: boolean;
    pointsEarned: number;
    pointsDeducted: number;
    pointsBefore?: number;      // Add this
    pointsAfter?: number;       // Add this
    pointsBreakdown?: {         // Add this
        baseDeduction: number;
        levelPenalty: number;
        total: number;
    };
    newLevel: boolean;
    levelUp: boolean;
    isGameOver: boolean;
    explanation: string;
    currentLevel: number;
    levelProgress: {
        current: number;
        needed: number;
        level: number;
    };
}

// Game interface remains the same as above
export interface BibleQuizGame {
    startNewGame(): void;
    getNextQuestion(): BibleQuestion | null;
    submitAnswer(question: BibleQuestion, answerIndex: number): AnswerResult;
    getPlayerStats(): Player;
    useHint(): void;
    getCurrentLevel(): number;
    getLevelProgress(): { current: number; needed: number; level: number };
    getLevelName(): string;
    getLevelMultiplier(): number;
}

// Game screen type - unchanged
export type GameScreen = 'menu' | 'game' | 'result' | 'gameover' | 'tutorial' | 'deduction' | 'results' | 'leaderboard';

// GameState with level tracking
export type GameState = {
    currentScreen: GameScreen;
    currentQuestion: BibleQuestion | null;
    selectedAnswer: number | null;
    isAnswered: boolean;
    timeLeft: number;
    gameStarted: boolean;
    showResults: boolean;
    showLevelUp?: boolean;
    isGameOver: boolean;
    currentLevel?: number;              // Track current difficulty level in UI
    levelProgress?: {                   // Track level progress in UI
        current: number;
        needed: number;
        level: number;
    };
}