'use strict';

import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { View, Text } from 'react-native';
import styles from './Styles';
import { GlobalStateContext } from './StateManager';

// Presentational SSO error banner. Mirrors the intent of the web
// ErrorBanner (static/js/auth/ErrorBanner.jsx) — render nothing when there's
// no error, otherwise show the message in an error-styled banner. Mobile
// callers are expected to build `error` via the same shape web uses
// ({ message }), e.g. { message: strings.ssoEmailExistsGoogle }.
// `theme` is the caller's resolved theme object (see AuthPage, which pins it
// to the light theme regardless of the app's theme setting) rather than
// something this component resolves for itself from context.
const SSOErrorBanner = ({ error, theme }) => {
  const { interfaceLanguage } = useContext(GlobalStateContext);
  const isHeb = interfaceLanguage === 'hebrew';

  if (!error) return null;

  return (
    <View style={[styles.ssoErrorBanner, theme.ssoErrorBannerBackground, theme.ssoErrorBannerBorder, isHeb && { flexDirection: 'row-reverse' }]}>
      <Text style={[styles.ssoErrorBannerText, theme.ssoErrorBannerText, isHeb ? styles.heInt : styles.enInt]}>
        {error.message}
      </Text>
    </View>
  );
};

SSOErrorBanner.propTypes = {
  error: PropTypes.shape({ message: PropTypes.string }),
  theme: PropTypes.object.isRequired,
};

export default SSOErrorBanner;
