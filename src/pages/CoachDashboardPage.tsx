import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CoachDashboard } from '../components/CoachDashboard';

export const CoachDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <CoachDashboard
      onBack={() => navigate('/')}
      onStartPractice={() => navigate('/role-select')}
      onQuestionEditor={() => navigate('/question-editor')}
      onLeaderboard={() => navigate('/leaderboard')}
      onMatchHistory={() => navigate('/match-history')}
      onStudentRoster={() => navigate('/student-roster')}
      onPerformanceReports={() => navigate('/performance-reports')}
      onGameSettings={() => navigate('/game-settings')}
      onQuestionValidation={() => navigate('/question-validation')}
      onTeamManagement={() => navigate('/team-management')}
      onCreateMatch={() => navigate('/create-match')}
    />
  );
};



