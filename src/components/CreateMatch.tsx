import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Users, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuestions } from '../context/QuestionsContext';
import { createGame, getGame, updateGame, getPlayersByTeam } from '../services/firestore';
import { Question, Game, Player } from '../types/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MatchResults } from './MatchResults';

interface CreateMatchProps {
  onBack: () => void;
}

export const CreateMatch: React.FC<CreateMatchProps> = ({ onBack }) => {
  const { userData } = useAuth();
  const { questions: allQuestions, loading: questionsLoading } = useQuestions();
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [creating, setCreating] = useState(false);
  const [match, setMatch] = useState<Game | null>(null);
  const [joinedPlayers, setJoinedPlayers] = useState<Player[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [matchIdCode, setMatchIdCode] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a short match ID code (6 characters, alphanumeric)
  const generateMatchIdCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Filter questions based on subject filter (computed value, not state)
  const filteredQuestions = subjectFilter
    ? allQuestions.filter(q => q.subjectArea === subjectFilter)
    : allQuestions;

  // Function to refresh joined players
  const refreshJoinedPlayers = async () => {
    if (!match || !userData?.teamId) return;
    
    try {
      const currentGame = await getGame(match.id);
      if (currentGame && currentGame.playerIds && currentGame.playerIds.length > 0) {
        const allPlayers = await getPlayersByTeam(userData.teamId);
        const joined = allPlayers.filter(p => currentGame.playerIds!.includes(p.userId));
        setJoinedPlayers(joined);
      } else {
        setJoinedPlayers([]);
      }
    } catch (error) {
      console.error('Error refreshing players:', error);
    }
  };

  useEffect(() => {
    if (match) {
      // Initial load of joined players
      refreshJoinedPlayers();

      // Set up auto-refresh every 5 seconds
      refreshIntervalRef.current = setInterval(() => {
        refreshJoinedPlayers();
      }, 5000);

      // Listen for real-time updates to the match
      const unsubscribe = onSnapshot(doc(db, 'games', match.id), async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const updatedMatch = {
            id: docSnapshot.id,
            ...data,
            startedAt: data.startedAt?.toDate() || new Date(),
            endedAt: data.endedAt?.toDate(),
          } as Game;
          setMatch(updatedMatch);
          // Update matchIdCode if it exists in the game
          if (updatedMatch.matchIdCode) {
            setMatchIdCode(updatedMatch.matchIdCode);
          }

          // Check if match has completed
          if (updatedMatch.status === 'completed') {
            setShowResults(true);
          }

          // Refresh joined players when match updates
          await refreshJoinedPlayers();
        }
      });

      return () => {
        unsubscribe();
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    } else {
      // Clear interval when match is null
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }
  }, [match, userData]);

  const handleCreateMatch = async () => {
    if (selectedQuestions.length === 0) {
      alert('Please select at least one question');
      return;
    }

    if (!userData?.teamId) {
      alert('You must have a team to create a match');
      return;
    }

    try {
      setCreating(true);
      // Generate match ID code
      const code = generateMatchIdCode();
      setMatchIdCode(code);
      
      const gameId = await createGame({
        type: 'match',
        teamId: userData.teamId,
        coachId: userData.uid,
        questionIds: selectedQuestions,
        status: 'waiting', // Start in waiting state
        playerIds: [],
      });

      // Store matchIdCode in the game document
      await updateGame(gameId, { matchIdCode: code } as any);

      const createdMatch = await getGame(gameId);
      if (createdMatch) {
        setMatch(createdMatch);
        // Load matchIdCode from the game if it exists
        if (createdMatch.matchIdCode) {
          setMatchIdCode(createdMatch.matchIdCode);
        }
      }
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Failed to create match');
    } finally {
      setCreating(false);
    }
  };

  const handleBeginMatch = async () => {
    if (!match) return;

    if (joinedPlayers.length === 0) {
      alert('At least one player must join before beginning the match');
      return;
    }

    try {
      await updateGame(match.id, {
        status: 'active',
      });
      // Don't navigate away - let coach see the match in progress
      // The match will be active and players can start playing
    } catch (error) {
      console.error('Error beginning match:', error);
      alert('Failed to begin match');
    }
  };

  const handleCancelMatch = async () => {
    if (!match) return;

    if (!window.confirm('Are you sure you want to cancel this match?')) return;

    try {
      await updateGame(match.id, {
        status: 'completed',
      });
      setMatch(null);
      setSelectedQuestions([]);
      setJoinedPlayers([]);
    } catch (error) {
      console.error('Error canceling match:', error);
      alert('Failed to cancel match');
    }
  };

  const handleSelectQuestions = () => {
    // Auto-select random questions based on numQuestions
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(numQuestions, filteredQuestions.length));
    setSelectedQuestions(selected.map(q => q.id));
  };

  if (questionsLoading) {
    return (
      <div 
        className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: 'url(/Environments/Coach%20Panel.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="text-white text-2xl">Loading questions...</div>
      </div>
    );
  }

  // Show match results if match is completed
  if (showResults && match) {
    return (
      <MatchResults
        gameId={match.id}
        onBack={() => {
          setShowResults(false);
          setMatch(null);
          setSelectedQuestions([]);
          setJoinedPlayers([]);
        }}
      />
    );
  }

  return (
    <div 
      className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/Environments/Coach%20Panel.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay interactive elements on top of background */}
      <div className="inset-0 flex flex-col items-center justify-center px-4 overflow-auto py-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors z-20 shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>

        <div className="bg-purple-900 border-4 border-cyan-400 rounded-3xl p-12 max-w-4xl w-full">
          <div className="flex items-center mb-8 border-b border-cyan-400/30 pb-6">
            <Play className="text-cyan-400 mr-4" size={48} />
            <h1 className="text-4xl font-black text-white">CREATE MATCH</h1>
          </div>

          {!match ? (
            <>
              {/* Match Configuration */}
              <div className="space-y-6 mb-6">
                <div className="bg-purple-950 rounded-xl p-6 border-2 border-cyan-400/30">
                  <label className="block text-cyan-400 text-sm font-bold uppercase mb-4">
                    Select Subject Area (Optional)
                  </label>
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="w-full bg-purple-900 text-white p-3 rounded-lg border-2 border-cyan-400/30"
                  >
                    <option value="">All Subjects</option>
                    <option value="SS">Social Studies</option>
                    <option value="SC">Science</option>
                    <option value="LA">Language Arts</option>
                    <option value="MA">Math</option>
                    <option value="AH">Arts & Humanities</option>
                  </select>
                </div>

                <div className="bg-purple-950 rounded-xl p-6 border-2 border-cyan-400/30">
                  <label className="block text-cyan-400 text-sm font-bold uppercase mb-4">
                    Number of Questions: {numQuestions}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                    className="w-full h-2 bg-purple-900 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-2">
                    <span>5</span>
                    <span>15</span>
                    <span>25</span>
                    <span>35</span>
                    <span>50</span>
                  </div>
                </div>

                <div className="bg-purple-950 rounded-xl p-6 border-2 border-cyan-400/30">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-cyan-400 text-sm font-bold uppercase">
                      Available Questions: {filteredQuestions.length}
                    </label>
                    <button
                      onClick={handleSelectQuestions}
                      disabled={filteredQuestions.length === 0}
                      className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Auto-Select {numQuestions} Questions
                    </button>
                  </div>
                  <div className="text-white/70 text-sm mb-2">
                    Selected: {selectedQuestions.length} questions
                  </div>
                  {selectedQuestions.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {selectedQuestions.map((qId) => {
                        const q = filteredQuestions.find(q => q.id === qId);
                        return q ? (
                          <div key={qId} className="bg-purple-900 rounded p-2 text-sm text-white flex items-center justify-between">
                            <span className="truncate flex-1">{q.questionText}</span>
                            <button
                              onClick={() => setSelectedQuestions(prev => prev.filter(id => id !== qId))}
                              className="ml-2 text-red-400 hover:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-cyan-400/30">
                <button
                  onClick={onBack}
                  className="flex-1 bg-purple-950 text-white/70 hover:text-white font-bold py-3 rounded-xl border-2 border-white/20"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleCreateMatch}
                  disabled={creating || selectedQuestions.length === 0}
                  className="flex-1 bg-yellow-500 hover:bg-orange-500 text-black font-black py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'CREATING...' : 'CREATE MATCH'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Match Waiting Room */}
              <div className="space-y-6 mb-6">
                <div className="bg-green-900/30 border-2 border-green-500 rounded-xl p-6">
                  <h2 className="text-2xl font-black text-green-400 mb-2">Match Created!</h2>
                  <div className="bg-purple-950 border-2 border-cyan-400 rounded-lg p-4 mb-4">
                    <p className="text-cyan-400 text-sm font-bold uppercase mb-2">Match ID Code</p>
                    <p className="font-mono font-black text-4xl text-yellow-400 text-center tracking-wider">
                      {matchIdCode || match.id.substring(0, 6).toUpperCase()}
                    </p>
                  </div>
                  <p className="text-white/70 text-sm">
                    Share this Match ID Code with your students. They can join using the Match Join feature.
                  </p>
                </div>

                <div className="bg-purple-950 rounded-xl p-6 border-2 border-cyan-400/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-cyan-400 font-bold uppercase text-lg">
                      <Users className="inline w-5 h-5 mr-2" />
                      Joined Players ({joinedPlayers.length})
                    </h3>
                    <button
                      onClick={refreshJoinedPlayers}
                      className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                      title="Refresh player list"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>
                  {joinedPlayers.length === 0 ? (
                    <div className="text-center text-white/50 py-8">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Waiting for players to join...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {joinedPlayers.map((player) => (
                        <div
                          key={player.id}
                          className="bg-purple-900 rounded-lg p-4 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-white font-bold">{player.displayName}</div>
                            <div className="text-white/50 text-sm">
                              {player.gamesPlayed || 0} games played
                            </div>
                          </div>
                          <div className="text-green-400 font-bold">✓ Joined</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-purple-950 rounded-xl p-6 border-2 border-cyan-400/30">
                  <h3 className="text-cyan-400 font-bold uppercase mb-4">Match Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-white/70 uppercase text-xs mb-1">Questions</div>
                      <div className="text-white font-bold text-lg">{selectedQuestions.length}</div>
                    </div>
                    <div>
                      <div className="text-white/70 uppercase text-xs mb-1">Status</div>
                      <div className="text-white font-bold text-lg capitalize">{match.status}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-cyan-400/30">
                <button
                  onClick={handleCancelMatch}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl"
                >
                  CANCEL MATCH
                </button>
                <button
                  onClick={handleBeginMatch}
                  disabled={joinedPlayers.length === 0 || match.status === 'active'}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {match.status === 'active' ? 'MATCH ACTIVE' : 'BEGIN MATCH'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

