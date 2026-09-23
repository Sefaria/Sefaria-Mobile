'use strict';

import { Platform } from 'react-native';
import VersionNumber from 'react-native-version-number';

// Phase 0 of the API Key Program: Sefaria's own clients identify themselves as
// `Sefaria/<service>`, with the app version in a comment when we have one, so
// they can be told apart in the server logs. Without this the apps show up as
// the platform default (CFNetwork on iOS, bare okhttp on Android).
const service = `Sefaria/mobile-${Platform.OS}`;
export const USER_AGENT = VersionNumber.appVersion
  ? `${service} (${VersionNumber.appVersion})`
  : service;

// Merge the User-Agent into a fetch() headers object. Caller headers win.
export const withUserAgent = (headers = {}) => ({ 'User-Agent': USER_AGENT, ...headers });
