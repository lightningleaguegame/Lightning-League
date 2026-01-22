import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

// Cloud Functions for server-side logic

export const arbitrateBuzzer = httpsCallable(functions, 'arbitrateBuzzer');
export const createMatch = httpsCallable(functions, 'createMatch');
export const writeMatchStats = httpsCallable(functions, 'writeMatchStats');
export const calculateLeaderboard = httpsCallable(functions, 'calculateLeaderboard');
export const commitQuestionEdit = httpsCallable(functions, 'commitQuestionEdit');










