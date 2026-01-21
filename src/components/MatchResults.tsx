import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getGame, getMatchHistoriesByGameId, getPlayer } from '../services/firestore';
import { Game, MatchHistory, Player } from '../types/firebase';
import { ArrowLeft, Trophy, Medal, Award } from 'lucide-react';

interface MatchResultsProps {
  gameId: string;
  onBack: () => void;
}

interface PlayerResult {
  playerId: string;
  displayName: string;
  avatar?: string;
  score: number;
  total: number;
  avgBuzzTime: number;
  accuracy: number;
  rank: number;
}

export const MatchResults: React.FC<MatchResultsProps> = ({ gameId, onBack }) => {
  const { userData } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true);
        
        // Load game info
        const gameData = await getGame(gameId);
        if (gameData) {
          setGame(gameData);
        }

        // Load all match histories for this game
        const matchHistories = await getMatchHistoriesByGameId(gameId);
        
        // Load player info for each match history
        const playerResults: PlayerResult[] = [];
        
        for (const history of matchHistories) {
          const player = await getPlayer(history.playerId);
          if (player) {
            const accuracy = history.total > 0 ? (history.score / history.total) * 100 : 0;
            playerResults.push({
              playerId: history.playerId,
              displayName: player.displayName,
              avatar: player.avatar,
              score: history.score,
              total: history.total,
              avgBuzzTime: history.avgBuzzTime,
              accuracy: accuracy,
              rank: 0, // Will be set after sorting
            });
          }
        }

        // Sort by score (descending), then by avgBuzzTime (ascending for ties)
        playerResults.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score; // Higher score first
          }
          return a.avgBuzzTime - b.avgBuzzTime; // Lower buzz time first for ties
        });

        // Assign ranks
        playerResults.forEach((result, index) => {
          result.rank = index + 1;
        });

        setResults(playerResults);
      } catch (error) {
        console.error('Error loading match results:', error);
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      loadResults();
    }
  }, [gameId]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Trophy className="w-8 h-8 text-yellow-400" />;
    } else if (rank === 2) {
      return <Medal className="w-8 h-8 text-gray-300" />;
    } else if (rank === 3) {
      return <Award className="w-8 h-8 text-amber-600" />;
    }
    return <span className="text-2xl font-black text-white">#{rank}</span>;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) {
      return 'bg-yellow-500/20 border-yellow-500';
    } else if (rank === 2) {
      return 'bg-gray-300/20 border-gray-300';
    } else if (rank === 3) {
      return 'bg-amber-600/20 border-amber-600';
    }
    return 'bg-purple-950 border-cyan-400/30';
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
        <div className="text-white text-2xl drop-shadow-lg">Loading results...</div>
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

        <div className="bg-purple-900 border-4 border-cyan-400 rounded-2xl p-8 max-w-4xl w-full">
          <h2 className="text-4xl font-black text-white mb-6 text-center">MATCH RESULTS</h2>

          {game && (
            <div className="mb-6 text-center">
              <p className="text-cyan-400 text-lg font-bold mb-2">
                Match ID: <span className="text-white font-mono">{game.matchIdCode || game.id.substring(0, 6).toUpperCase()}</span>
              </p>
              {game.endedAt && (
                <p className="text-white/70 text-sm">
                  Completed: {new Date(game.endedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {results.length === 0 ? (
            <div className="text-center text-white/70 py-8">
              <p>No results available yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-6 gap-4 pb-3 border-b border-cyan-400/30 font-bold text-cyan-400 uppercase text-sm">
                <div>Rank</div>
                <div>Player</div>
                <div className="text-center">Score</div>
                <div className="text-center">Accuracy</div>
                <div className="text-center">Avg Buzz</div>
                <div className="text-center">Total</div>
              </div>

              {/* Results */}
              {results.map((result) => (
                <div
                  key={result.playerId}
                  className={`grid grid-cols-6 gap-4 items-center p-4 rounded-xl border-2 ${getRankColor(result.rank)} ${
                    result.playerId === userData?.uid ? 'ring-2 ring-yellow-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {getRankIcon(result.rank)}
                  </div>
                  <div className="flex items-center gap-3">
                    {result.avatar ? (
                      <img
                        src={`/Avatars/AVATAR- Transparent/${result.avatar}.png`}
                        alt={result.avatar}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-purple-800 rounded-full flex items-center justify-center">
                        <span className="text-lg font-black text-white">
                          {result.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className={`font-bold ${
                      result.playerId === userData?.uid ? 'text-yellow-400' : 'text-white'
                    }`}>
                      {result.displayName}
                      {result.playerId === userData?.uid && ' (You)'}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-black text-yellow-400">{result.score}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-green-400">{result.accuracy.toFixed(1)}%</span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-cyan-400">{result.avgBuzzTime.toFixed(2)}s</span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-white/70">{result.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onBack}
            className="w-full mt-6 bg-yellow-500 hover:bg-orange-500 text-black font-black text-xl py-4 rounded-xl transition-colors"
          >
            BACK
          </button>
        </div>
      </div>
    </div>
  );
};


