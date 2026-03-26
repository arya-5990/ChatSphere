import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { getCurrentUser, db, UserData } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  avatar: string;
  profilePic?: string;
}

interface ChatsScreenProps {
  navigation: any;
}

const ChatsScreen: React.FC<ChatsScreenProps> = ({ navigation }) => {
  const { colors, colorScheme, toggleColorScheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acceptedUsers, setAcceptedUsers] = useState<ChatItem[]>([]);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  
  // Load current user data on component mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user) {
        await Promise.all([
          loadAcceptedUsers(user.id),
          loadPendingInvitesCount(user.id)
        ]);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAcceptedUsers = async (currentUserId: string) => {
    try {
      const invitesRef = collection(db, 'invite');
      // Get all invites where current user is involved and status is accepted
      const q = query(
        invitesRef,
        where('status', '==', 'accepted')
      );
      const querySnapshot = await getDocs(q);
      
      const acceptedUserIds: string[] = [];
      querySnapshot.forEach((doc) => {
        const invite = doc.data();
        if (invite.from === currentUserId) {
          acceptedUserIds.push(invite.to);
        } else if (invite.to === currentUserId) {
          acceptedUserIds.push(invite.from);
        }
      });

      // Get user data and chat data for accepted users
      const usersRef = collection(db, 'users');
      const chatsRef = collection(db, 'chats');
      const chatItems: ChatItem[] = [];
      
      for (const userId of acceptedUserIds) {
        // Get user data
        const userQuery = query(usersRef, where('id', '==', userId));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data() as UserData;
          
          // Get chat data for this user
          const chatQuery = query(
            chatsRef,
            where('participants', 'array-contains', currentUserId)
          );
          const chatSnapshot = await getDocs(chatQuery);
          
          let lastMessage = 'Start a conversation!';
          let lastMessageTime = 'Now';
          let isLastMessageRead = true;
          let lastMessageSenderId = '';
          let unreadCount = 0;
          let chatDocumentId = '';
          let unreadVoiceNotes = 0;
          
          chatSnapshot.forEach((chatDoc) => {
            const chatData = chatDoc.data();
            if (chatData.participants.includes(userId)) {
              chatDocumentId = chatDoc.id;
              if (chatData.lastMessage) {
                lastMessage = chatData.lastMessage;
                lastMessageSenderId = chatData.lastMessageSenderId || '';
                
                // Format the timestamp
                if (chatData.lastMessageTime) {
                  const timestamp = chatData.lastMessageTime;
                  let date: Date;
                  
                  if (timestamp.toDate) {
                    date = timestamp.toDate();
                  } else if (timestamp.seconds) {
                    date = new Date(timestamp.seconds * 1000);
                  } else {
                    date = new Date(timestamp);
                  }
                  
                  const now = new Date();
                  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
                  
                  if (diffInHours < 1) {
                    lastMessageTime = 'Now';
                  } else if (diffInHours < 24) {
                    lastMessageTime = date.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    });
                  } else if (diffInHours < 48) {
                    lastMessageTime = 'Yesterday';
                  } else {
                    lastMessageTime = date.toLocaleDateString([], { 
                      month: 'short', 
                      day: 'numeric' 
                    });
                  }
                } else {
                  // If there's a lastMessage but no timestamp, show "Now"
                  lastMessageTime = 'Now';
                }
              }
            }
          });

          // Get unread message count and last message read status
          if (chatDocumentId) {
            const { unreadCount: count, isLastRead, lastMessageSenderId: senderId, lastMessageText: messageText, unreadVoiceNotes: voiceNotesCount } = await getUnreadMessageCount(chatDocumentId, currentUserId, userId);
            unreadCount = count;
            isLastMessageRead = isLastRead;
            lastMessageSenderId = senderId;
            lastMessage = messageText;
            unreadVoiceNotes = voiceNotesCount;
          }
          
          // Format the last message display based on sender and unread count
          if (lastMessage && lastMessage !== 'Start a conversation!') {
            if (lastMessageSenderId === currentUserId) {
              // Message sent by current user
              if (lastMessage === '🎤 Voice note') {
                lastMessage = 'sent: 🎤 Voice note';
              } else {
                lastMessage = `sent: ${lastMessage}`;
              }
              if (isLastMessageRead) {
                lastMessage += ' ✓✓';
              } else {
                lastMessage += ' ✓';
              }
            } else {
              // Message received from other user
              if (lastMessage === '🎤 Voice note') {
                if (unreadCount > 1) {
                  if (unreadVoiceNotes === unreadCount) {
                    // All unread messages are voice notes
                    lastMessage = `(${unreadCount}) new voice msgs`;
                  } else if (unreadVoiceNotes === 1) {
                    // Only 1 voice note among multiple unread messages
                    lastMessage = `(${unreadCount}) new msgs`;
                  } else {
                    // Multiple voice notes among unread messages
                    lastMessage = `(${unreadCount}) new msgs`;
                  }
                } else if (unreadCount === 1) {
                  lastMessage = '1 new voice msg';
                } else {
                  lastMessage = '🎤 Voice note';
                }
              } else {
                if (unreadCount > 1) {
                  lastMessage = `(${unreadCount}) new msgs`;
                } else if (unreadCount === 1) {
                  // Single unread message - show the message
                  lastMessage = lastMessage;
                } else {
                  // All messages read - show the last message
                  lastMessage = lastMessage;
                }
              }
            }
          }
          
          chatItems.push({
            id: userData.id!,
            name: userData.name,
            lastMessage: lastMessage,
            timestamp: lastMessageTime,
            unreadCount: unreadCount,
            avatar: '👤',
            profilePic: userData.profilePic,
          });
        }
      }
      
      setAcceptedUsers(chatItems);
    } catch (error) {
      console.error('Error loading accepted users:', error);
    }
  };

  const getUnreadMessageCount = async (chatId: string, currentUserId: string, otherUserId: string) => {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      let unreadCount = 0;
      let isLastRead = true;
      let lastMessageSenderId = '';
      let lastMessageText = '';
      let unreadVoiceNotes = 0;
      
      if (!querySnapshot.empty) {
        const lastMessage = querySnapshot.docs[0].data();
        lastMessageSenderId = lastMessage.senderId;
        lastMessageText = lastMessage.text || (lastMessage.voiceNote ? '🎤 Voice note' : '');
        
        // Check if last message is from other user and if it's read
        if (lastMessageSenderId === otherUserId) {
          isLastRead = !!lastMessage.seenBy?.[currentUserId];
        }
        
        // Count unread messages and voice notes
        const allMessagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
        const allMessagesSnapshot = await getDocs(allMessagesQuery);
        
        allMessagesSnapshot.forEach((doc) => {
          const messageData = doc.data();
          if (messageData.senderId !== currentUserId && !messageData.seenBy?.[currentUserId]) {
            unreadCount++;
            if (messageData.voiceNote) {
              unreadVoiceNotes++;
            }
          }
        });
      }
      
      return { unreadCount, isLastRead, lastMessageSenderId, lastMessageText, unreadVoiceNotes };
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return { unreadCount: 0, isLastRead: true, lastMessageSenderId: '', lastMessageText: '', unreadVoiceNotes: 0 };
    }
  };

  const loadPendingInvitesCount = async (currentUserId: string) => {
    try {
      const invitesRef = collection(db, 'invite');
      const q = query(
        invitesRef,
        where('to', '==', currentUserId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      setPendingInvitesCount(querySnapshot.size);
    } catch (error) {
      console.error('Error loading pending invites count:', error);
    }
  };
  
  const renderProfileSection = () => {
    if (loading) {
      return (
        <View style={[styles.profileSection, { borderBottomColor: colors.border }]}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.surface }]}>
            <Text style={styles.avatar}>⏳</Text>
          </View>
          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text style={[styles.chatName, { color: colors.text }]}>Loading...</Text>
              <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>My Profile</Text>
            </View>
            <View style={styles.messageContainer}>
              <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                Loading user data...
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (!currentUser) {
      return (
        <View style={[styles.profileSection, { borderBottomColor: colors.border }]}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.surface }]}>
            <Text style={styles.avatar}>❌</Text>
          </View>
          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text style={[styles.chatName, { color: colors.text }]}>Not Logged In</Text>
              <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>My Profile</Text>
            </View>
            <View style={styles.messageContainer}>
              <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                Please login to view your profile
              </Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity 
        style={[styles.profileSection, { borderBottomColor: colors.border }]}
        onPress={handleProfilePress}
      >
        <View style={[styles.avatarContainer, { backgroundColor: colors.surface }]}>
          {currentUser.profilePic ? (
            <Image source={{ uri: currentUser.profilePic }} style={styles.profileImage} />
          ) : (
            <Text style={styles.avatar}>👤</Text>
          )}
        </View>
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, { color: colors.text }]}>{currentUser.name}</Text>
            <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>My Profile</Text>
          </View>
          <View style={styles.messageContainer}>
            <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
              Tap to view and edit your profile
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity 
      style={[styles.chatItem, { borderBottomColor: colors.border }]}
      onPress={() => navigation.navigate('Chat', { userData: item })}
    >
      <View style={[styles.avatarContainer, { backgroundColor: colors.surface }]}>
        {item.profilePic ? (
          <Image source={{ uri: item.profilePic }} style={styles.profileImage} />
        ) : (
          <Text style={styles.avatar}>{item.avatar}</Text>
        )}
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.timestamp, { color: colors.textTertiary }]}>{item.timestamp}</Text>
        </View>
        <View style={styles.messageContainer}>
          <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.unreadCount, { color: colors.buttonText }]}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleSearchPress = () => {
    navigation.navigate('SearchUsers');
  };

  const handleBellPress = () => {
    navigation.navigate('Notifications');
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile', { userData: currentUser });
  };

  // Refresh user data when screen comes into focus
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCurrentUser();
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <LinearGradient
      colors={[colors.primary, colors.secondary]}
      style={styles.container}
    >
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={[styles.searchButton, { backgroundColor: colors.overlay }]}
              onPress={handleSearchPress}
            >
              <Text style={styles.searchIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.bellButton, { backgroundColor: colors.overlay }]}
              onPress={handleBellPress}
            >
              <Text style={styles.bellIcon}>🔔</Text>
              {pendingInvitesCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.badgeText, { color: colors.buttonText }]}>{pendingInvitesCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
          
          {/* Theme Toggle Button */}
          <TouchableOpacity 
            style={[styles.themeToggle, { backgroundColor: colors.overlay }]}
            onPress={toggleColorScheme}
          >
            <Text style={styles.themeIcon}>
              {colorScheme === 'dark' ? '☀️' : '🌙'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chat List */}
        <View style={[styles.chatListContainer, { backgroundColor: colors.background }]}>
          <FlatList
            data={acceptedUsers}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chatList}
            ListHeaderComponent={renderProfileSection}
          />
        </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeIcon: {
    fontSize: 18,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    fontSize: 18,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  chatListContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 10,
  },
  chatList: {
    paddingTop: 10,
  },
  profileSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatar: {
    fontSize: 24,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -5,
    right: -5,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -5,
    right: -5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ChatsScreen; 