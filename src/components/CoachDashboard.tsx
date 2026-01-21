import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  Settings, 
  Users, 
  BarChart3, 
  Play,
  FileText,
  Trophy,
  AlertTriangle,
  Bell,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPlayersByTeam, getQuestions, createQuestion, markNotificationAsRead } from '../services/firestore';
import { Player, Question as FirestoreQuestion, Notification } from '../types/firebase';
import { parseCSVQuestions } from '../utils/csvParser';
import { onSnapshot, query, where, orderBy, limit, collection } from 'firebase/firestore';
import { db } from '../config/firebase';

interface CoachDashboardProps {
  onBack: () => void;
  onStartPractice: () => void;
  onQuestionEditor?: () => void;
  onQuestionValidation?: () => void;
  onLeaderboard?: () => void;
  onMatchHistory?: () => void;
  onStudentRoster?: () => void;
  onPerformanceReports?: () => void;
  onGameSettings?: () => void;
  onTeamManagement?: () => void;
  onCreateMatch?: () => void;
}

export function CoachDashboard({ 
  onBack, 
  onStartPractice,
  onQuestionEditor,
  onQuestionValidation,
  onLeaderboard,
  onMatchHistory,
  onStudentRoster,
  onPerformanceReports,
  onGameSettings,
  onTeamManagement,
  onCreateMatch,
}: CoachDashboardProps) {
  const navigate = useNavigate();
  const { userData, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<FirestoreQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    successCount: 0,
    errorCount: 0,
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotification, setShowNotification] = useState<Notification | null>(null);

  const loadData = useCallback(async () => {
    if (!userData) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch students if teamId exists
      let playersData: Player[] = [];
      if (userData.teamId) {
        playersData = await getPlayersByTeam(userData.teamId);
      }
      
      // Fetch questions: team-specific and coach-created questions
      const questionPromises: Promise<FirestoreQuestion[]>[] = [];
      
      if (userData.teamId) {
        questionPromises.push(getQuestions({ teamId: userData.teamId }));
      }
      
      if (userData.role === 'coach') {
        questionPromises.push(getQuestions({ coachId: userData.uid }));
      }
      
      const questionResults = await Promise.all(questionPromises);
      
      // Combine and deduplicate questions by ID
      const questionsMap = new Map<string, FirestoreQuestion>();
      questionResults.flat().forEach(q => {
        if (!questionsMap.has(q.id)) {
          questionsMap.set(q.id, q);
        }
      });
      
      setStudents(playersData || []);
      setQuestions(Array.from(questionsMap.values()));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStudents([]);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, loadData]);

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

  const avgAccuracy = students.length > 0
    ? students.reduce((sum, s) => {
        const accuracy = s.totalQuestions > 0 
          ? (s.totalScore / s.totalQuestions) * 100 
          : 0;
        return sum + accuracy;
      }, 0) / students.length
    : 0;

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!userData) {
      alert('You must be logged in to import questions.');
      return;
    }

    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          alert('CSV file is empty or invalid');
          setImporting(false);
          return;
        }

        // Parse CSV using the csvParser utility
        const parseResult = parseCSVQuestions(text);

        // Show errors if any
        if (parseResult.errors.length > 0) {
          const errorMessage = `Found ${parseResult.errors.length} error(s) in CSV:\n\n${parseResult.errors
            .slice(0, 10)
            .map((e) => `Row ${e.row}: ${e.error}`)
            .join('\n')}${parseResult.errors.length > 10 ? `\n... and ${parseResult.errors.length - 10} more` : ''}`;
          
          if (parseResult.questions.length === 0) {
            alert(errorMessage + '\n\nNo valid questions to import.');
            setImporting(false);
            return;
          }
          
          const proceed = window.confirm(
            errorMessage + 
            `\n\n${parseResult.questions.length} valid question(s) found. Continue importing valid questions?`
          );
          
          if (!proceed) {
            setImporting(false);
            return;
          }
        }

        if (parseResult.questions.length === 0) {
          alert('No valid questions found in CSV. Please check the format.\n\nExpected format: Question ID, Category, Subgroup, Difficulty, Level, Question Text, Answer, Distractor 1, Distractor 2, Distractor 3');
          setImporting(false);
          return;
        }

        // Create questions in Firestore
        let successCount = 0;
        let errorCount = 0;
        const totalQuestions = parseResult.questions.length;

        // Initialize progress
        setImportProgress({
          current: 0,
          total: totalQuestions,
          successCount: 0,
          errorCount: 0,
        });

        for (let i = 0; i < parseResult.questions.length; i++) {
          const csvQuestion = parseResult.questions[i];
          
          // Update progress
          setImportProgress({
            current: i + 1,
            total: totalQuestions,
            successCount,
            errorCount,
          });

          try {
            const questionData: Omit<FirestoreQuestion, 'id' | 'createdAt' | 'updatedAt'> = {
              subjectArea: csvQuestion.subjectArea,
              questionText: csvQuestion.questionText,
              correctAnswer: csvQuestion.correctAnswer,
              distractors: csvQuestion.distractors,
              level: csvQuestion.level || 'EL',
              isPublic: csvQuestion.isPublic !== undefined ? csvQuestion.isPublic : true,
              createdBy: userData.uid,
              teamId: csvQuestion.isPublic === false ? userData.teamId : undefined,
              importDate: new Date(),
              importYear: csvQuestion.importYear || new Date().getFullYear(),
              validationStatus: csvQuestion.validationStatus || 'pending',
            };

            await createQuestion(questionData);
            successCount++;
          } catch (error) {
            console.error('Error creating question:', error);
            errorCount++;
          }
        }

        // Final progress update
        setImportProgress({
          current: totalQuestions,
          total: totalQuestions,
          successCount,
          errorCount,
        });

        // Refresh the questions list
        await loadData();

        // Show success message
        if (errorCount === 0) {
          alert(`Successfully imported ${successCount} question${successCount !== 1 ? 's' : ''}!`);
        } else {
          alert(`Import completed with errors:\n${successCount} question${successCount !== 1 ? 's' : ''} imported successfully\n${errorCount} question${errorCount !== 1 ? 's' : ''} failed to import`);
        }
      } catch (error) {
        console.error('Error importing CSV:', error);
        alert('Error importing CSV file: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setImporting(false);
        // Reset the file input so the same file can be imported again
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      alert('Error reading file');
      setImporting(false);
    };

    reader.readAsText(file);
  };

  return (
    <div 
      className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/Environments/Coach%20Panel.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundClip: 'padding-box',
      }}
    >
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
      {/* Overlay to hide bottom text */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10"></div>
      
      {/* Import Progress Modal */}
      {importing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-2xl font-black text-gray-800 mb-6 text-center">Importing Questions</h3>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  Progress: {importProgress.current} / {importProgress.total}
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-full transition-all duration-300 ease-out"
                  style={{
                    width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Successfully imported:</span>
                <span className="text-sm font-bold text-green-600">{importProgress.successCount}</span>
              </div>
              {importProgress.errorCount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Errors:</span>
                  <span className="text-sm font-bold text-red-600">{importProgress.errorCount}</span>
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay interactive elements on top of background */}
      <div className="absolute inset-0 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header with Logo Centered */}
          <div className="flex items-center justify-center mb-8 relative">
            <button
              onClick={onBack}
              className="absolute left-0 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors shadow-lg"
            >
              <ArrowLeft className="w-6 h-6 text-black" />
            </button>
          </div>

          {/* Three Column Layout */}
          <div className="grid grid-cols-3 gap-6">
            {/* LEFT COLUMN: GAME CONTROLS */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border-2 border-yellow-500/30">
              <h2 className="text-2xl font-black text-gray-800 mb-6 text-center uppercase">GAME CONTROLS</h2>
              
              <div className="space-y-4">
                <button
                  onClick={onStartPractice}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  <span>Start Practice</span>
                </button>

                {onQuestionEditor && (
                  <button
                    onClick={onQuestionEditor}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    <span>Question Editor</span>
                  </button>
                )}

                {onQuestionValidation && (
                  <button
                    onClick={onQuestionValidation}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    <span>Validate Questions</span>
                  </button>
                )}

                {onGameSettings && (
                  <button
                    onClick={onGameSettings}
                    className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Game Settings</span>
                  </button>
                )}

                {onTeamManagement && (
                  <button
                    onClick={onTeamManagement}
                    className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Users className="w-5 h-5" />
                    <span>Team Management</span>
                  </button>
                )}

                {onCreateMatch && (
                  <button
                    onClick={onCreateMatch}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Play className="w-5 h-5" />
                    <span>Create Match</span>
                  </button>
                )}

                <label className={`w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors cursor-pointer ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Upload className="w-5 h-5" />
                  <span>{importing ? 'Importing...' : 'Import Questions'}</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    disabled={importing}
                    className="hidden"
                  />
                </label>

                {/* Stats Cards */}
                <div className="mt-6 space-y-3">
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <div className="flex items-center mb-2">
                      <FileText className="w-6 h-6 text-blue-600 mr-2" />
                      <span className="text-sm font-semibold text-gray-700">Questions</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{questions.length}</p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                    <div className="flex items-center mb-2">
                      <Users className="w-6 h-6 text-green-600 mr-2" />
                      <span className="text-sm font-semibold text-gray-700">Students</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{students.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* MIDDLE COLUMN: STUDENT ROSTER */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border-2 border-yellow-500/30">
              <h2 className="text-2xl font-black text-gray-800 mb-6 text-center uppercase">STUDENT ROSTER</h2>
              
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No students registered yet</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[600px]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-2 font-bold text-gray-700 text-sm">Name</th>
                        <th className="text-left py-3 px-2 font-bold text-gray-700 text-sm">Games</th>
                        <th className="text-left py-3 px-2 font-bold text-gray-700 text-sm">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const accuracy = student.totalQuestions > 0
                          ? ((student.totalScore / student.totalQuestions) * 100).toFixed(0)
                          : '0';
                        return (
                          <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-2 font-medium text-gray-800">{student.displayName}</td>
                            <td className="py-3 px-2 text-gray-600">{student.gamesPlayed || 0}</td>
                            <td className="py-3 px-2 font-bold text-green-600">{accuracy}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              {onStudentRoster && (
                <button
                  onClick={onStudentRoster}
                  className="w-full mt-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  View Full Roster
                </button>
              )}
            </div>

            {/* RIGHT COLUMN: REPORTS */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border-2 border-yellow-500/30">
              <h2 className="text-2xl font-black text-gray-800 mb-6 text-center uppercase">REPORTS</h2>
              
              <div className="space-y-4">
                {onLeaderboard && (
                  <button
                    onClick={onLeaderboard}
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Trophy className="w-5 h-5" />
                    <span>Leaderboard</span>
                  </button>
                )}

                {onMatchHistory && (
                  <button
                    onClick={onMatchHistory}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span>Match History</span>
                  </button>
                )}

                {onPerformanceReports && (
                  <button
                    onClick={onPerformanceReports}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span>Performance Reports</span>
                  </button>
                )}

                {/* Summary Stats */}
                <div className="mt-6 bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                  <div className="flex items-center mb-2">
                    <BarChart3 className="w-6 h-6 text-purple-600 mr-2" />
                    <span className="text-sm font-semibold text-gray-700">Avg. Accuracy</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{avgAccuracy.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
