'use strict';

import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import firebase from 'react-native-firebase';

import {
  RainbowBar,
  CircleCloseButton,
  SystemButton,
} from './Misc';
import { GlobalStateContext, DispatchContext, STATE_ACTIONS } from './StateManager';
import Sefaria from './sefaria';
import strings from './LocalizedStrings';
import styles from './Styles';

const onSubmit = async (formState, authMode, setErrors, onLoginSuccess) => {
  const mobileAppKey = await getMobileAppKey();
  formState.mobile_app_key = mobileAppKey;
  let errors = await Sefaria.api.authenticate(formState, authMode);
  if (!errors) { errors = {}; }
  setErrors(errors);
  if (Object.keys(errors).length === 0 && Sefaria._auth.uid) {
    onLoginSuccess();
  }
};

const getMobileAppKey = async () => {
  firebase.config().setDefaults({ mobile_app_key: '' });
  await firebase.config().fetch(0);
  const activated = await firebase.config().activateFetched();
  if (!activated) { console.log('Fetch data not activated'); return ''; }
  const snapshot = await firebase.config().getValue('mobile_app_key');
  return snapshot.val();
};

const useAuthForm = (authMode, onLoginSuccess) => {
  const [first_name, setFirstName] = useState(null);
  const [last_name, setLastName] = useState(null);
  const [email, setEmail] = useState(null);
  const [password, setPassword] = useState(null);
  const [errors, setErrors] = useState({});
  const formState = {
    first_name,
    last_name,
    email,
    password,
  };
  return {
    errors,
    setFirstName,
    setLastName,
    setEmail,
    setPassword,
    onSubmit: () => { onSubmit(formState, authMode, setErrors, onLoginSuccess) },
  }
}

const AuthPage = ({ authMode, close, showToast }) => {
  const dispatch = useContext(DispatchContext);
  const { theme, themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const {
    errors,
    setFirstName,
    setLastName,
    setEmail,
    setPassword,
    onSubmit,
  } = useAuthForm(authMode, () => {
    dispatch({
      type: STATE_ACTIONS.setIsLoggedIn,
      value: true,
    });
    close();
    showToast(strings.loginSuccessful);
  });
  const isLogin = authMode === 'login';
  const placeholderTextColor = themeStr == "black" ? "#BBB" : "#777";
  return(
    <ScrollView style={{flex:1, alignSelf: "stretch" }} contentContainerStyle={{alignItems: "center"}}>
      <RainbowBar />
      <View style={{ flex: 1, alignSelf: "stretch", alignItems: "flex-end", marginHorizontal: 10}}>
        <CircleCloseButton onPress={close} />
      </View>
      <Text style={styles.pageTitle}>{isLogin ? strings.sign_in : strings.join_sefaria}</Text>
      <View style={{flex: 1, alignSelf: "stretch",  marginHorizontal: 37}}>
        { isLogin ?
          <View>
            {
              [
                {iconStr: 'star', text: strings.saveTexts},
                {iconStr: 'sync', text: strings.syncYourReading},
                {iconStr: 'sheet', text: strings.readYourSheets},
                {iconStr: 'mail', text: strings.getUpdates},
              ].map(x => (<LogInMotivator key={x.iconStr} { ...x } />))
            }
          </View>
          : null
        }
        { isLogin ? null :
          <AuthTextInput
            placeholder={strings.first_name}
            placeholderTextColor={placeholderTextColor}
            error={errors.first_name}
            errorText={errors.first_name}
            onChangeText={setFirstName}
          />
        }
        { isLogin ? null :
          <AuthTextInput
            placeholder={strings.last_name}
            placeholderTextColor={placeholderTextColor}
            error={errors.last_name}
            errorText={errors.last_name}
            onChangeText={setLastName}
          />
        }
        <AuthTextInput
          placeholder={strings.email}
          autoCapitalize={'none'}
          placeholderTextColor={placeholderTextColor}
          error={errors.username || errors.email}
          errorText={errors.username || errors.email}
          onChangeText={setEmail}
        />
        <AuthTextInput
          placeholder={strings.password}
          placeholderTextColor={placeholderTextColor}
          isPW={true}
          error={errors.password || errors.password1}
          errorText={errors.password || errors.password1}
          onChangeText={setPassword}
        />
        <ErrorText error={errors.non_field_errors} errorDisplayText={errors.non_field_errors} />
        <ErrorText error={errors.captcha} errorDisplayText={errors.captcha} />
        <SystemButton
          onPress={onSubmit}
          text={isLogin ? strings.sign_in : strings.create_account}
          isHeb={interfaceLanguage === 'hebrew'}
          isBlue
        />
        <TouchableOpacity>
          <Text>{strings.linkToRegister}</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text>{strings.forgotPassword}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
AuthPage.propTypes = {
  authMode: PropTypes.string.isRequired,
  close:    PropTypes.func.isRequired,
  showToast:PropTypes.func.isRequired,
};

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
}) => (
  <View>
    <TextInput
      style={[styles.textInput, styles.boxShadow, styles.authTextInput]}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      secureTextEntry={isPW}
      autoCapitalize={autoCapitalize}
      onChangeText={onChangeText}
    />
    <ErrorText error={error} errorText={errorText} />
  </View>
);

const LogInMotivator = ({
  iconStr,
  text
}) => {
  const { themeStr } = useContext(GlobalStateContext);
  let icon;
  if (themeStr === 'white') {
    if (iconStr === 'star')  { icon = require('./img/starUnfilled.png'); }
    if (iconStr === 'sync')  { icon = require('./img/sync.png'); }
    if (iconStr === 'sheet') { icon = require('./img/sheet.png'); }
    if (iconStr === 'mail')  { icon = require('./img/mail.png'); }
  } else {
    if (iconStr === 'star')  { icon = require('./img/starUnfilled-light.png'); }
    if (iconStr === 'sync')  { icon = require('./img/sync-light.png'); }
    if (iconStr === 'sheet') { icon = require('./img/sheet-light.png'); }
    if (iconStr === 'mail')  { icon = require('./img/mail-light.png'); }
  }
  return (
    <View style={{
        flexDirection: 'row',
        marginBottom: 20,
      }}
    >
      <Image style={{height: 20, width: 20}} source={icon} resizeMode={'contain'} />
      <Text style={[{marginHorizontal: 20}, styles.enInt]}>{ text }</Text>
    </View>
  );
}

export {
  AuthPage,
  AuthTextInput,
};
