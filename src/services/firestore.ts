import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Question,
  Team,
  Player,
  Game,
  MatchHistory,
  LeaderboardEntry,
  GameSettings,
  User,
  Notification,
} from '../types/firebase';

// Questions Collection
export const questionsCollection = collection(db, 'questions');

export const createQuestion = async (question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => {
  const questionRef = doc(questionsCollection);
  
  // Build document data, filtering out undefined values
  const questionDocData: any = {
    subjectArea: question.subjectArea,
    questionText: question.questionText,
    correctAnswer: question.correctAnswer,
    distractors: question.distractors,
    level: question.level,
    isPublic: question.isPublic,
    createdBy: question.createdBy,
    importDate: question.importDate,
    importYear: question.importYear,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  // Only include optional fields if they're defined
  if (question.teamId !== undefined && question.teamId !== null && question.teamId !== '') {
    questionDocData.teamId = question.teamId;
  }
  
  await setDoc(questionRef, questionDocData);
  return questionRef.id;
};

export const updateQuestion = async (questionId: string, updates: Partial<Question>) => {
  const questionRef = doc(db, 'questions', questionId);
  
  // Build update data, filtering out undefined values
  const updateData: any = {};
  
  // Copy defined fields
  Object.keys(updates).forEach(key => {
    const value = (updates as any)[key];
    if (value !== undefined) {
      updateData[key] = value;
    }
  });
  
  updateData.updatedAt = serverTimestamp();
  
  await updateDoc(questionRef, updateData);
};

export const deleteQuestion = async (questionId: string) => {
  await deleteDoc(doc(db, 'questions', questionId));
};

export const getQuestions = async (
  filters?: {
    isPublic?: boolean;
    teamId?: string;
    coachId?: string;
    subjectArea?: string;
    minYear?: number;
    maxYear?: number;
  }
) => {
  let q = query(questionsCollection);

  if (filters?.isPublic !== undefined) {
    q = query(q, where('isPublic', '==', filters.isPublic));
  }
  if (filters?.teamId) {
    q = query(q, where('teamId', '==', filters.teamId));
  }
  if (filters?.coachId) {
    q = query(q, where('createdBy', '==', filters.coachId));
  }
  if (filters?.subjectArea) {
    q = query(q, where('subjectArea', '==', filters.subjectArea));
  }
  if (filters?.minYear) {
    q = query(q, where('importYear', '>=', filters.minYear));
  }
  if (filters?.maxYear) {
    q = query(q, where('importYear', '<=', filters.maxYear));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    importDate: doc.data().importDate?.toDate() || new Date(),
  })) as Question[];
};

export const getQuestionsByIds = async (questionIds: string[]): Promise<Question[]> => {
  if (questionIds.length === 0) return [];
  
  const questions: Question[] = [];
  
  // Fetch each question individually
  for (const questionId of questionIds) {
    try {
      const questionDoc = await getDoc(doc(db, 'questions', questionId));
      if (questionDoc.exists()) {
        const data = questionDoc.data();
        questions.push({
          id: questionDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          importDate: data.importDate?.toDate() || new Date(),
        } as Question);
      }
    } catch (error) {
      console.error(`Error fetching question ${questionId}:`, error);
    }
  }
  
  // Return questions in the same order as questionIds
  return questionIds.map(id => questions.find(q => q.id === id)).filter((q): q is Question => q !== undefined);
};

// Teams Collection
export const teamsCollection = collection(db, 'teams');

export const createTeam = async (team: Omit<Team, 'id' | 'createdAt'>) => {
  const teamRef = doc(teamsCollection);
  await setDoc(teamRef, {
    ...team,
    createdAt: serverTimestamp(),
  });
  return teamRef.id;
};

export const getTeam = async (teamId: string) => {
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (teamDoc.exists()) {
    return { id: teamDoc.id, ...teamDoc.data(), createdAt: teamDoc.data().createdAt?.toDate() || new Date() } as Team;
  }
  return null;
};

