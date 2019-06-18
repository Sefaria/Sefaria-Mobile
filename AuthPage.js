import React from 'react';
import PropTypes from 'prop-types';
import {
    View,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    Button
} from 'react-native';


import Sefaria from './sefaria';
import strings from './LocalizedStrings';
import styles from './Styles';



class AuthPage extends React.Component {

    state = {
      email: null,
      password: null
    };

    _handleMultiInput = (name) => {
      return (text) => {
        console.log(name, text);
        this.setState({ [name]:text })
      }
    };

    handleSubmit = (event) => {
      const {email, password} = this.state;
      console.log(email, password);
      Sefaria.api._authenticate({email, password});
    };

    render() {
        return(
            <ScrollView>
                <Text>{strings.login}</Text>
                <TextInput placeholder={strings.email} onChangeText={this._handleMultiInput("email")}></TextInput>
                <TextInput placeholder={strings.password} secureTextEntry={true} onChangeText={this._handleMultiInput("password")}></TextInput>
                <Button onPress={this.handleSubmit} title={strings.login}/>
                <TouchableOpacity>
                    <Text>{strings.linkToRegister}</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                    <Text>{strings.forgotPassword}</Text>
                </TouchableOpacity>
            </ScrollView>
        )
    }
}


export default AuthPage;