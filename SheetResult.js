'use strict';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
import { GlobalStateContext } from './StateManager';
import HTMLView from 'react-native-htmlview'; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)

import styles from './Styles.js';

class SheetResult extends React.Component {
  static propTypes = {
    text:     PropTypes.string,
    title:    PropTypes.string,
    heTitle:  PropTypes.string,
    textType: PropTypes.oneOf(["english","hebrew"]),
    onPress:  PropTypes.func.isRequired
  };

  render() {
    const { theme, menuLanguage, interfaceLanguage } = React.useContext(GlobalStateContext);
    const refTitleStyle = menuLanguage === "hebrew" ? styles.he : styles.en;
    const refTitle = menuLanguage === "hebrew" ? this.props.heTitle : this.props.title;
    return (


      <TouchableOpacity style={[styles.textBlockLink, theme.textBlockLink, {margin:0, borderBottomWidth: 1, borderBottomColor: "#ccc", paddingTop: 13}]}
                        onPress={this.props.onPress} >

      <View style={{ flexDirection: (interfaceLanguage == "hebrew" ? "row-reverse" : "row"),flex:1}}>

        <Image
            style={styles.userAvatar}
            source={{uri: this.props.ownerImageUrl}}
        />
      <View style={{ flexDirection: "column",flex:1, marginRight: interfaceLanguage == "hebrew" ? 20 : 10, marginLeft: interfaceLanguage == "hebrew" ? 10 : 20}}>
          <View style={{flexDirection: (interfaceLanguage == "hebrew" ? "row-reverse" : "row"), flex: 0, justifyContent: "space-between"}}>
             <Text style={[styles.enInt, {alignSelf: "flex-start", color:"#666"}]}>{this.props.ownerName}</Text>
             <View style={{flexDirection: (interfaceLanguage == "hebrew" ? "row-reverse" : "row"), alignSelf: "flex-end"}}>
                <Text style={[{color:"#999"}, styles.enInt]}>{this.props.views}</Text>
                <Image style={{marginTop: 5, marginLeft: 0, width:15, height: 10}} source={interfaceLanguage == "hebrew" ? require('./img/eye-r.png') : require('./img/eye.png')}/>
             </View>
           </View>
          <View>
            <Text style={[styles.sheetListTitle, {textAlign: interfaceLanguage == "hebrew" ? "right" : "left"}]}>{this.props.title.replace(/\s\s+/g, ' ')}</Text>
          </View>

          {this.props.text ?
          <HTMLView
            value= {this.props.textType == "hebrew" ? "<hediv>"+this.props.text.replace(/(\r\n|\n|\r)/gm, "").substring(0, 124)+"...</hediv>" : "<endiv>"+this.props.text.replace(/(\r\n|\n|\r)/gm, "").substring(0, 124)+"...</endiv>"}
            stylesheet={styles}
            textComponentProps={{style: [this.props.textType == "hebrew" ? styles.hebrewText : styles.englishText, theme.text]}}
          /> : null }

        </View>
      </View>


      </TouchableOpacity>



    );
}
}

export default SheetResult;
