import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminQuestionManagement } from '../components/AdminQuestionManagement';

export const AdminQuestionManagementPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AdminQuestionManagement
      onBack={() => navigate('/admin-dashboard')}
    />
  );
};

