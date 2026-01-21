import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuestions } from '../context/QuestionsContext';
import { createQuestion, updateQuestion, deleteQuestion } from '../services/firestore';
import { Question } from '../types/firebase';
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react';

interface QuestionEditorProps {
  onBack: () => void;
}

// Extended type for imported questions with preview-only fields
interface ImportedQuestion extends Omit<Question, 'id' | 'createdAt' | 'updatedAt'> {
  subgroup?: string;
  difficulty?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({ onBack }) => {
  const { userData, isAdmin } = useAuth();
  const { questions: contextQuestions, loading: contextLoading, refreshQuestions } = useQuestions();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importedQuestions, setImportedQuestions] = useState<ImportedQuestion[]>([]);
  const [previewingQuestions, setPreviewingQuestions] = useState(false);
  const [previewCurrentPage, setPreviewCurrentPage] = useState(1);
  const [previewItemsPerPage, setPreviewItemsPerPage] = useState(10);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [filters, setFilters] = useState({
    isPublic: undefined as boolean | undefined,
    subjectArea: '',
    level: '' as '' | 'EL' | 'MS' | 'HS',
    minYear: '',
    maxYear: '',
    validationStatus: '' as '' | 'pending' | 'approved' | 'flagged' | 'rejected',
    startDate: '' as string,
    endDate: '' as string,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const applyFilters = useCallback(() => {
    let filtered = [...questions];

    if (filters.subjectArea) {
      filtered = filtered.filter((q) => q.subjectArea === filters.subjectArea);
    }
    if (filters.level) {
      filtered = filtered.filter((q) => q.level === filters.level);
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
    
    // Filter by import date range (admin only feature)
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0); // Start of day
      filtered = filtered.filter((q) => {
        if (!q.importDate) return false;
        const importDate = q.importDate instanceof Date 
          ? new Date(q.importDate) 
          : new Date(q.importDate);
        importDate.setHours(0, 0, 0, 0);
        return importDate >= startDate;
      });
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter((q) => {
        if (!q.importDate) return false;
        const importDate = q.importDate instanceof Date 
          ? new Date(q.importDate) 
          : new Date(q.importDate);
        importDate.setHours(0, 0, 0, 0);
        return importDate <= endDate;
      });
    }

    setFilteredQuestions(filtered);
  }, [questions, filters]);

  useEffect(() => {
    applyFilters();
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [applyFilters]);

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
      await refreshQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question');
    }
  };

  const handleFlagQuestion = async (questionId: string) => {
    const reason = window.prompt('Why is this question being flagged? (e.g., "Answer doesn\'t match question", "Incorrect answer", "Needs update")');
    if (!reason) return;

    try {
      await updateQuestion(questionId, {
        validationStatus: 'flagged',
        flaggedReason: reason,
      });
      await refreshQuestions();
      alert('Question flagged for review');
    } catch (error) {
      console.error('Error flagging question:', error);
      alert('Failed to flag question');
    }
  };

  const handleApproveQuestion = async (questionId: string) => {
    try {
      await updateQuestion(questionId, {
        validationStatus: 'approved',
        validatedBy: userData!.uid,
        validatedAt: new Date(),
      });
      await refreshQuestions();
      alert('Question approved');
    } catch (error) {
      console.error('Error approving question:', error);
      alert('Failed to approve question');
    }
  };

