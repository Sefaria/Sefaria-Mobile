import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Button,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  RainbowBar,
  CircleCloseButton,
} from './Misc';
import { GlobalStateContext, DispatchContext, STATE_ACTIONS } from './StateManager';
import Sefaria from './sefaria';
import strings from './LocalizedStrings';
import styles from './Styles';

const onSubmit = async (formState, authMode, setErrors, onLoginSuccess) => {
  let errors = await Sefaria.api.authenticate(formState, authMode);
  if (!errors) { errors = {}; }
  setErrors(errors);
  if (Object.keys(errors).length === 0 && Sefaria._auth.uid) {
    onLoginSuccess();
  }
};

const useAuthForm = (authMode, onLoginSuccess) => {
  const [first_name, setFirstName] = useState(null);
  const [last_name, setLastName] = useState(null);
  const [email, setEmail] = useState(null);
  const [password, setPassword] = useState(null);
  const [errors, setErrors] = useState({});
  const [g_recaptcha_response, setRecaptchaResponse] = useState(null);
  const formState = {
    first_name,
    last_name,
    email,
    password,
    g_recaptcha_response,
  };
  console.log('FORM STATE', formState);
  return {
    errors,
    setFirstName,
    setLastName,
    setEmail,
    setPassword,
    setRecaptchaResponse,
    onSubmit: () => { onSubmit(formState, authMode, setErrors, onLoginSuccess) },
  }
}

const AuthPage = ({ authMode, close, showToast }) => {
  const dispatch = useContext(DispatchContext);
  const { theme, themeStr } = useContext(GlobalStateContext);
  const {
    errors,
    setFirstName,
    setLastName,
    setEmail,
    setPassword,
    setRecaptchaResponse,
    onSubmit,
  } = useAuthForm(authMode, () => {
    dispatch({
      type: STATE_ACTIONS.setIsLoggedIn,
      isLoggedIn: true,
    });
    close();
    showToast(strings.loginSuccessful);
  });
  isLogin = authMode === 'login';
  const placeholderTextColor = themeStr == "black" ? "#BBB" : "#777";
  return(
    <ScrollView style={{flex:1, alignSelf: "stretch" }} contentContainerStyle={{alignItems: "center"}}>
      <RainbowBar />
      <View style={{ flex: 1, alignSelf: "stretch", alignItems: "flex-end", marginHorizontal: 10}}>
        <CircleCloseButton onPress={close} />
      </View>
      <Text style={styles.pageTitle}>{isLogin ? strings.sign_in : strings.join_sefaria}</Text>
      <View style={{flex: 1, alignSelf: "stretch",  marginHorizontal: 37}}>
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
        <Button onPress={onSubmit} title={isLogin ? strings.sign_in : strings.create_account}/>
        <TouchableOpacity>
          <Text>{strings.linkToRegister}</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text>{strings.forgotPassword}</Text>
        </TouchableOpacity>
      </View>
      { isLogin ? null : <ReCaptchaView onSuccess={setRecaptchaResponse} />}
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
}) => {
  return (
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
};

class ReCaptchaView extends React.Component {
  static propTypes = {
    onSuccess: PropTypes.func.isRequired,
  };
  getWebviewContent = () => {
    const originalForm = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="https://www.google.com/recaptcha/api.js"></script>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
          </style>
        </head>
        <body>
          <div class="g-recaptcha" data-size="normal" data-callback="[CALLBACK]" data-sitekey="[KEY]"></div>
        </body>
      </html>`;
    const tmp =  originalForm
      .replace("[CALLBACK]", 'recaptchaCallback')  // defined in getJS()
      .replace("[KEY]", '6LetNA8TAAAAALOniTMS0Cwz-ynl9b7bDmVxVfR7');

    return tmp;
  };

  getJS = () => {
    return `var recaptchaCallback = function(data) {
      window.ReactNativeWebView.postMessage(data);
    }`;
  }

  onMessage = e => {
    this.props.onSuccess(e.nativeEvent.data);
  };

  render() {
    return (
      <View style={{flex:1, alignSelf: "stretch"}}>
        <WebView
          javaScriptEnabled={true}
          mixedContentMode={'always'}
          style={{ height: 400, backgroundColor: 'transparent'}}
          onMessage={this.onMessage}
          injectedJavaScript={this.getJS()}
          source={{
            html: this.getWebviewContent(),
            baseUrl: Sefaria.api._baseHost,
          }}
        />
      </View>
    );
  }
}


export {
  AuthPage,
  AuthTextInput,
};
