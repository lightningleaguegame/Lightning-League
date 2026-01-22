import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QuestionValidation } from '../components/QuestionValidation';

export const QuestionValidationPage: React.FC = () => {
  const navigate = useNavigate();

  return <QuestionValidation onBack={() => navigate('/coach-dashboard')} />;
};


