import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GameModeSelection } from '../components/GameModeSelection';

export const GameModeSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/sign-in');
    }
  }, [currentUser, loading, navigate]);

  const handleBack = () => {
    navigate('/');
  };

  // Show nothing while checking auth or redirecting
  if (loading || !currentUser) {
    return null;
  }

  return <GameModeSelection onBack={handleBack} />;
};


