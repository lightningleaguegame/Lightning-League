import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getGame, getGameByMatchIdCode, getPlayer } from '../services/firestore';
import { ArrowLeft } from 'lucide-react';

interface MatchJoinProps {
  onJoin: (gameId: string) => void;
  onBack: () => void;
}

export const MatchJoin: React.FC<MatchJoinProps> = ({ onJoin, onBack }) => {
  const { userData } = useAuth();
  const [matchId, setMatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!matchId.trim()) {
      setError('Please enter a Match ID');
      return;
    }

    if (!userData) {
      setError('You must be logged in to join a match');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First try to find by matchIdCode, then fallback to gameId
      let game = null;
      try {
        game = await getGameByMatchIdCode(matchId);
      } catch (err: any) {
        console.error('Error getting game by matchIdCode:', err);
        // Continue to try as gameId
      }
      
      // If not found by matchIdCode, try as gameId (for backwards compatibility)
      if (!game) {
        try {
          game = await getGame(matchId);
        } catch (err: any) {
          console.error('Error getting game by gameId:', err);
          throw err; // Re-throw if this also fails
        }
      }
      
      if (!game) {
        setError('Match not found. Please check the Match ID Code.');
        return;
      }

      // Use the actual game document ID, not the matchIdCode
      const gameId = game.id;

      if (game.type !== 'match') {
        setError('This is not a match game. Please check the Match ID.');
        return;
      }

      if (game.status === 'completed') {
        setError('This match has already been completed.');
        return;
      }

      if (game.status === 'active') {
        setError('This match has already started.');
        return;
      }

      // Check if player already joined
      const playerIds = game.playerIds || [];
      if (playerIds.includes(userData.uid)) {
        setError('You have already joined this match.');
        return;
      }

      // Verify team membership matches the match's team
      if (game.teamId) {
        if (!userData.teamId) {
          setError('You must be on a team to join this match.');
          return;
        }
        if (userData.teamId !== game.teamId) {
          setError('You cannot join this match. This match is for a different team.');
          return;
        }
      }

      // Verify player document exists
      let player = null;
      try {
        player = await getPlayer(userData.uid);
      } catch (err: any) {
        console.error('Error getting player document:', err);
        throw new Error('Failed to load player profile. Please try again.');
      }
      if (!player) {
        setError('Player profile not found. Please contact support.');
        return;
      }

      // Join the match using the actual game document ID
      console.log('[DEBUG] MatchJoin - Resolved gameId:', gameId, 'from matchIdCode:', matchId);
      onJoin(gameId);
    } catch (err: any) {
      console.error('Error joining match:', err);
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack,
        userData: userData ? { uid: userData.uid, role: userData.role, teamId: userData.teamId } : null
      });
      setError(err.message || 'Failed to join match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-8 overflow-auto">
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors z-20 shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>

        <div className="bg-purple-900 border-4 border-cyan-400 rounded-2xl p-8 max-w-md w-full">
          <h2 className="text-4xl font-black text-white mb-6 text-center">JOIN MATCH</h2>

          <div className="mb-6">
            <label className="block text-white text-sm font-bold uppercase mb-3">
              Enter Match ID
            </label>
            <input
              type="text"
              value={matchId}
              onChange={(e) => {
                setMatchId(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="Enter Match ID"
              className="w-full bg-purple-950 text-white p-4 rounded-lg border-2 border-cyan-400/30 focus:border-cyan-400 font-bold text-xl text-center uppercase"
              maxLength={20}
              disabled={loading}
            />
            <p className="text-white/50 text-xs mt-2 text-center">
              Ask your coach for the Match ID
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border-2 border-red-500 rounded-xl">
              <p className="text-red-200 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={loading || !matchId.trim()}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black text-2xl py-4 px-8 rounded-xl font-black uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'JOINING...' : 'JOIN MATCH'}
          </button>
        </div>
      </div>
    </div>
  );
};

