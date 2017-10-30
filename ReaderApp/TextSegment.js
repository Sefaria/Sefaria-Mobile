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
    themeStr:           PropTypes.string.isRequired,
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
    this.state = {
      resetKey: 0
    };
  }
  onPressTextSegment = () => {
    let key = this.props.segmentKey;
    let section = parseInt(key.split(":")[0]);
    let segment = parseInt(key.split(":")[1]);
    this.props.textSegmentPressed(section, segment, this.props.rowRef, true);
  };

  onLongPress = () => {
    // Do nothing -- need to prevent onPress from firing onLongPress
  };

  componentWillReceiveProps(nextProps) {
    if (this.props.themeStr !== nextProps.themeStr) {
      this.setState({ resetKey: Math.random() }); //hacky fix to reset htmlview when theme colors change
    }
  }
  render() {
    // console.log(this.props.segmentKey+": "+typeof(this.props.textRef));
    const style = this.props.textType == "hebrew" ?
                  [styles.hebrewText, this.props.theme.text, styles.justifyText, {fontSize: this.props.settings.fontSize, lineHeight: this.props.settings.fontSize * 1.1},] :
                  [styles.englishText, this.props.theme.text, styles.justifyText, {fontSize: 0.8 * this.props.settings.fontSize, lineHeight: this.props.settings.fontSize * 1.04 }];
    if (this.props.bilingual && this.props.textType == "english") {
      style.push(styles.bilingualEnglishText);
      style.push(this.props.theme.bilingualEnglishText);
    }
    return (
           <HTMLView
             key={this.state.resetKey}
             value= {this.props.textType == "hebrew" ? "<hediv>"+this.props.data+"</hediv>" : "<endiv>"+this.props.data+"</endiv>"}
             stylesheet={styles}
             textComponentProps={
               {
                 suppressHighlighting: false,
                 onPress:this.onPressTextSegment,
                 onLongPress:this.onLongPress,
                 key:this.props.segmentKey,
                 style: style,
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