  const handleSave = async (questionData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, questionData);
      } else {
        await createQuestion({
          ...questionData,
          createdBy: userData!.uid,
          teamId: questionData.isPublic ? undefined : userData?.teamId,
          importDate: new Date(),
          importYear: new Date().getFullYear(),
        });
      }
      setShowForm(false);
      setEditingQuestion(null);
      // Refresh questions from context
      await refreshQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question');
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim());

        if (lines.length < 2) {
          alert('CSV file is empty or invalid');
          return;
        }

        // Helper function to parse CSV line, handling quoted fields
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
              } else {
                // Toggle quote state
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              // End of field
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          
          // Add last field
          result.push(current.trim());
          return result;
        };

        const parsed: ImportedQuestion[] = [];

        // Parse header row to find column indices
        const headerRow = parseCSVLine(lines[0]).map((v) => v.trim().toLowerCase());
        const getColumnIndex = (possibleNames: string[]): number => {
          for (const name of possibleNames) {
            const index = headerRow.findIndex((h) => h.includes(name));
            if (index !== -1) return index;
          }
          return -1;
        };

        const categoryIndex = getColumnIndex(['category', 'subject', 'subjectarea']);
        const subgroupIndex = getColumnIndex(['subgroup']);
        const difficultyIndex = getColumnIndex(['difficulty']);
        const levelIndex = getColumnIndex(['level']);
        const questionTextIndex = getColumnIndex(['question text', 'questiontext', 'question']);
        const answerIndex = getColumnIndex(['answer', 'correctanswer', 'correct']);
        const distractor1Index = getColumnIndex(['distractor 1', 'distractor1', 'distractor']);
        const distractor2Index = getColumnIndex(['distractor 2', 'distractor2']);
        const distractor3Index = getColumnIndex(['distractor 3', 'distractor3']);

        // If header detection fails, use fixed positions based on standard format:
        // Question, Category, Subgroup, Difficulty, Level, Question Text, Answer, Distractor 1, Distractor 2, Distractor 3
        const useFixedPositions = categoryIndex === -1 || questionTextIndex === -1 || answerIndex === -1;
        
        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);

          if (values.length < 7) {
            continue; // Skip rows with insufficient columns
          }

          let subjectArea: string;
          let questionText: string;
          let correctAnswer: string;
          let distractors: string[];
          let level: 'EL' | 'MS' | 'HS' = 'EL';
          let subgroup: string | undefined;
          let difficulty: string | undefined;

          if (useFixedPositions) {
            // Fixed format: [Question, Category, Subgroup, Difficulty, Level, Question Text, Answer, Distractor 1, Distractor 2, Distractor 3]
            subjectArea = values[1] || 'GK'; // Category column
            subgroup = values[2] || undefined; // Subgroup column
            difficulty = values[3] || undefined; // Difficulty column
            level = (values[4] as 'EL' | 'MS' | 'HS') || 'EL'; // Level column
            questionText = values[5] || ''; // Question Text column
            correctAnswer = values[6] || ''; // Answer column
            distractors = [
              values[7] || '', // Distractor 1
              values[8] || '', // Distractor 2
              values[9] || '', // Distractor 3
            ];
          } else {
            // Use detected column positions
            subjectArea = categoryIndex !== -1 ? values[categoryIndex] || 'GK' : 'GK';
            subgroup = subgroupIndex !== -1 ? values[subgroupIndex] || undefined : undefined;
            difficulty = difficultyIndex !== -1 ? values[difficultyIndex] || undefined : undefined;
            level = (levelIndex !== -1 ? (values[levelIndex] as 'EL' | 'MS' | 'HS') : 'EL') || 'EL';
            questionText = questionTextIndex !== -1 ? values[questionTextIndex] || '' : '';
            correctAnswer = answerIndex !== -1 ? values[answerIndex] || '' : '';
            distractors = [
              distractor1Index !== -1 ? values[distractor1Index] || '' : '',
              distractor2Index !== -1 ? values[distractor2Index] || '' : '',
              distractor3Index !== -1 ? values[distractor3Index] || '' : '',
            ];
          }

          // Validate required fields
          if (questionText && correctAnswer && distractors.filter(d => d).length >= 1) {
            parsed.push({
              subjectArea,
              questionText,
              correctAnswer,
              distractors: distractors.filter(d => d), // Remove empty distractors
              level,
              subgroup,
              difficulty,
              isPublic: true,
              createdBy: userData!.uid,
              teamId: userData?.teamId,
              importDate: new Date(),
              importYear: new Date().getFullYear(),
            });
          }
        }

        if (parsed.length === 0) {
          alert('No valid questions found in CSV. Please check format.\n\nExpected columns: Question, Category, Subgroup, Difficulty, Level, Question Text, Answer, Distractor 1, Distractor 2, Distractor 3');
          return;
        }

        // Check for duplicates
        const normalizeText = (text: string) => text.trim().toLowerCase();
        const checkDuplicate = (q1: ImportedQuestion, q2: ImportedQuestion): boolean => {
          return normalizeText(q1.questionText) === normalizeText(q2.questionText) &&
                 normalizeText(q1.correctAnswer) === normalizeText(q2.correctAnswer);
        };

        // Check duplicates against existing questions in database
        const existingQuestions = contextQuestions;
        const questionsWithDuplicates = parsed.map((question, index) => {
          // Check against existing questions
          const existsInDB = existingQuestions.some(existing => 
            normalizeText(existing.questionText) === normalizeText(question.questionText) &&
            normalizeText(existing.correctAnswer) === normalizeText(question.correctAnswer)
          );

          // Check for duplicates within the imported batch
          const duplicateInBatch = parsed.some((otherQuestion, otherIndex) => 
            index !== otherIndex && checkDuplicate(question, otherQuestion)
          );

          if (existsInDB) {
            return { ...question, isDuplicate: true, duplicateReason: 'Already exists in database' };
          } else if (duplicateInBatch) {
            return { ...question, isDuplicate: true, duplicateReason: 'Duplicate in import file' };
          }
          return { ...question, isDuplicate: false };
        });

        const duplicateCount = questionsWithDuplicates.filter(q => q.isDuplicate).length;
        if (duplicateCount > 0) {
          const proceed = window.confirm(
            `Found ${duplicateCount} duplicate question${duplicateCount !== 1 ? 's' : ''} that will be skipped during import.\n\n` +
            `Total questions to import: ${questionsWithDuplicates.length - duplicateCount}\n` +
            `Duplicates will be skipped: ${duplicateCount}\n\n` +
            `Continue with import?`
          );
          if (!proceed) {
            return;
          }
        }

        setImportedQuestions(questionsWithDuplicates);
        setPreviewCurrentPage(1); // Reset to first page when importing
        setPreviewingQuestions(true);
      } catch (error) {
        console.error('Error parsing CSV file:', error);
        alert('Error parsing CSV file: ' + (error as Error).message);
      }
    };
    reader.onerror = () => {
      alert('Error reading file');
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (importedQuestions.length === 0) {
      alert('No questions to import.');
      return;
    }

    // Filter out duplicates
    const questionsToImport = importedQuestions.filter(q => !q.isDuplicate);
    const duplicateCount = importedQuestions.length - questionsToImport.length;

    if (questionsToImport.length === 0) {
      alert('All questions are duplicates. Nothing to import.');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: questionsToImport.length });

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < questionsToImport.length; i++) {
        const question = questionsToImport[i];
        try {
          // Remove preview-only fields (subgroup, difficulty, isDuplicate, duplicateReason) before saving
          const questionData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'> = {
            subjectArea: question.subjectArea,
            questionText: question.questionText,
            correctAnswer: question.correctAnswer,
            distractors: question.distractors,
            level: question.level,
            isPublic: question.isPublic,
            createdBy: question.createdBy,
            teamId: question.teamId,
            importDate: question.importDate,
            importYear: question.importYear,
          };
          await createQuestion(questionData);
          successCount++;
        } catch (error) {
          console.error('Error importing question:', error);
          errorCount++;
        }
        setImportProgress({ current: i + 1, total: questionsToImport.length });
      }

      setImportedQuestions([]);
      setPreviewingQuestions(false);
      setImportProgress({ current: 0, total: 0 });
      await refreshQuestions();

      let message = `Import Complete!\n\n`;
      message += `Successfully imported: ${successCount} question${successCount !== 1 ? 's' : ''}\n`;
      if (duplicateCount > 0) {
        message += `Skipped duplicates: ${duplicateCount} question${duplicateCount !== 1 ? 's' : ''}\n`;
      }
      if (errorCount > 0) {
        message += `Failed to import: ${errorCount} question${errorCount !== 1 ? 's' : ''}\n`;
      }

      alert(message);
    } catch (error) {
      console.error('Error importing questions:', error);
      alert('Failed to import some questions. Please check the console for details.');
    } finally {
      setIsImporting(false);
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
      />
    );
  }

  if (previewingQuestions) {
    const totalPreviewPages = Math.ceil(importedQuestions.length / previewItemsPerPage);
    const startIndex = (previewCurrentPage - 1) * previewItemsPerPage;
    const endIndex = startIndex + previewItemsPerPage;
    const paginatedQuestions = importedQuestions.slice(startIndex, endIndex);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8"
      style={{
        backgroundImage: 'url(/Environments/Coach%20Panel.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div className="bg-purple-900 border-4 border-purple-500 rounded-3xl p-12 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center mb-8 border-b border-purple-500/30 pb-6">
            <Settings className="text-purple-400 mr-4" size={48} />
            <h1 className="text-4xl font-black text-white">PREVIEW QUESTIONS</h1>
            <div className="ml-auto flex flex-col items-end">
              <span className="text-purple-400 font-bold">{importedQuestions.length} Questions</span>
              {importedQuestions.filter(q => q.isDuplicate).length > 0 && (
                <span className="text-red-400 font-bold text-sm mt-1">
                  {importedQuestions.filter(q => q.isDuplicate).length} Duplicate{importedQuestions.filter(q => q.isDuplicate).length !== 1 ? 's' : ''} (will be skipped)
                </span>
              )}
            </div>
          </div>

          {/* Items per page selector */}
          <div className="flex justify-end items-center mb-4">
            <label className="text-white text-sm font-bold">
              Items per page:
              <select
                value={previewItemsPerPage}
                onChange={(e) => {
                  setPreviewItemsPerPage(parseInt(e.target.value));
                  setPreviewCurrentPage(1);
                }}
                className="ml-2 bg-purple-900 text-white p-2 rounded border border-purple-500/30"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </label>
          </div>

          {/* Pagination Info */}
          {importedQuestions.length > 0 && (
            <div className="mb-4 text-white/70 text-sm">
              Showing {startIndex + 1} to {Math.min(endIndex, importedQuestions.length)} of {importedQuestions.length} questions
            </div>
          )}

          <div className="space-y-4 mb-8">
            {paginatedQuestions.map((q, idx) => {
              const globalIndex = startIndex + idx;
              const levelDisplay = q.level === 'EL' ? 'Elementary' : q.level === 'MS' ? 'Middle School' : 'High School';
              return (
                <div 
                  key={globalIndex} 
                  className={`rounded-xl p-6 border-2 ${
                    q.isDuplicate 
                      ? 'bg-red-950/30 border-red-600' 
                      : 'bg-purple-950 border-purple-800'
                  }`}
                >
                  {/* Header with Question Number and Metadata */}
                  <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-purple-700/50">
                    <span className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-base">
                      Question {globalIndex + 1}
                    </span>
                    {q.isDuplicate && (
                      <span className="bg-red-600 text-white px-3 py-1 rounded font-bold text-sm">
                        ⚠ DUPLICATE
                      </span>
                    )}
                    <span className="bg-cyan-600 text-white px-3 py-1 rounded font-bold text-sm">
                      {q.subjectArea}
                    </span>
                    {q.subgroup && (
                      <span className="bg-blue-600 text-white px-3 py-1 rounded font-bold text-sm">
                        {q.subgroup}
                      </span>
                    )}
                    {q.difficulty && (
                      <span className="bg-orange-600 text-white px-3 py-1 rounded font-bold text-sm">
                        Difficulty: {q.difficulty}
                      </span>
                    )}
                    <span className="bg-yellow-600 text-white px-3 py-1 rounded font-bold text-sm">
                      {levelDisplay}
                    </span>
                  </div>
                  {q.isDuplicate && q.duplicateReason && (
                    <div className="mb-3 p-2 bg-red-900/40 border border-red-500 rounded">
                      <span className="text-red-300 text-sm font-bold">{q.duplicateReason}</span>
                    </div>
                  )}

                  {/* Question Text */}
                  <div className="mb-4">
                    <h3 className="text-white font-bold text-xl mb-2 leading-relaxed">{q.questionText}</h3>
                  </div>

                  {/* Answers Section */}
                  <div className="space-y-2">
                    <div className="bg-green-900/40 border-2 border-green-500 rounded-lg p-3">
                      <span className="text-green-400 text-sm font-bold uppercase">Correct Answer: </span>
                      <span className="text-white font-semibold text-base">{q.correctAnswer}</span>
                    </div>
                    {q.distractors.map((d, i) => (
                      <div key={i} className="bg-red-900/30 border-2 border-red-500/50 rounded-lg p-3">
                        <span className="text-red-400 text-sm font-bold uppercase">Distractor {i + 1}: </span>
                        <span className="text-white font-semibold text-base">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {importedQuestions.length > previewItemsPerPage && (
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setPreviewCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={previewCurrentPage === 1}
                className="bg-purple-950 text-white hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-2 px-4 rounded-lg border-2 border-purple-500/30 flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPreviewPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first page, last page, current page, and pages around current
                    if (totalPreviewPages <= 7) return true;
                    if (page === 1 || page === totalPreviewPages) return true;
                    if (Math.abs(page - previewCurrentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, index, array) => {
                    // Add ellipsis if there's a gap
                    const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsisBefore && (
                          <span className="text-white/50 px-2">...</span>
                        )}
                        <button
                          onClick={() => setPreviewCurrentPage(page)}
                          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                            previewCurrentPage === page
                              ? 'bg-yellow-500 text-black'
                              : 'bg-purple-950 text-white hover:bg-purple-800 border-2 border-purple-500/30'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>
              
              <button
                onClick={() => setPreviewCurrentPage(prev => Math.min(totalPreviewPages, prev + 1))}
                disabled={previewCurrentPage >= totalPreviewPages}
                className="bg-purple-950 text-white hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-2 px-4 rounded-lg border-2 border-purple-500/30 flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Import Progress Indicator */}
          {isImporting && (
            <div className="mb-6 p-4 bg-purple-800/50 rounded-xl border-2 border-purple-400">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold">
                  Importing questions... {importProgress.current} of {importProgress.total}
                </span>
                <span className="text-purple-300 font-bold">
                  {Math.round((importProgress.current / importProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-purple-900 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-400 h-full transition-all duration-300 ease-out"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t-2 border-purple-500/30">
            <button
              onClick={() => {
                setPreviewingQuestions(false);
                setImportedQuestions([]);
                setPreviewCurrentPage(1);
              }}
              disabled={isImporting}
              className="flex-1 bg-purple-950 text-white/70 hover:text-white font-bold py-4 rounded-xl border-2 border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CANCEL
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={importedQuestions.length === 0 || isImporting}
              className="flex-1 bg-purple-500 hover:bg-purple-400 text-white font-black py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  IMPORTING...
                </>
              ) : (() => {
                const validQuestions = importedQuestions.filter(q => !q.isDuplicate).length;
                const duplicateCount = importedQuestions.filter(q => q.isDuplicate).length;
                let buttonText = `CONFIRM IMPORT (${validQuestions} QUESTION${validQuestions !== 1 ? 'S' : ''}`;
                if (duplicateCount > 0) {
                  buttonText += `, ${duplicateCount} DUPLICATE${duplicateCount !== 1 ? 'S' : ''} SKIPPED`;
                }
                buttonText += ')';
                return buttonText;
              })()}
            </button>
          </div>
        </div>
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
      {/* Overlay interactive elements on top of background */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-8 overflow-auto">
        <div className="bg-purple-900 border-4 border-purple-500 rounded-3xl p-12 max-w-6xl w-full">
        <div className="flex items-center mb-8 border-b border-purple-500/30 pb-6">
          <Settings className="text-purple-400 mr-4" size={48} />
          <h1 className="text-4xl font-black text-white">QUESTION EDITOR</h1>
        </div>

        <div className="bg-purple-950 rounded-xl p-6 mb-6">
          <h3 className="text-purple-400 font-bold mb-4 uppercase">Filters</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <label className="block text-white text-sm font-bold mb-2">Level</label>
              <select
                value={filters.level}
                onChange={(e) => setFilters({ ...filters, level: e.target.value as '' | 'EL' | 'MS' | 'HS' })}
                className="w-full bg-purple-900 text-white p-2 rounded border border-purple-500/30"
              >
                <option value="">All</option>
                <option value="EL">Elementary</option>
                <option value="MS">Middle School</option>
                <option value="HS">High School</option>
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
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-purple-500/30">
              <h4 className="text-purple-300 font-bold mb-3 text-sm uppercase">Import Date Filter (Admin Only)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-bold mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full bg-purple-900 text-white p-2 rounded border border-purple-500/30"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-bold mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full bg-purple-900 text-white p-2 rounded border border-purple-500/30"
                  />
                </div>
              </div>
              {(filters.startDate || filters.endDate) && (
                <button
                  onClick={() => setFilters({ ...filters, startDate: '', endDate: '' })}
                  className="mt-3 text-purple-300 hover:text-purple-200 text-sm font-bold underline"
                >
                  Clear Date Filters
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="text-white font-bold">
            Showing {filteredQuestions.length} of {questions.length} questions
          </div>
          <div className="flex items-center gap-4">
            <label className="text-white text-sm font-bold">
              Items per page:
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="ml-2 bg-purple-900 text-white p-2 rounded border border-purple-500/30"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </label>
          </div>
          <div className="flex gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
              id="csv-import"
            />
            <label
              htmlFor="csv-import"
              className="bg-purple-500 hover:bg-purple-400 text-white font-black py-3 px-6 rounded-xl cursor-pointer"
            >
              IMPORT CSV
            </label>
            <button
              onClick={handleCreate}
              className="bg-purple-500 hover:bg-purple-400 text-white font-black py-3 px-6 rounded-xl"
            >
              + CREATE QUESTION
            </button>
          </div>
        </div>

        {/* Pagination Info */}
        {filteredQuestions.length > 0 && (
          <div className="mb-4 text-white/70 text-sm">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredQuestions.length)} of {filteredQuestions.length} questions
          </div>
        )}

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {filteredQuestions
            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
            .map((q) => (
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
                  {q.validationStatus !== 'approved' && (
                    <button
                      onClick={() => handleApproveQuestion(q.id)}
                      className="bg-green-600 hover:bg-green-500 text-white px-4 py-1 rounded font-bold text-sm"
                    >
                      APPROVE
                    </button>
                  )}
                  {q.validationStatus !== 'flagged' && (
                    <button
                      onClick={() => handleFlagQuestion(q.id)}
                      className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-1 rounded font-bold text-sm"
                    >
                      FLAG
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-1 rounded font-bold text-sm"
                  >
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
          ))}
        </div>

        {/* Pagination Controls */}
        {filteredQuestions.length > itemsPerPage && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="bg-purple-950 text-white hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-2 px-4 rounded-lg border-2 border-purple-500/30 flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.ceil(filteredQuestions.length / itemsPerPage) }, (_, i) => i + 1)
                .filter(page => {
                  // Show first page, last page, current page, and pages around current
                  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .map((page, index, array) => {
                  // Add ellipsis if there's a gap
                  const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsisBefore && (
                        <span className="text-white/50 px-2">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                          currentPage === page
                            ? 'bg-yellow-500 text-black'
                            : 'bg-purple-950 text-white hover:bg-purple-800 border-2 border-purple-500/30'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredQuestions.length / itemsPerPage), prev + 1))}
              disabled={currentPage >= Math.ceil(filteredQuestions.length / itemsPerPage)}
              className="bg-purple-950 text-white hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-2 px-4 rounded-lg border-2 border-purple-500/30 flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <button onClick={onBack} className="w-full mt-6 bg-purple-950 text-white/70 hover:text-white font-bold py-3 rounded-xl border-2 border-white/20">
          BACK TO DASHBOARD
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
}> = ({ question, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>({
    subjectArea: question?.subjectArea || 'SS',
    questionText: question?.questionText || '',
    correctAnswer: question?.correctAnswer || '',
    distractors: question?.distractors || ['', '', ''],
    level: question?.level || 'EL',
    isPublic: question?.isPublic ?? true,
    importYear: question?.importYear || new Date().getFullYear(),
    createdBy: question?.createdBy || '',
    importDate: question?.importDate || new Date(),
    teamId: question?.teamId,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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


