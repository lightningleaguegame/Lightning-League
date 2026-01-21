import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuestions } from '../context/QuestionsContext';
import { updateQuestion } from '../services/firestore';
import { Question } from '../types/firebase';
import { AlertTriangle, CheckCircle, XCircle, ArrowLeft, Search } from 'lucide-react';

interface QuestionValidationProps {
  onBack: () => void;
}

export const QuestionValidation: React.FC<QuestionValidationProps> = ({ onBack }) => {
  const { userData } = useAuth();
  const { questions: contextQuestions, loading: contextLoading, refreshQuestions } = useQuestions();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'flagged' | 'pending' | 'approved' | 'rejected'>('flagged');
  const [searchTerm, setSearchTerm] = useState('');

  // Use questions from context, filtered by coach/team
  useEffect(() => {
    if (!contextLoading && contextQuestions.length > 0) {
      let filtered = contextQuestions;
      
      // Filter by coach if coach role
      if (userData?.role === 'coach') {
        filtered = filtered.filter(q => 
          q.createdBy === userData.uid || 
          (userData.teamId && q.teamId === userData.teamId) ||
          q.isPublic
        );
      }
      
      setQuestions(filtered);
      setLoading(false);
    } else if (!contextLoading) {
      setLoading(false);
    }
  }, [contextQuestions, contextLoading, userData]);

  useEffect(() => {
    applyFilters();
  }, [questions, filter, searchTerm]);

  const applyFilters = () => {
    let filtered = [...questions];

    if (filter !== 'all') {
      filtered = filtered.filter((q) => q.validationStatus === filter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.questionText.toLowerCase().includes(searchLower) ||
          q.correctAnswer.toLowerCase().includes(searchLower) ||
          q.subjectArea.toLowerCase().includes(searchLower)
      );
    }

    setFilteredQuestions(filtered);
  };

  const handleApprove = async (questionId: string) => {
    try {
      await updateQuestion(questionId, {
        validationStatus: 'approved',
        validatedBy: userData!.uid,
        validatedAt: new Date(),
      });
      await refreshQuestions();
    } catch (error) {
      console.error('Error approving question:', error);
      alert('Failed to approve question');
    }
  };

  const handleReject = async (questionId: string) => {
    const reason = window.prompt('Why is this question being rejected?');
    if (!reason) return;

    try {
      await updateQuestion(questionId, {
        validationStatus: 'rejected',
        flaggedReason: reason,
      });
      await refreshQuestions();
    } catch (error) {
      console.error('Error rejecting question:', error);
      alert('Failed to reject question');
    }
  };

  const handleFlag = async (questionId: string) => {
    const reason = window.prompt('Why is this question being flagged?');
    if (!reason) return;

    try {
      await updateQuestion(questionId, {
        validationStatus: 'flagged',
        flaggedReason: reason,
      });
      await refreshQuestions();
    } catch (error) {
      console.error('Error flagging question:', error);
      alert('Failed to flag question');
    }
  };

  const handleClearValidation = async (questionId: string) => {
    try {
      await updateQuestion(questionId, {
        validationStatus: undefined,
        flaggedReason: undefined,
        validatedBy: undefined,
        validatedAt: undefined,
      });
      await refreshQuestions();
    } catch (error) {
      console.error('Error clearing validation:', error);
      alert('Failed to clear validation');
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-600';
      case 'flagged':
        return 'bg-orange-600';
      case 'rejected':
        return 'bg-red-600';
      case 'pending':
        return 'bg-yellow-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5" />;
      case 'flagged':
        return <AlertTriangle className="w-5 h-5" />;
      case 'rejected':
        return <XCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: 'url(/Environments/Coach%20Panel.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="text-white text-2xl drop-shadow-lg">Loading questions...</div>
      </div>
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
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-8 overflow-auto">
        <div className="bg-purple-900 border-4 border-purple-500 rounded-3xl p-12 max-w-6xl w-full">
          <div className="flex items-center mb-8 border-b border-purple-500/30 pb-6">
            <button
              onClick={onBack}
              className="mr-4 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors shadow-lg"
            >
              <ArrowLeft className="w-6 h-6 text-black" />
            </button>
            <h1 className="text-4xl font-black text-white">QUESTION VALIDATION</h1>
            <span className="ml-auto text-purple-400 font-bold">
              {filteredQuestions.length} Question{filteredQuestions.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Filters */}
          <div className="bg-purple-950 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm font-bold mb-2">Filter by Status</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="w-full bg-purple-900 text-white p-2 rounded border border-purple-500/30"
                >
                  <option value="all">All Questions</option>
                  <option value="flagged">Flagged</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-white text-sm font-bold mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search questions, answers, or subjects..."
                    className="w-full bg-purple-900 text-white p-2 pl-10 rounded border border-purple-500/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {filteredQuestions.length === 0 ? (
              <div className="text-center text-white/70 py-12">
                No questions found matching your criteria.
              </div>
            ) : (
              filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-purple-950 rounded-xl p-6 border-2 border-purple-800"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-3 flex-wrap">
                      <span className="bg-purple-600 text-white px-3 py-1 rounded font-bold text-sm">
                        {q.subjectArea}
                      </span>
                      <span className="bg-yellow-600 text-white px-3 py-1 rounded font-bold text-sm">
                        {q.level === 'EL' ? 'Elementary' : q.level === 'MS' ? 'Middle School' : 'High School'}
                      </span>
                      {q.validationStatus && (
                        <span
                          className={`${getStatusColor(q.validationStatus)} text-white px-3 py-1 rounded font-bold text-sm flex items-center gap-1`}
                        >
                          {getStatusIcon(q.validationStatus)}
                          {q.validationStatus.charAt(0).toUpperCase() + q.validationStatus.slice(1)}
                        </span>
                      )}
                      <span className="text-white/50 text-sm">Year: {q.importYear}</span>
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-lg mb-3">{q.questionText}</h3>

                  {q.flaggedReason && (
                    <div className="bg-orange-900/30 border border-orange-500 rounded p-3 mb-3">
                      <span className="text-orange-400 text-xs font-bold">FLAGGED REASON: </span>
                      <span className="text-white">{q.flaggedReason}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-green-900/30 border border-green-500 rounded p-2">
                      <span className="text-green-400 text-xs font-bold">CORRECT: </span>
                      <span className="text-white">{q.correctAnswer}</span>
                    </div>
                    {q.distractors.map((d, i) => (
                      <div key={i} className="bg-red-900/20 border border-red-500/30 rounded p-2">
                        <span className="text-red-400 text-xs font-bold">DISTRACTOR {i + 1}: </span>
                        <span className="text-white">{d}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {q.validationStatus !== 'approved' && (
                      <button
                        onClick={() => handleApprove(q.id)}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        APPROVE
                      </button>
                    )}
                    {q.validationStatus !== 'flagged' && (
                      <button
                        onClick={() => handleFlag(q.id)}
                        className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        FLAG
                      </button>
                    )}
                    {q.validationStatus !== 'rejected' && (
                      <button
                        onClick={() => handleReject(q.id)}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        REJECT
                      </button>
                    )}
                    {q.validationStatus && (
                      <button
                        onClick={() => handleClearValidation(q.id)}
                        className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded font-bold text-sm"
                      >
                        CLEAR STATUS
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={onBack}
            className="w-full mt-6 bg-purple-950 text-white/70 hover:text-white font-bold py-3 rounded-xl border-2 border-white/20"
          >
            BACK TO DASHBOARD
          </button>
        </div>
      </div>
    </div>
  );
};


