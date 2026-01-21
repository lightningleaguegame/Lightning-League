import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTeamLeaderboard } from '../services/firestore';
import { LeaderboardEntry } from '../types/firebase';
import { Trophy } from 'lucide-react';

interface LeaderboardProps {
  onBack: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
  const { userData } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'accuracy' | 'buzzTime' | 'wins'>('accuracy');

  useEffect(() => {
    if (userData?.teamId) {
      loadLeaderboard();
    }
  }, [userData]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const entries = await getTeamLeaderboard(userData!.teamId!);
      setLeaderboard(entries);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      alert('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    switch (sortBy) {
      case 'accuracy':
        return b.accuracy - a.accuracy;
      case 'buzzTime':
        return a.avgBuzzTime - b.avgBuzzTime;
      case 'wins':
        return b.wins - a.wins;
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div 
        className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: 'url(/Environments/Stats2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="text-white text-2xl drop-shadow-lg">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/Environments/Stats2.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay interactive elements on top of background */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 overflow-auto">
      <div className="bg-purple-900 border-4 border-yellow-500 rounded-3xl p-12 max-w-4xl w-full">
        <div className="flex items-center mb-8 border-b border-yellow-500/30 pb-6">
          <Trophy className="text-yellow-500 mr-4" size={48} />
          <h1 className="text-5xl font-black text-white">TEAM LEADERBOARD</h1>
        </div>

        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setSortBy('accuracy')}
            className={`px-6 py-2 rounded-xl font-bold ${
              sortBy === 'accuracy'
                ? 'bg-yellow-500 text-black'
                : 'bg-purple-950 text-white border-2 border-white/20'
            }`}
          >
            By Accuracy
          </button>
          <button
            onClick={() => setSortBy('buzzTime')}
            className={`px-6 py-2 rounded-xl font-bold ${
              sortBy === 'buzzTime'
                ? 'bg-yellow-500 text-black'
                : 'bg-purple-950 text-white border-2 border-white/20'
            }`}
          >
            By Buzz Time
          </button>
          <button
            onClick={() => setSortBy('wins')}
            className={`px-6 py-2 rounded-xl font-bold ${
              sortBy === 'wins'
                ? 'bg-yellow-500 text-black'
                : 'bg-purple-950 text-white border-2 border-white/20'
            }`}
          >
            By Wins
          </button>
        </div>

        <div className="bg-purple-950 rounded-xl p-6">
          <div className="grid grid-cols-6 gap-4 pb-3 border-b border-white/20 font-bold text-cyan-400 uppercase text-sm">
            <div>Rank</div>
            <div>Player</div>
            <div>Accuracy</div>
            <div>Avg Buzz</div>
            <div>Wins</div>
            <div>Games</div>
          </div>
          <div className="divide-y divide-white/10">
            {sortedLeaderboard.map((entry, idx) => (
              <div key={entry.id} className="grid grid-cols-6 gap-4 py-4 items-center">
                <div className="text-yellow-500 font-black text-2xl">#{idx + 1}</div>
                <div className="text-white font-bold">{entry.displayName}</div>
                <div className="text-green-400 font-bold">{entry.accuracy.toFixed(1)}%</div>
                <div className="text-cyan-400 font-bold">{entry.avgBuzzTime.toFixed(2)}s</div>
                <div className="text-yellow-400 font-bold">{entry.wins}</div>
                <div className="text-white/70">{entry.totalGames}</div>
              </div>
            ))}
          </div>
          {sortedLeaderboard.length === 0 && (
            <div className="text-center text-white/50 py-8">No leaderboard entries yet</div>
          )}
        </div>

        <button onClick={onBack} className="w-full mt-6 bg-yellow-500 hover:bg-orange-500 text-black font-black text-2xl py-4 rounded-xl">
          BACK
        </button>
      </div>
      </div>
    </div>
  );
};





