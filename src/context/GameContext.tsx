import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameSettings, Question, GameState, Student, MatchResult } from '../types';

interface GameContextType {
  settings: GameSettings;
  questions: Question[];
  students: Student[];
  gameState: GameState;
  currentStudent: Student | null;
  updateSettings: (settings: Partial<GameSettings>) => void;
  importQuestions: (questions: Question[]) => void;
  addStudent: (student: Student) => void;
  setCurrentStudent: (student: Student | null) => void;
  initializeGame: (selectedQuestions: Question[]) => void;
  revealNextWord: () => void;
  buzzIn: () => void;
  submitAnswer: (answer: string) => void;
  nextQuestion: () => void;
  endGame: () => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const initialSettings: GameSettings = {
  readingSpeed: 150,
  questionTimer: 30,
  hesitationTimer: 5,
};

const initialGameState: GameState = {
  currentQuestion: null,
  questionIndex: 0,
  score: 0,
  questionsCorrect: 0,
  questionsAttempted: 0,
  revealedWords: 0,
  hasStarted: false,
  hasBuzzed: false,
  showAnswer: false,
  timeLeft: 0,
  buzzTime: null,
  selectedAnswer: null,
  subjectStats: {},
};

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [settings, setSettings] = React.useState<GameSettings>(() => {
    const saved = localStorage.getItem('lightning-league-settings');
    return saved ? JSON.parse(saved) : initialSettings;
  });

  const [questions, setQuestions] = React.useState<Question[]>(() => {
    const saved = localStorage.getItem('lightning-league-questions');
    return saved ? JSON.parse(saved) : [];
  });

