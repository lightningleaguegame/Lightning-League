import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatchJoin } from '../components/MatchJoin';
import { MatchWaitingRoom } from '../components/MatchWaitingRoom';

export const MatchJoinPage: React.FC = () => {
  const navigate = useNavigate();
  const [gameId, setGameId] = useState<string | null>(null);
  const [matchStarted, setMatchStarted] = useState(false);

  const handleJoin = (joinedGameId: string) => {
    setGameId(joinedGameId);
  };

  const handleMatchStart = () => {
    setMatchStarted(true);
    // Navigate to match play when match starts
    navigate(`/match-play?gameId=${gameId}`);
  };

  const handleBack = () => {
    if (gameId) {
      setGameId(null);
      setMatchStarted(false);
    } else {
      navigate('/game-mode-selection');
    }
  };

  if (gameId && !matchStarted) {
    return <MatchWaitingRoom gameId={gameId} onMatchStart={handleMatchStart} onBack={handleBack} />;
  }

  return <MatchJoin onJoin={handleJoin} onBack={handleBack} />;
};

