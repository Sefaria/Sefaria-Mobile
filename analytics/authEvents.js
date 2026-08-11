/**
 * Shared constants/helpers for the SSO auth analytics events. Event names are
 * snake_case and flat -- one funnel, not a login/sign-up pair -- per the
 * cross-platform analytics spec (must match web), unlike the rest of
 * mobile's PascalCase events. What used to be two families distinguished by
 * event-name prefix is now a single family distinguished by the
 * `flow_intent` field (see AUTH_FLOW_INTENT in AuthConstants.js).
 */

// The five events of the auth funnel, named identically across platforms.
export const AUTH_EVENT = {
  FLOW_STARTED: 'auth_flow_started',
  METHOD_CHOSEN: 'auth_method_chosen',
  PROCESS_STARTED: 'auth_process_started',
  PROCESS_ENDED: 'auth_process_ended',
  FLOW_ENDED: 'auth_flow_ended',
};

// Firebase Analytics caps event param VALUES at 100 chars.
const FIREBASE_PARAM_VALUE_MAX_LENGTH = 100;

// Truncates a value to Firebase's 100-char param value limit (slice returns the
// whole string when it's already shorter). Returns undefined for nullish input
// so callers can omit the field.
export const truncateForAnalytics = (value) => {
  if (value === undefined || value === null) { return undefined; }
  return String(value).slice(0, FIREBASE_PARAM_VALUE_MAX_LENGTH);
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
