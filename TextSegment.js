'use strict';

import PropTypes from 'prop-types';

import React from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import HTMLView from 'react-native-htmlview'; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)
import styles from './Styles.js';


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
    onLongPress:        PropTypes.func.isRequired,
    fontSize:           PropTypes.number.isRequired,
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

  filterOutFootnotes = text => {
    // right now app is not displaying footnotes properly. interim solution is to not display them at all
    //NOTE need to be careful about nested i-tags
    try {
      return text.replace(/<sup>[^<]*<\/sup> *<i +class=["']footnote["']>(?:[^<]*|(?:[^<]*<i>[^<]*<\/i>[^<]*)+)<\/i>/g, '');
    } catch (e) {
      //in case segment is not string (which should not happen but does)
      return text;
    }
  };
  componentWillReceiveProps(nextProps) {
    if (this.props.themeStr !== nextProps.themeStr ||
        this.props.fontSize !== nextProps.fontSize) {
      this.setState({ resetKey: !this.state.resetKey }); //hacky fix to reset htmlview when theme colors change
    }
  }
  render() {
    // console.log(this.props.segmentKey+": "+typeof(this.props.textRef));
    const style = this.props.textType == "hebrew" ?
                  [styles.hebrewText, this.props.theme.text, styles.justifyText, {fontSize: this.props.fontSize, lineHeight: this.props.fontSize * 1.1},] :
                  [styles.englishText, this.props.theme.text, styles.justifyText, {fontSize: 0.8 * this.props.fontSize, lineHeight: this.props.fontSize * 1.04 }];
    if (this.props.bilingual && this.props.textType == "english") {
      style.push(styles.bilingualEnglishText);
      style.push(this.props.theme.bilingualEnglishText);
    }
    const data = this.filterOutFootnotes(this.props.data);
    const smallSheet = {
      small: {
        fontSize: this.props.fontSize * 0.8 * (this.props.textType === "hebrew" ? 1 : 0.8)
      }
    };
    return (
           <HTMLView
             key={this.state.resetKey}
             value= {this.props.textType == "hebrew" ? "<hediv>"+data+"</hediv>" : "<endiv>"+data+"</endiv>"}
             stylesheet={{...styles, ...smallSheet}}
             rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:this.onPressTextSegment,
                 onLongPress:this.props.onLongPress,
               }
             }
             RootComponent={TouchableOpacity}
             textComponentProps={
               {
                 suppressHighlighting: false,
                 key:this.props.segmentKey,
                 style: style,

               }
             }
           />

    );
  }
}


export default TextSegment;
