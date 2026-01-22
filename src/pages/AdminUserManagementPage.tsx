import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminUserManagement } from '../components/AdminUserManagement';

export const AdminUserManagementPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AdminUserManagement
      onBack={() => navigate('/admin-dashboard')}
    />
  );
};

