import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getGame, joinMatch, getPlayer } from '../services/firestore';
import { Game, Player } from '../types/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ArrowLeft } from 'lucide-react';

interface MatchWaitingRoomProps {
  gameId: string;
  onMatchStart: () => void;
  onBack: () => void;
}

interface PlayerInfo {
  playerId: string;
  displayName: string;
  avatar?: string;
}

export const MatchWaitingRoom: React.FC<MatchWaitingRoomProps> = ({
  gameId,
  onMatchStart,
  onBack,
}) => {
  const { userData } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userData || !gameId) return;

    // Join the match if not already joined
    const joinMatchIfNeeded = async () => {
      try {
        console.log('[DEBUG] Attempting to get game:', gameId, 'User:', userData?.uid);
        const currentGame = await getGame(gameId);
        console.log('[DEBUG] Game data:', currentGame);
        if (!currentGame) {
          setError('Match not found');
          setLoading(false);
          return;
        }

        const playerIds = currentGame.playerIds || [];
        console.log('[DEBUG] Current playerIds:', playerIds, 'User in list:', playerIds.includes(userData.uid));
        if (!playerIds.includes(userData.uid)) {
          console.log('[DEBUG] Attempting to join match...');
          await joinMatch(gameId, userData.uid);
          console.log('[DEBUG] Successfully joined match');
        }
      } catch (err: any) {
        console.error('[DEBUG] Error joining match:', err);
        console.error('[DEBUG] Error code:', err.code);
        console.error('[DEBUG] Error message:', err.message);
        setError(err.message || 'Failed to join match');
        setLoading(false);
      }
    };

    joinMatchIfNeeded();

    // Set up real-time listener for game updates
    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setError('Match not found');
        setLoading(false);
        return;
      }

      const gameData = snapshot.data();
      const updatedGame = {
        id: snapshot.id,
        ...gameData,
        startedAt: gameData.startedAt?.toDate() || new Date(),
        endedAt: gameData.endedAt?.toDate(),
      } as Game;

      setGame(updatedGame);

      // Load player information
      const playerIds = updatedGame.playerIds || [];
      const playerPromises = playerIds.map(async (playerId) => {
        const player = await getPlayer(playerId);
        if (player) {
          return {
            playerId: player.id,
            displayName: player.displayName,
            avatar: player.avatar,
          };
        }
        return null;
      });

      const playerResults = await Promise.all(playerPromises);
      setPlayers(playerResults.filter((p): p is PlayerInfo => p !== null));
      setLoading(false);

      // Check if match has started
      if (updatedGame.status === 'active') {
        onMatchStart();
      }
    });

    return () => unsubscribe();
  }, [gameId, userData, onMatchStart]);

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
        <div className="text-white text-2xl drop-shadow-lg">Joining match...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/Environments/Lobby.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <div className="bg-purple-900 border-4 border-red-500 rounded-2xl p-8 max-w-md w-full text-center">
            <h2 className="text-3xl font-black text-white mb-4">Error</h2>
            <p className="text-white/70 mb-6">{error}</p>
            <button
              onClick={onBack}
              className="w-full bg-yellow-500 hover:bg-orange-500 text-black font-black text-xl py-4 rounded-xl"
            >
              GO BACK
            </button>
          </div>
        </div>
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
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-8 overflow-auto">
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors z-20 shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>

        <div className="bg-purple-900 border-4 border-cyan-400 rounded-2xl p-8 max-w-2xl w-full">
          <h2 className="text-4xl font-black text-white mb-6 text-center">WAITING ROOM</h2>

          <div className="mb-6 text-center">
            <p className="text-cyan-400 text-lg font-bold mb-2">Match ID: {gameId}</p>
            <p className="text-white/70 text-sm">
              Waiting for match to start... ({players.length} player{players.length !== 1 ? 's' : ''} joined)
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-white text-xl font-bold mb-4 text-center">Players</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {players.map((player) => (
                <div
                  key={player.playerId}
                  className={`bg-purple-950 border-2 rounded-xl p-4 text-center ${
                    player.playerId === userData?.uid
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-cyan-400/30'
                  }`}
                >
                  {player.avatar ? (
                    <img
                      src={`/Avatars/AVATAR- Transparent/${player.avatar}.png`}
                      alt={player.avatar}
                      className="w-20 h-20 mx-auto mb-2 drop-shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 mx-auto mb-2 bg-purple-800 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-black text-white">
                        {player.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p className={`text-sm font-bold ${
                    player.playerId === userData?.uid ? 'text-yellow-400' : 'text-white'
                  }`}>
                    {player.displayName}
                    {player.playerId === userData?.uid && ' (You)'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-purple-950 border-2 border-cyan-400/50 rounded-xl p-4 text-center">
            <p className="text-white/70 text-sm">
              The match will begin when the coach starts it. Please wait...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

