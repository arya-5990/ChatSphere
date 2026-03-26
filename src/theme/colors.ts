export const lightColors = {
  primary: '#667eea',
  secondary: '#764ba2',
  background: '#ffffff',
  surface: '#f8f9fa',
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#e0e0e0',
  inputBackground: '#ffffff',
  inputBorder: '#d0d0d0',
  buttonText: '#ffffff',
  error: '#ff4444',
  success: '#00c851',
  warning: '#ffbb33',
  info: '#33b5e5',
  card: '#ffffff',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const darkColors = {
  primary: '#667eea',
  secondary: '#764ba2',
  background: '#121212',
  surface: '#1e1e1e',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  textTertiary: '#808080',
  border: '#333333',
  inputBackground: '#2a2a2a',
  inputBorder: '#404040',
  buttonText: '#ffffff',
  error: '#ff6b6b',
  success: '#51cf66',
  warning: '#ffd43b',
  info: '#74c0fc',
  card: '#1e1e1e',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export type ColorScheme = 'light' | 'dark';

export const getColors = (colorScheme: ColorScheme) => {
  return colorScheme === 'dark' ? darkColors : lightColors;
}; 