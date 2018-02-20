'use strict';
import PropTypes from 'prop-types';
import React from 'react';
import {
  View,
  Text
} from 'react-native';

import TextSegment from './TextSegment';
import styles from './Styles';


class TextRangeContinuous extends React.PureComponent {
  static propTypes = {
    settings:           PropTypes.object.isRequired,
    theme:              PropTypes.object.isRequired,
    themeStr:           PropTypes.string.isRequired,
    rowData:            PropTypes.object.isRequired,
    textLanguage:       PropTypes.oneOf(["hebrew","english","bilingual"]),
    sectionRef:         PropTypes.string.isRequired,
    setRowRef:          PropTypes.func.isRequired,
    setRowRefInitY:     PropTypes.func.isRequired,
    showSegmentNumbers: PropTypes.bool.isRequired,
    textSegmentPressed: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
  }

  renderSegmentForContinuousRow = (currSegData) => {
      const segmentText = [];
      currSegData.text = currSegData.content.text || "";
      currSegData.he = currSegData.content.he || "";
      const textLanguage = Sefaria.util.getTextLanguageWithContent(this.props.textLanguage, currSegData.text, currSegData.he);
      const segmentRef = currSegData.ref;
      const refSection = `${this.props.rowData.sectionIndex}:${currSegData.segmentNumber}`
      var style = [styles.continuousVerseNumber,
                   this.props.textLanguage == "hebrew" ? styles.continuousHebrewVerseNumber : null,
                   this.props.theme.verseNumber,
                   currSegData.highlight ? this.props.theme.segmentHighlight : null];
      const onSegmentLayout = (event) => {
       let {x, y, width, height} = event.nativeEvent.layout;
       this.props.setRowRefInitY(segmentRef, y);
      };
      segmentText.push(
        <View ref={segmentRef}
         style={this.props.showSegmentNumbers ? styles.continuousVerseNumberHolder : styles.continuousVerseNumberHolderTalmud}
         onLayout={onSegmentLayout}
         key={segmentRef+"|segment-number"} >
          <Text style={style}>
            {this.props.showSegmentNumbers ? (this.props.textLanguage == "hebrew" ?
              Sefaria.hebrew.encodeHebrewNumeral(currSegData.segmentNumber) :
              currSegData.segmentNumber) : ""}
          </Text>
        </View>);


      if (textLanguage == "hebrew" || textLanguage == "bilingual") {
        segmentText.push(
          <TextSegment
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            rowRef={segmentRef}
            segmentKey={refSection}
            key={segmentRef+"-he"}
            data={currSegData.he}
            textType="hebrew"
            textSegmentPressed={ this.props.textSegmentPressed }
            settings={this.props.settings}
          />
        );
      }

      if (textLanguage == "english" || textLanguage == "bilingual") {
        segmentText.push(<TextSegment
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          segmentIndexRef={this.props.segmentIndexRef}
          rowRef={segmentRef}
          segmentKey={refSection}
          key={segmentRef+"-en"}
          data={currSegData.text}
          textType="english"
          textSegmentPressed={ this.props.textSegmentPressed }
          settings={this.props.settings}/>);
      }

      segmentText.push(<Text key={segmentRef+"-emptytext"}> </Text>);
      return (<Text style={style} ref={(view)=>{this.props.setRowRef(segmentRef, view)}} key={segmentRef+"-outertext"}>{segmentText}</Text>);
  };

  render() {
    const segments = [];
    for (var i = 0; i < this.props.rowData.segmentData.length; i++) {
      segments.push(this.renderSegmentForContinuousRow(this.props.rowData.segmentData[i]));
    }
    var textStyle = this.props.textLanguage == "hebrew" ? styles.hebrewText : styles.englishText;
    return (<View style={[styles.verseContainer, styles.continuousRowHolder]} key={this.props.sectionRef}>
              <Text style={[textStyle, styles.continuousSectionRow]}>{segments}</Text>
           </View>);
  }
}

export default TextRangeContinuous;
