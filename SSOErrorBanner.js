'use strict';

import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import styles from './Styles';
import { GlobalStateContext } from './StateManager';

// Presentational SSO error banner. Mirrors the intent of the web
// ErrorBanner (static/js/auth/ErrorBanner.jsx) — render nothing when there's
// no error, otherwise show the message in an error-styled banner. Mobile
// callers are expected to build `error` via the same shape web uses
// ({ message }), e.g. { message: strings.ssoEmailExistsGoogle }.
const SSOErrorBanner = ({ error }) => {
  const { interfaceLanguage } = useContext(GlobalStateContext);
  const isHeb = interfaceLanguage === 'hebrew';

  if (!error) return null;

  return (
    <View style={[styles.ssoErrorBanner, isHeb && { flexDirection: 'row-reverse' }]}>
      <Text style={[styles.ssoErrorBannerText, isHeb ? styles.heInt : styles.enInt]}>
        {error.message}
      </Text>
    </View>
  );
};

export default SSOErrorBanner;