export const getTeamByCoach = async (coachId: string) => {
  const q = query(teamsCollection, where('coachId', '==', coachId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const teamDoc = snapshot.docs[0];
  return { id: teamDoc.id, ...teamDoc.data(), createdAt: teamDoc.data().createdAt?.toDate() || new Date() } as Team;
};

export const updateTeam = async (teamId: string, updates: Partial<Team>) => {
  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, updates);
};

// Generate a unique TeamID (6-character alphanumeric code)
const generateTeamId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Create a team with a generated TeamID for a coach
export const createTeamForCoach = async (coachId: string, teamName: string, levels?: ('EL' | 'MS' | 'HS')[]): Promise<string> => {
  // Generate a unique TeamID
  let teamId = generateTeamId();
  
  // Check if TeamID already exists (very unlikely, but just in case)
  let teamExists = true;
  let attempts = 0;
  while (teamExists && attempts < 10) {
    const existingTeam = await getTeam(teamId);
    if (!existingTeam) {
      teamExists = false;
    } else {
      teamId = generateTeamId();
      attempts++;
    }
  }
  
  if (teamExists) {
    throw new Error('Failed to generate unique TeamID. Please try again.');
  }
  
  // Create team document with TeamID as document ID
  const teamRef = doc(db, 'teams', teamId);
  const teamData: any = {
    id: teamId,
    name: teamName,
    coachId: coachId,
    playerIds: [],
    createdAt: serverTimestamp(),
  };
  
  // Only include levels if provided
  if (levels && levels.length > 0) {
    teamData.levels = levels;
  }
  
  await setDoc(teamRef, teamData);
  
  // Update user document with teamId
  const userRef = doc(db, 'users', coachId);
  await updateDoc(userRef, { teamId: teamId });
  
  return teamId;
};

export const createPlayer = async (player: Omit<Player, 'id' | 'createdAt'>) => {
  const playerRef = doc(playersCollection);
  await setDoc(playerRef, {
    ...player,
    createdAt: serverTimestamp(),
  });
  return playerRef.id;
};

export const deletePlayer = async (playerId: string) => {
  await deleteDoc(doc(db, 'players', playerId));
};

// Players Collection
export const playersCollection = collection(db, 'players');

export const getPlayer = async (playerId: string) => {
  const playerDoc = await getDoc(doc(db, 'players', playerId));
  if (playerDoc.exists()) {
    return { id: playerDoc.id, ...playerDoc.data() } as Player;
  }
  return null;
};

export const getPlayersByTeam = async (teamId: string) => {
  const q = query(playersCollection, where('teamId', '==', teamId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Player[];
};

export const updatePlayerStats = async (playerId: string, stats: Partial<Player>) => {
  const playerRef = doc(db, 'players', playerId);
  await updateDoc(playerRef, stats);
};

// Allow a student to join a team by TeamID
export const joinTeam = async (userId: string, teamId: string, displayName: string) => {
  // Validate team exists
  const team = await getTeam(teamId);
  if (!team) {
    throw new Error('Team ID not found. Please check with your coach.');
  }

  // Use batch to ensure atomicity
  const batch = writeBatch(db);

  // Update user document with teamId
  const userRef = doc(db, 'users', userId);
  batch.update(userRef, { teamId: teamId });

  // Check if player document exists
  const playerRef = doc(db, 'players', userId);
  const playerDoc = await getDoc(playerRef);

  if (playerDoc.exists()) {
    // Update existing player document
    batch.update(playerRef, { teamId: teamId });
  } else {
    // Create new player document
    batch.set(playerRef, {
      userId: userId,
      teamId: teamId,
      displayName: displayName,
      gamesPlayed: 0,
      totalScore: 0,
      totalQuestions: 0,
      avgBuzzTime: 0,
      correctBySubject: {},
      createdAt: serverTimestamp(),
    });
  }

  // Update team's playerIds array (only if not already included)
  const teamRef = doc(db, 'teams', teamId);
  const currentPlayerIds = team.playerIds || [];
  if (!currentPlayerIds.includes(userId)) {
    batch.update(teamRef, {
      playerIds: arrayUnion(userId),
    });
  }

  // Commit all changes
  await batch.commit();
};

// Games Collection
export const gamesCollection = collection(db, 'games');

export const createGame = async (game: Omit<Game, 'id' | 'startedAt'>) => {
  const gameRef = doc(gamesCollection);
  
  // Build document data, filtering out undefined values
  const gameDocData: any = {
    type: game.type,
    questionIds: game.questionIds,
    status: game.status,
    startedAt: serverTimestamp(),
  };
  
  // Only include optional fields if they're defined
  if (game.playerId !== undefined && game.playerId !== null && game.playerId !== '') {
    gameDocData.playerId = game.playerId;
  }
  if (game.teamId !== undefined && game.teamId !== null && game.teamId !== '') {
    gameDocData.teamId = game.teamId;
  }
  if (game.coachId !== undefined && game.coachId !== null && game.coachId !== '') {
    gameDocData.coachId = game.coachId;
  }
  if (game.playerIds !== undefined && game.playerIds !== null && Array.isArray(game.playerIds)) {
    gameDocData.playerIds = game.playerIds;
  }
  if (game.matchIdCode !== undefined && game.matchIdCode !== null && game.matchIdCode !== '') {
    gameDocData.matchIdCode = game.matchIdCode;
  }
  
  await setDoc(gameRef, gameDocData);
  return gameRef.id;
};

export const updateGame = async (gameId: string, updates: Partial<Game>) => {
  const gameRef = doc(db, 'games', gameId);
  const updateData: any = { ...updates };
  
  // Only include endedAt if it's being set
  if (updates.endedAt !== undefined) {
    updateData.endedAt = serverTimestamp();
  }
  
  // Remove any undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });
  
  await updateDoc(gameRef, updateData);
};

export const getGame = async (gameId: string) => {
  const gameDoc = await getDoc(doc(db, 'games', gameId));
  if (gameDoc.exists()) {
    const data = gameDoc.data();
    return { 
      id: gameDoc.id, 
      ...data,
      startedAt: data.startedAt?.toDate() || new Date(),
      endedAt: data.endedAt?.toDate(),
    } as Game;
  }
  return null;
};

export const joinMatch = async (gameId: string, playerId: string) => {
  const gameRef = doc(db, 'games', gameId);
  console.log('[DEBUG] joinMatch - Getting game document:', gameId);
  const gameDoc = await getDoc(gameRef);
  
  if (!gameDoc.exists()) {
    console.error('[DEBUG] joinMatch - Game document does not exist');
    throw new Error('Match not found');
  }
  
  const gameData = gameDoc.data();
  console.log('[DEBUG] joinMatch - Game data:', gameData);
  console.log('[DEBUG] joinMatch - Game has type:', gameData.type);
  console.log('[DEBUG] joinMatch - Game has coachId:', gameData.coachId);
  console.log('[DEBUG] joinMatch - Game has teamId:', gameData.teamId);
  console.log('[DEBUG] joinMatch - Game has playerId:', gameData.playerId);
  console.log('[DEBUG] joinMatch - Game status:', gameData.status);
  
  const playerIds = gameData.playerIds || [];
  
  if (playerIds.includes(playerId)) {
    throw new Error('You have already joined this match');
  }
  
  if (gameData.status !== 'waiting') {
    throw new Error('Match is not accepting new players');
  }
  
  console.log('[DEBUG] joinMatch - Attempting updateDoc with arrayUnion');
  // Use arrayUnion instead of spread operator to work with Firestore security rules
  await updateDoc(gameRef, {
    playerIds: arrayUnion(playerId),
  });
  console.log('[DEBUG] joinMatch - Successfully updated');
};

export const getGamesByMatchId = async (matchId: string) => {
  const q = query(gamesCollection, where('matchId', '==', matchId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startedAt: data.startedAt?.toDate() || new Date(),
      endedAt: data.endedAt?.toDate(),
    };
  }) as Game[];
};

export const getGameByMatchIdCode = async (matchIdCode: string) => {
  // Query by matchIdCode only (type field may not exist in all documents)
  // The security rules allow reading games with matchIdCode
  const q = query(
    gamesCollection, 
    where('matchIdCode', '==', matchIdCode.toUpperCase())
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  const data = doc.data();
  
  return {
    id: doc.id,
    ...data,
    startedAt: data.startedAt?.toDate() || new Date(),
    endedAt: data.endedAt?.toDate(),
  } as Game;
};

// Users Collection
export const usersCollection = collection(db, 'users');

export const getUser = async (userId: string) => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    const data = userDoc.data();
    return {
      uid: userDoc.id,
      email: data.email || '',
      displayName: data.displayName,
      role: data.role,
      teamId: data.teamId,
      createdAt: data.createdAt?.toDate() || new Date(),
      lastActive: data.lastActive?.toDate() || new Date(),
    } as User;
  }
  return null;
};

// Admin functions for user management
export const getAllUsers = async () => {
  const snapshot = await getDocs(usersCollection);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      uid: doc.id,
      email: data.email || '',
      displayName: data.displayName,
      role: data.role,
      teamId: data.teamId,
      createdAt: data.createdAt?.toDate() || new Date(),
      lastActive: data.lastActive?.toDate() || new Date(),
    } as User;
  });
};

