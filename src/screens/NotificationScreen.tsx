import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { getCurrentUser, db, UserData } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';

interface PendingInvite {
  id: string;
  from: string;
  to: string;
  status: string;
  timestamp: any;
  senderData?: UserData;
}

interface NotificationScreenProps {
  navigation: any;
}

const NotificationScreen: React.FC<NotificationScreenProps> = ({ navigation }) => {
  const { colors, colorScheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user) {
        await loadPendingInvites(user.id);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingInvites = async (currentUserId: string) => {
    try {
      const invitesRef = collection(db, 'invite');
      const q = query(
        invitesRef,
        where('to', '==', currentUserId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      
      const invites: PendingInvite[] = [];
      for (const docSnapshot of querySnapshot.docs) {
        const invite = docSnapshot.data() as PendingInvite;
        invite.id = docSnapshot.id;
        
        // Get sender's user data
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('id', '==', invite.from));
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
          invite.senderData = userSnapshot.docs[0].data() as UserData;
        }
        
        invites.push(invite);
      }
      
      setPendingInvites(invites);
    } catch (error) {
      console.error('Error loading pending invites:', error);
    }
  };

  const handleInviteResponse = async (inviteId: string, status: 'accepted' | 'rejected') => {
    setProcessingInvite(inviteId);
    try {
      const inviteRef = doc(db, 'invite', inviteId);
      await updateDoc(inviteRef, {
        status: status,
      });
      
      // If accepted, create a chat document
      if (status === 'accepted' && currentUser) {
        const invite = pendingInvites.find(inv => inv.id === inviteId);
        if (invite) {
          const chatData = {
            users: [currentUser.id, invite.from],
            messages: [],
            createdAt: new Date(),
            lastMessage: null,
            lastMessageTime: null,
          };
          
          await addDoc(collection(db, 'chats'), chatData);
        }
      }
      
      // Remove the invite from the list
      setPendingInvites(prev => prev.filter(invite => invite.id !== inviteId));
    } catch (error) {
      console.error('Error updating invite status:', error);
    } finally {
      setProcessingInvite(null);
    }
  };

  const renderInviteItem = ({ item }: { item: PendingInvite }) => (
    <View style={[styles.inviteItem, { borderBottomColor: colors.border }]}>
      <View style={styles.userInfo}>
        {item.senderData?.profilePic ? (
          <Image source={{ uri: item.senderData.profilePic }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 24 }}>👤</Text>
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.senderData?.name || 'Unknown User'}
          </Text>
          <Text style={[styles.inviteText, { color: colors.textSecondary }]}>
            sent you a friend request
          </Text>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: colors.primary }]}
          onPress={() => handleInviteResponse(item.id, 'accepted')}
          disabled={processingInvite === item.id}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            {processingInvite === item.id ? 'Accepting...' : 'Accept'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.rejectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => handleInviteResponse(item.id, 'rejected')}
          disabled={processingInvite === item.id}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>
            {processingInvite === item.id ? 'Rejecting...' : 'Reject'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.container}>
        <StatusBar 
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonText} />
            <Text style={[styles.loadingText, { color: colors.buttonText }]}>Loading notifications...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.container}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.overlay }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Notifications List */}
        <View style={[styles.notificationsContainer, { backgroundColor: colors.background }]}>
          {pendingInvites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>🔔</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                You're all caught up!
              </Text>
            </View>
          ) : (
            <FlatList
              data={pendingInvites}
              renderItem={renderInviteItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.notificationsList}
            />
          )}
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  notificationsContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 10,
  },
  notificationsList: {
    paddingTop: 10,
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  inviteText: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  rejectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default NotificationScreen; 