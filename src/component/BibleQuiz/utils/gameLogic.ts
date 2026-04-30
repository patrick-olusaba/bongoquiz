import type {AnswerResult, BibleQuestion, Player} from "../types/type.ts";

export class BibleQuizGame {
    private player: Player;
    private questions: BibleQuestion[];
    private usedQuestions: Set<number>;
    private currentLevel: number = 1;
    private correctInCurrentLevel: number = 0;
    private readonly questionsNeededToLevelUp: number = 3;
    private readonly initialPoints: number = 100;
    private readonly maxPoints: number = 200;
    private isGameOver: boolean = false;

    constructor(playerName: string, questions: BibleQuestion[]) {
        this.player = {
            id: Date.now(),
            name: playerName,
            score: 0,
            level: 1,
            totalQuestions: 0,
            correctAnswers: 0,
            currentStreak: 0,
            bestStreak: 0,
            currentDifficultyLevel: 'easy',
            progressToNextLevel: 0,
            points: this.initialPoints,
            maxPoints: this.maxPoints
        };
        this.questions = [...questions];
        this.usedQuestions = new Set();
        this.currentLevel = 1;
        this.correctInCurrentLevel = 0;
        this.isGameOver = false;
    }

    // Reset the game state
    startNewGame(): void {
        this.player = {
            ...this.player,
            score: 0,
            level: 1,
            totalQuestions: 0,
            correctAnswers: 0,
            currentStreak: 0,
            bestStreak: 0,
            currentDifficultyLevel: 'easy',
            progressToNextLevel: 0,
            points: this.initialPoints,
            maxPoints: this.maxPoints
        };
        this.usedQuestions.clear();
        this.currentLevel = 1;
        this.correctInCurrentLevel = 0;
        this.isGameOver = false;

        // Shuffle questions for new game
        this.shuffleQuestions();
    }

    // Get the next question based on current level
    getNextQuestion(): BibleQuestion | null {
        // Don't give questions if game is over
        if (this.isGameOver) {
            return null;
        }

        // If all questions used, return null
        if (this.usedQuestions.size >= this.questions.length) {
            return null;
        }

        const targetDifficulty = this.getDifficultyForLevel(this.currentLevel);

        // First try to find a question with matching difficulty
        for (let i = 0; i < this.questions.length; i++) {
            const question = this.questions[i];
            if (!this.usedQuestions.has(question.id) && question.difficulty === targetDifficulty) {
                this.usedQuestions.add(question.id);
                return question;
            }
        }

        // If no matching difficulty, use any unused question
        for (let i = 0; i < this.questions.length; i++) {
            const question = this.questions[i];
            if (!this.usedQuestions.has(question.id)) {
                this.usedQuestions.add(question.id);
                return question;
            }
        }

        return null;
    }

    // Submit an answer and calculate results
    submitAnswer(question: BibleQuestion, answerIndex: number): AnswerResult {
        if (this.isGameOver) {
            return {
                correct: false, pointsEarned: 0, pointsDeducted: 0,
                pointsBefore: this.player.points, pointsAfter: this.player.points,
                pointsBreakdown: { baseDeduction: 0, levelPenalty: 0, total: 0 },
                newLevel: false, levelUp: false, isGameOver: true,
                explanation: question.explanation, currentLevel: this.currentLevel,
                levelProgress: { current: this.correctInCurrentLevel, needed: this.questionsNeededToLevelUp, level: this.currentLevel }
            };
        }

        this.player.totalQuestions++;
        const pointsBefore = this.player.points;
        const isCorrect = answerIndex === question.correctAnswer;

        if (isCorrect) {
            this.player.correctAnswers++;
            this.player.currentStreak++;
            if (this.player.currentStreak > this.player.bestStreak)
                this.player.bestStreak = this.player.currentStreak;

            this.player.score += 100;
            this.correctInCurrentLevel++;
            this.player.progressToNextLevel = this.correctInCurrentLevel;

            let levelUp = false;
            if (this.correctInCurrentLevel >= this.questionsNeededToLevelUp && this.currentLevel < 3) {
                levelUp = true;
                this.currentLevel++;
                this.correctInCurrentLevel = 0;
                this.player.progressToNextLevel = 0;
                this.player.level = this.currentLevel;
                this.player.currentDifficultyLevel = this.getDifficultyForLevel(this.currentLevel);
            }

            return {
                correct: true, pointsEarned: 100, pointsDeducted: 0,
                pointsBefore, pointsAfter: this.player.points,
                pointsBreakdown: { baseDeduction: 0, levelPenalty: 0, total: 100 },
                newLevel: false, levelUp, isGameOver: false,
                explanation: question.explanation, currentLevel: this.currentLevel,
                levelProgress: { current: this.correctInCurrentLevel, needed: this.questionsNeededToLevelUp, level: this.currentLevel }
            };
        } else {
            this.player.currentStreak = 0;
            this.player.score -= 50;

            return {
                correct: false, pointsEarned: 0, pointsDeducted: 50,
                pointsBefore, pointsAfter: this.player.points,
                pointsBreakdown: { baseDeduction: 50, levelPenalty: 0, total: 50 },
                newLevel: false, levelUp: false, isGameOver: false,
                explanation: question.explanation, currentLevel: this.currentLevel,
                levelProgress: { current: this.correctInCurrentLevel, needed: this.questionsNeededToLevelUp, level: this.currentLevel }
            };
        }
    }

