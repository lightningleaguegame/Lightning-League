// Firestore Collection Types

export type UserRole = 'student' | 'coach';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  teamId?: string;
  createdAt: Date;
  lastActive: Date;
}

export interface Team {
  id: string;
  name: string;
  coachId: string;
  createdAt: Date;
  playerIds: string[];
  levels?: ('EL' | 'MS' | 'HS')[]; // Elementary, Middle School, High School
}

export interface Question {
  id: string;
  subjectArea: string; // SS, SC, LA, MA, AH
  questionText: string;
  correctAnswer: string;
  distractors: string[];
  level: 'EL' | 'MS' | 'HS'; // Elementary, Middle School, High School
  isPublic: boolean;
  createdBy: string; // coachId
  teamId?: string; // if private, tied to team
  importDate: Date;
  importYear: number;
  createdAt: Date;
  updatedAt: Date;
  validationStatus?: 'pending' | 'approved' | 'flagged' | 'rejected'; // For quality control
  flaggedReason?: string; // Reason why question was flagged
  validatedBy?: string; // User ID who validated the question
  validatedAt?: Date; // When question was validated
}

export interface Player {
  id: string;
  userId: string;
  teamId: string;
  displayName: string;
  avatar?: string;
  gamesPlayed: number;
  totalScore: number;
  totalQuestions: number;
  avgBuzzTime: number;
  correctBySubject: Record<string, number>;
  createdAt: Date;
}

export interface Game {
  id: string;
  type: 'practice' | 'match';
  playerId?: string; // Optional: required for practice games, not for match games
  teamId?: string;
  coachId?: string;
  questionIds: string[];
  startedAt: Date;
  endedAt?: Date;
  status: 'waiting' | 'active' | 'completed';
  matchIdCode?: string; // Short code for students to join
  playerIds?: string[]; // Array of player IDs who joined the match
}

export interface MatchHistory {
  id: string;
  gameId: string;
  playerId: string;
  teamId?: string;
  type: 'practice' | 'match';
  score: number;
  total: number;
  avgBuzzTime: number;
  correctBySubject: Record<string, number>;
  totalBySubject?: Record<string, number>;
  questionIds: string[];
  startedAt: Date;
  completedAt: Date;
  hesitationCount: number;
}

export interface LeaderboardEntry {
  id: string;
  playerId: string;
  teamId: string;
  displayName: string;
  accuracy: number;
  avgBuzzTime: number;
  wins: number;
  highScore: number;
  totalGames: number;
  lastUpdated: Date;
}

export interface GameSettings {
  questionTime: number;
  hesitationTime: number;
  wpm: number;
  teamId?: string;
}

export interface MatchState {
  gameId: string;
  currentQuestionIndex: number;
  questionStartTime: number;
  buzzerState: 'idle' | 'locked' | 'buzzed';
  buzzedBy?: string;
  buzzedAt?: number;
  revealedWordsCount: number;
  questionFullyRevealed: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'match_end' | 'match_start' | 'team_invite' | 'other';
  title: string;
  message: string;
  gameId?: string;
  teamId?: string;
  read: boolean;
  createdAt: Date;
}









