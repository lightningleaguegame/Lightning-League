import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MatchHistoryComponent } from '../components/MatchHistory';

export const MatchHistoryPage: React.FC = () => {
  const navigate = useNavigate();

  return <MatchHistoryComponent onBack={() => navigate('/coach-dashboard')} />;
};



