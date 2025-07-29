import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { registerUser } from '../firebase';
import { uploadImageToCloudinary } from '../services/cloudinary';
import { useTheme } from '../theme/ThemeContext';

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { colors, colorScheme, toggleColorScheme } = useTheme();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleRegister = async () => {
    if (!name || !mobile || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      let profilePicUrl = '';
      if (profilePic) {
        try {
          profilePicUrl = await uploadImageToCloudinary(profilePic);
        } catch (uploadError) {
          setLoading(false);
          Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
          return;
        }
      }

      // Register user in Firestore
      const result = await registerUser({
        name,
        mobile,
        email,
        password,
        ...(profilePicUrl && { profilePic: profilePicUrl }),
      });

      console.log('Firebase registration result:', result); // Debug log

      if (result.success) {
        Alert.alert(
          'Success',
          'Account created successfully! ',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
              
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

            {/* Profile Picture Section */}
            <View style={styles.profileSection}>
              <TouchableOpacity style={styles.profileContainer} onPress={pickImage}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={styles.profileImage} />
                ) : (
                  <View style={[styles.profilePlaceholder, { backgroundColor: colors.overlay }]}>
                    <Text style={styles.profilePlaceholderText}>📷</Text>
                    <Text style={[styles.profilePlaceholderLabel, { color: colors.textSecondary }]}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Registration Form */}
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

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                      color: colors.text
                    }
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                      color: colors.text
                    }
                  ]}
                  placeholder="Create a password"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity 
                style={[
                  styles.registerButton, 
                  { backgroundColor: colors.success },
                  loading && styles.disabledButton
                ]} 
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.buttonText} />
                ) : (
                  <Text style={[styles.registerButtonText, { color: colors.buttonText }]}>Create Account</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={[styles.loginButtonText, { color: colors.text }]}>
                  Already have an account? Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    justifyContent: 'space-between',
  },
  themeToggle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeIcon: {
    fontSize: 24,
  },
  backButton: {
    marginRight: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
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
  registerButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginButton: {
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default RegisterScreen; 