export const deleteUser = async (userId: string) => {
  // Delete user document
  await deleteDoc(doc(db, 'users', userId));
  // Also delete associated player document if it exists
  const playerDoc = await getDoc(doc(db, 'players', userId));
  if (playerDoc.exists()) {
    await deleteDoc(doc(db, 'players', userId));
  }
};

// Match History Collection
export const matchHistoryCollection = collection(db, 'matchHistory');

export const getMatchHistoriesByGameId = async (gameId: string) => {
  const q = query(
    collection(db, 'matchHistory'),
    where('gameId', '==', gameId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startedAt: data.startedAt?.toDate() || new Date(),
      completedAt: data.completedAt?.toDate() || new Date(),
    } as MatchHistory;
  });
};

export const createMatchHistory = async (match: Omit<MatchHistory, 'id' | 'startedAt' | 'completedAt'>) => {
  const matchRef = doc(matchHistoryCollection);
  
  // Build document data - keep it simple and ensure playerId is exactly the auth uid
  const matchDocData: Record<string, unknown> = {
    gameId: match.gameId,
    playerId: match.playerId, // Must match request.auth.uid exactly
    type: match.type,
    score: match.score,
    total: match.total,
    avgBuzzTime: match.avgBuzzTime,
    correctBySubject: match.correctBySubject || {},
    questionIds: match.questionIds || [],
    hesitationCount: match.hesitationCount || 0,
    startedAt: serverTimestamp(),
    completedAt: serverTimestamp(),
  };
  
  // Only include optional fields if they're defined and not empty
  if (match.teamId !== undefined && match.teamId !== null && match.teamId !== '') {
    matchDocData.teamId = match.teamId;
  }
  
  // Include totalBySubject if it's defined
  if (match.totalBySubject !== undefined && match.totalBySubject !== null) {
    matchDocData.totalBySubject = match.totalBySubject;
  }
  
  // Log the exact data being sent for debugging
  console.log('Firestore setDoc data:', {
    playerId: matchDocData.playerId,
    playerIdType: typeof matchDocData.playerId,
    gameId: matchDocData.gameId,
    type: matchDocData.type,
    score: matchDocData.score,
    total: matchDocData.total,
  });
  
  await setDoc(matchRef, matchDocData);
  return matchRef.id;
};

