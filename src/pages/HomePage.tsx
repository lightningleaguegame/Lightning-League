import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Play, Trophy, LayoutDashboard } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userData, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div 
      className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/Environments/Olympus%20Arena.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay interactive elements on top of background */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-80 h-80 mb-8">
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-2xl">
            <path
              d="M150 280 C 100 250, 20 180, 20 80 L 150 20 L 280 80 C 280 180, 200 250, 150 280 Z"
              fill="#1A0D3E"
              stroke="#00B8FF"
              strokeWidth="6"
            />
            <path
              d="M160 50 L 130 130 H 170 L 140 250 L 170 250 L 200 130 H 160 L 190 50 Z"
              fill="#38FFFF"
            />
            <text x="150" y="160" textAnchor="middle" fill="white" fontSize="36" fontWeight="bold">
              LIGHTNING
            </text>
            <text x="150" y="190" textAnchor="middle" fill="#00B8FF" fontSize="18" fontWeight="bold">
              LEAGUE
            </text>
          </svg>
        </div>

        {currentUser ? (
          <>
            <div className="mb-4 text-white text-lg drop-shadow-lg">
              Welcome, {userData?.displayName || currentUser.email}!
            </div>
            <button
              onClick={() => navigate('/game-mode-selection')}
              className="bg-yellow-500 hover:bg-orange-500 text-black text-3xl py-4 px-16 rounded-md font-black uppercase mb-4 drop-shadow-lg"
            >
              <Play className="inline mr-2" size={32} /> PLAY
            </button>
            <div className="flex gap-6">
              {userData?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin-dashboard')}
                  className="bg-yellow-500 hover:bg-orange-500 text-black text-xl py-2 px-8 rounded-md font-black uppercase drop-shadow-lg"
                >
                  <LayoutDashboard className="inline mr-2" size={24} /> ADMIN
                </button>
              )}
              {userData?.role === 'coach' && (
                <button
                  onClick={() => navigate('/coach-dashboard')}
                  className="bg-yellow-500 hover:bg-orange-500 text-black text-xl py-2 px-8 rounded-md font-black uppercase drop-shadow-lg"
                >
                  <LayoutDashboard className="inline mr-2" size={24} /> DASHBOARD
                </button>
              )}
              {userData?.role === 'student' && (
                <button
                  onClick={() => navigate('/student-dashboard')}
                  className="bg-yellow-500 hover:bg-orange-500 text-black text-xl py-2 px-8 rounded-md font-black uppercase drop-shadow-lg"
                >
                  <Trophy className="inline mr-2" size={24} /> STATS
                </button>
              )}
              <button
                onClick={handleLogout}
                className="bg-yellow-500 hover:bg-orange-500 text-black text-xl py-2 px-8 rounded-md font-black uppercase drop-shadow-lg"
              >
                LOGOUT
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/sign-in')}
              className="bg-yellow-500 hover:bg-orange-500 text-black text-3xl py-4 px-16 rounded-md font-black uppercase mb-4 drop-shadow-lg"
            >
              <Play className="inline mr-2" size={32} /> PLAY
            </button>
            <div className="flex gap-6">
              <button
                onClick={() => navigate('/sign-in')}
                className="bg-yellow-500 hover:bg-orange-500 text-black text-xl py-2 px-8 rounded-md font-black uppercase drop-shadow-lg"
              >
                SIGN IN
              </button>
              <button
                onClick={() => navigate('/sign-up')}
                className="bg-yellow-500 hover:bg-orange-500 text-black text-xl py-2 px-8 rounded-md font-black uppercase drop-shadow-lg"
              >
                SIGN UP
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};



