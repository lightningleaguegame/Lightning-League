import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Zap, Clock, Award } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface GamePlayProps {
  onBack: () => void;
  onGameEnd: () => void;
}

export function GamePlay({ onBack, onGameEnd }: GamePlayProps) {
  const { 
    gameState, 
    settings, 
    revealNextWord, 
    buzzIn, 
    submitAnswer, 
    nextQuestion,
    endGame 
  } = useGame();

  const [timeLeft, setTimeLeft] = useState(settings.questionTimer);
  const [hesitationTimeLeft, setHesitationTimeLeft] = useState<number | null>(null);
  const [showHesitation, setShowHesitation] = useState(false);
  const revealIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!gameState.hasStarted || gameState.showAnswer) return;

    // Word revelation timer - stop when buzzed
    if (!gameState.hasBuzzed && gameState.revealedWords < gameState.currentQuestion?.question.split(' ').length!) {
      revealIntervalRef.current = setInterval(() => {
        revealNextWord();
      }, (60 / settings.readingSpeed) * 1000);

      return () => {
        if (revealIntervalRef.current) {
          clearInterval(revealIntervalRef.current);
          revealIntervalRef.current = null;
        }
      };
    } else {
      // Stop revealing when buzzed
      if (revealIntervalRef.current) {
        clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
      }
    }
  }, [gameState.revealedWords, gameState.hasBuzzed, gameState.hasStarted, gameState.showAnswer, revealNextWord, settings.readingSpeed, gameState.currentQuestion]);

  useEffect(() => {
    if (!gameState.hasStarted || gameState.showAnswer) return;

    // Main timer - only run when not buzzed
    if (!gameState.hasBuzzed) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up - auto submit or move to next
            if (!gameState.hasBuzzed) {
              buzzIn();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState.hasStarted, gameState.showAnswer, gameState.hasBuzzed, buzzIn]);

  // Hesitation timer - starts when buzzed in
  useEffect(() => {
    if (gameState.hasBuzzed && !gameState.showAnswer && hesitationTimeLeft === null) {
      setHesitationTimeLeft(settings.hesitationTimer);
      setShowHesitation(false);
    }

    if (hesitationTimeLeft !== null && hesitationTimeLeft > 0 && !gameState.showAnswer) {
      const timer = setInterval(() => {
        setHesitationTimeLeft(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            // Hesitation time expired
            setShowHesitation(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else if (hesitationTimeLeft === 0 && !gameState.showAnswer) {
      setShowHesitation(true);
    }
  }, [gameState.hasBuzzed, gameState.showAnswer, hesitationTimeLeft, settings.hesitationTimer]);

  // Reset hesitation state when moving to next question
  useEffect(() => {
    if (!gameState.hasBuzzed) {
      setHesitationTimeLeft(null);
      setShowHesitation(false);
    }
  }, [gameState.hasBuzzed]);

  const handleBuzzIn = () => {
    // Buzzer is immediately available when question starts
    if (gameState.hasBuzzed || !gameState.hasStarted) return;
    buzzIn();
    // Stop word revelation immediately
    if (revealIntervalRef.current) {
      clearInterval(revealIntervalRef.current);
      revealIntervalRef.current = null;
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (!gameState.hasBuzzed) return;
    submitAnswer(answer);
  };

  const handleNext = () => {
    if (gameState.questionIndex + 1 >= (gameState.currentQuestion ? 1 : 0)) {
      endGame();
      onGameEnd();
    } else {
      nextQuestion();
      setTimeLeft(settings.questionTimer);
    }
  };

  if (!gameState.currentQuestion) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative bg-cover bg-center"
        style={{
          backgroundImage: 'url(/Environments/Loading.png)',
        }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="text-white text-center relative z-10">
          <div className="mb-6">
            <img 
              src="/Decorative Assets/Lightning League Logo.png" 
              alt="Logo" 
              className="w-64 h-auto mx-auto drop-shadow-2xl animate-pulse"
            />
          </div>
          <h2 className="text-3xl font-bold mb-4 drop-shadow-lg">Loading game...</h2>
          <div className="flex justify-center space-x-2 mt-4">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const question = gameState.currentQuestion;
  const words = question.question.split(' ');
  const revealedText = words.slice(0, gameState.revealedWords).join(' ');

  // Determine which background image to show based on game state
  let backgroundImage = '/Environments/Olympus%20Arena.png';
  if (!gameState.hasBuzzed && gameState.revealedWords > 0) {
    backgroundImage = '/Environments/Olympus%20Arena.png';
  } else if (gameState.showAnswer) {
    backgroundImage = '/Environments/Olympus%20Arena.png';
  }

  return (
    <div 
      className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay interactive elements on top of mockup */}
      <div className="absolute inset-0">
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors z-20 shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>

        {/* Timer and Score - positioned based on mockup */}
        <div className="absolute top-4 right-4 flex items-center space-x-6 text-white z-20">
          <div className="flex items-center space-x-2 bg-black/30 px-4 py-2 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="font-bold text-lg">{timeLeft}s</span>
          </div>
          <div className="flex items-center space-x-2 bg-black/30 px-4 py-2 rounded-lg">
            <Award className="w-5 h-5" />
            <span className="font-bold text-lg">{gameState.score}/{gameState.questionsAttempted}</span>
          </div>
        </div>

        {/* Question text overlay - positioned based on mockup */}
        {gameState.currentQuestion && (
          <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-8 z-10">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border-4 border-yellow-600">
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Question {gameState.questionIndex + 1} • {question.subject}
                </span>
              </div>
              
              {/* Hide question when buzzed in */}
              {!gameState.hasBuzzed && (
                <div className="text-xl leading-relaxed text-gray-800 min-h-[3rem] flex items-center mb-4">
                  {revealedText}
                  {gameState.revealedWords < words.length && !gameState.hasBuzzed && (
                    <span className="animate-pulse text-purple-600">|</span>
                  )}
                </div>
              )}

              {/* Hesitation message */}
              {showHesitation && gameState.hasBuzzed && !gameState.showAnswer && (
                <div className="text-center p-6 mb-4 bg-red-100 text-red-800 border-4 border-red-500 rounded-xl">
                  <h3 className="text-3xl font-bold">HESITATION</h3>
                  <p className="text-lg mt-2">You took too long to answer!</p>
                </div>
              )}

              {/* Answer Choices - only show when buzzed in and not showing answer */}
              {gameState.hasBuzzed && !gameState.showAnswer && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {Object.entries(question.answers).map(([letter, answer]) => (
                    <button
                      key={letter}
                      onClick={() => handleAnswerSelect(letter)}
                      className="relative bg-gradient-to-br from-gray-50 to-gray-100 hover:from-yellow-50 hover:to-yellow-100 border-2 border-gray-300 hover:border-yellow-500 rounded-xl p-5 text-left transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center"
                    >
                      <span className="font-bold text-yellow-600 text-xl mr-3 flex-shrink-0">{letter}.</span>
                      <span className="text-gray-800 font-medium flex-1 text-left">{answer}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Answer Feedback */}
              {gameState.showAnswer && (
                <div className="space-y-6 mt-6">
                  <div className={`text-center p-6 rounded-xl border-4 ${
                    gameState.selectedAnswer === question.correct
                      ? 'bg-green-100 text-green-800 border-green-500'
                      : 'bg-red-100 text-red-800 border-red-500'
                  }`}>
                    <h3 className="text-2xl font-bold mb-2">
                      {gameState.selectedAnswer === question.correct ? '✓ Correct!' : '✗ Incorrect'}
                    </h3>
                    <p className="text-lg">
                      The correct answer was: <strong>{question.correct}. {question.answers[question.correct]}</strong>
                    </p>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={handleNext}
                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-yellow-900 font-bold py-3 px-8 rounded-xl transition-colors border-2 border-yellow-700 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Next Question
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Buzz In button overlay - immediately available when question starts */}
        {!gameState.hasBuzzed && gameState.hasStarted && (
          <button
            onClick={handleBuzzIn}
            className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 bg-transparent hover:bg-white/10 rounded-lg p-8 transition-all z-20"
          >
            <span className="sr-only">Buzz In</span>
          </button>
        )}
      </div>
    </div>
  );
}