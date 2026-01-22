export interface Question {
  id: string;
  subject: string;
  question: string;
  answers: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: 'A' | 'B' | 'C' | 'D';
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GameSettings {
  readingSpeed: number; // WPM (50-300)
  questionTimer: number; // seconds (5-60)
  hesitationTimer: number; // seconds (2-10)
}

export interface StudentStats {
  matchHistory: MatchResult[];
  totalGames: number;
  averageAccuracy: number;
  averageBuzzTime: number;
  bestSubject: string;
}

export interface SubjectBreakdown {
  [subject: string]: {
    correct: number;
    total: number;
    accuracy: number;
  };
}

export interface MatchResult {
  id: string;
  date: Date;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number;
  averageBuzzTime: number;
  subject: string;
  subjectBreakdown?: SubjectBreakdown;
}

export interface Student {
  id: string;
  name: string;
  avatar?: string;
  stats: StudentStats;
}

export interface GameState {
  currentQuestion: Question | null;
  questionIndex: number;
  score: number;
  questionsCorrect: number;
  questionsAttempted: number;
  revealedWords: number;
  hasStarted: boolean;
  hasBuzzed: boolean;
  showAnswer: boolean;
  timeLeft: number;
  buzzTime: number | null;
  selectedAnswer: string | null;
  subjectStats: Record<string, { correct: number; total: number }>;
}

export type UserRole = 'student' | 'coach';
export type GameScreen = 'menu' | 'student-config' | 'coach-login' | 'coach-dashboard' | 'gameplay' | 'results' | 'stats';