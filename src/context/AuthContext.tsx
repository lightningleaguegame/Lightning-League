import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, UserRole } from '../types/firebase';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, role: UserRole, teamId?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  isCoach: boolean;
  isStudent: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (user: FirebaseUser) => {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      setUserData({
        uid: user.uid,
        email: user.email || '',
        displayName: data.displayName,
        role: data.role,
        teamId: data.teamId,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActive: data.lastActive?.toDate() || new Date(),
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshUserData = async () => {
    if (currentUser) {
      await fetchUserData(currentUser);
    }
  };

  const signUp = async (email: string, password: string, displayName: string, role: UserRole, teamId?: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    let finalTeamId = teamId;

    // If coach, auto-create team and assign TeamID
    if (role === 'coach') {
      // Generate a unique TeamID (6-character alphanumeric code)
      const generateTeamId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      finalTeamId = generateTeamId();

      // Create team document
      const teamRef = doc(db, 'teams', finalTeamId);
      await setDoc(teamRef, {
        id: finalTeamId,
        name: `${displayName}'s Team`, // Default team name
        coachId: user.uid,
        playerIds: [],
        createdAt: serverTimestamp(),
      });
    }

    // Create user document in Firestore
    // Only include teamId if it's defined (Firestore doesn't allow undefined values)
    const userDocData: any = {
      uid: user.uid,
      email: user.email || '',
      displayName,
      role,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    };

    // Only add teamId if it's defined
    if (finalTeamId !== undefined && finalTeamId !== null && finalTeamId !== '') {
      userDocData.teamId = finalTeamId;
    }

    await setDoc(doc(db, 'users', user.uid), userDocData);

    // If student, create player document
    if (role === 'student' && finalTeamId) {
      await setDoc(doc(db, 'players', user.uid), {
        userId: user.uid,
        teamId: finalTeamId,
        displayName,
        gamesPlayed: 0,
        totalScore: 0,
        totalQuestions: 0,
        avgBuzzTime: 0,
        correctBySubject: {},
        createdAt: serverTimestamp(),
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
  };

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    signUp,
    signIn,
    logout,
    refreshUserData,
    isCoach: userData?.role === 'coach',
    isStudent: userData?.role === 'student',
    isAdmin: userData?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};







