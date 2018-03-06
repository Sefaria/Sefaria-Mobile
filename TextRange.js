'use strict';
import PropTypes from 'prop-types';
import React from 'react';
import {
  View,
  Text
} from 'react-native';

import TextSegment from './TextSegment';
import styles from './Styles';


class TextRange extends React.PureComponent {
  static propTypes = {
    theme:              PropTypes.object.isRequired,
    themeStr:           PropTypes.string.isRequired,
    fontSize:           PropTypes.number.isRequired,
    rowData:            PropTypes.object.isRequired,
    segmentRef:         PropTypes.string.isRequired,
    textLanguage:       PropTypes.oneOf(["hebrew","english","bilingual"]),
    showSegmentNumbers: PropTypes.bool.isRequired,
    textSegmentPressed: PropTypes.func.isRequired,
    setRowRef:          PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
  }

  render() {
    let enText = this.props.rowData.content.text || "";
    let heText = this.props.rowData.content.he || "";
    let numLinks = this.props.rowData.content.links ? this.props.rowData.content.links.length : 0;

    let segment = [];
    let textLanguage = Sefaria.util.getTextLanguageWithContent(this.props.textLanguage, enText, heText);
    let refSection = this.props.rowData.sectionIndex + ":" + this.props.rowData.rowIndex;
    let numberMargin = (<Text ref={this.props.segmentRef}
                                   style={[styles.verseNumber, this.props.textLanguage == "hebrew" ? styles.hebrewVerseNumber : null, this.props.theme.verseNumber]}
                                   key={this.props.segmentRef + "|segment-number"}>
                        {this.props.showSegmentNumbers ? (this.props.textLanguage == "hebrew" ?
                         Sefaria.hebrew.encodeHebrewNumeral(this.props.rowData.content.segmentNumber) :
                         this.props.rowData.content.segmentNumber) : ""}
                      </Text>);

    let bulletOpacity = (numLinks-20) / (70-20);
    if (numLinks == 0) { bulletOpacity = 0; }
    else if (bulletOpacity < 0.3) { bulletOpacity = 0.3; }
    else if (bulletOpacity > 0.8) { bulletOpacity = 0.8; }

    var bulletMargin = (<Text ref={this.props.segmentRef}
                                   style={[styles.verseBullet, this.props.theme.verseBullet, {opacity:bulletOpacity}]}
                                   key={this.props.segmentRef + "|segment-dot"}>
                        {"●"}
                      </Text>);


    var segmentText = [];

    if (textLanguage == "hebrew" || textLanguage == "bilingual") {
      segmentText.push(<TextSegment
        rowRef={this.props.segmentRef}
        theme={this.props.theme}
        themeStr={this.props.themeStr}
        segmentKey={refSection}
        key={this.props.segmentRef+"|hebrew"}
        data={heText}
        textType="hebrew"
        textSegmentPressed={ this.props.textSegmentPressed }
        fontSize={this.props.fontSize}/>);
    }

    if (textLanguage == "english" || textLanguage == "bilingual") {
      segmentText.push(<TextSegment
        rowRef={this.props.segmentRef}
        theme={this.props.theme}
        themeStr={this.props.themeStr}
        segmentKey={refSection}
        key={this.props.segmentRef+"|english"}
        data={enText}
        textType="english"
        bilingual={textLanguage === "bilingual"}
        textSegmentPressed={ this.props.textSegmentPressed }
        fontSize={this.props.fontSize} />);
    }

    let textStyle = [styles.textSegment];
    if (this.props.rowData.highlight) {
        textStyle.push(this.props.theme.segmentHighlight);
    }

    segmentText = <View style={textStyle} key={this.props.segmentRef+"|text-box"}>{segmentText}</View>;

    let completeSeg = this.props.textLanguage == "english" ? [numberMargin, segmentText, bulletMargin] : [bulletMargin, segmentText, numberMargin];

    if (enText || heText) {
      segment.push(<View style={styles.numberSegmentHolderEn} key={this.props.segmentRef+"|inner-box"}>
                      {completeSeg}
                    </View>);
    }

    return (
      <View
        style={styles.verseContainer}
        ref={(view)=>{this.props.setRowRef(this.props.segmentRef, view)}}
      >
        {segment}
      </View>
    );
  }
}

export default TextRange;
