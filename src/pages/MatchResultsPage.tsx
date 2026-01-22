import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MatchResults } from '../components/MatchResults';

export const MatchResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');

  const handleBack = () => {
    if (userData?.role === 'coach') {
      navigate('/coach-dashboard');
    } else {
      navigate('/student-dashboard');
    }
  };

  if (!gameId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">No game ID provided</div>
      </div>
    );
  }

  return <MatchResults gameId={gameId} onBack={handleBack} />;
};

