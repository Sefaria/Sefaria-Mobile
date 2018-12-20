import PropTypes from 'prop-types';

import React, {Component} from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    FlatList,
    Image,
    Platform,
    AppState,
    WebView,
    Dimensions,

} from 'react-native';

import {
    CategoryColorLine,
    TwoBox,
    LanguageToggleButton,
    MenuButton,
    LoadingView
} from './Misc.js';

import styles from './Styles.js';
import strings from "./LocalizedStrings";
import {CloseButton, DirectedButton} from "./Misc";
import HTMLView from 'react-native-htmlview';
import Sheet from "./Sheet"; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)
const ViewPort    = Dimensions.get('window');


class SheetMeta extends React.Component {
    static propTypes = {
    };

    constructor(props) {
        super(props);
    }

    componentDidMount() {
    }


    render() {
    const langStyle = this.props.interfaceLang === "hebrew" ? styles.heInt : styles.enInt;
        return(
          <View style={[styles.menu,this.props.theme.menu]}>
            <CategoryColorLine category="Sheets" />
            <View style={[styles.header, this.props.theme.header]}>
              <CloseButton onPress={this.props.close} theme={this.props.theme} themeStr={this.props.themeStr} />
              <Text style={[langStyle, styles.textTocHeaderTitle, styles.textCenter, this.props.theme.text]}>{strings.tableOfContents}</Text>
              <LanguageToggleButton theme={this.props.theme} toggleLanguage={this.props.toggleLanguage} language={this.props.contentLang} />
            </View>

            <ScrollView style={styles.menuContent} contentContainerStyle={{paddingTop: 20,paddingBottom: 40}}>
                <View><Text>wut</Text></View>
            </ScrollView>
          </View>
        )
    }
}


export default SheetMeta;
