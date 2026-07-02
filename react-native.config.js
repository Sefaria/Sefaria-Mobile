module.exports = {
  dependencies: {
    // Apple Sign-In is iOS-only — disable Android autolinking to prevent build issues
    '@invertase/react-native-apple-authentication': {
      platforms: {
        android: null,
      },
    },
  },
}
