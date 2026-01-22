import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentDashboard } from '../components/StudentDashboard';

export const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return <StudentDashboard onBack={() => navigate('/')} />;
};



