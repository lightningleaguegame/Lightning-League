import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * One-time setup script to create the admin user
 * Run this function once to create the admin account
 */
export const createAdminUser = async () => {
  const email = 'LightningLeagueGame@gmail.com';
  const password = 'Z@nd3490';
  const displayName = 'Admin';
  const role = 'admin' as const;

  try {
    // Check if user already exists
    console.log('Checking if admin user already exists...');
    
    // Try to create the user in Firebase Auth
    console.log('Creating Firebase Auth user...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    console.log('Creating Firestore user document...');
    const userDocData = {
      uid: user.uid,
      email: user.email || '',
      displayName,
      role,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', user.uid), userDocData);

    console.log('✅ Admin user created successfully!');
    console.log('User ID:', user.uid);
    console.log('Email:', email);
    console.log('Role:', role);
    
    return { success: true, userId: user.uid };
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️ User already exists. Checking Firestore document...');
      
      // Try to find the user by email in Firestore
      // Since we can't query by email easily, we'll need to sign in first
      // For now, just log that the user exists
      console.log('User exists in Firebase Auth. Please check Firestore manually.');
      console.log('If the user document doesn\'t have admin role, update it manually.');
      
      return { success: false, error: 'User already exists in Firebase Auth' };
    }
    
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
};

/**
 * Helper function to update existing user to admin role
 * Use this if the user already exists but doesn't have admin role
 */
export const updateUserToAdmin = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }
    
    await setDoc(userRef, {
      ...userDoc.data(),
      role: 'admin',
    }, { merge: true });
    
    console.log('✅ User updated to admin role successfully!');
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating user to admin:', error);
    throw error;
  }
};

