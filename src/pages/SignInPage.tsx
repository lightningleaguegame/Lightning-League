import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn } from '../components/Auth/SignIn';
import { useAuth } from '../context/AuthContext';

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  const handleSuccess = () => {
    if (userData?.role === 'coach') {
      navigate('/coach-dashboard');
    } else {
      navigate('/');
    }
  };

  return <SignIn onSuccess={handleSuccess} onBack={() => navigate('/')} />;
};



