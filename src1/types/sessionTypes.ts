// Session history types
export interface QuestionRecord {
    question: string;
    options: string[];
    correctAnswer: string;
    userAnswer: string | null;
    isCorrect: boolean;
    timeSpent?: number;
    pointsEarned: number;
}

export interface RoundRecord {
    roundNumber: 1 | 2 | 3;
    questions: QuestionRecord[];
    score: number;
    category?: string;
}

export interface GameSession {
    id: string;
    playerName: string;
    phone: string;
    power: string;
    rounds: RoundRecord[];
    totalScore: number;
    playedAt: Date;
}
