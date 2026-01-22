import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QuestionEditor } from '../components/QuestionEditor';

export const QuestionEditorPage: React.FC = () => {
  const navigate = useNavigate();

  return <QuestionEditor onBack={() => navigate('/coach-dashboard')} />;
};



