import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPlayer, updatePlayerStats } from '../services/firestore';
import { ArrowLeft } from 'lucide-react';

interface AvatarSelectionProps {
  onBack: () => void;
}

// Avatar structure: { name: display name, path: folder path, filename: actual filename }
// All avatars from /Avatars/ folder (root and subfolders)
// Root folder avatars are preferred when duplicates exist
const AVATARS = [
  { name: 'Aphrodite', path: '/Avatars/', filename: 'Aphrodite' },
  { name: 'Apollo', path: '/Avatars/', filename: 'Apollo' },
  { name: 'Ares', path: '/Avatars/', filename: 'Ares' },
  { name: 'Artemis', path: '/Avatars/', filename: 'Artemis' },
  { name: 'Athena', path: '/Avatars/', filename: 'Athena' },
  { name: 'Hades', path: '/Avatars/', filename: 'Hades' },
  { name: 'Hera', path: '/Avatars/', filename: 'Hera' },
  { name: 'Hephaestus', path: '/Avatars/', filename: 'Hephaestus' },
  { name: 'Hercules', path: '/Avatars/', filename: 'Hercules' },
  { name: 'Hermes', path: '/Avatars/', filename: 'Hermes' },
  { name: 'Poseidon', path: '/Avatars/', filename: 'Poseidon' },
  { name: 'Zeus', path: '/Avatars/', filename: 'Zeus' },
  // Also include transparent version of Hera (HEra) from subfolder
  { name: 'Hera (Transparent)', path: '/Avatars/AVATAR- Transparent/', filename: 'HEra' },
];

export const AvatarSelection: React.FC<AvatarSelectionProps> = ({ onBack }) => {
  const { userData } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userData) {
      loadCurrentAvatar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  const loadCurrentAvatar = async () => {
    try {
      if (userData?.uid) {
        const player = await getPlayer(userData.uid);
        if (player?.avatar) {
          // Find matching avatar by name or filename
          const foundAvatar = AVATARS.find(
            av => av.name === player.avatar || av.filename === player.avatar || av.filename === 'HEra' && player.avatar === 'Hera'
          );
          if (foundAvatar) {
            setSelectedAvatar(JSON.stringify(foundAvatar));
          } else {
            setSelectedAvatar(JSON.stringify(AVATARS[0]));
          }
        } else {
          // Default to first avatar if none selected
          setSelectedAvatar(JSON.stringify(AVATARS[0]));
        }
      }
    } catch (error) {
      console.error('Error loading avatar:', error);
      setSelectedAvatar(JSON.stringify(AVATARS[0]));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userData?.uid || !selectedAvatar) return;

    try {
      setSaving(true);
      const avatarData = JSON.parse(selectedAvatar);
      // Save the avatar name for display purposes
      await updatePlayerStats(userData.uid, {
        avatar: avatarData.name,
      });
      alert('Avatar saved successfully!');
      onBack();
    } catch (error) {
      console.error('Error saving avatar:', error);
      alert('Failed to save avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: 'url(/Environments/Lobby.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="text-white text-2xl drop-shadow-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/Environments/Lobby.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay interactive elements on top of background */}
      <div className="absolute inset-0 flex flex-col items-center px-4 pt-16 pb-16 overflow-auto">
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors z-20 shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>

        <div className="bg-purple-900 border-4 border-cyan-400 rounded-2xl p-8 max-w-4xl w-full mt-8 mb-8">
          <h2 className="text-4xl font-black text-white mb-6 text-center">SELECT YOUR AVATAR</h2>

          <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-8">
            {AVATARS.map((avatar) => {
              const avatarKey = JSON.stringify(avatar);
              const isSelected = selectedAvatar === avatarKey;
              return (
                <button
                  key={avatarKey}
                  onClick={() => setSelectedAvatar(avatarKey)}
                  className={`p-4 rounded-xl border-4 transition-all ${
                    isSelected
                      ? 'bg-yellow-500 border-yellow-600 scale-110'
                      : 'bg-purple-950 border-cyan-400/30 hover:border-cyan-400'
                  }`}
                >
                  <img
                    src={`${avatar.path}${avatar.filename}.png`}
                    alt={avatar.name}
                    className="w-full h-auto"
                  />
                  <div className={`text-center mt-2 font-bold ${
                    isSelected ? 'text-black' : 'text-white'
                  }`}>
                    {avatar.name}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-4">
            <button
              onClick={onBack}
              className="flex-1 bg-purple-950 hover:bg-purple-800 text-white text-xl py-4 px-8 rounded-xl font-black uppercase transition-colors border-2 border-cyan-400/30"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selectedAvatar}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black text-xl py-4 px-8 rounded-xl font-black uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'SAVING...' : 'SAVE AVATAR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

