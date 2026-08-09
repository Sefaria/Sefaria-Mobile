/**
 * Shared constants/helpers for the SSO auth analytics events (sign-up + login
 * families). These event names are snake_case per the cross-platform analytics
 * spec (must match web), unlike the rest of mobile's PascalCase events.
 */

import { AUTH_MODE } from '../AuthConstants';

// Single lookup for the event-name family prefix, keyed by AuthPage's `authMode`.
// A future rename of either family is a one-line edit here.
export const AUTH_EVENT_FAMILY = {
  [AUTH_MODE.REGISTER]: 'sign_up',
  [AUTH_MODE.LOGIN]: 'login',
};

// Firebase Analytics caps event param VALUES at 100 chars.
const FIREBASE_PARAM_VALUE_MAX_LENGTH = 100;

// Truncates a value to Firebase's 100-char param value limit. Returns
// undefined for nullish input so callers can omit the field.
export const truncateForAnalytics = (value) => {
  if (value === undefined || value === null) { return undefined; }
  const str = String(value);
  return str.length > FIREBASE_PARAM_VALUE_MAX_LENGTH ? str.slice(0, FIREBASE_PARAM_VALUE_MAX_LENGTH) : str;
};

// Minimal RFC 4122 v4 UUID generator, used for analytics flow_id/attempt_id.
// These IDs only need to be unique enough to correlate events for a single
// user's flow -- not cryptographically strong -- so Math.random is sufficient
// and this avoids adding a uuid dependency for a one-line need.
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
