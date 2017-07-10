'use strict';

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  WebView
} from 'react-native';
import HTMLView from 'react-native-htmlview'; //var HTMLView = require('react-native-htmlview'); //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)
var styles = require('./Styles.js');
var entities = require('entities');

class TextSegment extends React.Component {


  static propTypes = {
    theme:              React.PropTypes.object.isRequired,
    rowRef:             React.PropTypes.string.isRequired, /* this ref keys into TextColumn.rowRefs */
    segmentIndexRef:    React.PropTypes.number,
    segmentKey:         React.PropTypes.string,
    data:               React.PropTypes.string,
    textType:           React.PropTypes.oneOf(["english","hebrew"]),
    bilingual:          React.PropTypes.bool,
    textSegmentPressed: React.PropTypes.func.isRequired,
    textListVisible:    React.PropTypes.bool.isRequired,
    settings:           React.PropTypes.object
  };

  onPressTextSegment = () => {
    console.log("press")
    let key = this.props.segmentKey;
    let section = parseInt(key.split(":")[0]);
    let segment = parseInt(key.split(":")[1]);
    this.props.textSegmentPressed(section, segment, this.props.rowRef, true);
  };

  onLongPress = () => {
    // Do nothing -- need to prevent onPress from firing onLongPress
  };
  /*renderHTML = (node, index, siblings, parent, defaultRenderer) => {
    console.log("Node", node);
    console.log("Index", index);
    console.log("SIbllingasfs", siblings);
    console.log("parent", parent);
    console.log("default", defaultRenderer);
    if (node.type === 'text') {
      var style = this.props.textType == "hebrew" ?
                    [styles.hebrewText, this.props.theme.text, styles.justifyText, {fontSize: this.props.settings.fontSize, lineHeight: this.props.settings.fontSize * 1.1},] :
                    [styles.englishText, this.props.theme.text, styles.justifyText, {fontSize: 0.8 * this.props.settings.fontSize, lineHeight: this.props.settings.fontSize * 1.04 }];
      if (this.props.bilingual && this.props.textType == "english") {
        style.push(styles.bilingualEnglishText);
        style.push(this.props.theme.bilingualEnglishText);
      }
      return (
        <Text
            style={style}
            suppressHighlighting={false}
            onPress={this.onPressTextSegment}
            onLongPress={this.onLongPress}
            key={this.props.segmentKey+"-"+index}
            onLayout={this.onLayout}
            selectable={true}>
            {node.data}
        </Text>);
    } else if (node.type === 'tag') {
      return (
        <View key={index}>
          {node.children.map(this.renderHTML)}
        </View>)
    }
  };*/
  render() {
    var style = this.props.textType == "hebrew" ?
                  [styles.hebrewText, this.props.theme.text, styles.justifyText, {fontSize: this.props.settings.fontSize, lineHeight: this.props.settings.fontSize * 1.1},] :
                  [styles.englishText, this.props.theme.text, styles.justifyText, {fontSize: 0.8 * this.props.settings.fontSize, lineHeight: this.props.settings.fontSize * 1.04 }];
    if (this.props.bilingual && this.props.textType == "english") {
      style.push(styles.bilingualEnglishText);
      style.push(this.props.theme.bilingualEnglishText);
    }
/*, suppressHighlighting: false,
  onPress: this.onPressTextSegment, onLongPress: this.onLongPress,
  key: this.props.segmentKey, onLayout: this.onLayout, selectable: true*/
/*      <HTMLView value={
        this.props.textType == "english" ?
        "&#x200E;"+Sefaria.reformatTalmudContent(this.props.data) :
          this.props.data
        } stylesheet={styles}
        textComponentProps={{ style: {color: "orange"}, key: this.props.segmentKey}} />*/
    return (
      <Text
          style={style}
          suppressHighlighting={false}
          onPress={this.onPressTextSegment}
          onLongPress={this.onLongPress}
          key={this.props.segmentKey}
          onLayout={this.onLayout}
          selectable={true}>
          <HTMLView style={{width: 300, height: 30}} value={this.props.textType == "english" ?
          "&#x200E;"+Sefaria.reformatTalmudContent(this.props.data) :
            this.props.data} stylesheet={styles} textComponentProps={{style: {color: "orange"}}}/>
      </Text>);
  }
}


module.exports = TextSegment;
