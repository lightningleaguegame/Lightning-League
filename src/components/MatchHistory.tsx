import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMatchHistoryByPlayer, getMatchHistoryByTeam } from '../services/firestore';
import { MatchHistory } from '../types/firebase';
import { Trophy } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MatchHistoryProps {
  onBack: () => void;
}

export const MatchHistoryComponent: React.FC<MatchHistoryProps> = ({ onBack }) => {
  const { userData } = useAuth();
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  useEffect(() => {
    loadMatchHistory();
  }, [userData]);

  const loadMatchHistory = async () => {
    try {
      setLoading(true);
      let history: MatchHistory[] = [];
      if (userData?.role === 'coach' && userData.teamId) {
        history = await getMatchHistoryByTeam(userData.teamId, 50);
      } else if (userData) {
        history = await getMatchHistoryByPlayer(userData.uid, 50);
      }
      setMatchHistory(history);
    } catch (error) {
      console.error('Error loading match history:', error);
      alert('Failed to load match history');
    } finally {
      setLoading(false);
    }
  };

  const chartData = matchHistory.map((match, idx) => ({
    name: `Match ${matchHistory.length - idx}`,
    accuracy: (match.score / match.total) * 100,
    buzzTime: match.avgBuzzTime,
    score: match.score,
    total: match.total,
  }));

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
        <div className="text-white text-2xl drop-shadow-lg">Loading match history...</div>
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
      <div className="inset-0 flex flex-col items-center justify-center px-4 py-8 overflow-auto">
      <div className="bg-purple-900 border-4 border-green-400 rounded-3xl p-12 max-w-6xl w-full">
        <div className="flex items-center justify-between mb-8 border-b border-green-400/30 pb-6">
          <div className="flex items-center">
            <Trophy className="text-green-400 mr-4" size={48} />
            <h1 className="text-4xl font-black text-white">MATCH HISTORY</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-xl font-bold ${
                viewMode === 'list'
                  ? 'bg-green-500 text-black'
                  : 'bg-purple-950 text-white border-2 border-white/20'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`px-4 py-2 rounded-xl font-bold ${
                viewMode === 'graph'
                  ? 'bg-green-500 text-black'
                  : 'bg-purple-950 text-white border-2 border-white/20'
              }`}
            >
              Graph
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="bg-purple-950 rounded-xl p-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {matchHistory.map((match, idx) => (
                <div key={match.id} className="bg-purple-900 rounded-xl p-6 border-2 border-purple-800">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-white font-bold text-lg">Match {matchHistory.length - idx}</div>
                    <div className="text-white/50 text-sm">
                      {new Date(match.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-cyan-400 text-sm font-bold uppercase">Score</div>
                      <div className="text-white text-2xl font-black">
                        {match.score}/{match.total}
                      </div>
                    </div>
                    <div>
                      <div className="text-green-400 text-sm font-bold uppercase">Accuracy</div>
                      <div className="text-white text-2xl font-black">
                        {((match.score / match.total) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-yellow-400 text-sm font-bold uppercase">Avg Buzz</div>
                      <div className="text-white text-2xl font-black">{match.avgBuzzTime}s</div>
                    </div>
                    <div>
                      <div className="text-purple-400 text-sm font-bold uppercase">Type</div>
                      <div className="text-white text-lg font-bold uppercase">{match.type}</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-cyan-400 text-sm font-bold uppercase mb-3">Performance by Subject</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(() => {
                        // Get all subjects from both correctBySubject and totalBySubject
                        const allSubjects = new Set([
                          ...Object.keys(match.correctBySubject || {}),
                          ...Object.keys(match.totalBySubject || {})
                        ]);
                        
                        return Array.from(allSubjects)
                          .map(subject => {
                            const correctCount = match.correctBySubject[subject] || 0;
                            const totalCount = match.totalBySubject?.[subject] || 0;
                            const successRate = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
                            
                            return { subject, correctCount, totalCount, successRate };
                          })
                          .sort((a, b) => b.totalCount - a.totalCount)
                          .map(({ subject, correctCount, totalCount, successRate }) => (
                            <div key={subject} className="bg-purple-800 rounded-lg p-3 border-2 border-purple-700">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-white font-bold text-sm uppercase">{subject}</span>
                                <span className={`font-bold text-lg ${
                                  successRate >= 80 ? 'text-green-400' :
                                  successRate >= 60 ? 'text-yellow-400' :
                                  'text-red-400'
                                }`}>
                                  {successRate.toFixed(1)}%
                                </span>
                              </div>
                              <div className="text-white/70 text-xs mb-2">
                                {correctCount} correct out of {totalCount} question{totalCount !== 1 ? 's' : ''}
                              </div>
                              <div className="w-full bg-purple-900 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    successRate >= 80 ? 'bg-green-500' :
                                    successRate >= 60 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(successRate, 100)}%` }}
                                />
                              </div>
                            </div>
                          ));
                      })()}
                      {Object.keys(match.correctBySubject || {}).length === 0 && (
                        <div className="text-white/50 text-sm col-span-2">No subject data available</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {matchHistory.length === 0 && (
              <div className="text-center text-white/50 py-8">No match history yet</div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-purple-950 rounded-xl p-6">
              <h3 className="text-green-400 font-bold mb-4 uppercase">Accuracy Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #4B5563' }}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-purple-950 rounded-xl p-6">
              <h3 className="text-yellow-400 font-bold mb-4 uppercase">Average Buzz Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #4B5563' }}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Legend />
                  <Bar dataKey="buzzTime" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <button onClick={onBack} className="w-full mt-6 bg-green-500 hover:bg-green-400 text-black font-black text-2xl py-4 rounded-xl">
          BACK
        </button>
      </div>
      </div>
    </div>
  );
};





