'use strict';

import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from './Styles';
import { GlobalStateContext } from './StateManager';

// Presentational SSO error banner. Mirrors the intent of the web
// ErrorBanner (static/js/auth/ErrorBanner.jsx) — render nothing when there's
// no error, otherwise show the message(s) in an error-styled banner.
//
// Two shapes for `error`:
//  - { message } -- a single line, no link (login/register's existing usage).
//  - { rows: [{ message, linkText, onPress, disabled }, ...] } -- one or more
//    stacked message+link pairs, one row per linked SSO provider (forgot-
//    password's sso_only_account case), mirroring web's error.providers.map(...).
// `{ message }` is treated as `{ rows: [{ message }] }` internally.
// `theme` is the caller's resolved theme object (see AuthPage, which pins it
// to the light theme regardless of the app's theme setting) rather than
// something this component resolves for itself from context.
const SSOErrorBanner = ({ error, theme }) => {
  const { interfaceLanguage } = useContext(GlobalStateContext);
  const isHeb = interfaceLanguage === 'hebrew';

  if (!error) return null;

  const rows = error.rows || [{ message: error.message }];

  return (
    <View style={[styles.ssoErrorBanner, theme.ssoErrorBannerBackground, theme.ssoErrorBannerBorder, { flexDirection: 'column', alignItems: isHeb ? 'flex-end' : 'flex-start' }]}>
      {rows.map((row, index) => (
        // flex:0 undoes styles.ssoErrorBannerText's flex:1, which sizes the text
        // across a row banner but stretches it down a column one.
        <View key={index} style={[{ alignSelf: 'stretch' }, index > 0 ? { marginTop: 8 } : null]}>
          <Text style={[styles.ssoErrorBannerText, theme.ssoErrorBannerText, isHeb ? styles.heInt : styles.enInt, { flex: 0 }]}>
            {row.message}
          </Text>
          {!!row.linkText && (
            <TouchableOpacity onPress={row.onPress} disabled={row.disabled}>
              <Text style={[styles.ssoErrorBannerText, styles.underline, theme.ssoErrorBannerText, isHeb ? styles.heInt : styles.enInt, { flex: 0, marginTop: 4 }]}>
                {row.linkText}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
};

SSOErrorBanner.propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string,
    rows: PropTypes.arrayOf(PropTypes.shape({
      message: PropTypes.string,
      linkText: PropTypes.string,
      onPress: PropTypes.func,
      disabled: PropTypes.bool,
    })),
  }),
  theme: PropTypes.object.isRequired,
};

export default SSOErrorBanner;
