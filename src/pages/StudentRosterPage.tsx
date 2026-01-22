import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPlayersByTeam } from '../services/firestore';

export const StudentRosterPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (userData?.teamId && userData?.role === 'coach') {
      loadStudents();
    }
  }, [userData]);

  const loadStudents = async () => {
    if (userData?.teamId && userData?.role === 'coach') {
      try {
        const players = await getPlayersByTeam(userData.teamId);
        setStudents(players);
      } catch (error) {
        console.error('Error loading students:', error);
      }
    }
  };

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
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 overflow-auto">
        {/* Back button */}
        <button
          onClick={() => navigate('/coach-dashboard')}
          className="absolute top-4 left-4 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors z-20 shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
        <div className="bg-purple-900 border-4 border-blue-400 rounded-3xl p-12 max-w-4xl w-full">
          <div className="flex items-center mb-8 border-b border-blue-400/30 pb-6">
            <User className="text-blue-400 mr-4" size={48} />
            <h1 className="text-4xl font-black text-white">STUDENT ROSTER</h1>
          </div>

          <div className="bg-purple-950 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-4 gap-4 pb-3 border-b border-white/20 font-bold text-cyan-400 uppercase text-sm">
              <div>Name</div>
              <div>Games Played</div>
              <div>Avg Score</div>
              <div>Last Active</div>
            </div>
            <div className="divide-y divide-white/10">
              {students.map((student) => {
                const avgScore =
                  student.totalQuestions > 0
                    ? ((student.totalScore / student.totalQuestions) * 100).toFixed(0)
                    : '0';
                return (
                  <div key={student.id} className="grid grid-cols-4 gap-4 py-4 text-white">
                    <div>{student.displayName}</div>
                    <div>{student.gamesPlayed || 0}</div>
                    <div className="text-green-400 font-bold">{avgScore}%</div>
                    <div className="text-white/70">Recently</div>
                  </div>
                );
              })}
              {students.length === 0 && (
                <div className="text-center text-white/50 py-4">No students in team yet</div>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/coach-dashboard')}
            className="w-full bg-yellow-500 hover:bg-orange-500 text-black font-black text-2xl py-4 rounded-xl"
          >
            BACK TO DASHBOARD
          </button>
        </div>
      </div>
    </div>
  );
};



