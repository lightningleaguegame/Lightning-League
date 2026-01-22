import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getQuestions, getTeam } from '../services/firestore';
import { Question } from '../types/firebase';

interface QuestionsContextType {
  questions: Question[];
  loading: boolean;
  error: string | null;
  refreshQuestions: () => Promise<void>;
  getQuestionsForRole: () => Question[];
}

const QuestionsContext = createContext<QuestionsContextType | undefined>(undefined);

export const useQuestions = () => {
  const context = useContext(QuestionsContext);
  if (context === undefined) {
    throw new Error('useQuestions must be used within a QuestionsProvider');
  }
  return context;
};

export const QuestionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userData } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    if (!userData) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (userData.role === 'coach') {
        // For coaches: get public questions + team-specific questions + coach-created questions
        const questionPromises: Promise<Question[]>[] = [
          getQuestions({ isPublic: true }),
        ];

        if (userData.teamId) {
          questionPromises.push(getQuestions({ teamId: userData.teamId }));
        }

        questionPromises.push(getQuestions({ coachId: userData.uid }));

        const questionResults = await Promise.all(questionPromises);
        const allQuestions = questionResults.flat();

        // Deduplicate by ID
        const uniqueQuestions = Array.from(
          new Map(allQuestions.map(q => [q.id, q])).values()
        );
        setQuestions(uniqueQuestions);
      } else if (userData.role === 'student') {
        // For students: get public questions + team-specific questions
        const questionPromises: Promise<Question[]>[] = [
          getQuestions({ isPublic: true }),
        ];

        if (userData.teamId) {
          questionPromises.push(getQuestions({ teamId: userData.teamId }));
        }

        const questionResults = await Promise.all(questionPromises);
        const allQuestions = questionResults.flat();

        // Deduplicate by ID
        let uniqueQuestions = Array.from(
          new Map(allQuestions.map(q => [q.id, q])).values()
        );

        // Filter questions by team level if team has levels set
        if (userData.teamId) {
          const team = await getTeam(userData.teamId);
          if (team && team.levels && team.levels.length > 0) {
            // Only show questions that match the team's levels
            uniqueQuestions = uniqueQuestions.filter(q => 
              team.levels!.includes(q.level)
            );
          }
        }

        setQuestions(uniqueQuestions);
      } else {
        // For admin or other roles: get all public questions
        const allQuestions = await getQuestions({ isPublic: true });
        setQuestions(allQuestions);
      }
    } catch (err) {
      console.error('Error loading questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load questions');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const getQuestionsForRole = useCallback(() => {
    return questions;
  }, [questions]);

  const value: QuestionsContextType = {
    questions,
    loading,
    error,
    refreshQuestions: loadQuestions,
    getQuestionsForRole,
  };

  return <QuestionsContext.Provider value={value}>{children}</QuestionsContext.Provider>;
};

