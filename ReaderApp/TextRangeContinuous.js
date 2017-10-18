'use strict';
import PropTypes from 'prop-types';
import React from 'react';
import {
  View,
  Text
} from 'react-native';

const TextSegment = require('./TextSegment');
const styles = require('./Styles');


class TextRangeContinuous extends React.PureComponent {
  static propTypes = {
    Sefaria:            PropTypes.object.isRequired,
    settings:           PropTypes.object.isRequired,
    theme:              PropTypes.object.isRequired,
    rowData:            PropTypes.object.isRequired,
    textLanguage:       PropTypes.oneOf(["hebrew","english","bilingual"]),
    sectionRef:         PropTypes.string.isRequired,
    setSectionRef:      PropTypes.func.isRequired,
    setRowRef:          PropTypes.func.isRequired,
    showSegmentNumbers: PropTypes.bool.isRequired,
    textSegmentPressed: PropTypes.func.isRequired,
    onSegmentLayout:    PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    Sefaria = props.Sefaria;
  }

  onSectionLayout = (event) => {
    var {x, y, width, height} = event.nativeEvent.layout;
    this.props.setSectionRef( this.props.sectionRef, { height, y });
  };

  onSegmentLayout = (event) => {
    //TODO make this work
    var {x, y, width, height} = event.nativeEvent.layout;
    // console.log(this.props.sectionArray[rowData.sectionIndex] + ":" + currSegData.segmentNumber + " y=" + y)
    // this.rowRefs[reactRef]._initY = y;
    // if (currSegData.highlight) {
    //   // console.log('scrollling...')
    //   this.refs._listView.scrollTo({
    //    x: 0,
    //    y: y+this.sectionRefsHash[rowData.sectionIndex].y,
    //    animated: false
    //   });
    // }
  };

  renderSegmentForContinuousRow = (currSegData) => {
      const segmentText = [];
      currSegData.text = currSegData.content.text || "";
      currSegData.he = currSegData.content.he || "";
      const textLanguage = Sefaria.util.getTextLanguageWithContent(this.props.textLanguage, currSegData.text, currSegData.he);
      const segmentRef = `${this.props.sectionRef}:${currSegData.segmentNumber}`;
      const refSection = `${this.props.rowData.sectionIndex}:${currSegData.segmentNumber}`
      var style = [styles.continuousVerseNumber,
                   this.props.textLanguage == "hebrew" ? styles.continuousHebrewVerseNumber : null,
                   this.props.theme.verseNumber,
                   currSegData.highlight ? this.props.theme.segmentHighlight : null];
      segmentText.push(
        <View ref={segmentRef}
         style={this.props.showSegmentNumbers ? styles.continuousVerseNumberHolder : styles.continuousVerseNumberHolderTalmud}
         onLayout={this.onSegmentLayout}
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
          segmentIndexRef={this.props.segmentIndexRef}
          rowRef={segmentRef}
          segmentKey={refSection}
          key={segmentRef+"-en"}
          data={currSegData.text}
          textType="english"
          textSegmentPressed={ this.props.textSegmentPressed }
          settings={this.props.settings}/>);
      }

      segmentText.push(<Text> </Text>);
      return (<Text style={style} ref={(view)=>{this.props.setRowRef(segmentRef, view)}}>{segmentText}</Text>);
  };

  render() {
    const segments = [];
    for (var i = 0; i < this.props.rowData.segmentData.length; i++) {
      segments.push(this.renderSegmentForContinuousRow(this.props.rowData.segmentData[i]));
    }
    var textStyle = this.props.textLanguage == "hebrew" ? styles.hebrewText : styles.englishText;
    return (<View style={[styles.verseContainer, styles.continuousRowHolder]} key={this.props.sectionRef} onLayout={this.onSectionLayout} >
              <Text style={[textStyle, styles.continuousSectionRow]}>{segments}</Text>
           </View>);
  }
}

module.exports = TextRangeContinuous;
