// Migration script to convert from old structure to new structure
// Run this script once to migrate existing data

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, addDoc, serverTimestamp } = require('firebase/firestore');

// Firebase configuration - IMPORTANT: Replace with your actual values
// In production, these should come from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  projectId: process.env.FIREBASE_PROJECT_ID || "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_FIREBASE_MESSAGING_SENDER_ID",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateChats() {
  try {
    console.log('Starting migration...');
    
    // Get all existing chats
    const chatsRef = collection(db, 'chats');
    const querySnapshot = await getDocs(chatsRef);
    
    console.log(`Found ${querySnapshot.size} chats to migrate`);
    
    for (const chatDoc of querySnapshot.docs) {
      const chatData = chatDoc.data();
      const chatId = chatDoc.id;
      
      console.log(`Migrating chat ${chatId}...`);
      
      // Check if this chat has the old structure (messages array)
      if (chatData.messages && Array.isArray(chatData.messages)) {
        
        // Create new chat document with new structure
        const newChatData = {
          participants: chatData.users || chatData.participants || [],
          createdAt: chatData.createdAt || serverTimestamp(),
          lastMessage: chatData.lastMessage || null,
          lastMessageTime: chatData.lastMessageTime || null,
          lastMessageSenderId: chatData.lastMessageSenderId || null,
        };
        
        // Update the chat document
        await setDoc(doc(db, 'chats', chatId), newChatData);
        
        // Move messages to subcollection
        if (chatData.messages.length > 0) {
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          
          for (const message of chatData.messages) {
            // Ensure message has required fields
            const newMessageData = {
              senderId: message.senderId,
              text: message.text,
              timestamp: message.timestamp || serverTimestamp(),
              seenBy: message.seenBy || {},
            };
            
            await addDoc(messagesRef, newMessageData);
          }
          
          console.log(`Migrated ${chatData.messages.length} messages for chat ${chatId}`);
        }
        
        // Remove old messages array from chat document
        const { messages, users, ...cleanChatData } = chatData;
        await setDoc(doc(db, 'chats', chatId), cleanChatData);
        
      } else {
        console.log(`Chat ${chatId} already has new structure, skipping...`);
      }
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration
migrateChats(); 