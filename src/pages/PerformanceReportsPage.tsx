import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Users, User, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPlayersByTeam, getMatchHistoryByTeam } from '../services/firestore';
import { Player, MatchHistory } from '../types/firebase';

export const PerformanceReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [students, setStudents] = useState<Player[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [viewMode, setViewMode] = useState<'aggregate' | 'individual'>('aggregate');
  const [selectedStudent, setSelectedStudent] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.teamId && userData?.role === 'coach') {
      loadData();
    }
  }, [userData]);

  const loadData = async () => {
    if (userData?.teamId && userData?.role === 'coach') {
      try {
        setLoading(true);
        const [players, history] = await Promise.all([
          getPlayersByTeam(userData.teamId),
          getMatchHistoryByTeam(userData.teamId, 100),
        ]);
        setStudents(players);
        setMatchHistory(history);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Calculate aggregate statistics
  const aggregateStats = {
    totalStudents: students.length,
    totalGames: students.reduce((sum, s) => sum + (s.gamesPlayed || 0), 0),
    totalQuestions: students.reduce((sum, s) => sum + (s.totalQuestions || 0), 0),
    totalCorrect: students.reduce((sum, s) => sum + (s.totalScore || 0), 0),
    avgAccuracy: students.length > 0
      ? students.reduce((sum, s) => {
          const accuracy = s.totalQuestions > 0 ? (s.totalScore / s.totalQuestions) * 100 : 0;
          return sum + accuracy;
        }, 0) / students.length
      : 0,
    avgBuzzTime: students.length > 0
      ? students.reduce((sum, s) => sum + (s.avgBuzzTime || 0), 0) / students.length
      : 0,
    subjectBreakdown: students.reduce((acc, s) => {
      if (s.correctBySubject) {
        Object.entries(s.correctBySubject).forEach(([subject, count]) => {
          acc[subject] = (acc[subject] || 0) + count;
        });
      }
      return acc;
    }, {} as Record<string, number>),
  };

  // Get individual student stats
  const getStudentStats = (student: Player) => {
    const studentHistory = matchHistory.filter(m => m.playerId === student.userId);
    const accuracy = student.totalQuestions > 0
      ? ((student.totalScore / student.totalQuestions) * 100)
      : 0;
    const bestSubject = student.correctBySubject
      ? Object.entries(student.correctBySubject).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      : 'N/A';
    
    return {
      ...student,
      accuracy,
      bestSubject,
      matchHistory: studentHistory,
      recentAccuracy: studentHistory.length > 0
        ? studentHistory.slice(0, 5).reduce((sum, m) => sum + (m.score / m.total) * 100, 0) / Math.min(5, studentHistory.length)
        : 0,
    };
  };

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
        <div className="text-white text-2xl">Loading performance data...</div>
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
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 overflow-auto py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/coach-dashboard')}
          className="absolute top-4 left-4 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors z-20 shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
        <div className="bg-purple-900 border-4 border-green-400 rounded-3xl p-8 max-w-6xl w-full">
          <div className="flex items-center mb-8 border-b border-green-400/30 pb-6">
            <Trophy className="text-green-400 mr-4" size={48} />
            <h1 className="text-4xl font-black text-white">PERFORMANCE REPORTS</h1>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => {
                setViewMode('aggregate');
                setSelectedStudent(null);
              }}
              className={`flex-1 py-3 px-6 rounded-xl font-bold transition-colors ${
                viewMode === 'aggregate'
                  ? 'bg-green-500 text-white'
                  : 'bg-purple-950 text-white/70 hover:text-white border-2 border-green-400/30'
              }`}
            >
              <BarChart3 className="inline w-5 h-5 mr-2" />
              Aggregate Stats
            </button>
            <button
              onClick={() => {
                setViewMode('individual');
                setSelectedStudent(null);
              }}
              className={`flex-1 py-3 px-6 rounded-xl font-bold transition-colors ${
                viewMode === 'individual'
                  ? 'bg-green-500 text-white'
                  : 'bg-purple-950 text-white/70 hover:text-white border-2 border-green-400/30'
              }`}
            >
              <User className="inline w-5 h-5 mr-2" />
              Individual Stats
            </button>
          </div>

          {viewMode === 'aggregate' ? (
            <>
              {/* Aggregate Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-purple-950 rounded-xl p-6 border-2 border-green-400/30 text-center">
                  <div className="text-white/70 text-sm uppercase mb-2">Total Students</div>
                  <div className="text-3xl font-black text-green-400">{aggregateStats.totalStudents}</div>
                </div>
                <div className="bg-purple-950 rounded-xl p-6 border-2 border-green-400/30 text-center">
                  <div className="text-white/70 text-sm uppercase mb-2">Total Games</div>
                  <div className="text-3xl font-black text-cyan-400">{aggregateStats.totalGames}</div>
                </div>
                <div className="bg-purple-950 rounded-xl p-6 border-2 border-green-400/30 text-center">
                  <div className="text-white/70 text-sm uppercase mb-2">Avg Accuracy</div>
                  <div className="text-3xl font-black text-yellow-400">{aggregateStats.avgAccuracy.toFixed(1)}%</div>
                </div>
                <div className="bg-purple-950 rounded-xl p-6 border-2 border-green-400/30 text-center">
                  <div className="text-white/70 text-sm uppercase mb-2">Avg Buzz Time</div>
                  <div className="text-3xl font-black text-orange-400">{aggregateStats.avgBuzzTime.toFixed(1)}s</div>
                </div>
              </div>

              <div className="bg-purple-950 rounded-xl p-6 mb-6 border-2 border-green-400/30">
                <h3 className="text-green-400 font-bold mb-4 uppercase flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Team Performance by Subject
                </h3>
                <div className="space-y-3">
                  {Object.entries(aggregateStats.subjectBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([subject, count]) => {
                      const subjectNames: Record<string, string> = {
                        'SS': 'Social Studies',
                        'SC': 'Science',
                        'LA': 'Language Arts',
                        'MA': 'Math',
                        'AH': 'Arts & Humanities',
                      };
                      return (
                        <div key={subject} className="flex items-center justify-between bg-purple-900 rounded-lg p-4">
                          <div className="text-white font-bold">{subjectNames[subject] || subject}</div>
                          <div className="text-2xl font-black text-green-400">{count} correct</div>
                        </div>
                      );
                    })}
                  {Object.keys(aggregateStats.subjectBreakdown).length === 0 && (
                    <div className="text-center text-white/50 py-4">No subject data available</div>
                  )}
                </div>
              </div>

              <div className="bg-purple-950 rounded-xl p-6 mb-6 border-2 border-green-400/30">
                <h3 className="text-green-400 font-bold mb-4 uppercase flex items-center">
                  <Trophy className="w-5 h-5 mr-2" />
                  Top Performers
                </h3>
                <div className="space-y-3">
                  {students
                    .map(s => getStudentStats(s))
                    .sort((a, b) => b.accuracy - a.accuracy)
                    .slice(0, 5)
                    .map((student) => (
                      <div
                        key={student.id}
                        className="flex justify-between items-center py-3 border-b border-white/10 last:border-0"
                      >
                        <div>
                          <div className="text-white font-bold">{student.displayName}</div>
                          <div className="text-white/50 text-sm">
                            {student.gamesPlayed || 0} games • {student.bestSubject} focus
                          </div>
                        </div>
                        <div className="text-2xl font-black text-green-400">{student.accuracy.toFixed(0)}%</div>
                      </div>
                    ))}
                  {students.length === 0 && (
                    <div className="text-center text-white/50 py-8">No performance data yet</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Individual Statistics */}
              {!selectedStudent ? (
                <div className="bg-purple-950 rounded-xl p-6 mb-6 border-2 border-green-400/30">
                  <h3 className="text-green-400 font-bold mb-4 uppercase flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Select Student to View Details
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {students.map((student) => {
                      const stats = getStudentStats(student);
                      return (
                        <button
                          key={student.id}
                          onClick={() => setSelectedStudent(student)}
                          className="w-full text-left bg-purple-900 hover:bg-purple-800 rounded-lg p-4 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-white font-bold">{student.displayName}</div>
                              <div className="text-white/50 text-sm">
                                {student.gamesPlayed || 0} games • {stats.accuracy.toFixed(0)}% accuracy
                              </div>
                            </div>
                            <div className="text-green-400 font-bold">View Details →</div>
                          </div>
                        </button>
                      );
                    })}
                    {students.length === 0 && (
                      <div className="text-center text-white/50 py-8">No students available</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-purple-950 rounded-xl p-6 border-2 border-green-400/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-green-400 font-bold text-xl uppercase">
                        {selectedStudent.displayName} - Performance Details
                      </h3>
                      <button
                        onClick={() => setSelectedStudent(null)}
                        className="bg-purple-900 hover:bg-purple-800 text-white px-4 py-2 rounded-lg"
                      >
                        Back to List
                      </button>
                    </div>
                    {(() => {
                      const stats = getStudentStats(selectedStudent);
                      return (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-purple-900 rounded-lg p-4 text-center">
                              <div className="text-white/70 text-xs uppercase mb-1">Games Played</div>
                              <div className="text-2xl font-black text-cyan-400">{stats.gamesPlayed || 0}</div>
                            </div>
                            <div className="bg-purple-900 rounded-lg p-4 text-center">
                              <div className="text-white/70 text-xs uppercase mb-1">Total Questions</div>
                              <div className="text-2xl font-black text-yellow-400">{stats.totalQuestions || 0}</div>
                            </div>
                            <div className="bg-purple-900 rounded-lg p-4 text-center">
                              <div className="text-white/70 text-xs uppercase mb-1">Overall Accuracy</div>
                              <div className="text-2xl font-black text-green-400">{stats.accuracy.toFixed(1)}%</div>
                            </div>
                            <div className="bg-purple-900 rounded-lg p-4 text-center">
                              <div className="text-white/70 text-xs uppercase mb-1">Avg Buzz Time</div>
                              <div className="text-2xl font-black text-orange-400">{stats.avgBuzzTime.toFixed(1)}s</div>
                            </div>
                          </div>

                          <div className="bg-purple-900 rounded-lg p-4 mb-4">
                            <div className="text-white/70 text-sm uppercase mb-2">Best Subject</div>
                            <div className="text-xl font-black text-green-400">{stats.bestSubject}</div>
                          </div>

                          <div className="bg-purple-900 rounded-lg p-4 mb-4">
                            <div className="text-white/70 text-sm uppercase mb-2">Performance by Subject</div>
                            <div className="space-y-2 mt-2">
                              {stats.correctBySubject
                                ? Object.entries(stats.correctBySubject)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([subject, count]) => {
                                      const subjectNames: Record<string, string> = {
                                        'SS': 'Social Studies',
                                        'SC': 'Science',
                                        'LA': 'Language Arts',
                                        'MA': 'Math',
                                        'AH': 'Arts & Humanities',
                                      };
                                      const total = stats.totalQuestions || 1;
                                      const percentage = (count / total) * 100;
                                      return (
                                        <div key={subject} className="flex items-center justify-between">
                                          <span className="text-white font-bold">{subjectNames[subject] || subject}</span>
                                          <div className="flex items-center gap-3">
                                            <div className="w-32 bg-purple-950 rounded-full h-2">
                                              <div
                                                className="bg-green-400 h-2 rounded-full"
                                                style={{ width: `${percentage}%` }}
                                              />
                                            </div>
                                            <span className="text-green-400 font-bold w-16 text-right">
                                              {count} ({percentage.toFixed(0)}%)
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })
                                : <div className="text-white/50 text-sm">No subject data available</div>}
                            </div>
                          </div>

                          <div className="bg-purple-900 rounded-lg p-4">
                            <div className="text-white/70 text-sm uppercase mb-2">Recent Performance</div>
                            <div className="text-white/50 text-sm">
                              Recent 5 matches average: <span className="text-green-400 font-bold">{stats.recentAccuracy.toFixed(1)}%</span>
                            </div>
                            <div className="text-white/50 text-sm mt-1">
                              Total matches: <span className="text-cyan-400 font-bold">{stats.matchHistory.length}</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </>
          )}

          <button
            onClick={() => navigate('/coach-dashboard')}
            className="w-full bg-yellow-500 hover:bg-orange-500 text-black font-black text-2xl py-4 rounded-xl mt-6"
          >
            BACK TO DASHBOARD
          </button>
        </div>
      </div>
    </div>
  );
};