    // Pass a question — deducts 50 from score and moves on
    passQuestion(): { isGameOver: boolean } {
        this.player.totalQuestions++;
        this.player.currentStreak = 0;
        this.player.score -= 50;
        return { isGameOver: false };
    }

    // Get player statistics
    getPlayerStats(): Player {
        return {
            ...this.player,
            currentDifficultyLevel: this.getDifficultyForLevel(this.currentLevel),
            progressToNextLevel: this.correctInCurrentLevel
        };
    }

    // Get level progress
    getLevelProgress(): { current: number; needed: number; level: number } {
        return {
            current: this.correctInCurrentLevel,
            needed: this.questionsNeededToLevelUp,
            level: this.currentLevel
        };
    }

    // Get current difficulty level
    getCurrentLevel(): number {
        return this.currentLevel;
    }

    // Get level name for display
    getLevelName(): string {
        switch(this.currentLevel) {
            case 1: return "Beginner (Easy Questions)";
            case 2: return "Intermediate (Medium Questions)";
            case 3: return "Expert (Hard Questions)";
            default: return "Master (Challenging Questions)";
        }
    }

    // Get level difficulty description
    getLevelDifficulty(): string {
        switch(this.currentLevel) {
            case 1: return "Easy - Basic Bible knowledge";
            case 2: return "Medium - Intermediate Bible knowledge";
            case 3: return "Hard - Advanced Bible knowledge";
            default: return "Expert - Bible mastery";
        }
    }

    // Get points multiplier for current level
    getLevelMultiplier(): number {
        return 1 + ((this.currentLevel - 1) * 0.5);
    }

    // Get game over state
    getGameOverState(): boolean {
        return this.isGameOver;
    }

    // Use hint (deduct points)
    useHint(): void {
        if (this.player.points >= 10 && !this.isGameOver) {
            this.player.points -= 10;

            // Check if hint use caused game over
            if (this.player.points <= 0) {
                this.isGameOver = true;
            }
        }
    }

    // Check if player can continue
    canContinue(): boolean {
        return this.player.points > 0 && !this.isGameOver;
    }

    // Get points status
    getPointsStatus(): { current: number; max: number; percentage: number } {
        return {
            current: this.player.points,
            max: this.maxPoints,
            percentage: (this.player.points / this.maxPoints) * 100
        };
    }

    // Check if questions are available
    hasMoreQuestions(): boolean {
        if (this.isGameOver) {
            return false;
        }
        return this.usedQuestions.size < this.questions.length && this.player.points > 0;
    }

    // Force game over (for external use)
    forceGameOver(): void {
        this.isGameOver = true;
    }

    // Helper: Get difficulty string for level
    private getDifficultyForLevel(level: number): 'easy' | 'medium' | 'hard' {
        switch(level) {
            case 1: return 'easy';
            case 2: return 'medium';
            case 3: return 'hard';
            default: return 'hard';
        }
    }

    // Helper: Shuffle questions
    private shuffleQuestions(): void {
        for (let i = this.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
        }
    }
}