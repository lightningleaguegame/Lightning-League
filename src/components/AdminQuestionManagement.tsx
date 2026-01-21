import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from '../services/firestore';
import { Question } from '../types/firebase';

interface AdminQuestionManagementProps {
  onBack: () => void;
}

export const AdminQuestionManagement: React.FC<AdminQuestionManagementProps> = ({ onBack }) => {
  const { userData } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    isPublic: undefined as boolean | undefined,
    subjectArea: '',
    minYear: '',
    maxYear: '',
    validationStatus: '' as '' | 'pending' | 'approved' | 'flagged' | 'rejected',
  });

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Reset to first page when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, filters]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      // Admin can see ALL questions
      const allQuestions = await getQuestions();
      setQuestions(allQuestions);
    } catch (error) {
      console.error('Error loading questions:', error);
      alert('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...questions];

    if (filters.isPublic !== undefined) {
      filtered = filtered.filter((q) => q.isPublic === filters.isPublic);
    }
    if (filters.subjectArea) {
      filtered = filtered.filter((q) => q.subjectArea === filters.subjectArea);
    }
    if (filters.minYear) {
      filtered = filtered.filter((q) => q.importYear >= parseInt(filters.minYear));
    }
    if (filters.maxYear) {
      filtered = filtered.filter((q) => q.importYear <= parseInt(filters.maxYear));
    }
    if (filters.validationStatus) {
      filtered = filtered.filter((q) => q.validationStatus === filters.validationStatus);
    }

    setFilteredQuestions(filtered);
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQuestions = filteredQuestions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of questions list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreate = () => {
    setEditingQuestion(null);
    setShowForm(true);
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setShowForm(true);
  };

  const handleDelete = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      await deleteQuestion(questionId);
      await loadQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question');
    }
  };

  const handleSave = async (questionData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, questionData);
      } else {
        await createQuestion({
          ...questionData,
          createdBy: userData?.uid || 'admin', // Admin-created questions
          importDate: new Date(),
          importYear: new Date().getFullYear(),
        });
      }
      setShowForm(false);
      setEditingQuestion(null);
      await loadQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question');
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

  if (showForm) {
    return (
      <QuestionForm
        question={editingQuestion}
        onSave={handleSave}
        onCancel={() => {
          setShowForm(false);
          setEditingQuestion(null);
        }}
        userData={userData}
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
      {/* Back button positioned absolutely at top-left */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-50 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors shadow-lg"
      >
        <ArrowLeft className="w-6 h-6 text-black" />
      </button>
      
      <div className="flex flex-col items-center px-4 pt-16 pb-8">
        <div className="bg-purple-900 border-4 border-purple-500 rounded-3xl p-12 max-w-6xl w-full">
          <div className="flex items-center justify-between mb-8 border-b border-purple-500/30 pb-6">
            <div className="flex items-center">
              <Settings className="text-purple-400 mr-4" size={48} />
              <h1 className="text-4xl font-black text-white">ADMIN QUESTION MANAGEMENT</h1>
            </div>
          </div>

          <div className="bg-purple-950 rounded-xl p-6 mb-6">
            <h3 className="text-purple-400 font-bold mb-4 uppercase">Filters</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-white text-sm font-bold mb-2">Visibility</label>
                <select
                  value={filters.isPublic === undefined ? 'all' : filters.isPublic ? 'public' : 'private'}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      isPublic: e.target.value === 'all' ? undefined : e.target.value === 'public',
                    })
                  }
                  className="w-full bg-purple-900 text-white p-2 rounded border border-purple-500/30"
                >
                  <option value="all">All</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label className="block text-white text-sm font-bold mb-2">Subject</label>
                <select
                  value={filters.subjectArea}
                  onChange={(e) => setFilters({ ...filters, subjectArea: e.target.value })}
                  className="w-full bg-purple-900 text-white p-2 rounded border border-purple-500/30"
                >
                  <option value="">All</option>
                  <option value="SS">Social Studies</option>
                  <option value="SC">Science</option>
                  <option value="LA">Language Arts</option>
                  <option value="MA">Math</option>
                  <option value="AH">Arts & Humanities</option>
                </select>
              </div>
              <div>
                <label className="block text-white text-sm font-bold mb-2">Min Year</label>
                <input
                  type="number"
                  value={filters.minYear}
                  onChange={(e) => setFilters({ ...filters, minYear: e.target.value })}
                  className="w-full bg-purple-900 text-white p-2 rounded border border-purple-500/30"
                  placeholder="2020"
                />
              </div>
              <div>
                <label className="block text-white text-sm font-bold mb-2">Max Year</label>
                <input
                  type="number"
                  value={filters.maxYear}
                  onChange={(e) => setFilters({ ...filters, maxYear: e.target.value })}
                  className="w-full bg-purple-900 text-white p-2 rounded border border-purple-500/30"
                  placeholder="2025"
                />
              </div>
              <div>
                <label className="block text-white text-sm font-bold mb-2">Validation Status</label>
                <select
                  value={filters.validationStatus}
                  onChange={(e) => setFilters({ ...filters, validationStatus: e.target.value as '' | 'pending' | 'approved' | 'flagged' | 'rejected' })}
                  className="w-full bg-purple-900 text-white p-2 rounded border border-purple-500/30"
                >
                  <option value="">All</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="flagged">Flagged</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="text-white font-bold">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredQuestions.length)} of {filteredQuestions.length} questions
              {filteredQuestions.length !== questions.length && ` (filtered from ${questions.length} total)`}
            </div>
            <button
              onClick={handleCreate}
              className="bg-purple-500 hover:bg-purple-400 text-white font-black py-3 px-6 rounded-xl"
            >
              + CREATE QUESTION
            </button>
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            {paginatedQuestions.length === 0 ? (
              <div className="text-center py-8 text-white/70">
                No questions found
              </div>
            ) : (
              paginatedQuestions.map((q) => (
              <div key={q.id} className="bg-purple-950 rounded-xl p-6 border-2 border-purple-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-3">
                    <span className="bg-purple-600 text-white px-3 py-1 rounded font-bold text-sm">
                      {q.subjectArea}
                    </span>
                    <span className="bg-cyan-600 text-white px-3 py-1 rounded font-bold text-sm">
                      {q.isPublic ? 'Public' : 'Private'}
                    </span>
                    <span className="bg-yellow-600 text-white px-3 py-1 rounded font-bold text-sm">
                      {q.level === 'EL' ? 'Elementary' : q.level === 'MS' ? 'Middle School' : 'High School'}
                    </span>
                    {q.validationStatus && (
                      <span className={`px-3 py-1 rounded font-bold text-sm ${
                        q.validationStatus === 'approved' ? 'bg-green-600 text-white' :
                        q.validationStatus === 'flagged' ? 'bg-orange-600 text-white' :
                        q.validationStatus === 'rejected' ? 'bg-red-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {q.validationStatus.charAt(0).toUpperCase() + q.validationStatus.slice(1)}
                      </span>
                    )}
                    <span className="text-white/50 text-sm">Year: {q.importYear}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(q)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1 rounded font-bold text-sm"
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-1 rounded font-bold text-sm flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      DELETE
                    </button>
                  </div>
                </div>
                <h3 className="text-white font-bold text-lg mb-3">{q.questionText}</h3>
                {q.flaggedReason && (
                  <div className="bg-orange-900/30 border border-orange-500 rounded p-2 mb-3">
                    <span className="text-orange-400 text-xs font-bold">FLAGGED REASON: </span>
                    <span className="text-white">{q.flaggedReason}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
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
              </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-purple-500/30">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 bg-purple-950 hover:bg-purple-800 disabled:bg-purple-900 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                          currentPage === page
                            ? 'bg-purple-500 text-white'
                            : 'bg-purple-950 hover:bg-purple-800 text-white'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <span key={page} className="text-white/50 px-2">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-4 py-2 bg-purple-950 hover:bg-purple-800 disabled:bg-purple-900 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          <button
            onClick={onBack}
            className="w-full mt-6 bg-purple-950 text-white/70 hover:text-white font-bold py-3 rounded-xl border-2 border-white/20"
          >
            BACK TO ADMIN DASHBOARD
          </button>
        </div>
      </div>
    </div>
  );
};

const QuestionForm: React.FC<{
  question: Question | null;
  onSave: (data: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  userData?: { uid: string } | null;
}> = ({ question, onSave, onCancel, userData }) => {
  const [formData, setFormData] = useState({
    subjectArea: question?.subjectArea || 'SS',
    questionText: question?.questionText || '',
    correctAnswer: question?.correctAnswer || '',
    distractors: question?.distractors || ['', '', ''],
    level: question?.level || 'EL',
    isPublic: question?.isPublic ?? true,
    importYear: question?.importYear || new Date().getFullYear(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      createdBy: question?.createdBy || userData?.uid || 'admin',
      importDate: question?.importDate || new Date(),
    });
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
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 overflow-auto">
        <div className="bg-purple-900 border-4 border-purple-500 rounded-3xl p-12 max-w-2xl w-full">
          <h2 className="text-3xl font-black text-white mb-6">
            {question ? 'EDIT QUESTION' : 'CREATE QUESTION'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Subject Area</label>
              <select
                value={formData.subjectArea}
                onChange={(e) => setFormData({ ...formData, subjectArea: e.target.value })}
                className="w-full bg-purple-950 text-white p-3 rounded-lg border-2 border-cyan-400/30"
                required
              >
                <option value="SS">Social Studies</option>
                <option value="SC">Science</option>
                <option value="LA">Language Arts</option>
                <option value="MA">Math</option>
                <option value="AH">Arts & Humanities</option>
              </select>
            </div>
            <div>
              <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Question Text</label>
              <textarea
                value={formData.questionText}
                onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                className="w-full bg-purple-950 text-white p-3 rounded-lg border-2 border-cyan-400/30"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-green-400 text-sm font-bold uppercase mb-2">Correct Answer</label>
              <input
                type="text"
                value={formData.correctAnswer}
                onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                className="w-full bg-purple-950 text-white p-3 rounded-lg border-2 border-green-400/30"
                required
              />
            </div>
            {formData.distractors.map((distractor, i) => (
              <div key={i}>
                <label className="block text-red-400 text-sm font-bold uppercase mb-2">
                  Distractor {i + 1}
                </label>
                <input
                  type="text"
                  value={distractor}
                  onChange={(e) => {
                    const newDistractors = [...formData.distractors];
                    newDistractors[i] = e.target.value;
                    setFormData({ ...formData, distractors: newDistractors });
                  }}
                  className="w-full bg-purple-950 text-white p-3 rounded-lg border-2 border-red-400/30"
                  required
                />
              </div>
            ))}
            <div>
              <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as 'EL' | 'MS' | 'HS' })}
                className="w-full bg-purple-950 text-white p-3 rounded-lg border-2 border-cyan-400/30"
              >
                <option value="EL">Elementary</option>
                <option value="MS">Middle School</option>
                <option value="HS">High School</option>
              </select>
            </div>
            <div>
              <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Import Year</label>
              <input
                type="number"
                value={formData.importYear}
                onChange={(e) => setFormData({ ...formData, importYear: parseInt(e.target.value) })}
                className="w-full bg-purple-950 text-white p-3 rounded-lg border-2 border-cyan-400/30"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-cyan-400 text-sm font-bold uppercase">Public (available to all teams)</span>
              </label>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-purple-950 text-white font-bold py-3 rounded-xl border-2 border-white/20"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="flex-1 bg-purple-500 hover:bg-purple-400 text-white font-black py-3 rounded-xl"
              >
                SAVE
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

