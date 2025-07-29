import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { db, UserData, getCurrentUser } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useTheme } from '../theme/ThemeContext';

interface SearchUsersScreenProps {
  navigation: any;
}

const SearchUsersScreen: React.FC<SearchUsersScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sendingInviteTo, setSendingInviteTo] = useState<string | null>(null);
  const [sentInvites, setSentInvites] = useState<{ [key: string]: boolean }>({});
  let searchTimeout: NodeJS.Timeout;

  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setNoResults(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    setNoResults(false);
    setLoading(true);
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchUsers(search.trim());
    }, 400);
    return () => clearTimeout(searchTimeout);
  }, [search]);

  const searchUsers = async (searchText: string) => {
    try {
      // Firestore does not support case-insensitive or OR queries directly, so we fetch by name and mobile separately
      const usersRef = collection(db, 'users');
      // For name (case-insensitive, partial match)
      const qName = query(usersRef, where('name', '>=', searchText), where('name', '<=', searchText + '\uf8ff'));
      // For mobile (exact match or partial)
      const qMobile = query(usersRef, where('mobile', '>=', searchText), where('mobile', '<=', searchText + '\uf8ff'));
      const [snapName, snapMobile] = await Promise.all([getDocs(qName), getDocs(qMobile)]);
      const users: UserData[] = [];
      snapName.forEach(doc => {
        const data = doc.data() as UserData;
        if (data.name.toLowerCase().includes(searchText.toLowerCase())) {
          users.push({ ...data, id: doc.id });
        }
      });
      snapMobile.forEach(doc => {
        const data = doc.data() as UserData;
        if (data.mobile && data.mobile.includes(searchText) && !users.find(u => u.id === doc.id)) {
          users.push({ ...data, id: doc.id });
        }
      });
      setResults(users);
      setNoResults(users.length === 0);
    } catch (error) {
      setResults([]);
      setNoResults(true);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const sendInvite = async (toUserId: string) => {
    if (!currentUser?.id) return;
    setSendingInviteTo(toUserId);
    try {
      await addDoc(collection(db, 'invite'), {
        from: currentUser.id,
        to: toUserId,
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      setSentInvites((prev) => ({ ...prev, [toUserId]: true }));
    } catch (e) {
      // Optionally show error
    } finally {
      setSendingInviteTo(null);
    }
  };

  const renderItem = ({ item }: { item: UserData }) => {
    const isSelf = currentUser && item.id === currentUser.id;
    return (
      <TouchableOpacity style={styles.userItem} disabled>
        {item.profilePic ? (
          <Image source={{ uri: item.profilePic }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}> 
            <Text style={{ fontSize: 24 }}>👤</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.mobile, { color: colors.textSecondary }]}>{item.mobile}</Text>
        </View>
        {!isSelf && (
          <TouchableOpacity
            style={[styles.inviteButton, sentInvites[item.id!] && styles.inviteButtonSent]}
            onPress={() => sendInvite(item.id!)}
            disabled={sendingInviteTo === item.id || sentInvites[item.id!]}
          >
            <Text style={styles.inviteButtonText}>
              {sentInvites[item.id!] ? 'Invited' : sendingInviteTo === item.id ? 'Sending...' : 'Send Invite'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.searchBarContainer}>
        <TextInput
          style={[styles.searchBar, { backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Search by name or number..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>
      {loading && (
        <ActivityIndicator style={{ marginTop: 20 }} size="large" color={colors.primary} />
      )}
      {!loading && noResults && (
        <Text style={[styles.noResults, { color: colors.textSecondary }]}>No users found.</Text>
      )}
      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={item => item.id || item.email}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    elevation: 2,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  mobile: {
    fontSize: 14,
    marginTop: 2,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
  inviteButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  inviteButtonSent: {
    backgroundColor: '#aaa',
  },
  inviteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default SearchUsersScreen; 