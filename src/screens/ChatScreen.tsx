import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useTheme } from '../theme/ThemeContext';
import { getCurrentUser, db } from '../firebase';
import { uploadAudioToCloudinary } from '../services/cloudinary';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  onSnapshot,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

interface Message {
  id: string;
  senderId: string;
  text?: string;
  voiceNote?: {
    url: string;
    duration: number;
  };
  timestamp: any; // Firestore timestamp
  seenBy: { [userId: string]: string }; // Read receipts: userId -> timestamp
}

interface MessageGroup {
  date: string;
  messages: Message[];
}

interface ChatScreenProps {
  navigation: any;
  route: {
    params: {
      userData: {
        id: string;
        name: string;
        profilePic?: string;
      };
    };
  };
}

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const { colors, colorScheme } = useTheme();
  const { userData } = route.params;
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageGroups, setMessageGroups] = useState<MessageGroup[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showUnreadDivider, setShowUnreadDivider] = useState(false);
  const [unreadMessageIndex, setUnreadMessageIndex] = useState<number | null>(null);
  
  // Voice recording states
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser && userData) {
      findOrCreateChat();
    }
  }, [currentUser, userData]);

  useEffect(() => {
    groupMessagesByDate();
  }, [messages]);

  // Scroll to bottom when message groups change
  useEffect(() => {
    if (messageGroups.length > 0) {
      // scrollToBottom(); // Removed as FlatList is inverted
    }
  }, [messageGroups]);

  // Show unread divider when messages are loaded
  useEffect(() => {
    if (currentUser && messages.length > 0) {
      const unreadIndex = messages.findIndex(message => 
        message.senderId !== currentUser.id && !message.seenBy?.[currentUser.id]
      );

      if (unreadIndex !== -1) {
        setUnreadMessageIndex(unreadIndex);
        setShowUnreadDivider(true);
        
        // Hide divider after 3 seconds
        setTimeout(() => {
          setShowUnreadDivider(false);
          setUnreadMessageIndex(null);
        }, 3000);
      }
    }
  }, [messages, currentUser]);

  // Force scroll to bottom when component mounts
  useEffect(() => {
    if (messageGroups.length > 0 && !loading) {
      // setTimeout(() => { // Removed as FlatList is inverted
      //   scrollToBottom();
      // }, 100);
    }
  }, [loading]);

  // Mark messages as read when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (currentUser && chatId) {
        // Check for unread messages and show divider if needed
        const unreadIndex = messages.findIndex(message => 
          message.senderId !== currentUser.id && !message.seenBy?.[currentUser.id]
        );

        if (unreadIndex !== -1) {
          setUnreadMessageIndex(unreadIndex);
          setShowUnreadDivider(true);
          
          // Hide divider after 3 seconds
          setTimeout(() => {
            setShowUnreadDivider(false);
            setUnreadMessageIndex(null);
          }, 3000);
        }
        
        // Mark messages as read
        markMessagesAsRead();
      }
    });

    return unsubscribe;
  }, [navigation, currentUser, chatId, messages]);

  const scrollToUnreadMessages = () => {
    if (!currentUser || !messages.length) return;

    // Find the first unread message from other user
    const unreadIndex = messages.findIndex(message => 
      message.senderId !== currentUser.id && !message.seenBy?.[currentUser.id]
    );

    if (unreadIndex !== -1) {
      // Check if unread messages are near the bottom (last 3 messages)
      const isNearBottom = unreadIndex >= messages.length - 3;
      
      if (isNearBottom) {
        // If unread messages are near bottom, just scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 500);
      } else {
        // If unread messages are further up, scroll to them and show divider
        setUnreadMessageIndex(unreadIndex);
        setShowUnreadDivider(true);
        
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: unreadIndex,
            animated: true,
            viewPosition: 0.3
          });
        }, 500);
      }
    } else {
      // If no unread messages, scroll to bottom to show most recent
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 500);
    }
  };

  const markMessagesAsRead = async () => {
    if (!currentUser || !chatId || !messages.length) return;

    try {
      const currentTime = new Date().toISOString();
      
      // Update each unread message individually
      for (const message of messages) {
        if (message.senderId !== currentUser.id && !message.seenBy?.[currentUser.id]) {
          const messageRef = doc(db, 'chats', chatId, 'messages', message.id);
          await updateDoc(messageRef, {
            [`seenBy.${currentUser.id}`]: currentTime
          });
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const startRecording = async () => {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Microphone permission is required to record voice notes.');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingUri(null);

      // Start timer for recording duration
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      // Stop recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        setRecordingUri(uri);
        setRecording(null);
        setIsRecording(false);
        
        // Clear timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        // Send voice note if duration is more than 1 second
        if (recordingDuration > 1) {
          await sendVoiceNote(uri, recordingDuration);
        } else {
          Alert.alert('Recording too short', 'Please record for at least 1 second.');
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const sendVoiceNote = async (uri: string, duration: number) => {
    if (!chatId || !currentUser) return;

    setSending(true);
    
    try {
      // Upload audio to Cloudinary
      const audioUrl = await uploadAudioToCloudinary(uri);
      
      // Create message data
      const messageData = {
        senderId: currentUser.id,
        voiceNote: {
          url: audioUrl,
          duration: duration,
        },
        timestamp: serverTimestamp(),
        seenBy: {},
      };

      const chatRef = doc(db, 'chats', chatId);
      const messagesRef = collection(chatRef, 'messages');
      
      // Add message to subcollection
      await addDoc(messagesRef, messageData);
      
      // Update the chat document with last message info
      await updateDoc(chatRef, {
        lastMessage: '🎤 Voice note',
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: currentUser.id,
      });

      // Reset recording states
      setRecordingUri(null);
      setRecordingDuration(0);

    } catch (error) {
      console.error('Error sending voice note:', error);
      Alert.alert('Error', 'Failed to send voice note. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const playVoiceNote = async (url: string, messageId: string) => {
    try {
      // Stop any currently playing audio
      if (sound) {
        await sound.unloadAsync();
      }

      // Load and play the audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(messageId);

      // Listen for playback status
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(null);
        }
      });

    } catch (error) {
      console.error('Error playing voice note:', error);
      Alert.alert('Error', 'Failed to play voice note.');
    }
  };

  const stopVoiceNote = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(null);
    }
  };

  const onViewableItemsChanged = ({ viewableItems }: any) => {
    // Mark messages as read when they become visible
    if (viewableItems.length > 0 && currentUser && chatId) {
      markMessagesAsRead();
    }
  };



  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const findOrCreateChat = async () => {
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('participants', 'array-contains', currentUser.id)
      );
      const querySnapshot = await getDocs(q);
      
      let foundChat = false;
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.participants.includes(userData.id)) {
          setChatId(doc.id);
          foundChat = true;
          loadMessages(doc.id);
        }
      });

      if (!foundChat) {
        // Create new chat
        const newChatData = {
          participants: [currentUser.id, userData.id],
          createdAt: serverTimestamp(),
          lastMessage: null,
          lastMessageTime: null,
        };
        
        const chatRef = await addDoc(collection(db, 'chats'), newChatData);
        setChatId(chatRef.id);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error finding/creating chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = (chatDocumentId: string) => {
    const messagesRef = collection(db, 'chats', chatDocumentId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData: Message[] = [];
      querySnapshot.forEach((doc) => {
        const messageData = doc.data() as Message;
        messagesData.push({
          ...messageData,
          id: doc.id
        });
      });
      setMessages(messagesData);
    });

    return unsubscribe;
  };

  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const messageDate = getMessageDate(message.timestamp);
      if (!groups[messageDate]) {
        groups[messageDate] = [];
      }
      groups[messageDate].push(message);
    });

    const sortedGroups = Object.keys(groups)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(date => ({
        date,
        messages: groups[date]
      }));

    setMessageGroups(sortedGroups);
  };

  const getMessageDate = (timestamp: any): string => {
    if (!timestamp) return new Date().toDateString();
    
    let date: Date;
    if (timestamp.toDate) {
      // Firestore timestamp
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      // Firestore timestamp object
      date = new Date(timestamp.seconds * 1000);
    } else {
      // Regular date
      date = new Date(timestamp);
    }
    
    return date.toDateString();
  };

  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const formatMessageTime = (timestamp: any): string => {
    if (!timestamp) return '';
    
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !currentUser) return;
    
    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately
    setSending(true);
    
    try {
      const messageData = {
        senderId: currentUser.id,
        text: messageText,
        timestamp: serverTimestamp(),
        seenBy: {}, // Initialize seenBy field
      };

      const chatRef = doc(db, 'chats', chatId);
      const messagesRef = collection(chatRef, 'messages');
      
      // Add message to subcollection
      const messageRef = await addDoc(messagesRef, messageData);
      
      // Update the chat document with last message info
      await updateDoc(chatRef, {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: currentUser.id,
      });

      // No need to scroll manually with inverted FlatList

    } catch (error) {
      console.error('Error sending message:', error);
      // If there's an error, restore the message to the input field
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const renderDateHeader = ({ item }: { item: MessageGroup }) => (
    <View style={styles.dateHeaderContainer}>
      <View style={[styles.dateHeader, { 
        backgroundColor: colorScheme === 'dark' ? '#2d2d2d' : colors.surface 
      }]}>
        <Text style={[styles.dateHeaderText, { 
          color: colorScheme === 'dark' ? '#CCCCCC' : colors.textSecondary 
        }]}>
          {formatDateHeader(item.date)}
        </Text>
      </View>
    </View>
  );

  const renderUnreadDivider = () => (
    <View style={styles.unreadDividerContainer}>
      <View style={[styles.unreadDivider, { 
        backgroundColor: colorScheme === 'dark' ? '#0A84FF' : '#007AFF' 
      }]}>
        <Text style={[styles.unreadDividerText, { color: '#FFFFFF' }]}>
          New Messages
        </Text>
      </View>
    </View>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === currentUser?.id;
    const isRead = isMyMessage && item.seenBy && Object.keys(item.seenBy).length > 0;
    const otherUserId = isMyMessage ? userData.id : currentUser?.id;
    const isReadByOther = isMyMessage && item.seenBy?.[otherUserId];
    
    // Determine message status for my messages
    let messageStatus = '';
    let statusIcon = '';
    if (isMyMessage) {
      if (isReadByOther) {
        statusIcon = '✓✓';
        messageStatus = 'Seen';
      } else if (isRead) {
        statusIcon = '✓✓';
        messageStatus = 'Delivered';
      } else {
        statusIcon = '✓';
        messageStatus = 'Sent';
      }
    }
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage 
            ? [styles.myMessageBubble, { 
                backgroundColor: colorScheme === 'dark' ? '#0A84FF' : '#007AFF' 
              }]
            : [styles.otherMessageBubble, { 
                backgroundColor: colorScheme === 'dark' ? '#2d2d2d' : '#E9E9EB' 
              }]
        ]}>
          {item.text && (
            <Text style={[
              styles.messageText,
              isMyMessage 
                ? { color: '#FFFFFF' }
                : { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
            ]}>
              {item.text}
            </Text>
          )}
          
          {item.voiceNote && (
            <View style={styles.voiceNoteContainer}>
              <TouchableOpacity
                style={[
                  styles.voiceNoteButton,
                  { 
                    backgroundColor: isMyMessage 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)')
                  }
                ]}
                onPress={() => {
                  if (isPlaying === item.id) {
                    stopVoiceNote();
                  } else {
                    playVoiceNote(item.voiceNote!.url, item.id);
                  }
                }}
              >
                <Text style={[styles.voiceNoteIcon, { 
                  color: isMyMessage ? '#FFFFFF' : (colorScheme === 'dark' ? '#FFFFFF' : '#000000') 
                }]}>
                  {isPlaying === item.id ? '⏸️' : '▶️'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.voiceNoteInfo}>
                <View style={styles.voiceNoteWaveformContainer}>
                  <View style={[styles.voiceNoteWaveform, { 
                    backgroundColor: isMyMessage 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)') 
                  }]}>
                    {[...Array(8)].map((_, index) => (
                      <View 
                        key={index}
                        style={[
                          styles.voiceNoteWave,
                          { 
                            backgroundColor: isMyMessage 
                              ? '#FFFFFF' 
                              : (colorScheme === 'dark' ? '#FFFFFF' : '#000000'),
                            height: isPlaying === item.id ? 16 : 12,
                            opacity: isPlaying === item.id ? 1 : 0.7
                          }
                        ]} 
                      />
                    ))}
                  </View>
                </View>
                
                <View style={styles.voiceNoteDetails}>
                  <Text style={[styles.voiceNoteLabel, { 
                    color: isMyMessage 
                      ? 'rgba(255, 255, 255, 0.9)' 
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)') 
                  }]}>
                    Voice Note
                  </Text>
                  <Text style={[styles.voiceNoteDuration, { 
                    color: isMyMessage 
                      ? 'rgba(255, 255, 255, 0.7)' 
                      : (colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)') 
                  }]}>
                    {Math.floor(item.voiceNote.duration / 60)}:{(item.voiceNote.duration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              </View>
              
              {isPlaying === item.id && (
                <View style={styles.playingIndicator}>
                  <Text style={[styles.playingText, { 
                    color: isMyMessage ? '#FFFFFF' : (colorScheme === 'dark' ? '#FFFFFF' : '#000000') 
                  }]}>
                    Playing...
                  </Text>
                </View>
              )}
            </View>
          )}
          
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isMyMessage 
                ? { color: 'rgba(255, 255, 255, 0.7)' }
                : { color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }
            ]}>
              {formatMessageTime(item.timestamp)}
            </Text>
            {isMyMessage && (
              <View style={styles.readStatus}>
                <Text style={[styles.readIcon, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                  {statusIcon}
                </Text>
                <Text style={[styles.readText, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                  {messageStatus}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: MessageGroup }) => (
    <View>
      {renderDateHeader({ item })}
      {item.messages.map((message, messageIndex) => {
        // Find the message index in the original messages array
        const globalMessageIndex = messages.findIndex(m => m.id === message.id);
        const shouldShowDivider = showUnreadDivider && unreadMessageIndex === globalMessageIndex;
        
        return (
          <View key={message.id}>
            {shouldShowDivider && renderUnreadDivider()}
            {renderMessage({ item: message })}
          </View>
        );
      })}
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={colorScheme === 'dark' ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']} style={styles.container}>
        <StatusBar 
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: '#FFFFFF' }]}>Loading chat...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={colorScheme === 'dark' ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']} style={styles.container}>
      <StatusBar 
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.headerUserInfo}>
            {userData.profilePic ? (
              <Image source={{ uri: userData.profilePic }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, { backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 16, color: '#FFFFFF' }}>👤</Text>
              </View>
            )}
            <Text style={[styles.headerUserName, { color: '#FFFFFF' }]}>{userData.name}</Text>
          </View>
          
          <View style={styles.placeholder} />
        </View>

        {/* Messages */}
        <KeyboardAvoidingView 
          style={[styles.messagesContainer, { backgroundColor: colorScheme === 'dark' ? '#121212' : '#FFFFFF' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={[...messageGroups].reverse()}
            renderItem={renderItem}
            keyExtractor={(item) => item.date}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            removeClippedSubviews={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            inverted={true}
          />

          {/* Message Input */}
          <View style={[styles.inputContainer, { 
            backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#F8F9FA',
            borderTopColor: colorScheme === 'dark' ? '#333333' : '#E1E5E9'
          }]}>
            {isRecording ? (
              // Recording UI
              <View style={styles.recordingContainer}>
                <View style={styles.recordingInfo}>
                  <View style={styles.recordingIndicator}>
                    <Text style={styles.recordingDot}>🔴</Text>
                  </View>
                  <Text style={[styles.recordingText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                    Recording...
                  </Text>
                  <Text style={[styles.recordingDuration, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.stopRecordingButton, { backgroundColor: '#FF3B30' }]}
                  onPress={stopRecording}
                >
                  <Text style={styles.stopRecordingText}>Stop</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Normal input UI
              <>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colorScheme === 'dark' ? '#2d2d2d' : '#FFFFFF', 
                    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                    borderColor: colorScheme === 'dark' ? '#404040' : '#E1E5E9' 
                  }]}
                  placeholder="Type a message..."
                  placeholderTextColor={colorScheme === 'dark' ? '#888888' : '#8E8E93'}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  maxLength={500}
                />
                
                {newMessage.trim() ? (
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      { backgroundColor: colorScheme === 'dark' ? '#0A84FF' : '#007AFF' }
                    ]}
                    onPress={sendMessage}
                    disabled={sending}
                  >
                    <Text style={[styles.sendButtonText, { color: '#FFFFFF' }]}>
                      {sending ? '...' : '→'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.voiceButton,
                      { backgroundColor: colorScheme === 'dark' ? '#0A84FF' : '#007AFF' }
                    ]}
                    onPress={startRecording}
                    disabled={sending}
                  >
                    <Text style={[styles.voiceButtonText, { color: '#FFFFFF' }]}>
                      🎤
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headerUserName: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 10,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  messageContainer: {
    marginVertical: 4,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myMessageBubble: {
    borderBottomRightRadius: 5,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  readStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  readText: {
    fontSize: 12,
  },
  unreadDividerContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  unreadDivider: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unreadDividerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E1E5E9',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  voiceNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    minWidth: 280,
    maxWidth: 320,
  },
  voiceNoteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceNoteIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  voiceNoteInfo: {
    flex: 1,
    flexDirection: 'column',
  },
  voiceNoteWaveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  voiceNoteWaveform: {
    flex: 1,
    height: 28,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginRight: 16,
    minWidth: 180,
  },
  voiceNoteWave: {
    width: 3,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  voiceNoteDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceNoteLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  voiceNoteDuration: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },
  playingIndicator: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  playingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  recordingDuration: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
    fontFamily: 'monospace',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    fontSize: 12,
  },
  stopRecordingButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stopRecordingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ChatScreen; 