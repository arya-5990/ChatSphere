import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { otpService } from '../services/otpService';

interface VerifyOTPScreenProps {
  navigation: any;
  route: any;
}

const VerifyOTPScreen: React.FC<VerifyOTPScreenProps> = ({ navigation, route }) => {
  const { colors, colorScheme } = useTheme();
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyOTP = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const result = await otpService.verifyOTP(email, otp);
      
      if (result.success) {
        Alert.alert(
          'Success', 
          'Verification successful! You can now reset your password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('ResetPassword', { email })
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Invalid verification code. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const result = await otpService.resendOTP(email);
      
      if (result.success) {
        Alert.alert(
          'Success', 
          `A new verification code has been sent to your email.\n\nFor testing purposes, the new OTP is: ${result.otp}`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to resend verification code. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend verification code. Please try again.');
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
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
          </TouchableOpacity>

          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={[styles.title, { color: colors.text }]}>Verify Code</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter the 6-digit code sent to
            </Text>
            <Text style={[styles.emailText, { color: colors.text }]}>{email}</Text>
          </View>

          {/* Form */}
          <View style={[styles.formContainer, { backgroundColor: colors.overlay }]}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Verification Code</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.text
                  }
                ]}
                placeholder="Enter 6-digit code"
                placeholderTextColor={colors.textTertiary}
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={6}
                autoFocus
              />
            </View>

            <TouchableOpacity 
              style={[
                styles.verifyButton, 
                { backgroundColor: colors.success },
                loading && styles.disabledButton
              ]} 
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.buttonText} />
              ) : (
                <Text style={[styles.verifyButtonText, { color: colors.buttonText }]}>
                  Verify Code
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendOTP}
              disabled={loading}
            >
              <Text style={[styles.resendButtonText, { color: colors.text }]}>
                Didn't receive code? Resend
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 30,
    zIndex: 1000,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5,
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
    fontSize: 18,
    borderWidth: 1,
    textAlign: 'center',
    letterSpacing: 2,
  },
  verifyButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendButton: {
    alignItems: 'center',
  },
  resendButtonText: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default VerifyOTPScreen; 