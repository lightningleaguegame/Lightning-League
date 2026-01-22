import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PracticeMode } from '../components/PracticeMode';
import { useAuth } from '../context/AuthContext';
import { getGameSettings } from '../services/firestore';

export const PracticeModePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userData } = useAuth();
  const [gameSettings, setGameSettings] = useState({
    questionTime: 10,
    hesitationTime: 5,
    wpm: 150,
  });

  const numQuestions = parseInt(searchParams.get('numQuestions') || '5');
  const practiceMode = searchParams.get('practiceMode') || 'Mix';

  useEffect(() => {
    // Always load settings - getGameSettings will handle fallback to 'default' if teamId doesn't exist
    if (userData !== undefined) {
      loadGameSettings();
    }
  }, [userData]); // Trigger when userData becomes available (even if teamId is undefined)

  const loadGameSettings = async () => {
    try {
      console.log('PracticeModePage: Loading settings for teamId:', userData?.teamId || 'default');
      const settings = await getGameSettings(userData?.teamId);
      console.log('PracticeModePage: Loaded game settings from database:', settings);
      if (settings) {
        // Use actual values from database
        setGameSettings({
          questionTime: settings.questionTime,
          hesitationTime: settings.hesitationTime,
          wpm: settings.wpm,
        });
        console.log('PracticeModePage: Updated state with settings:', {
          questionTime: settings.questionTime,
          hesitationTime: settings.hesitationTime,
          wpm: settings.wpm,
        });
      }
    } catch (error) {
      console.error('Error loading game settings:', error);
    }
  };

  const handleBack = () => {
    if (userData?.role === 'coach') {
      navigate('/coach-dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <PracticeMode
      onBack={handleBack}
      numQuestions={numQuestions}
      practiceMode={practiceMode}
      gameSettings={gameSettings}
    />
  );
};



