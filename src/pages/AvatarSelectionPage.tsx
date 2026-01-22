import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarSelection } from '../components/AvatarSelection';

export const AvatarSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  return <AvatarSelection onBack={() => navigate('/student-dashboard')} />;
};

