import { Alert } from 'react-native';

/**
 * Centralized alert function that wraps React Native's Alert.alert
 * 
 * @param {string} title - The title of the alert
 * @param {string} message - The message of the alert
 * @param {Array} buttons - Array of button objects with text and onPress handlers
 * @param {Object} options - Additional alert options (cancelable, onDismiss)
 */
const showAlert = (title, message, buttons = [{ text: 'OK' }], options = {}) => {
  Alert.alert(title, message, buttons, options);
};

export default {
  showAlert,
}; 