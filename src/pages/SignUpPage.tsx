import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUp } from '../components/Auth/SignUp';
import { useAuth } from '../context/AuthContext';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleSuccess = async () => {
    // Sign out the user after successful signup
    await logout();
    // Redirect to sign-in page
    navigate('/sign-in');
  };

  return (
    <SignUp
      onSuccess={handleSuccess}
      onCancel={() => navigate('/')}
      onBack={() => navigate('/')}
    />
  );
};



