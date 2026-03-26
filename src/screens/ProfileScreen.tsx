import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinary';
import { updateUserProfile, getCurrentUser, logout } from '../firebase';

interface ProfileScreenProps {
  navigation: any;
  route: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, route }) => {
  const { colors, colorScheme, toggleColorScheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);

  // Load user data on component mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Try to get user data from route params first, then from current user
      const routeUserData = route.params?.userData;
      const currentUser = await getCurrentUser();
      
      const finalUserData = routeUserData || currentUser;
      
      if (finalUserData) {
        setUserData(finalUserData);
        setName(finalUserData.name || '');
        setMobile(finalUserData.mobile || '');
        setProfilePic(finalUserData.profilePic || null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim() || !mobile.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setUpdating(true);
    try {
      let profilePicUrl = profilePic;
      let oldProfilePicUrl = userData?.profilePic;
      
      // If profile pic is a local URI, upload it to Cloudinary
      if (profilePic && profilePic.startsWith('file://')) {
        try {
          profilePicUrl = await uploadImageToCloudinary(profilePic);
        } catch (uploadError) {
          setUpdating(false);
          Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
          return;
        }
      }

      // Update user profile in Firebase
      const updates: any = {};
      let hasUpdates = false;
      
      // Check if name has changed
      if (name !== userData?.name) {
        updates.name = name;
        hasUpdates = true;
      }
      
      // Check if mobile has changed
      if (mobile !== userData?.mobile) {
        updates.mobile = mobile;
        hasUpdates = true;
      }
      
      // Check if profile picture has changed
      if (profilePicUrl && profilePicUrl !== userData?.profilePic) {
        updates.profilePic = profilePicUrl;
        hasUpdates = true;
        
        // Delete old profile picture from Cloudinary if it exists and is different
        if (oldProfilePicUrl && oldProfilePicUrl !== profilePicUrl && oldProfilePicUrl.startsWith('http')) {
          try {
            const deleteResult = await deleteImageFromCloudinary(oldProfilePicUrl);
            if (deleteResult) {
              console.log('Old profile picture deleted successfully');
            } else {
              console.log('Failed to delete old profile picture');
            }
          } catch (deleteError) {
            console.error('Error deleting old profile picture:', deleteError);
            // Don't show error to user as this is not critical
          }
        }
      }
      
      if (hasUpdates) {
        const result = await updateUserProfile(userData.id, updates);
        if (!result.success) {
          Alert.alert('Error', 'Failed to update profile');
          return;
        }
      }

      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await logout();
              if (result.success) {
                Alert.alert('Success', 'Logged out successfully!');
                // Navigate to login screen and clear navigation stack
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } else {
                Alert.alert('Error', 'Failed to logout. Please try again.');
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong during logout.');
            }
          },
        },
      ]
    );
  };

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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>My Profile</Text>
          
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

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
            </View>
          ) : userData ? (
            <>
              {/* Profile Picture Section */}
              <View style={styles.profileSection}>
                <TouchableOpacity style={styles.profileContainer} onPress={pickImage}>
                  {profilePic ? (
                    <Image source={{ uri: profilePic }} style={styles.profileImage} />
                  ) : (
                    <View style={[styles.profilePlaceholder, { backgroundColor: colors.overlay }]}>
                      <Text style={styles.profilePlaceholderText}>👤</Text>
                      <Text style={[styles.profilePlaceholderLabel, { color: colors.textSecondary }]}>Add Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={[styles.profileName, { color: colors.text }]}>{name}</Text>
              </View>

          {/* Profile Form */}
          <View style={[styles.formContainer, { backgroundColor: colors.overlay }]}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.text
                  }
                ]}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.textTertiary
                  }
                ]}
                placeholder="Enter your email"
                placeholderTextColor={colors.textTertiary}
                value={userData.email}
                editable={false}
              />
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Email cannot be changed
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Mobile Number</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.text
                  }
                ]}
                placeholder="Enter your mobile number"
                placeholderTextColor={colors.textTertiary}
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity 
              style={[
                styles.updateButton, 
                { backgroundColor: colors.success },
                updating && styles.disabledButton
              ]} 
              onPress={handleUpdateProfile}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color={colors.buttonText} />
              ) : (
                <Text style={[styles.updateButtonText, { color: colors.buttonText }]}>Update Profile</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.logoutButton, 
                { backgroundColor: colors.error }
              ]} 
              onPress={handleLogout}
            >
              <Text style={[styles.logoutButtonText, { color: colors.buttonText }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.text }]}>No user data found</Text>
            </View>
          )}
        </ScrollView>
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
    marginRight: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeIcon: {
    fontSize: 18,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 15,
  },
  profileImage: {
    width: 114,
    height: 114,
    borderRadius: 57,
  },
  profilePlaceholder: {
    alignItems: 'center',
  },
  profilePlaceholderText: {
    fontSize: 40,
    marginBottom: 5,
  },
  profilePlaceholderLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  formContainer: {
    borderRadius: 20,
    padding: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  helperText: {
    fontSize: 12,
    marginTop: 5,
  },
  updateButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  updateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  errorText: {
    fontSize: 16,
  },
});

export default ProfileScreen; 