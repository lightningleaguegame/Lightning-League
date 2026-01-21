import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, FileText, Shield } from 'lucide-react';
import { getAllUsers } from '../services/firestore';
import { getQuestions } from '../services/firestore';

interface AdminDashboardProps {
  onBack: () => void;
  onUserManagement: () => void;
  onQuestionManagement: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBack,
  onUserManagement,
  onQuestionManagement,
}) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalQuestions: 0,
    students: 0,
    coaches: 0,
    admins: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [users, questions] = await Promise.all([
        getAllUsers(),
        getQuestions(),
      ]);

      const userStats = {
        students: users.filter((u) => u.role === 'student').length,
        coaches: users.filter((u) => u.role === 'coach').length,
        admins: users.filter((u) => u.role === 'admin').length,
      };

      setStats({
        totalUsers: users.length,
        totalQuestions: questions.length,
        ...userStats,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
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
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-8 overflow-auto">
        <div className="bg-purple-900 border-4 border-purple-500 rounded-3xl p-12 max-w-5xl w-full">
          <div className="flex items-center justify-between mb-8 border-b border-purple-500/30 pb-6">
            <div className="flex items-center">
              <Shield className="text-purple-400 mr-4" size={48} />
              <h1 className="text-4xl font-black text-white">ADMIN DASHBOARD</h1>
            </div>
            <button
              onClick={onBack}
              className="p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-black" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-white">Loading statistics...</div>
          ) : (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-purple-950 rounded-xl p-6 border-2 border-purple-800">
                  <div className="flex items-center mb-3">
                    <Users className="w-8 h-8 text-cyan-400 mr-3" />
                    <span className="text-cyan-400 font-bold uppercase text-sm">Total Users</span>
                  </div>
                  <p className="text-4xl font-black text-white">{stats.totalUsers}</p>
                </div>

                <div className="bg-purple-950 rounded-xl p-6 border-2 border-purple-800">
                  <div className="flex items-center mb-3">
                    <FileText className="w-8 h-8 text-green-400 mr-3" />
                    <span className="text-green-400 font-bold uppercase text-sm">Total Questions</span>
                  </div>
                  <p className="text-4xl font-black text-white">{stats.totalQuestions}</p>
                </div>

                <div className="bg-purple-950 rounded-xl p-6 border-2 border-purple-800">
                  <div className="flex items-center mb-3">
                    <Users className="w-8 h-8 text-yellow-400 mr-3" />
                    <span className="text-yellow-400 font-bold uppercase text-sm">Students</span>
                  </div>
                  <p className="text-4xl font-black text-white">{stats.students}</p>
                </div>

                <div className="bg-purple-950 rounded-xl p-6 border-2 border-purple-800">
                  <div className="flex items-center mb-3">
                    <Users className="w-8 h-8 text-blue-400 mr-3" />
                    <span className="text-blue-400 font-bold uppercase text-sm">Coaches</span>
                  </div>
                  <p className="text-4xl font-black text-white">{stats.coaches}</p>
                </div>

                <div className="bg-purple-950 rounded-xl p-6 border-2 border-purple-800">
                  <div className="flex items-center mb-3">
                    <Shield className="w-8 h-8 text-red-400 mr-3" />
                    <span className="text-red-400 font-bold uppercase text-sm">Admins</span>
                  </div>
                  <p className="text-4xl font-black text-white">{stats.admins}</p>
                </div>
              </div>

              {/* Management Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={onUserManagement}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-black py-6 px-8 rounded-xl flex items-center justify-center space-x-3 transition-colors"
                >
                  <Users className="w-8 h-8" />
                  <span className="text-2xl">USER MANAGEMENT</span>
                </button>

                <button
                  onClick={onQuestionManagement}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black py-6 px-8 rounded-xl flex items-center justify-center space-x-3 transition-colors"
                >
                  <FileText className="w-8 h-8" />
                  <span className="text-2xl">QUESTION MANAGEMENT</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

