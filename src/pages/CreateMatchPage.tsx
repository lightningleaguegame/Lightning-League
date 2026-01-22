import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateMatch } from '../components/CreateMatch';

export const CreateMatchPage: React.FC = () => {
  const navigate = useNavigate();

  return <CreateMatch onBack={() => navigate('/coach-dashboard')} />;
};

