'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { View, Text, TextInput } from 'react-native';
import styles from './Styles';
import { GlobalStateContext } from './StateManager';

const ErrorText = ({ error, errorText }) => (
  error ?
    (
      <Text>
        { errorText }
      </Text>
    ) : null
);

const AuthTextInput = ({
  isPW,
  placeholder,
  placeholderTextColor,
  autoCapitalize,
  error,
  errorText,
  onChangeText,
  onFocus,
  theme,
}) => (
  <GlobalStateContext.Consumer>
    {
      ({ interfaceLanguage }) => (
        <View>
          <TextInput
            style={[
              styles.textInput,
              styles.systemButton,
              styles.boxShadow,
              styles.authTextInput,
              interfaceLanguage === 'hebrew' ? styles.heInt : styles.enInt,
              theme.text,
              theme.mainTextPanel
            ]}
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor}
            secureTextEntry={isPW}
            autoCapitalize={autoCapitalize}
            onChangeText={onChangeText}
            onFocus={onFocus}
          />
          <ErrorText error={error} errorText={errorText} />
        </View>
      )
    }
  </GlobalStateContext.Consumer>
);

ErrorText.propTypes = {
  error: PropTypes.any,
  errorText: PropTypes.node,
};

AuthTextInput.propTypes = {
  isPW: PropTypes.bool,
  placeholder: PropTypes.string,
  placeholderTextColor: PropTypes.string,
  autoCapitalize: PropTypes.string,
  error: PropTypes.any,
  errorText: PropTypes.node,
  onChangeText: PropTypes.func,
  onFocus: PropTypes.func,
  theme: PropTypes.object.isRequired,
};

export { AuthTextInput, ErrorText };
