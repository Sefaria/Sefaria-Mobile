'use strict';
import PropTypes from 'prop-types';
import React from 'react';
import {
  View,
  Text,
  Clipboard,
  Platform,
  Share,
  Linking
} from 'react-native';
import ActionSheet from 'react-native-action-sheet';

import TextSegment from './TextSegment';
import styles from './Styles';
import strings from './LocalizedStrings';


class TextRange extends React.PureComponent {
  static propTypes = {
    showToast:          PropTypes.func.isRequired,
    theme:              PropTypes.object.isRequired,
    themeStr:           PropTypes.string.isRequired,
    fontSize:           PropTypes.number.isRequired,
    rowData:            PropTypes.object.isRequired,
    segmentRef:         PropTypes.string.isRequired,
    segmentHeRef:       PropTypes.string,
    textLanguage:       PropTypes.oneOf(["hebrew","english","bilingual"]),
    showSegmentNumbers: PropTypes.bool.isRequired,
    textSegmentPressed: PropTypes.func.isRequired,
    setRowRef:          PropTypes.func.isRequired,
    setRowRefInitY:     PropTypes.func.isRequired,
    biLayout:           PropTypes.oneOf(["stacked", "sidebyside", "sidebysiderev"]),
  };

  constructor(props) {
    super(props);
  }

  getDisplayedText = (withURL) => {
    const {text, he} = this.props.rowData.content;
    const enText = Sefaria.util.removeHtml(typeof text === "string" ? text : "") || "";
    const heText = Sefaria.util.removeHtml(typeof he === "string" ? he : "") || "";
    const isHeb = this.props.textLanguage !== "english";
    const isEng = this.props.textLanguage !== "hebrew";
    const fullText = (heText && isHeb ? heText + (enText && isEng ? "\n" : "") : "") + ((enText && isEng) ? enText : "");
    return withURL ? `${fullText}\n\n${Sefaria.refToUrl(this.props.segmentRef)}` : fullText;
  };
  copyToClipboard = () => {
    Clipboard.setString(this.getDisplayedText());
    this.props.showToast("Copied to clipboard", 500);
  };
  reportErrorBody = () => (
    encodeURIComponent(
      `${this.props.segmentRef}

      ${this.getDisplayedText(true)}

      Describe the error:`)
  )
  reportError = () => {
    Linking.openURL(`mailto:corrections@sefaria.org?subject=${encodeURIComponent(`Sefaria Text Correction from ${Platform.OS}`)}&body=${this.reportErrorBody()}`)
  }

  onLongPress = () => {
    ActionSheet.showActionSheetWithOptions({
      options: [
        strings.copy,
        strings.reportError,
        strings.share,
        strings.viewOnSite,
        strings.cancel,
      ],
      cancelButtonIndex: 4,
    },
    (buttonIndex) => {
      if (buttonIndex === 0) { this.copyToClipboard(); }
      else if (buttonIndex === 1) { this.reportError(); }
      else if (buttonIndex === 2) { Share.share({
          message: this.getDisplayedText(Platform.OS === 'android'),  // android for some reason doesn't share text with a url attached at the bottom
          title: this.props.segmentRef,
          url: Sefaria.refToUrl(this.props.segmentRef)
        })
      }
      else if (buttonIndex === 3) { this.props.openUri(Sefaria.refToUrl(this.props.segmentRef))}
    })
  };

  _setRef = ref => {
    this.props.setRowRef(this.props.segmentRef, ref);
  };

  render() {

    let enText = this.props.rowData.content.text || "";
    let heText = this.props.rowData.content.he || "";
    enText = Sefaria.util.getDisplayableHTML(enText, 'english');
    heText = Sefaria.util.getDisplayableHTML(heText, 'hebrew');
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

    let textStyle = [styles.textSegment];
    if (this.props.rowData.highlight) {
        textStyle.push(this.props.theme.segmentHighlight);
    }
    if (this.props.biLayout === 'sidebyside') {
      textStyle.push({flexDirection: "row"})
    } else if (this.props.biLayout === 'sidebysiderev') {
      textStyle.push({flexDirection: "row-reverse"})
    }
    const showHe = textLanguage == "hebrew" || textLanguage == "bilingual";
    const showEn = textLanguage == "english" || textLanguage == "bilingual";
    return (
      <View
        style={styles.verseContainer}
        ref={this._setRef}
      >
        <View
          style={[styles.numberSegmentHolderEn, {flexDirection: this.props.textLanguage === 'english' ? 'row' : 'row-reverse'}]}
          key={this.props.segmentRef+"|inner-box"}
        >
          { numberMargin }
          <View style={textStyle} key={this.props.segmentRef+"|text-box"}>
            {
              showHe ? (
                <View style={{flex: 4.5 , paddingHorizontal: 10}}>
                  {this.props.displayRef ? <Text style={[styles.he, styles.textListCitation, this.props.theme.textListCitation]}>{this.props.rowData.content.sourceHeRef}</Text> : null}
                  <TextSegment
                    rowRef={this.props.segmentRef}
                    theme={this.props.theme}
                    themeStr={this.props.themeStr}
                    segmentKey={refSection}
                    key={this.props.segmentRef+"|hebrew"}
                    data={heText}
                    textType="hebrew"
                    biLayout={this.props.biLayout}
                    textSegmentPressed={ this.props.textSegmentPressed }
                    onLongPress={this.onLongPress}
                    fontSize={this.props.fontSize}
                  />
                </View>
              ) : null
            }
            {
              showEn ? (
                <View style={{flex: 5.5 , paddingHorizontal: 10}}>
                  {this.props.displayRef ? <Text style={[styles.en, styles.textListCitation, this.props.theme.textListCitation]}>{this.props.rowData.content.sourceRef}</Text> : null}
                  <TextSegment
                    rowRef={this.props.segmentRef}
                    theme={this.props.theme}
                    themeStr={this.props.themeStr}
                    segmentKey={refSection}
                    key={this.props.segmentRef+"|english"}
                    data={enText}
                    textType="english"
                    biLayout={this.props.biLayout}
                    bilingual={textLanguage === "bilingual"}
                    textSegmentPressed={ this.props.textSegmentPressed }
                    onLongPress={this.onLongPress}
                    fontSize={this.props.fontSize}
                  />
                </View>
              ) : null
            }
          </View>
          { bulletMargin }
        </View>
      </View>
    );
  }
}

export default TextRange;
