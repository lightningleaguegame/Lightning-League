import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getGameSettings, updateGameSettings } from '../services/firestore';

export const GameSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [gameSettings, setGameSettings] = useState({
    questionTime: 10,
    hesitationTime: 5,
    wpm: 150,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Always load settings - getGameSettings will handle fallback to 'default' if teamId doesn't exist
    if (userData !== undefined) {
      loadGameSettings();
    }
  }, [userData]); // Trigger when userData becomes available (even if teamId is undefined)

  const loadGameSettings = async () => {
    try {
      setLoading(true);
      console.log('GameSettingsPage: Loading settings for teamId:', userData?.teamId || 'default');
      const settings = await getGameSettings(userData?.teamId);
      console.log('GameSettingsPage: Loaded game settings from database:', settings);
      if (settings) {
        // Use actual values from database, don't fall back to defaults in the UI
        setGameSettings({
          questionTime: settings.questionTime,
          hesitationTime: settings.hesitationTime,
          wpm: settings.wpm,
        });
        console.log('GameSettingsPage: Updated state with settings:', {
          questionTime: settings.questionTime,
          hesitationTime: settings.hesitationTime,
          wpm: settings.wpm,
        });
      }
    } catch (error) {
      console.error('Error loading game settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateGameSettings(gameSettings, userData?.teamId);
      alert('Settings saved successfully!');
      navigate('/coach-dashboard');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  };

  return (
    <div 
      className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/Environments/Marble%20Throne%20Room.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay interactive elements on top of background */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 overflow-auto">
        {/* Back button */}
        <button
          onClick={() => navigate('/coach-dashboard')}
          className="absolute top-4 left-4 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors z-20 shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
        <div className="bg-purple-900 border-4 border-cyan-400 rounded-3xl p-12 max-w-2xl w-full">
          <div className="flex items-center mb-8 border-b border-cyan-400/30 pb-6">
            <Settings className="text-cyan-400 mr-4" size={48} />
            <h1 className="text-4xl font-black text-white">GAME SETTINGS</h1>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-white text-xl">Loading settings...</div>
            </div>
          ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">
                Reading Speed (WPM)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="10"
                  value={gameSettings.wpm}
                  onChange={(e) =>
                    setGameSettings({ ...gameSettings, wpm: parseInt(e.target.value) })
                  }
                  className="flex-1 h-2 bg-purple-950 rounded-lg cursor-pointer"
                />
                <span className="text-3xl font-black text-white w-20 text-center">
                  {gameSettings.wpm}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-yellow-500 text-sm font-bold uppercase mb-2">
                Question Timer (Seconds)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="1"
                  value={gameSettings.questionTime}
                  onChange={(e) =>
                    setGameSettings({ ...gameSettings, questionTime: parseInt(e.target.value) })
                  }
                  className="flex-1 h-2 bg-purple-950 rounded-lg cursor-pointer"
                />
                <span className="text-3xl font-black text-white w-20 text-center">
                  {gameSettings.questionTime}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-green-400 text-sm font-bold uppercase mb-2">
                Hesitation Timer (Seconds)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={gameSettings.hesitationTime}
                  onChange={(e) =>
                    setGameSettings({ ...gameSettings, hesitationTime: parseInt(e.target.value) })
                  }
                  className="flex-1 h-2 bg-purple-950 rounded-lg cursor-pointer"
                />
                <span className="text-3xl font-black text-white w-20 text-center">
                  {gameSettings.hesitationTime}
                </span>
              </div>
            </div>
          </div>
          )}

          <div className="flex gap-4 mt-8 pt-6 border-t border-cyan-400/30">
            <button
              onClick={() => navigate('/coach-dashboard')}
              className="flex-1 bg-purple-950 text-white/70 hover:text-white font-bold py-3 rounded-xl border-2 border-white/20"
            >
              CANCEL
            </button>
            <button
              onClick={handleSaveSettings}
              className="flex-1 bg-yellow-500 hover:bg-orange-500 text-black font-black py-3 rounded-xl"
            >
              SAVE SETTINGS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



