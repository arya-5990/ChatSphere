import { Platform } from 'react-native';

// For React Native, we'll use a different approach since react-native-dotenv
// might not work as expected. We'll create a config object that can be
// easily replaced with environment variables in production.

interface Config {
  firebase: {
    apiKey: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
  };
  cloudinary: {
    cloudName: string;
    uploadPreset: string;
    apiKey: string;
    apiSecret: string;
  };
}

// IMPORTANT: In a real production app, these values should come from:
// 1. Environment variables (process.env)
// 2. Secure storage
// 3. Remote configuration
// 4. Build-time configuration

// For development, you can temporarily store these here
// BUT REMEMBER TO REMOVE THEM BEFORE PUSHING TO GIT
const config: Config = {
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCrI9OulD9FUQLHcWuyelO2FocquJ1A048",
    projectId: process.env.FIREBASE_PROJECT_ID || "chatsphere-54fb7",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "chatsphere-54fb7.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "467105186042",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "dpvab3v9f",
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || "chatsphere_preset",
    apiKey: process.env.CLOUDINARY_API_KEY || "915544357637558",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "eQR7z9rrUXMTa2qjvScLyUdZrp4",
  },
};

// Function to get configuration based on environment
export const getConfig = (): Config => {
  // In a real production app, you would load these from environment variables
  // For now, we'll use the hardcoded values but structure it so it's easy to change later
  
  if (__DEV__) {
    console.log('Running in development mode');
    // In development, you might want to load from a local file
    // that's not committed to git
  } else {
    console.log('Running in production mode');
    // In production, these should come from environment variables
  }
  
  return config;
};

export default config; 