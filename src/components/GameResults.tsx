import React from 'react';
import { ArrowLeft, Trophy, Target, Clock, Star, BookOpen } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface GameResultsProps {
  onBack: () => void;
  onPlayAgain: () => void;
}

export function GameResults({ onBack, onPlayAgain }: GameResultsProps) {
  const { gameState, currentStudent } = useGame();

  const accuracy = gameState.questionsAttempted > 0 
    ? Math.round((gameState.questionsCorrect / gameState.questionsAttempted) * 100)
    : 0;

  const getPerformanceMessage = () => {
    if (accuracy >= 90) return { message: 'Outstanding!', color: 'text-yellow-600', icon: Trophy };
    if (accuracy >= 80) return { message: 'Excellent!', color: 'text-green-600', icon: Star };
    if (accuracy >= 70) return { message: 'Good Job!', color: 'text-blue-600', icon: Target };
    if (accuracy >= 60) return { message: 'Keep Practicing!', color: 'text-purple-600', icon: Target };
    return { message: 'Try Again!', color: 'text-red-600', icon: Target };
  };

  const performance = getPerformanceMessage();
  const PerformanceIcon = performance.icon;

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/UI Mockups- Example/Results Screen.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay interactive elements on top of mockup */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-2xl w-full border-4 border-yellow-600">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-3 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <h2 className="text-3xl font-bold text-gray-800">Game Results</h2>
        </div>

        {/* Performance Header */}
        <div className="text-center mb-8">
          <div className="mb-4 relative">
            {/* Gold Wreath behind icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <img 
                src="/Decorative Assets/Gold Wreath Laurel.png" 
                alt="Wreath" 
                className="w-32 h-32 opacity-30"
              />
            </div>
            {currentStudent?.avatar && (
              <div className="mb-4 relative z-10">
                <img
                  src={`/Avatars/AVATAR- Transparent/${currentStudent.avatar}.png`}
                  alt={currentStudent.avatar}
                  className="w-24 h-24 mx-auto drop-shadow-lg"
                />
              </div>
            )}
            <PerformanceIcon className={`w-16 h-16 mx-auto mb-2 ${performance.color} relative z-10`} />
            <h3 className={`text-2xl font-bold ${performance.color} relative z-10`}>
              {performance.message}
            </h3>
          </div>
          {currentStudent && (
            <p className="text-gray-600 text-lg font-semibold">
              Great work, {currentStudent.name}!
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{gameState.questionsCorrect}</p>
            <p className="text-blue-800 font-medium">Correct Answers</p>
          </div>

          <div className="bg-purple-50 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{accuracy}%</p>
            <p className="text-purple-800 font-medium">Accuracy</p>
          </div>

          <div className="bg-green-50 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{gameState.questionsAttempted}</p>
            <p className="text-green-800 font-medium">Questions Attempted</p>
          </div>

          <div className="bg-yellow-50 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-yellow-600">{gameState.score}</p>
            <p className="text-yellow-800 font-medium">Final Score</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onPlayAgain}
            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            Play Again
          </button>
          
          <button
            onClick={onBack}
            className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            Back to Menu
          </button>
        </div>

        {/* Subject Breakdown */}
        {gameState.subjectStats && Object.keys(gameState.subjectStats).length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <BookOpen className="w-5 h-5 text-purple-600 mr-2" />
              <h4 className="text-lg font-semibold text-gray-800">Performance by Subject</h4>
            </div>
            <div className="space-y-3">
              {Object.entries(gameState.subjectStats)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([subject, stats]) => {
                  const subjectAccuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                  return (
                    <div key={subject} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border-2 border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-gray-800 text-lg">{subject}</span>
                        <span className="font-semibold text-purple-600">{subjectAccuracy}%</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>{stats.correct} correct out of {stats.total} questions</span>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              subjectAccuracy >= 80 ? 'bg-green-500' :
                              subjectAccuracy >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(subjectAccuracy, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Recent Performance */}
        {currentStudent && currentStudent.stats.matchHistory.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Recent Performance</h4>
            <div className="space-y-2">
              {currentStudent.stats.matchHistory.slice(0, 3).map((match, index) => (
                <div key={match.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-600">
                    Game {index + 1} • {match.questionsAttempted} questions
                  </span>
                  <span className="font-semibold text-gray-800">
                    {Math.round(match.accuracy)}% accuracy
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}