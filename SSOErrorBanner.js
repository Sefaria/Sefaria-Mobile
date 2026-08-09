'use strict';

import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import styles from './Styles';
import { GlobalStateContext, getTheme } from './StateManager';

// Presentational SSO error banner. Mirrors the intent of the web
// ErrorBanner (static/js/auth/ErrorBanner.jsx) — render nothing when there's
// no error, otherwise show the message in an error-styled banner. Mobile
// callers are expected to build `error` via the same shape web uses
// ({ message }), e.g. { message: strings.ssoEmailExistsGoogle }.
const SSOErrorBanner = ({ error }) => {
  const { interfaceLanguage, themeStr } = useContext(GlobalStateContext);
  const isHeb = interfaceLanguage === 'hebrew';
  const theme = getTheme(themeStr);

  if (!error) return null;

  return (
    <View style={[styles.ssoErrorBanner, theme.ssoErrorBannerBackground, theme.ssoErrorBannerBorder, isHeb && { flexDirection: 'row-reverse' }]}>
      <Text style={[styles.ssoErrorBannerText, theme.ssoErrorBannerText, isHeb ? styles.heInt : styles.enInt]}>
        {error.message}
      </Text>
    </View>
  );
};

export default SSOErrorBanner;
