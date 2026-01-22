import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PracticeMode } from '../components/PracticeMode';
import { useAuth } from '../context/AuthContext';
import { getGame, getQuestionsByIds, getGameSettings } from '../services/firestore';
import { Game, Question } from '../types/firebase';

export const MatchPlayPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userData } = useAuth();
  const gameId = searchParams.get('gameId');
  
  const [match, setMatch] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameSettings, setGameSettings] = useState({
    questionTime: 10,
    hesitationTime: 5,
    wpm: 150,
  });

  useEffect(() => {
    if (!gameId) {
      setError('No game ID provided');
      setLoading(false);
      return;
    }

    if (!userData) {
      setLoading(true);
      return;
    }

    const loadMatch = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load match
        const matchData = await getGame(gameId);
        if (!matchData) {
          setError('Match not found');
          setLoading(false);
          return;
        }

        // Check if match is active
        if (matchData.status !== 'active') {
          setError('Match is not active');
          setLoading(false);
          return;
        }

        // Check if user is part of the match
        if (matchData.playerIds && !matchData.playerIds.includes(userData.uid)) {
          setError('You are not part of this match');
          setLoading(false);
          return;
        }

        setMatch(matchData);

        // Load questions
        if (matchData.questionIds && matchData.questionIds.length > 0) {
          const matchQuestions = await getQuestionsByIds(matchData.questionIds);
          if (matchQuestions.length === 0) {
            setError('No questions found for this match');
            setLoading(false);
            return;
          }
          setQuestions(matchQuestions);
        } else {
          setError('Match has no questions');
          setLoading(false);
          return;
        }

        // Load game settings
        const settings = await getGameSettings(matchData.teamId);
        if (settings) {
          setGameSettings({
            questionTime: settings.questionTime,
            hesitationTime: settings.hesitationTime,
            wpm: settings.wpm,
          });
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error loading match:', err);
        setError(err.message || 'Failed to load match');
        setLoading(false);
      }
    };

    loadMatch();
  }, [gameId, userData]);

  const handleBack = () => {
    navigate('/match-join');
  };

  if (loading) {
    return (
      <div
        className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: 'url(/Environments/Loading.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="text-white text-2xl drop-shadow-lg">Loading match...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/Environments/Lobby.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <div className="bg-purple-900 border-4 border-red-500 rounded-2xl p-8 max-w-md w-full text-center">
            <h2 className="text-3xl font-black text-white mb-4">Error</h2>
            <p className="text-white/70 mb-6">{error}</p>
            <button
              onClick={handleBack}
              className="w-full bg-yellow-500 hover:bg-orange-500 text-black font-black text-xl py-4 rounded-xl"
            >
              GO BACK
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!match || questions.length === 0) {
    return null;
  }

  // Use PracticeMode component with match questions and gameId
  return (
    <PracticeMode
      onBack={handleBack}
      numQuestions={questions.length}
      practiceMode="Mix"
      gameSettings={gameSettings}
      matchGameId={gameId || undefined}
      matchQuestions={questions}
    />
  );
};