export const getMatchHistoryByPlayer = async (playerId: string, limitCount: number = 50) => {
  const q = query(
    matchHistoryCollection,
    where('playerId', '==', playerId),
    orderBy('completedAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    startedAt: doc.data().startedAt?.toDate() || new Date(),
    completedAt: doc.data().completedAt?.toDate() || new Date(),
  })) as MatchHistory[];
};

export const getMatchHistoryByTeam = async (teamId: string, limitCount: number = 100) => {
  const q = query(
    matchHistoryCollection,
    where('teamId', '==', teamId),
    orderBy('completedAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    startedAt: doc.data().startedAt?.toDate() || new Date(),
    completedAt: doc.data().completedAt?.toDate() || new Date(),
  })) as MatchHistory[];
};

// Leaderboards Collection
export const leaderboardsCollection = collection(db, 'leaderboards');

export const getTeamLeaderboard = async (teamId: string) => {
  const q = query(
    leaderboardsCollection,
    where('teamId', '==', teamId),
    orderBy('accuracy', 'desc'),
    orderBy('avgBuzzTime', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    lastUpdated: doc.data().lastUpdated?.toDate() || new Date(),
  })) as LeaderboardEntry[];
};

// Settings Collection
export const settingsCollection = collection(db, 'settings');

export const getGameSettings = async (teamId?: string) => {
  // First, try to get team-specific settings
  if (teamId) {
    const teamSettingsRef = doc(db, 'settings', teamId);
    const teamSettingsDoc = await getDoc(teamSettingsRef);
    if (teamSettingsDoc.exists()) {
      const data = teamSettingsDoc.data();
      console.log(`Found team-specific settings for teamId: ${teamId}`, data);
      return data as GameSettings;
    }
  }
  
  // Fallback to 'default' settings if team-specific doesn't exist
  const defaultSettingsRef = doc(db, 'settings', 'default');
  const defaultSettingsDoc = await getDoc(defaultSettingsRef);
  if (defaultSettingsDoc.exists()) {
    const data = defaultSettingsDoc.data();
    console.log('Using default settings document', data);
    return data as GameSettings;
  }
  
  // Return hardcoded defaults only if no settings exist in database
  console.log('No settings found in database, using hardcoded defaults');
  return {
    questionTime: 10,
    hesitationTime: 5,
    wpm: 150,
  } as GameSettings;
};

