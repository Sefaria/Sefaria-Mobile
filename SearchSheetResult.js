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
import HTMLView from 'react-native-htmlview'; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)

import styles from './Styles.js';

class SearchSheetResult extends React.Component {
  static propTypes = {
    theme:    PropTypes.object.isRequired,
    text:     PropTypes.string,
    title:    PropTypes.string,
    heTitle:  PropTypes.string,
    menuLanguage: PropTypes.oneOf(["english", "hebrew"]),
    textType: PropTypes.oneOf(["english","hebrew"]),
    onPress:  PropTypes.func.isRequired
  };

  render() {
    const refTitleStyle = this.props.interfaceLang === "hebrew" ? styles.he : styles.en;

    return (


      <TouchableOpacity style={[styles.textBlockLink, this.props.theme.textBlockLink, {margin:0, borderBottomWidth: 1, borderBottomColor: "#ccc", paddingTop: 13}]}
                        onPress={this.props.onPress} >

      <View style={{ flexDirection: "column",flex:1, marginRight: this.props.interfaceLang == "hebrew" ? 20 : 10, marginLeft: this.props.interfaceLang == "hebrew" ? 10 : 20}}>
          <View>
            <Text style={[refTitleStyle, styles.textListCitation, this.props.theme.textListCitation]}>{this.props.title.replace(/\s\s+/g, ' ')}</Text>
          </View>

          {this.props.text ?
          <HTMLView
            value= {this.props.textType == "hebrew" ? "<hediv>"+this.props.text.replace(/(\r\n|\n|\r)/gm, "").substring(0, 124)+"...</hediv>" : "<endiv>"+this.props.text.replace(/(\r\n|\n|\r)/gm, "").substring(0, 124)+"...</endiv>"}
            stylesheet={styles}
            textComponentProps={{style: [this.props.textType == "hebrew" ? styles.hebrewText : styles.englishText,this.props.theme.text]}}
          /> : null }


        <View style={{ flexDirection: (this.props.interfaceLang == "hebrew" ? "row-reverse" : "row"), flex:1, marginTop: 10}}>

          <Image
              style={styles.userAvatar}
              source={{uri: this.props.ownerImageUrl}}
          />

          <View style={{flexDirection: "column", flex: 1, justifyContent: "space-between", marginHorizontal: 10}}>
             <Text style={[styles.enInt, {alignSelf: "flex-start", color:"#666"}]}>{this.props.ownerName}</Text>
             <Text style={[{color:"#999"}, styles.enInt]}>{this.props.views} Views · {this.props.tags.join(", ")}</Text>
           </View>

        </View>

      </View>


      </TouchableOpacity>



    );
}
}

export default SearchSheetResult;
