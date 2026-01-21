import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuestions } from '../context/QuestionsContext';
import { createGame, createMatchHistory, updatePlayerStats, getPlayer, getUser, getGame, getMatchHistoriesByGameId, updateGame, createNotification, getTeam } from '../services/firestore';
import { Question, MatchHistory } from '../types/firebase';
import { Bolt, ArrowLeft } from 'lucide-react';
import { auth } from '../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const COLOR_THEME = {
  A_RED: '#FF416C',
  B_BLUE: '#4F5CF7',
  C_GREEN: '#32FFB8',
  D_YELLOW: '#FFC838',
};

interface PracticeModeProps {
  onBack: () => void;
  numQuestions: number;
  practiceMode: string;
  gameSettings: { questionTime: number; hesitationTime: number; wpm: number };
  matchGameId?: string; // Optional: if provided, use this gameId instead of creating a new one
  matchQuestions?: Question[]; // Optional: if provided, use these questions instead of loading from context
}

export const PracticeMode: React.FC<PracticeModeProps> = ({
  onBack,
  numQuestions,
  practiceMode,
  gameSettings,
  matchGameId,
  matchQuestions,
}) => {
  const navigate = useNavigate();
  const { userData, currentUser, loading: authLoading } = useAuth();
  const { questions: allQuestions, loading: questionsLoading } = useQuestions();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [timer, setTimer] = useState(gameSettings.questionTime);
  const [revealedWordsCount, setRevealedWordsCount] = useState(0);
  const [isQuestionLive, setIsQuestionLive] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  const [shuffledAnswersQuestionId, setShuffledAnswersQuestionId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showIncorrect, setShowIncorrect] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [questionFullyRevealed, setQuestionFullyRevealed] = useState(false);
  const [buzzTimes, setBuzzTimes] = useState<number[]>([]);
  const [correctBySubject, setCorrectBySubject] = useState<Record<string, number>>({});
  const [totalBySubject, setTotalBySubject] = useState<Record<string, number>>({});
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [showHesitation, setShowHesitation] = useState(false);
  const [hesitationTimer, setHesitationTimer] = useState<number | null>(null);
  const [hesitationComplete, setHesitationComplete] = useState(false);
  const revealIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load match questions if provided, otherwise load from context
  useEffect(() => {
    if (matchQuestions && matchGameId) {
      // Use match questions and gameId
      setQuestions(matchQuestions);
      setGameId(matchGameId);
      setLoading(false);
    } else if (!questionsLoading && allQuestions.length > 0) {
      loadQuestions();
    }
  }, [questionsLoading, allQuestions, practiceMode, numQuestions, matchQuestions, matchGameId]);

  // Update timer when gameSettings change (if no question is active)
  useEffect(() => {
    if (questionStartTime === null) {
      console.log('Updating timer from gameSettings:', gameSettings);
      setTimer(gameSettings.questionTime);
    }
  }, [gameSettings.questionTime, questionStartTime]);

  // Start question when question index changes or when questions are loaded
  useEffect(() => {
    if (questions.length > 0 && gameId && questionStartTime === null && !loading && currentQuestionIndex < questions.length) {
      startQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, gameId, currentQuestionIndex, questionStartTime, loading]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      
      // Filter questions based on practice mode
      let availableQuestions = allQuestions;
      
      if (practiceMode !== 'Mix') {
        const subjectMap: Record<string, string> = {
          'Social Studies': 'SS',
          'Science': 'SC',
          'Language Arts': 'LA',
          'Math': 'MA',
          'Arts and Humanities': 'AH',
        };
        const subjectCode = subjectMap[practiceMode] || practiceMode;
        availableQuestions = allQuestions.filter(q => q.subjectArea === subjectCode);
      }
      
      if (availableQuestions.length === 0) {
        alert('No questions available. Please ask your coach to add questions first.');
        onBack();
        return;
      }

      // Shuffle questions but keep each question object intact with its answers
      // This ensures questions and their answers stay locked together
      const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(numQuestions, availableQuestions.length));
      // Verify each question has its correctAnswer and distractors properly set
      const validatedQuestions = selected.map(q => {
        if (!q.correctAnswer || !q.distractors || q.distractors.length === 0) {
          console.warn(`Question ${q.id} is missing answer data`);
        }
        return q;
      });
      setQuestions(validatedQuestions);

      if (selected.length > 0 && userData) {
        // Create game record
        const newGameId = await createGame({
          type: 'practice',
          playerId: userData.uid,
          teamId: userData.teamId,
          questionIds: selected.map((q) => q.id),
          status: 'active',
        });
        setGameId(newGameId);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      alert('Failed to load questions. Please try again.');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const startQuestion = () => {
    if (!questions[currentQuestionIndex]) return;

    const currentQuestion = questions[currentQuestionIndex];
    // Validate question has required data
    if (!currentQuestion.correctAnswer || !currentQuestion.distractors || currentQuestion.distractors.length === 0) {
      console.error(`Question ${currentQuestion.id} is missing answer data:`, {
        questionText: currentQuestion.questionText,
        correctAnswer: currentQuestion.correctAnswer,
        distractors: currentQuestion.distractors
      });
      return;
    }
    
    // Shuffle answers but keep them tied to this specific question object
    // Use the question's ID to ensure we're always using the correct question's answers
    const shuffled = [currentQuestion.correctAnswer, ...currentQuestion.distractors].sort(
      () => Math.random() - 0.5
    );
    
    // Debug: Log to verify question and answers match
    console.log('Starting question:', {
      questionId: currentQuestion.id,
      questionText: currentQuestion.questionText,
      correctAnswer: currentQuestion.correctAnswer,
      shuffledAnswers: shuffled
    });
    
    setShuffledAnswers(shuffled);
    setShuffledAnswersQuestionId(currentQuestion.id); // Store question ID to validate match
    setQuestionFullyRevealed(false);
    setRevealedWordsCount(0);
    setIsQuestionLive(true); // Allow immediate buzzing
    setHasBuzzed(false);
    setShowHesitation(false);
    setHesitationTimer(null);
    setHesitationComplete(false);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowCorrect(false);
    setShowIncorrect(false);
    console.log('Starting question with settings:', gameSettings);
    setTimer(gameSettings.questionTime);
    setQuestionStartTime(Date.now());
  };

  useEffect(() => {
    if (questions.length === 0 || !questions[currentQuestionIndex] || hasBuzzed) return;

    const currentQuestion = questions[currentQuestionIndex];
    const totalWords = currentQuestion.questionText.split(' ').length;
    const msPerWord = (60 / gameSettings.wpm) * 1000;

    revealIntervalRef.current = setInterval(() => {
      setRevealedWordsCount((prev) => {
        if (prev < totalWords) {
          const newCount = prev + 1;
          if (newCount === totalWords) {
            setQuestionFullyRevealed(true);
          }
          return newCount;
        }
        if (revealIntervalRef.current) {
          clearInterval(revealIntervalRef.current);
          revealIntervalRef.current = null;
        }
        return prev;
      });
    }, msPerWord);

    return () => {
      if (revealIntervalRef.current) {
        clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
      }
    };
  }, [currentQuestionIndex, questions, gameSettings.wpm, hasBuzzed]);

  useEffect(() => {
    // Question timer only runs if question is fully revealed AND buzzer hasn't been clicked
    // If buzzer is clicked, question timer stops and hesitation timer takes over
    const shouldRunTimer = questionFullyRevealed && timer > 0 && !hasBuzzed;

    if (shouldRunTimer) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && questionFullyRevealed && !hasBuzzed) {
      // Timer expired without buzzing - move to next question
      handleTimeExpired();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, questionFullyRevealed, hasBuzzed]);

  const handleBuzz = () => {
    if (hasBuzzed || questionStartTime === null) return;
    
    // Stop word revelation immediately
    if (revealIntervalRef.current) {
      clearInterval(revealIntervalRef.current);
      revealIntervalRef.current = null;
    }
    
    const buzzTime = (Date.now() - questionStartTime) / 1000;
    setBuzzTimes((prev) => [...prev, buzzTime]);
    setHasBuzzed(true);
    
    // Stop question timer by setting it to 0 (timer effect checks hasBuzzed, so it won't run)
    // The question timer stops when hasBuzzed is true
    
    // Mark question as fully revealed so hesitation timer can start
    setQuestionFullyRevealed(true);
    
    // Reset hesitation state
    setHesitationComplete(false);
    setShowHesitation(false);
    
    console.log('Buzz clicked:', {
      hesitationTime: gameSettings.hesitationTime,
      questionTime: gameSettings.questionTime
    });
  };

  // Start hesitation timer when buzzer is clicked (hasBuzzed becomes true)
  useEffect(() => {
    if (hasBuzzed && hesitationTimer === null && !hesitationComplete && !showResult) {
      console.log('Buzzer clicked, starting hesitation timer');
      setHesitationTimer(gameSettings.hesitationTime);
    }
  }, [hasBuzzed, hesitationTimer, hesitationComplete, showResult, gameSettings.hesitationTime]);

  // Hesitation timer countdown
  useEffect(() => {
    if (showResult || hesitationComplete || hesitationTimer === null || hesitationTimer <= 0) {
      return;
    }
    
    console.log('Starting hesitation timer countdown:', hesitationTimer);
    const timer = setInterval(() => {
      setHesitationTimer((prev) => {
        if (prev === null || prev <= 0) {
          return 0;
        }
        const newValue = prev - 1;
        console.log('Hesitation timer:', newValue);
        return newValue;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [hesitationTimer, showResult, hesitationComplete]);
  
  // When hesitation timer reaches 0, show hesitation message
  useEffect(() => {
    if (showResult || hesitationComplete || !hasBuzzed) {
      return;
    }
    
    // Check if hesitation timer has reached 0 and we haven't shown the message yet
    if (hesitationTimer === 0 && !showHesitation && !hesitationComplete) {
      console.log('Hesitation timer reached 0, showing hesitation message');
      setShowHesitation(true);
    }
  }, [hesitationTimer, showResult, hesitationComplete, showHesitation, hasBuzzed]);

  // After hesitation message is shown, wait 2 seconds then show correct answer and advance
  useEffect(() => {
    if (!showHesitation || hesitationComplete || showResult || !hasBuzzed) {
      return;
    }
    
    console.log('Hesitation message shown, setting timeout to show answer');
    const timeoutId = setTimeout(() => {
      console.log('Hesitation period complete, showing correct answer');
      setShowHesitation(false);
      setHesitationComplete(true);
      
      // Show the result with no selected answer (to display correct answer)
      setShowResult(true);
      setSelectedAnswer(null);
      
      // Track this as a missed question (no answer selected, hesitation timeout)
      setTotalBySubject((prev) => {
        const currentQuestion = questions[currentQuestionIndex];
        if (currentQuestion) {
          return {
            ...prev,
            [currentQuestion.subjectArea]: (prev[currentQuestion.subjectArea] || 0) + 1,
          };
        }
        return prev;
      });
      
      // After 3 seconds, automatically advance to next question
      setTimeout(() => {
        setShowResult(false);
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex >= questions.length) {
          // Pass current score (no change since no answer was selected)
          endGame(playerScore);
        } else {
          setCurrentQuestionIndex(nextIndex);
          // Reset question state for next question
          setQuestionStartTime(null);
          setHasBuzzed(false);
          setShowHesitation(false);
          setHesitationTimer(null);
          setHesitationComplete(false);
          setSelectedAnswer(null);
          // startQuestion will be called by the useEffect when questionStartTime becomes null
        }
      }, 3000);
    }, 2000);
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHesitation, hasBuzzed]);

  // Debug: Log state changes after buzzing
  useEffect(() => {
    if (hasBuzzed && questions.length > 0 && questions[currentQuestionIndex]) {
      const currentQ = questions[currentQuestionIndex];
      console.log('State after buzz:', {
        hasBuzzed,
        hesitationTimer,
        showHesitation,
        hesitationComplete,
        questionFullyRevealed,
        hasCurrentQuestion: !!currentQ,
        shuffledAnswersQuestionId,
        currentQuestionId: currentQ?.id
      });
    }
  }, [hasBuzzed, hesitationTimer, showHesitation, hesitationComplete, questionFullyRevealed, questions, currentQuestionIndex, shuffledAnswersQuestionId]);

  // Ensure shuffledAnswers always match the current question
  useEffect(() => {
    if (questions.length > 0 && questions[currentQuestionIndex]) {
      const currentQuestion = questions[currentQuestionIndex];
      if (shuffledAnswersQuestionId !== currentQuestion.id) {
        // Regenerate shuffled answers if they don't match the current question
        if (!currentQuestion.correctAnswer || !currentQuestion.distractors || currentQuestion.distractors.length === 0) {
          console.error(`Question ${currentQuestion.id} is missing answer data`);
          return;
        }
        const shuffled = [currentQuestion.correctAnswer, ...currentQuestion.distractors].sort(
          () => Math.random() - 0.5
        );
        console.log('Regenerating shuffled answers for question:', {
          questionId: currentQuestion.id,
          questionText: currentQuestion.questionText,
          shuffledAnswers: shuffled
        });
        setShuffledAnswers(shuffled);
        setShuffledAnswersQuestionId(currentQuestion.id);
      }
    }
  }, [currentQuestionIndex, questions, shuffledAnswersQuestionId]);

  const handleTimeExpired = () => {
    // Show the answer when time expires
    setShowResult(true);
    setSelectedAnswer(null); // No answer selected, so show correct answer
    
    // Wait 3 seconds to show the answer before moving to next question
    setTimeout(() => {
      setShowResult(false);
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex >= questions.length) {
        // Pass current score (no change since no answer was selected)
        endGame(playerScore);
      } else {
        setCurrentQuestionIndex(nextIndex);
        startQuestion();
      }
    }, 3000);
  };

  const handleAnswer = async (answer: string) => {
    if (showResult || hesitationComplete) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;

    setSelectedAnswer(answer);
    setShowResult(true);

    // Track total questions by subject
    setTotalBySubject((prev) => ({
      ...prev,
      [currentQuestion.subjectArea]: (prev[currentQuestion.subjectArea] || 0) + 1,
    }));

    // Calculate the updated score immediately
    const updatedScore = isCorrect ? playerScore + 1 : playerScore;

    if (isCorrect) {
      setPlayerScore((prev) => prev + 1);
      setShowCorrect(true);
      setCorrectBySubject((prev) => ({
        ...prev,
        [currentQuestion.subjectArea]: (prev[currentQuestion.subjectArea] || 0) + 1,
      }));
    } else {
      setShowIncorrect(true);
    }

    setTimeout(() => {
      setShowCorrect(false);
      setShowIncorrect(false);
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex >= questions.length) {
        // Pass the updated score to ensure the last question's point is included
        endGame(updatedScore);
      } else {
        setCurrentQuestionIndex(nextIndex);
        startQuestion();
      }
    }, 2000);
  };

  const endGame = async (finalScore?: number) => {
    // Ensure auth is fully loaded before proceeding
    if (authLoading) {
      console.error('Cannot save match history: Auth still loading');
      alert('Please wait for authentication to complete.');
      return;
    }
    
    // Ensure both currentUser and userData exist - Firestore rules check request.auth.uid
    if (!currentUser || !userData || !gameId) {
      console.error('Cannot save match history: Missing authentication', {
        authLoading,
        hasCurrentUser: !!currentUser,
        hasUserData: !!userData,
        hasGameId: !!gameId,
      });
      alert('Cannot save game results. Please ensure you are logged in.');
      onBack();
      return;
    }

    // Verify Firebase Auth is ready and user is authenticated
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser || currentAuthUser.uid !== currentUser.uid) {
      console.error('Firebase Auth state mismatch:', {
        currentAuthUserUid: currentAuthUser?.uid,
        currentUserUid: currentUser.uid,
      });
      alert('Authentication error. Please refresh the page and try again.');
      onBack();
      return;
    }

    // Use currentUser.uid to ensure it matches request.auth.uid in Firestore rules
    const playerId = currentUser.uid;
    
    // Verify userData.uid matches currentUser.uid
    if (userData.uid !== playerId) {
      console.error('User data mismatch:', {
        currentUserUid: playerId,
        userDataUid: userData.uid,
      });
      alert('Authentication error. Please log out and log back in.');
      onBack();
      return;
    }

    const avgBuzzTime = buzzTimes.length > 0
      ? buzzTimes.reduce((a, b) => a + b, 0) / buzzTimes.length
      : 0;

    // Use finalScore if provided (to ensure last question score is included), otherwise use current state
    const finalPlayerScore = finalScore !== undefined ? finalScore : playerScore;

    // Determine if this is a match or practice based on whether matchGameId was provided
    const gameType = matchGameId ? 'match' : 'practice';
    
    const matchHistory: Omit<MatchHistory, 'id' | 'startedAt' | 'completedAt'> = {
      gameId,
      playerId: playerId, // Use currentUser.uid to match request.auth.uid
      teamId: userData.teamId,
      type: gameType,
      score: finalPlayerScore,
      total: questions.length,
      avgBuzzTime: parseFloat(avgBuzzTime.toFixed(2)),
      correctBySubject,
      totalBySubject,
      questionIds: questions.map((q) => q.id),
      hesitationCount: 0,
    };

    try {
      // Verify user document exists in Firestore (required for some rules)
      let userDoc = await getUser(playerId);
      if (!userDoc) {
        console.warn('User document does not exist in Firestore, creating it...');
        try {
          // Create user document if it doesn't exist
          await setDoc(doc(db, 'users', playerId), {
            uid: playerId,
            email: currentUser.email || '',
            displayName: userData.displayName || '',
            role: userData.role,
            teamId: userData.teamId || null,
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp(),
          });
          console.log('User document created successfully');
          // Re-fetch to verify it was created
          userDoc = await getUser(playerId);
        } catch (userDocError: any) {
          console.error('Failed to create user document:', userDocError);
          throw new Error(`Cannot create user document: ${userDocError.message}`);
        }
      }
      
      // For students, ensure player document exists with correct userId
      if (userData.role === 'student') {
        const playerDoc = await getPlayer(playerId);
        if (!playerDoc) {
          console.warn('Player document does not exist, creating it...');
          try {
            await setDoc(doc(db, 'players', playerId), {
              userId: playerId, // Must match request.auth.uid for Firestore rules
              teamId: userData.teamId || '',
              displayName: userData.displayName || '',
              gamesPlayed: 0,
              totalScore: 0,
              totalQuestions: 0,
              avgBuzzTime: 0,
              correctBySubject: {},
              createdAt: serverTimestamp(),
            });
            console.log('Player document created successfully with userId:', playerId);
          } catch (playerDocError: any) {
            console.error('Failed to create player document:', playerDocError);
            // Don't throw - we'll try again later when updating stats
          }
        } else if (playerDoc.userId !== playerId) {
          // Fix userId if it doesn't match
          console.warn('Player document userId mismatch, fixing...', {
            currentUserId: playerDoc.userId,
            expectedUserId: playerId,
          });
          try {
            await setDoc(doc(db, 'players', playerId), {
              userId: playerId, // Ensure userId matches auth uid
            }, { merge: true });
            console.log('Player document userId fixed');
          } catch (fixError: any) {
            console.error('Failed to fix player document userId:', fixError);
          }
        }
      }
      
      // Log authentication details for debugging
      console.log('Authentication check:', {
        currentUserUid: currentUser.uid,
        currentAuthUserUid: currentAuthUser?.uid,
        userDataUid: userData.uid,
        matchHistoryPlayerId: matchHistory.playerId,
        authMatch: currentUser.uid === matchHistory.playerId,
        authTokenExists: !!currentAuthUser,
        teamId: userData.teamId,
        userDocExists: !!userDoc,
        userDocRole: userDoc?.role,
      });
      
      // Verify playerId is a non-empty string
      if (!matchHistory.playerId || typeof matchHistory.playerId !== 'string') {
        throw new Error('Invalid playerId: must be a non-empty string');
      }
      
      // Verify playerId matches auth uid exactly
      if (matchHistory.playerId !== currentAuthUser.uid) {
        throw new Error(`PlayerId mismatch: ${matchHistory.playerId} !== ${currentAuthUser.uid}`);
      }
      
      console.log('Creating match history with data:', {
        ...matchHistory,
        playerId: matchHistory.playerId,
        teamId: matchHistory.teamId || 'undefined (will be omitted)',
      });
      
      // Double-check auth before writing
      const finalAuthCheck = auth.currentUser;
      if (!finalAuthCheck || finalAuthCheck.uid !== matchHistory.playerId) {
        throw new Error(`Final auth check failed: ${finalAuthCheck?.uid} !== ${matchHistory.playerId}`);
      }
      
      console.log('Final auth verification passed, creating match history...');
      await createMatchHistory(matchHistory);
      console.log('Match history created successfully!');
      
      // Get current player stats to calculate increments
      // Use playerId (currentUser.uid) to ensure consistency
      let currentPlayer = await getPlayer(playerId);
      
      // If player document doesn't exist, create it first
      if (!currentPlayer) {
        console.warn('Player document does not exist, creating it before updating stats...');
        try {
          await setDoc(doc(db, 'players', playerId), {
            userId: playerId, // Critical: must match request.auth.uid for rules
            teamId: userData.teamId || '',
            displayName: userData.displayName || '',
            gamesPlayed: 0,
            totalScore: 0,
            totalQuestions: 0,
            avgBuzzTime: 0,
            correctBySubject: {},
            createdAt: serverTimestamp(),
          });
          console.log('Player document created successfully');
          // Re-fetch to get the created document
          currentPlayer = await getPlayer(playerId);
        } catch (playerCreateError: any) {
          console.error('Failed to create player document:', playerCreateError);
          throw new Error(`Cannot create player document: ${playerCreateError.message}`);
        }
      }
      
      // Verify player document has userId field matching auth uid
      if (currentPlayer && currentPlayer.userId !== playerId) {
        console.warn('Player document userId mismatch, fixing...');
        try {
          await setDoc(doc(db, 'players', playerId), {
            ...currentPlayer,
            userId: playerId, // Ensure userId matches auth uid
          }, { merge: true });
          currentPlayer = await getPlayer(playerId);
        } catch (fixError: any) {
          console.error('Failed to fix player document:', fixError);
        }
      }
      
      const currentGamesPlayed = currentPlayer?.gamesPlayed || 0;
      const currentTotalScore = currentPlayer?.totalScore || 0;
      const currentTotalQuestions = currentPlayer?.totalQuestions || 0;
      const currentCorrectBySubject = currentPlayer?.correctBySubject || {};
      
      // Calculate new averages
      const newGamesPlayed = currentGamesPlayed + 1;
      const newTotalScore = currentTotalScore + finalPlayerScore;
      const newTotalQuestions = currentTotalQuestions + questions.length;
      const newAvgBuzzTime = buzzTimes.length > 0
        ? ((currentPlayer?.avgBuzzTime || 0) * currentGamesPlayed + avgBuzzTime) / newGamesPlayed
        : currentPlayer?.avgBuzzTime || 0;
      
      // Merge correctBySubject
      const mergedCorrectBySubject = { ...currentCorrectBySubject };
      Object.entries(correctBySubject).forEach(([subject, count]) => {
        mergedCorrectBySubject[subject] = (mergedCorrectBySubject[subject] || 0) + count;
      });

      console.log('Updating player stats:', {
        playerId,
        playerUserId: currentPlayer?.userId,
        authUid: currentAuthUser.uid,
        userIdMatch: currentPlayer?.userId === currentAuthUser.uid,
      });

      await updatePlayerStats(playerId, {
        gamesPlayed: newGamesPlayed,
        totalScore: newTotalScore,
        totalQuestions: newTotalQuestions,
        avgBuzzTime: parseFloat(newAvgBuzzTime.toFixed(2)),
        correctBySubject: mergedCorrectBySubject,
      });
      
      console.log('Player stats updated successfully!');

      // If this is a match (not practice), check if all players have completed
      if (matchGameId && gameType === 'match') {
        try {
          // Get the game to check player list
          const gameData = await getGame(matchGameId);
          if (!gameData) {
            console.error('Game data not found for match:', matchGameId);
            throw new Error('Game not found');
          }
          
          if (!gameData.playerIds || gameData.playerIds.length === 0) {
            console.error('No playerIds found in game data');
            throw new Error('No players in match');
          }
          
          // Include current player in completed set since we just created their match history
          const completedPlayerIds = new Set([playerId]);
          
          // Get all match histories for this game (with retry to account for eventual consistency)
          let allMatchHistories: MatchHistory[] = [];
          try {
            allMatchHistories = await getMatchHistoriesByGameId(matchGameId);
          } catch (err) {
            console.warn('Error fetching match histories, will retry:', err);
          }
          
          // Add all players from match histories to completed set
          allMatchHistories.forEach(mh => completedPlayerIds.add(mh.playerId));
          
          // If we don't see the current player's match history yet, wait a bit and retry
          // This handles Firestore's eventual consistency
          if (!allMatchHistories.some(mh => mh.playerId === playerId)) {
            console.log('Match history not yet visible in query, waiting and retrying...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            try {
              allMatchHistories = await getMatchHistoriesByGameId(matchGameId);
              allMatchHistories.forEach(mh => completedPlayerIds.add(mh.playerId));
            } catch (err) {
              console.warn('Error on retry fetching match histories:', err);
              // Continue anyway since we already have current player in the set
            }
          }
          
          // Check if all players have completed
          // Since we always include the current player, if there's only one player, this will be true
          const allPlayersCompleted = gameData.playerIds.every(pId => completedPlayerIds.has(pId));
          
          console.log('Match completion check:', {
            gameId: matchGameId,
            currentPlayerId: playerId,
            totalPlayers: gameData.playerIds.length,
            playerIds: gameData.playerIds,
            completedPlayers: Array.from(completedPlayerIds),
            allPlayersCompleted,
            gameStatus: gameData.status,
            matchHistoriesFound: allMatchHistories.length
          });
          
          if (allPlayersCompleted) {
            if (gameData.status !== 'completed') {
              // All players completed - update game status and send notifications
              console.log('All players completed! Completing match and sending notifications...');
              await updateGame(matchGameId, {
                status: 'completed',
                endedAt: new Date(),
              });
              
              // Get team info to find coach
              let coachId: string | undefined;
              try {
                if (gameData.teamId) {
                  const team = await getTeam(gameData.teamId);
                  coachId = team?.coachId;
                } else if (gameData.coachId) {
                  coachId = gameData.coachId;
                }
              } catch (err) {
                console.warn('Error fetching team/coach info:', err);
              }
              
              // Create notification for coach
              if (coachId) {
                try {
                  await createNotification({
                    userId: coachId,
                    type: 'match_end',
                    title: 'End of Match',
                    message: `Match ${gameData.matchIdCode || matchGameId.substring(0, 6).toUpperCase()} has ended. All players have completed.`,
                    gameId: matchGameId,
                    teamId: gameData.teamId || userData.teamId,
                    read: false,
                  });
                } catch (err) {
                  console.warn('Error creating coach notification:', err);
                }
              }
              
              // Create notifications for all students
              for (const pId of gameData.playerIds) {
                try {
                  await createNotification({
                    userId: pId,
                    type: 'match_end',
                    title: 'End of Match',
                    message: `Match ${gameData.matchIdCode || matchGameId.substring(0, 6).toUpperCase()} has ended. View your results!`,
                    gameId: matchGameId,
                    teamId: gameData.teamId || userData.teamId,
                    read: false,
                  });
                } catch (err) {
                  console.warn(`Error creating notification for player ${pId}:`, err);
                }
              }
            }
            
            // Navigate to match results (whether we just completed it or it was already completed)
            console.log('Navigating to match results...');
            navigate(`/match-results?gameId=${matchGameId}`);
            return;
          } else {
            console.log('Not all players completed yet:', {
              total: gameData.playerIds.length,
              completed: completedPlayerIds.size,
              missing: gameData.playerIds.filter(id => !completedPlayerIds.has(id))
            });
          }
        } catch (error: any) {
          console.error('Error checking match completion:', error);
          console.error('Error details:', {
            message: error?.message,
            code: error?.code,
            stack: error?.stack
          });
          // If there's an error, we can't determine completion status
          // But since we know the current player just completed, if there's only one player,
          // we should still complete the match
          try {
            const gameData = await getGame(matchGameId);
            if (gameData && gameData.playerIds && gameData.playerIds.length === 1 && gameData.playerIds[0] === playerId) {
              // Only one player and it's the current player - complete the match
              console.log('Single player match detected, completing despite error...');
              await updateGame(matchGameId, {
                status: 'completed',
                endedAt: new Date(),
              });
              
              // Get coach and send notifications
              let coachId: string | undefined;
              if (gameData.teamId) {
                const team = await getTeam(gameData.teamId);
                coachId = team?.coachId;
              } else if (gameData.coachId) {
                coachId = gameData.coachId;
              }
              
              if (coachId) {
                await createNotification({
                  userId: coachId,
                  type: 'match_end',
                  title: 'End of Match',
                  message: `Match ${gameData.matchIdCode || matchGameId.substring(0, 6).toUpperCase()} has ended.`,
                  gameId: matchGameId,
                  teamId: gameData.teamId || userData.teamId,
                  read: false,
                });
              }
              
              await createNotification({
                userId: playerId,
                type: 'match_end',
                title: 'End of Match',
                message: `Match ${gameData.matchIdCode || matchGameId.substring(0, 6).toUpperCase()} has ended. View your results!`,
                gameId: matchGameId,
                teamId: gameData.teamId || userData.teamId,
                read: false,
              });
              
              navigate(`/match-results?gameId=${matchGameId}`);
              return;
            }
          } catch (fallbackError) {
            console.error('Error in fallback completion check:', fallbackError);
          }
          // Continue with normal flow if we can't complete the match
        }
      }

      // For practice mode or if not all players completed, show normal completion message
      if (gameType === 'practice') {
        alert(`Practice Complete! Final Score: ${finalPlayerScore}/${questions.length}`);
        onBack();
      } else {
        // For matches, if we reach here, it means not all players completed yet
        // But we should still check one more time after a short delay in case of eventual consistency
        if (matchGameId) {
          setTimeout(async () => {
            try {
              const gameData = await getGame(matchGameId);
              if (gameData && gameData.status === 'completed') {
                // Match was completed by another player or eventual consistency caught up, navigate to results
                navigate(`/match-results?gameId=${matchGameId}`);
                return;
              }
            } catch (error) {
              console.error('Error checking match status:', error);
            }
          }, 2000); // Wait 2 seconds before showing waiting message
        }
        alert(`Match Complete! Final Score: ${finalPlayerScore}/${questions.length}\nWaiting for other players to finish...`);
        onBack();
      }
    } catch (error: any) {
      console.error('Error saving match history:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Match history data:', matchHistory);
      console.error('Auth state at error:', {
        currentUser: !!currentUser,
        currentUserUid: currentUser?.uid,
        currentAuthUser: !!currentAuthUser,
        currentAuthUserUid: currentAuthUser?.uid,
        userData: !!userData,
        userDataUid: userData?.uid,
      });
      
      // Provide more specific error message based on error code
      let errorMessage = 'Unknown error occurred';
      if (error?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please ensure you are logged in and your account is properly set up.';
      } else if (error?.code === 'unauthenticated') {
        errorMessage = 'You are not authenticated. Please log in and try again.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert(`Game completed but failed to save results.\n\nError: ${errorMessage}\n\nYour score: ${finalPlayerScore}/${questions.length}`);
      onBack();
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: 'url(/Environments/Olympus%20Arena.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="text-white text-2xl drop-shadow-lg">Loading questions...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div
        className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/Environments/Olympus Arena.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay interactive elements on top of background */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 overflow-auto">
        <div className="bg-purple-900 border-4 border-red-500 rounded-3xl p-12 max-w-md w-full text-center">
          <h2 className="text-3xl font-black text-white mb-4">No Questions Available</h2>
          <p className="text-white/70 mb-6">
            There are no questions available for your selected settings. Please try a different subject or ask your coach to add more questions.
          </p>
          <button
            onClick={onBack}
            className="w-full bg-yellow-500 hover:bg-orange-500 text-black font-black text-xl py-4 rounded-xl"
          >
            GO BACK
          </button>
        </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const revealedText = currentQuestion.questionText
    .split(' ')
    .slice(0, revealedWordsCount)
    .join(' ');

  return (
    <div
      className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/Environments/Olympus Arena.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay interactive elements on top of background */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 overflow-auto">
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors z-20 shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
      {showCorrect && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="relative transform border-8 border-green-500 rounded-xl p-4 bg-green-900/90 shadow-2xl animate-pulse">
            <h1 className="text-6xl md:text-9xl font-black text-green-400 uppercase" style={{ WebkitTextStroke: '2px black' }}>
              CORRECT
            </h1>
          </div>
        </div>
      )}
      {showIncorrect && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="border-8 border-red-600 rounded-xl p-4 bg-red-900/90 rotate-[-15deg]">
            <h1 className="text-6xl md:text-9xl font-black text-red-500 uppercase" style={{ WebkitTextStroke: '2px black' }}>
              INCORRECT
            </h1>
          </div>
        </div>
      )}

      <div className="absolute top-8 right-8 bg-purple-950/80 border-2 border-cyan-400 px-6 py-3 rounded-full">
        <span className="text-cyan-400 font-black text-2xl">SCORE: {playerScore}</span>
      </div>

      <div className="relative w-40 h-40 flex items-center justify-center mb-6">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="80" cy="80" r={60} stroke="#1A0D3E" strokeWidth="12" fill="none" />
          <circle
            cx="80"
            cy="80"
            r={60}
            stroke={(() => {
              if (hasBuzzed && hesitationTimer !== null) {
                return hesitationTimer <= 3 ? '#ef4444' : '#00B8FF';
              }
              return timer <= 3 ? '#ef4444' : '#00B8FF';
            })()}
            strokeWidth="12"
            fill="none"
            strokeDasharray={2 * Math.PI * 60}
            strokeDashoffset={2 * Math.PI * 60 * (1 - (() => {
              if (hasBuzzed && hesitationTimer !== null) {
                return hesitationTimer / gameSettings.hesitationTime;
              }
              return timer / gameSettings.questionTime;
            })())}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-6xl font-black ${(() => {
            if (hasBuzzed && hesitationTimer !== null) {
              return hesitationTimer <= 3 ? 'text-red-500 animate-pulse' : 'text-white';
            }
            return timer <= 3 ? 'text-red-500 animate-pulse' : 'text-white';
          })()}`}>
            {hasBuzzed && hesitationTimer !== null ? hesitationTimer : timer}
          </span>
        </div>
      </div>

      {/* Question section - completely disappears after buzzing */}
      {!hasBuzzed && (
        <div className="relative w-full max-w-4xl mx-auto mb-8">
          {/* Show question when question is fully revealed (naturally, without buzzing) */}
          {currentQuestion && questionFullyRevealed && (
            <div className="bg-purple-950/90 border-2 border-cyan-400 rounded-xl p-8 text-center min-h-[160px] flex items-center justify-center">
              <h2 className="text-3xl md:text-5xl font-black text-white">
                {currentQuestion.questionText}
              </h2>
            </div>
          )}
          
          {/* Show question during word-by-word reveal (before buzz) */}
          {currentQuestion && !questionFullyRevealed && (
            <div className="bg-purple-950/90 border-2 border-cyan-400 rounded-xl p-8 text-center min-h-[160px] flex items-center justify-center">
              <h2 className="text-3xl md:text-5xl font-black text-white">
                {revealedText}
                <span className="animate-pulse text-cyan-400">|</span>
              </h2>
            </div>
          )}
        </div>
      )}

      {/* Hesitation message overlay - appears above answer choices when hesitation timer expires */}
      {showHesitation && hasBuzzed && !showResult && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="bg-red-900/95 border-4 border-red-500 rounded-xl p-8 text-center min-h-[160px] flex items-center justify-center">
            <h2 className="text-4xl md:text-6xl font-black text-red-400 uppercase">
              HESITATION
            </h2>
          </div>
        </div>
      )}

      {/* Show buzzer button when not buzzed (available until buzzed or timer expires) */}
      {!hasBuzzed ? (
        <button
          onClick={handleBuzz}
          disabled={!isQuestionLive}
          className={`w-48 h-48 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-8 border-orange-500 flex items-center justify-center transform hover:scale-110 active:scale-95 ${
            !isQuestionLive ? 'opacity-50' : ''
          }`}
        >
          <Bolt size={80} className="text-yellow-900" fill="currentColor" />
        </button>
      ) : (
        /* Show answer choices ONLY after buzzer is clicked */
        hasBuzzed && currentQuestion && shuffledAnswersQuestionId === currentQuestion.id && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
            {shuffledAnswers.map((answer, idx) => {
              const labels = ['A', 'B', 'C', 'D'];
              const colors = [COLOR_THEME.A_RED, COLOR_THEME.B_BLUE, COLOR_THEME.C_GREEN, COLOR_THEME.D_YELLOW];
              // Ensure we're checking against the current question's correct answer
              const isCorrect = answer === currentQuestion.correctAnswer;
              const glow =
                showResult && selectedAnswer === answer
                  ? isCorrect
                    ? 'shadow-[0_0_40px_rgba(56,255,255,0.8)]'
                    : 'shadow-[0_0_40px_rgba(239,68,68,0.8)]'
                  : '';
              return (
                <button
                  key={`${currentQuestion.id}-${idx}-${answer}`}
                  onClick={() => handleAnswer(answer)}
                  disabled={showResult || hesitationComplete}
                  className={`relative p-1 rounded-xl ${glow} hover:scale-[1.02] ${showResult || hesitationComplete ? 'opacity-50' : ''}`}
                >
                  <div className="bg-purple-950 border-2 border-white/20 rounded-xl flex items-center p-4">
                    <div
                      className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-center font-black text-2xl text-black rounded-l-xl flex-shrink-0"
                      style={{ backgroundColor: colors[idx] }}
                    >
                      {labels[idx]}
                    </div>
                    <span className="ml-20 text-xl font-bold text-white flex-1 text-left">{answer}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}

      {showResult && (selectedAnswer === null || selectedAnswer !== currentQuestion.correctAnswer) && (
        <div className="mt-4 text-2xl font-black text-green-400">
          Correct: {currentQuestion.correctAnswer}
        </div>
      )}
      </div>
    </div>
  );
};


