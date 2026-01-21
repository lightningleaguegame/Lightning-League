import React, { useState } from 'react';
import { ArrowLeft, Play, Users, BookOpen } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface StudentConfigProps {
  onBack: () => void;
  onStartGame: () => void;
}

export function StudentConfig({ onBack, onStartGame }: StudentConfigProps) {
  const { questions, currentStudent, setCurrentStudent } = useGame();
  const [studentName, setStudentName] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [subject, setSubject] = useState('mixed');
  const [selectedAvatar, setSelectedAvatar] = useState('Zeus');

  const subjects = ['mixed', ...Array.from(new Set(questions.map(q => q.subject)))];
  
  const avatars = [
    'Zeus', 'Hera', 'Poseidon', 'Hades', 'Athena', 
    'Apollo', 'Artemis', 'Ares', 'Aphrodite', 'Hephaestus', 
    'Hermes', 'Hercules'
  ];

  const handleStartGame = () => {
    if (!studentName.trim()) return;

    // Create or find student
    let student = currentStudent;
    if (!student || student.name !== studentName) {
      student = {
        id: Date.now().toString(),
        name: studentName,
        avatar: selectedAvatar,
        stats: {
          matchHistory: [],
          totalGames: 0,
          averageAccuracy: 0,
          averageBuzzTime: 0,
          bestSubject: 'Mixed',
        },
      };
      setCurrentStudent(student);
    }

    // Filter and shuffle questions
    let filteredQuestions = subject === 'mixed' 
      ? questions 
      : questions.filter(q => q.subject === subject);

    if (filteredQuestions.length === 0) {
      alert('No questions available for the selected subject.');
      return;
    }

    // Shuffle and limit questions
    filteredQuestions = [...filteredQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, questionCount);

    onStartGame();
  };

  return (
    <div 
      className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/UI Mockups- Example/Lobby Screen.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay interactive form elements on top of mockup */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-2xl border-4 border-yellow-600">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-3 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <div className="flex items-center space-x-3">
            <img 
              src="/Decorative Assets/Greek Shield.png" 
              alt="Shield" 
              className="w-10 h-10"
            />
            <h2 className="text-3xl font-bold text-gray-800">Practice Configuration</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Student Info */}
          <div className="space-y-6">
            <div className="flex items-center text-green-600 mb-4">
              <Users className="w-6 h-6 mr-2" />
              <h3 className="text-lg font-semibold">Student Information</h3>
            </div>

            <div>
              <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="studentName"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Choose Your Avatar
              </label>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                {avatars.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`p-2 rounded-lg border-2 transition-all ${
                      selectedAvatar === avatar
                        ? 'border-yellow-500 bg-yellow-50 scale-110'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={`/Avatars/AVATAR- Transparent/${avatar}.png`}
                      alt={avatar}
                      className="w-full h-auto"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Game Settings */}
          <div className="space-y-6">
            <div className="flex items-center text-green-600 mb-4">
              <BookOpen className="w-6 h-6 mr-2" />
              <h3 className="text-lg font-semibold">Practice Settings</h3>
            </div>

            <div>
              <label htmlFor="questionCount" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Questions
              </label>
              <select
                id="questionCount"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={20}>20 Questions</option>
                <option value={30}>30 Questions</option>
              </select>
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject Focus
              </label>
              <select
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {subjects.map(s => (
                  <option key={s} value={s}>
                    {s === 'mixed' ? 'Mixed Subjects' : s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleStartGame}
            disabled={!studentName.trim()}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:hover:scale-100 hover:shadow-xl flex items-center space-x-3"
          >
            <Play className="w-6 h-6" />
            <span className="text-xl">Start Practice</span>
          </button>
        </div>

        {questions.length === 0 && (
          <div className="mt-6 p-4 bg-yellow-100 border border-yellow-400 rounded-lg text-yellow-700 text-center">
            No questions available. Please contact your coach to import questions.
          </div>
        )}
        </div>
      </div>
    </div>
  );
}