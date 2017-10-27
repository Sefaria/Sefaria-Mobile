'use strict';

import PropTypes from 'prop-types';

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import HTMLView from 'react-native-htmlview'; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)
var styles = require('./Styles.js');


class TextSegment extends React.PureComponent {
  static propTypes = {
    theme:              PropTypes.object.isRequired,
    rowRef:             PropTypes.string.isRequired, /* this ref keys into TextColumn.rowRefs */
    segmentKey:         PropTypes.string,
    data:               PropTypes.string,
    textType:           PropTypes.oneOf(["english","hebrew"]),
    bilingual:          PropTypes.bool,
    textSegmentPressed: PropTypes.func.isRequired,
    settings:           PropTypes.object
  };

  constructor(props) {
    super(props);
  }
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

  render() {
    if (this.props.bilingual && this.props.textType == "english") {
      style.push(styles.bilingualEnglishText);
      style.push(this.props.theme.bilingualEnglishText);
    }

    const stylesheet = this.props.textType == "hebrew" ?
      StyleSheet.create({
        div: {
          fontFamily: "Taamey Frank Taamim Fix",
          writingDirection: "rtl",
          flex: -1,
          paddingTop: 10,
          marginTop: -5,
          textAlign: "justify",
          fontSize: this.props.settings.fontSize,
          lineHeight: this.props.settings.fontSize * 1.1
        }
      }) :

     StyleSheet.create({
        div: {
          fontFamily: "Amiri",
          textAlign: 'justify',
          marginTop: 5,
          fontSize: 0.8 * this.props.settings.fontSize,
          lineHeight: this.props.settings.fontSize * 1.04
        }
      });

    return (
           <HTMLView
             value={"<div>"+this.props.data+"</div>"}
             stylesheet={stylesheet}
             textComponentProps={
               {
                 suppressHighlighting: false,
                 onPress:this.onPressTextSegment,
                 onLongPress:this.onLongPress,
                 key:this.props.segmentKey,
               }
             }
             nodeComponentProps={
               {
                 selectable: true,
               }
             }
           />

    );
  }
}


module.exports = TextSegment;
