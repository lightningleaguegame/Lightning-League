import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuestions } from '../context/QuestionsContext';
import { getTeam } from '../services/firestore';

export const RoleSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { questions, loading: questionsLoading } = useQuestions();
  const [numQuestions, setNumQuestions] = useState(5);
  const [practiceMode, setPracticeMode] = useState('Mix');
  const [hasQuestions, setHasQuestions] = useState(false);
  const [checkingQuestions, setCheckingQuestions] = useState(true);
  
  // Check if there are questions matching team level
  useEffect(() => {
    const checkQuestions = async () => {
      if (questionsLoading) {
        setCheckingQuestions(true);
        return;
      }

      try {
        if (userData?.role === 'coach' && userData?.teamId) {
          // For coaches: filter questions by team level
          const team = await getTeam(userData.teamId);
          if (team && team.levels && team.levels.length > 0) {
            const matchingQuestions = questions.filter(q => 
              team.levels!.includes(q.level)
            );
            setHasQuestions(matchingQuestions.length > 0);
          } else {
            // No team levels set, allow all questions
            setHasQuestions(questions.length > 0);
          }
        } else {
          // For students: questions are already filtered by team level in QuestionsContext
          setHasQuestions(questions.length > 0);
        }
      } catch (error) {
        console.error('Error checking questions:', error);
        setHasQuestions(false);
      } finally {
        setCheckingQuestions(false);
      }
    };

    checkQuestions();
  }, [questions, questionsLoading, userData]);

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set('numQuestions', numQuestions.toString());
    params.set('practiceMode', practiceMode);
    navigate(`/practice-mode?${params.toString()}`);
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
      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-8 px-4">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors z-20 shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
        <h2 className="text-4xl font-black text-white">SELECT PLAYER</h2>

        <div className="bg-purple-900 border-4 border-cyan-400 rounded-2xl p-8 max-w-md w-full">
          <h3 className="text-2xl font-bold text-cyan-400 mb-4">Practice Settings</h3>

          <div className="mb-6">
            <label className="block text-white text-sm font-bold uppercase mb-2">
              Number of Questions: {numQuestions}
            </label>
            <input
              type="range"
              min="0"
              max="30"
              step="5"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              className="w-full h-2 bg-purple-950 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-xs text-white/50 mt-1">
              <span>0</span>
              <span>10</span>
              <span>20</span>
              <span>30</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-white text-sm font-bold uppercase mb-2">Practice Mode</label>
            <select
              value={practiceMode}
              onChange={(e) => setPracticeMode(e.target.value)}
              className="w-full bg-purple-950 text-white p-3 rounded-lg border-2 border-cyan-400/30 font-bold"
            >
              <option>Mix</option>
              <option>Arts and Humanities</option>
              <option>Language Arts</option>
              <option>Math</option>
              <option>Science</option>
              <option>Social Studies</option>
            </select>
          </div>
        </div>

        {!hasQuestions && !checkingQuestions && !questionsLoading && (
          <div className="mb-4 p-4 bg-red-500/20 border-2 border-red-500 rounded-xl max-w-md w-full">
            <p className="text-red-400 text-sm font-bold text-center">
              No questions available. Please add questions that match your team level.
            </p>
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!hasQuestions || checkingQuestions || questionsLoading}
          className="bg-purple-900 border-4 border-yellow-500 disabled:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed p-12 rounded-2xl hover:bg-yellow-500 disabled:hover:bg-purple-900 transition-colors group"
        >
          <User size={64} className="mx-auto mb-4 text-white group-hover:text-black disabled:group-hover:text-white" />
          <span className="text-3xl font-bold text-white group-hover:text-black disabled:group-hover:text-white">
            {(questionsLoading || checkingQuestions) ? 'LOADING...' : 'START'}
          </span>
        </button>
      </div>
    </div>
  );
};



