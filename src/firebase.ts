import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { getConfig } from './config/env';

// Firebase configuration from environment
const config = getConfig();
const firebaseConfig = {
  apiKey: config.firebase.apiKey,
  projectId: config.firebase.projectId,
  storageBucket: config.firebase.storageBucket,
  messagingSenderId: config.firebase.messagingSenderId,
};

// Initialize Firebase
const apps = getApps();
const app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);

// Test Firebase connection
console.log('Firebase initialized with config:', {
  projectId: firebaseConfig.projectId,
  db: db ? 'Initialized' : 'Failed',
});

// User interface
export interface UserData {
  id?: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
  profilePic?: string;
  createdAt: Date;
}

// Helper function to generate auto-incrementing user ID
const generateUserId = async (): Promise<number> => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getCountFromServer(usersRef);
    return snapshot.data().count + 1;
  } catch (error) {
    console.error('Error generating user ID:', error);
    // Fallback: use timestamp as user ID
    return Date.now();
  }
};

// Helper function to generate hexadecimal token
const generateToken = (userData: UserData): string => {
  const tokenData = {
    userId: userData.id,
    email: userData.email,
    name: userData.name,
    mobile: userData.mobile,
    profilePic: userData.profilePic,
    createdAt: userData.createdAt,
    timestamp: Date.now(),
  };
  
  const tokenString = JSON.stringify(tokenData);
  return Buffer.from(tokenString).toString('hex');
};

// Helper function to decode token
export const decodeToken = (token: string): any => {
  try {
    const tokenString = Buffer.from(token, 'hex').toString();
    return JSON.parse(tokenString);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// User functions
export const registerUser = async (userData: Omit<UserData, 'id' | 'createdAt'>) => {
  try {
    // Check if user with this email already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', userData.email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return { success: false, error: 'User with this email already exists' };
    }

    // Generate auto-incrementing user ID
    const userId = await generateUserId();

    // Prepare user data for Firestore
    const userDocData: UserData = {
      ...userData,
      id: userId.toString(),
      createdAt: new Date(),
    };

    // Save user data to Firestore with custom ID
    await setDoc(doc(db, 'users', userId.toString()), userDocData);
    
    console.log('User registered with ID:', userId);

    return { success: true, userId: userId.toString(), userData: userDocData };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'User not found' };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as UserData;
    
    return { 
      success: true, 
      userData: { ...userData, id: userDoc.id },
      userId: userDoc.id 
    };
  } catch (error: any) {
    console.error('Get user error:', error);
    return { success: false, error: error.message };
  }
};

export const getUserData = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() as UserData };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error: any) {
    console.error('Get user data error:', error);
    return { success: false, error: error.message };
  }
};

export const authenticateUser = async (email: string, password: string) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'User not found' };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as UserData;
    
    // Check if password matches
    if (userData.password !== password) {
      return { success: false, error: 'Invalid password' };
    }
    
    // Generate token
    const token = generateToken(userData);
    
    // Store token in AsyncStorage
    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));
    
    return { 
      success: true, 
      userData: userData,
      userId: userData.id,
      token: token
    };
  } catch (error: any) {
    console.error('Authentication error:', error);
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = async () => {
  try {
    const userDataString = await AsyncStorage.getItem('userData');
    if (userDataString) {
      return JSON.parse(userDataString);
    }
    return null;
  } catch (error: any) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const logout = async () => {
  try {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    return { success: true };
  } catch (error: any) {
    console.error('Error during logout:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserProfilePic = async (userId: string, profilePicUrl: string) => {
  try {
    await setDoc(doc(db, 'users', userId), { profilePic: profilePicUrl }, { merge: true });
    
    // Update local storage with new profile pic
    const currentUser = await getCurrentUser();
    if (currentUser) {
      currentUser.profilePic = profilePicUrl;
      await AsyncStorage.setItem('userData', JSON.stringify(currentUser));
      
      // Generate new token with updated user data
      const newToken = generateToken(currentUser);
      await AsyncStorage.setItem('userToken', newToken);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Update profile pic error:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<UserData>) => {
  try {
    await setDoc(doc(db, 'users', userId), updates, { merge: true });
    
    // Update local storage with new user data
    const currentUser = await getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      
      // Generate new token with updated user data
      const newToken = generateToken(updatedUser);
      await AsyncStorage.setItem('userToken', newToken);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Update user profile error:', error);
    return { success: false, error: error.message };
  }
};

export default app; 

