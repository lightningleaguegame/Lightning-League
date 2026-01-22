import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaderboard } from '../components/Leaderboard';

export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();

  return <Leaderboard onBack={() => navigate('/coach-dashboard')} />;
};



