import { StatusBar } from 'expo-status-bar';
import './src/firebase';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

const AppContent = () => {
  const { colorScheme } = useTheme();
  
  return (
    <>
      <AppNavigator />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
