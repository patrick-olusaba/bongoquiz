export type Difficulty = "easy" | "medium" | "hard";

export interface RevisionQuestion {
  id: string;
  subject: string;
  topic: string;
  year: number;
  difficulty: Difficulty;
  question: string;
  options: string[];      // exactly 4
  answer: number;         // index 0-3
  explanation?: string;
  uploadedAt?: any;
}

export const SUBJECTS = [
  "Mathematics", "English", "Kiswahili", "Biology", "Chemistry", "Physics",
  "History", "Geography", "CRE", "IRE", "Business Studies", "Agriculture",
  "Computer Studies", "Home Science",
];

export const YEARS = Array.from({ length: 15 }, (_, i) => 2024 - i);

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "#16a34a",
  medium: "#d97706",
  hard: "#dc2626",
};