export const updateGameSettings = async (settings: GameSettings, teamId?: string) => {
  const settingsRef = doc(db, 'settings', teamId || 'default');
  
  // Build document data, filtering out undefined values
  const settingsDocData: any = {
    questionTime: settings.questionTime,
    hesitationTime: settings.hesitationTime,
    wpm: settings.wpm,
  };
  
  // Only include optional fields if they're defined
  if (settings.teamId !== undefined && settings.teamId !== null && settings.teamId !== '') {
    settingsDocData.teamId = settings.teamId;
  }
  
  await setDoc(settingsRef, settingsDocData);
};

// Notifications Collection
export const notificationsCollection = collection(db, 'notifications');

export const createNotification = async (notification: Omit<Notification, 'id' | 'createdAt'>) => {
  const notificationRef = doc(notificationsCollection);
  
  // Build document data, filtering out undefined values
  const notificationDocData: any = {
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: false,
    createdAt: serverTimestamp(),
  };
  
  // Only include optional fields if they're defined
  if (notification.gameId !== undefined && notification.gameId !== null && notification.gameId !== '') {
    notificationDocData.gameId = notification.gameId;
  }
  if (notification.teamId !== undefined && notification.teamId !== null && notification.teamId !== '') {
    notificationDocData.teamId = notification.teamId;
  }
  
  await setDoc(notificationRef, notificationDocData);
  return notificationRef.id;
};

export const getNotificationsByUser = async (userId: string, limitCount: number = 50) => {
  const q = query(
    notificationsCollection,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Notification[];
};

export const markNotificationAsRead = async (notificationId: string) => {
  const notificationRef = doc(db, 'notifications', notificationId);
  await updateDoc(notificationRef, { read: true });
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const q = query(
    notificationsCollection,
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { read: true });
  });
  await batch.commit();
};







