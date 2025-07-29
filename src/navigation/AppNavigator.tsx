import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchUsersScreen from '../screens/SearchUsersScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ChatScreen from '../screens/ChatScreen';
import { getCurrentUser, decodeToken } from '../firebase';
import { useTheme } from '../theme/ThemeContext';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Chats: undefined;
  SearchUsers: undefined;
  Notifications: undefined;
  Chat: { userData: { id: string; name: string; profilePic?: string } };
  Profile: { userData: any };
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if user data exists in local storage
      const userData = await getCurrentUser();
      
      if (userData) {
        // User data exists, check if it's valid
        console.log('Found user data in storage:', userData.name);
        setIsAuthenticated(true);
      } else {
        // No user data found
        console.log('No user data found in storage');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: colors.background 
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "Chats" : "Login"}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Chats" component={ChatsScreen} />
        <Stack.Screen name="SearchUsers" component={SearchUsersScreen} />
        <Stack.Screen name="Notifications" component={NotificationScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 