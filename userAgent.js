'use strict';

import { Platform } from 'react-native';
import VersionNumber from 'react-native-version-number';

// Phase 0 of the API Key Program: Sefaria's own clients identify themselves as
// `Sefaria/<service> (+<repo>)` so they can be told apart in the server logs.
// Without this the apps show up as the platform default (CFNetwork on iOS,
// bare okhttp on Android).
export const USER_AGENT =
  `Sefaria/mobile-${Platform.OS}/${VersionNumber.appVersion || 'unknown'} (+https://github.com/Sefaria/Sefaria-Mobile)`;

// Merge the User-Agent into a fetch() headers object. Caller headers win.
export const withUserAgent = (headers = {}) => ({ 'User-Agent': USER_AGENT, ...headers });
