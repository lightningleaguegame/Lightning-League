import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMatchHistoryByPlayer, getPlayer, getTeam, joinTeam, markNotificationAsRead } from '../services/firestore';
import { onSnapshot, query, where, orderBy, limit, collection } from 'firebase/firestore';
import { MatchHistory, Player, Notification } from '../types/firebase';
import { Trophy, Users, Bell, X } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { db } from '../config/firebase';

interface StudentDashboardProps {
  onBack: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { userData, refreshUserData } = useAuth();
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Team joining state
  const [teamId, setTeamId] = useState('');
  const [checkingTeam, setCheckingTeam] = useState(false);
  const [joiningTeam, setJoiningTeam] = useState(false);
  const [teamJoinError, setTeamJoinError] = useState('');
  const [foundTeamName, setFoundTeamName] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotification, setShowNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (userData) {
      loadData();
    }
  }, [userData]);

  // Listen for notifications
  useEffect(() => {
    if (!userData) return;

    const notificationsRef = collection(db, 'notifications');
    // Query without orderBy to avoid index requirement - we'll sort in memory
    const q = query(
      notificationsRef,
      where('userId', '==', userData.uid),
      where('read', '==', false),
      limit(50) // Get more to sort in memory
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Notification[];

      // Sort by createdAt in memory (newest first)
      newNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setNotifications(newNotifications);

      // Show the most recent unread notification
      if (newNotifications.length > 0) {
        const latestNotification = newNotifications[0];
        if (latestNotification.type === 'match_end') {
          setShowNotification(latestNotification);
        }
      }
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });

    return () => unsubscribe();
  }, [userData]);

  // Handle notification click - navigate to match results
  const handleNotificationClick = async (notification: Notification) => {
    if (notification.gameId) {
      // Mark as read
      await markNotificationAsRead(notification.id);
      setShowNotification(null);
      // Navigate to match results
      navigate(`/match-results?gameId=${notification.gameId}`);
    }
  };

  const handleDismissNotification = async (notification: Notification) => {
    await markNotificationAsRead(notification.id);
    setShowNotification(null);
  };

  // Check TeamID when it's 6 characters
  useEffect(() => {
    const checkTeamId = async () => {
      if (teamId.trim().length === 6) {
        setCheckingTeam(true);
        setTeamJoinError('');
        try {
          const team = await getTeam(teamId.trim().toUpperCase());
          if (team) {
            setFoundTeamName(team.name);
            setTeamJoinError('');
          } else {
            setFoundTeamName(null);
            setTeamJoinError('Team ID not found. Please check with your coach.');
          }
        } catch (error) {
          setFoundTeamName(null);
          setTeamJoinError('Error checking Team ID. Please try again.');
        } finally {
          setCheckingTeam(false);
        }
      } else {
        setFoundTeamName(null);
        setTeamJoinError('');
      }
    };

    const timeoutId = setTimeout(checkTeamId, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [teamId]);

  const handleJoinTeam = async () => {
    if (!userData || !teamId.trim() || teamId.trim().length !== 6) {
      setTeamJoinError('Please enter a valid 6-character Team ID');
      return;
    }

    if (!foundTeamName) {
      setTeamJoinError('Please verify the Team ID is correct');
      return;
    }

    try {
      setJoiningTeam(true);
      setTeamJoinError('');
      const joinedTeamId = teamId.trim().toUpperCase();
      await joinTeam(userData.uid, joinedTeamId, userData.displayName);
      
      // Refresh user data to get updated teamId
      await refreshUserData();
      
      // Reload dashboard data to reflect the team join
      await loadData();
      
      // Clear the form
      setTeamId('');
      setFoundTeamName(null);
    } catch (err: any) {
      setTeamJoinError(err.message || 'Failed to join team. Please try again.');
    } finally {
      setJoiningTeam(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [historyData, playerData] = await Promise.all([
        getMatchHistoryByPlayer(userData!.uid, 20),
        getPlayer(userData!.uid),
      ]);
      setMatchHistory(historyData);
      setPlayer(playerData);
      
      // Load team name if teamId exists
      if (userData.teamId) {
        try {
          const team = await getTeam(userData.teamId);
          if (team) {
            setTeamName(team.name);
          }
        } catch (error) {
          console.error('Error loading team:', error);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const avgAccuracy = matchHistory.length > 0
    ? matchHistory.reduce((sum, m) => sum + (m.score / m.total) * 100, 0) / matchHistory.length
    : 0;

  const bestSubject = player?.correctBySubject
    ? Object.entries(player.correctBySubject).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
    : 'N/A';

  const chartData = matchHistory.slice(0, 10).reverse().map((match, idx) => ({
    name: `Match ${idx + 1}`,
    accuracy: (match.score / match.total) * 100,
    buzzTime: match.avgBuzzTime,
  }));

  if (loading) {
    return (
      <div 
        className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: 'url(/Environments/Statsboad.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="text-white text-2xl drop-shadow-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/Environments/Statsboad.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay interactive elements on top of background */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-8 overflow-auto">
      {/* Notification Banner */}
      {showNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <div className="bg-yellow-500 border-4 border-yellow-600 rounded-xl p-4 shadow-2xl flex items-center justify-between">
            <div className="flex items-center flex-1">
              <Bell className="text-black mr-3" size={24} />
              <div className="flex-1">
                <h3 className="text-black font-black text-lg">{showNotification.title}</h3>
                <p className="text-black/80 text-sm">{showNotification.message}</p>
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              {showNotification.gameId && (
                <button
                  onClick={() => handleNotificationClick(showNotification)}
                  className="bg-black text-yellow-500 font-bold px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  VIEW RESULTS
                </button>
              )}
              <button
                onClick={() => handleDismissNotification(showNotification)}
                className="bg-black/20 text-black hover:bg-black/30 rounded-lg p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-purple-900 border-4 border-yellow-500 rounded-3xl p-12 max-w-4xl w-full">
        <div className="flex items-center mb-8 border-b border-yellow-500/30 pb-6">
          <Trophy className="text-yellow-500 mr-4" size={48} />
          <div className="flex-1">
            <h1 className="text-5xl font-black text-white">MY STATS</h1>
            {userData?.teamId && (
              <div className="mt-2 space-y-1">
                <p className="text-cyan-400 text-sm">Team ID: {userData.teamId}</p>
                {teamName && (
                  <p className="text-cyan-400 text-sm">Team: {teamName}</p>
                )}
              </div>
            )}
          </div>
          {player?.avatar && (
            <div className="ml-4">
              <img
                src={`/Avatars/AVATAR- Transparent/${player.avatar}.png`}
                alt={player.avatar}
                className="w-24 h-24 drop-shadow-lg"
              />
            </div>
          )}
        </div>

        {/* Join Team Section - Show if student doesn't have a team */}
        {userData?.role === 'student' && !userData?.teamId && (
          <div className="bg-purple-950 border-2 border-cyan-400 rounded-xl p-6 mb-8">
            <div className="flex items-center mb-4">
              <Users className="text-cyan-400 mr-3" size={32} />
              <h2 className="text-2xl font-black text-white">JOIN A TEAM</h2>
            </div>
            <p className="text-white/70 mb-4">
              Enter your Team ID to join your coach's team. Ask your coach for the 6-character Team ID.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">
                  Team ID
                </label>
                <input
                  type="text"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character Team ID"
                  maxLength={6}
                  className="w-full bg-purple-900 text-white p-4 rounded-lg border-2 border-cyan-400/30 outline-none font-mono text-center text-xl tracking-widest"
                />
                {checkingTeam && (
                  <p className="text-white/50 text-sm mt-2">Checking Team ID...</p>
                )}
                {foundTeamName && !checkingTeam && (
                  <div className="mt-3 p-3 bg-green-900/30 border-2 border-green-500 rounded-lg">
                    <p className="text-green-400 font-bold text-sm uppercase mb-1">Team Found:</p>
                    <p className="text-white font-bold text-lg">{foundTeamName}</p>
                  </div>
                )}
                {teamJoinError && !checkingTeam && (
                  <p className="text-red-400 text-sm mt-2">{teamJoinError}</p>
                )}
              </div>
              
              <button
                onClick={handleJoinTeam}
                disabled={joiningTeam || !foundTeamName || teamId.trim().length !== 6}
                className="w-full bg-yellow-500 hover:bg-orange-500 text-black font-black text-xl py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joiningTeam ? 'JOINING TEAM...' : 'JOIN TEAM'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-purple-950 border-2 border-cyan-400 rounded-xl p-6 text-center">
            <div className="text-cyan-400 text-sm font-bold uppercase mb-2">Avg Accuracy</div>
            <div className="text-5xl font-black text-white">{avgAccuracy.toFixed(1)}%</div>
          </div>
          <div className="bg-purple-950 border-2 border-yellow-500 rounded-xl p-6 text-center">
            <div className="text-yellow-500 text-sm font-bold uppercase mb-2">Avg Buzz Time</div>
            <div className="text-5xl font-black text-white">
              {player?.avgBuzzTime ? player.avgBuzzTime.toFixed(2) : '0.00'}s
            </div>
          </div>
          <div className="bg-purple-950 border-2 border-green-400 rounded-xl p-6 text-center">
            <div className="text-green-400 text-sm font-bold uppercase mb-2">Best Subject</div>
            <div className="text-2xl font-black text-white">{bestSubject}</div>
          </div>
        </div>

        {matchHistory.length > 0 ? (
          <div className="bg-purple-950 rounded-xl p-6 mb-8">
            <h3 className="text-cyan-400 font-bold mb-4 uppercase">Performance Over Time</h3>
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
                <Line type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2} name="Accuracy %" />
                <Line type="monotone" dataKey="buzzTime" stroke="#F59E0B" strokeWidth={2} name="Buzz Time (s)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-purple-950 rounded-xl p-6 mb-8 text-center text-white/50">
            No match history yet. Start practicing to see your stats!
          </div>
        )}

        <div className="bg-purple-950 rounded-xl p-6 mb-8">
          <h3 className="text-cyan-400 font-bold mb-4 uppercase">Match History</h3>
          <div className="space-y-3">
            {matchHistory.slice(0, 5).map((match) => (
              <div key={match.id} className="flex justify-between py-3 border-b border-white/10 last:border-0">
                <span className="text-white/70">
                  {new Date(match.completedAt).toLocaleDateString()}
                </span>
                <div className="flex gap-6">
                  <span className="text-white font-bold">{match.score}/{match.total}</span>
                  <span className="text-cyan-400">{(match.score / match.total * 100).toFixed(0)}%</span>
                  <span className="text-yellow-500">{match.avgBuzzTime}s</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => navigate('/avatar-selection')}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-black text-xl py-4 rounded-xl"
          >
            CHANGE AVATAR
          </button>
          <button onClick={onBack} className="flex-1 bg-yellow-500 hover:bg-orange-500 text-black font-black text-2xl py-4 rounded-xl">
            BACK TO LOBBY
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};





