import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../components/AdminDashboard';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AdminDashboard
      onBack={() => navigate('/')}
      onUserManagement={() => navigate('/admin/users')}
      onQuestionManagement={() => navigate('/admin/questions')}
    />
  );
};