  const [students, setStudents] = React.useState<Student[]>(() => {
    const saved = localStorage.getItem('lightning-league-students');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentStudent, setCurrentStudentState] = React.useState<Student | null>(null);
  const [gameQuestions, setGameQuestions] = React.useState<Question[]>([]);
  const [gameState, setGameState] = React.useState<GameState>(initialGameState);

  const updateSettings = (newSettings: Partial<GameSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('lightning-league-settings', JSON.stringify(updated));
  };

  const importQuestions = (newQuestions: Question[]) => {
    setQuestions(newQuestions);
    localStorage.setItem('lightning-league-questions', JSON.stringify(newQuestions));
  };

  const addStudent = (student: Student) => {
    const updated = [...students, student];
    setStudents(updated);
    localStorage.setItem('lightning-league-students', JSON.stringify(updated));
  };

  const setCurrentStudent = (student: Student | null) => {
    setCurrentStudentState(student);
  };

  const initializeGame = (selectedQuestions: Question[]) => {
    setGameQuestions(selectedQuestions);
    setGameState({
      ...initialGameState,
      currentQuestion: selectedQuestions[0] || null,
      timeLeft: settings.questionTimer,
      hasStarted: true,
      subjectStats: {},
    });
  };

  const revealNextWord = () => {
    if (!gameState.currentQuestion) return;
    
    const words = gameState.currentQuestion.question.split(' ');
    if (gameState.revealedWords < words.length) {
      setGameState(prev => ({
        ...prev,
        revealedWords: prev.revealedWords + 1,
      }));
    }
  };

  const buzzIn = () => {
    // Allow buzzing immediately when question starts
    if (gameState.hasBuzzed || !gameState.hasStarted) return;
    
    setGameState(prev => ({
      ...prev,
      hasBuzzed: true,
      buzzTime: Date.now(),
    }));
  };

  const submitAnswer = (answer: string) => {
    if (!gameState.currentQuestion) return;

    const isCorrect = answer === gameState.currentQuestion.correct;
    const newScore = isCorrect ? gameState.score + 1 : gameState.score;
    const subject = gameState.currentQuestion.subject;

    setGameState(prev => {
      const currentSubjectStats = prev.subjectStats[subject] || { correct: 0, total: 0 };
      const updatedSubjectStats = {
        ...prev.subjectStats,
        [subject]: {
          correct: isCorrect ? currentSubjectStats.correct + 1 : currentSubjectStats.correct,
          total: currentSubjectStats.total + 1,
        },
      };

      return {
        ...prev,
        selectedAnswer: answer,
        showAnswer: true,
        score: newScore,
        questionsCorrect: isCorrect ? prev.questionsCorrect + 1 : prev.questionsCorrect,
        questionsAttempted: prev.questionsAttempted + 1,
        subjectStats: updatedSubjectStats,
      };
    });
  };

  const nextQuestion = () => {
    const nextIndex = gameState.questionIndex + 1;
    const nextQuestion = gameQuestions[nextIndex];

    if (nextQuestion) {
      setGameState(prev => ({
        ...prev,
        currentQuestion: nextQuestion,
        questionIndex: nextIndex,
        revealedWords: 0,
        hasBuzzed: false,
        showAnswer: false,
        timeLeft: settings.questionTimer,
        buzzTime: null,
        selectedAnswer: null,
      }));
    }
  };

  const endGame = () => {
    if (!currentStudent) return;

    // Calculate subject breakdown with accuracy percentages
    const subjectBreakdown: Record<string, { correct: number; total: number; accuracy: number }> = {};
    Object.entries(gameState.subjectStats).forEach(([subject, stats]) => {
      subjectBreakdown[subject] = {
        correct: stats.correct,
        total: stats.total,
        accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      };
    });

    // Determine primary subject (subject with most questions)
    const primarySubject = Object.entries(gameState.subjectStats).reduce((a, b) => 
      a[1].total > b[1].total ? a : b, 
      ['Mixed', { correct: 0, total: 0 }] as [string, { correct: number; total: number }]
    )[0];

    const matchResult: MatchResult = {
      id: Date.now().toString(),
      date: new Date(),
      questionsAttempted: gameState.questionsAttempted,
      correctAnswers: gameState.questionsCorrect,
      accuracy: gameState.questionsAttempted > 0 ? (gameState.questionsCorrect / gameState.questionsAttempted) * 100 : 0,
      averageBuzzTime: gameState.buzzTime ? 2.5 : 0, // Simplified calculation
      subject: primarySubject,
      subjectBreakdown,
    };

    // Determine best subject (highest accuracy with at least 2 questions)
    const bestSubject = Object.entries(subjectBreakdown)
      .filter(([_, stats]) => stats.total >= 2)
      .reduce((a, b) => a[1].accuracy > b[1].accuracy ? a : b, 
        [primarySubject, subjectBreakdown[primarySubject] || { correct: 0, total: 0, accuracy: 0 }] as [string, { correct: number; total: number; accuracy: number }]
      )[0];

    const updatedStudent = {
      ...currentStudent,
      stats: {
        ...currentStudent.stats,
        matchHistory: [matchResult, ...currentStudent.stats.matchHistory].slice(0, 5),
        totalGames: currentStudent.stats.totalGames + 1,
        averageAccuracy: ((currentStudent.stats.averageAccuracy * currentStudent.stats.totalGames) + matchResult.accuracy) / (currentStudent.stats.totalGames + 1),
        averageBuzzTime: matchResult.averageBuzzTime,
        bestSubject,
      },
    };

    const updatedStudents = students.map(s => s.id === currentStudent.id ? updatedStudent : s);
    setStudents(updatedStudents);
    localStorage.setItem('lightning-league-students', JSON.stringify(updatedStudents));
    setCurrentStudentState(updatedStudent);
  };

  const resetGame = () => {
    setGameState(initialGameState);
    setGameQuestions([]);
  };

  return (
    <GameContext.Provider value={{
      settings,
      questions,
      students,
      gameState,
      currentStudent,
      updateSettings,
      importQuestions,
      addStudent,
      setCurrentStudent,
      initializeGame,
      revealNextWord,
      buzzIn,
      submitAnswer,
      nextQuestion,
      endGame,
      resetGame,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}