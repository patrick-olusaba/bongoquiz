export interface Question {
  id: string;
  class_level: string;
  topic: string;
  question: string;
  imageUrl?: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  phone?: string;
  score: number;
  date: string;
}
