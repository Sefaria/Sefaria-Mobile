import { NativeModules } from 'react-native';
import mockRNCNetInfo from '@react-native-community/netinfo/jest/netinfo-mock.js';

jest.mock('@react-native-community/netinfo', () => mockRNCNetInfo);


// NativeModules.RNCNetInfo = {
//   getCurrentState: jest.fn(),
//   addListener: jest.fn(),
//   removeListeners: jest.fn()
// };
