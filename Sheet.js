'use strict';

import PropTypes from 'prop-types';

import React, {Component} from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    FlatList,
    Image,
    Platform,
    AppState,
    WebView,
    Dimensions, Share, Clipboard,

} from 'react-native';

import {
    HebrewInEnglishText,
} from './Misc.js';

import styles from './Styles.js';
import strings from "./LocalizedStrings";
import {DirectedButton, SText} from "./Misc";
import HTMLView from 'react-native-htmlview';
import ActionSheet from "react-native-action-sheet";
import Sefaria from './sefaria';
const ViewPort    = Dimensions.get('window');


class Sheet extends React.Component {
    static propTypes = {
    };

    constructor(props) {
        super(props);
    }

    componentDidMount() {
    }

    _getSheetListRef = (ref) => {
        this.sheetListRef = ref;
    }

    onPressTextSegment = (ref, sourceIndex, segmentIndex, shouldToggle=true) => {
        var key = [sourceIndex, segmentIndex];
        if (shouldToggle == true) { this.sheetListRef.scrollToIndex({animated: true, index: sourceIndex, viewPosition: 0})}
        this.props.textSegmentPressed(ref, key, shouldToggle);
    };
  copyToClipboard = (text) => {
    Clipboard.setString(this.cleanDisplayedText(text));
    this.props.showToast("Copied to clipboard", 500);
  };
  cleanDisplayedText = (text, withURL) => {
    var cleanedText = Sefaria.util.removeHtml(text)
    return withURL ? `${cleanedText}\n\n${Sefaria.refToUrl(this.props.segmentRef)}` : cleanedText;
  };

      onLongPress = (text) => {
        ActionSheet.showActionSheetWithOptions({
          options: [
            strings.copy,
            strings.share,
            strings.viewOnSite,
            strings.cancel,
          ],
          cancelButtonIndex: 4,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) { this.copyToClipboard(text); }
          else if (buttonIndex === 1) { Share.share({
              message: this.cleanDisplayedText(text, Platform.OS === 'android'),  // android for some reason doesn't share text with a url attached at the bottom
              title: this.props.segmentRef,
              url: Sefaria.refToUrl("Sheet "+this.props.sheet.id+"."+this.props.activeSheetNode)
            })
          }
          else if (buttonIndex === 2) { this.props.openUri(Sefaria.refToUrl("Sheet "+this.props.sheet.id+"."+this.props.activeSheetNode))}
        })
      };


    renderSource = ({ item, index }) => {


        let numLinks = 0;
        let bulletOpacity = (numLinks-20) / (70-20);
        if (numLinks == 0) { bulletOpacity = 0; }
        else if (bulletOpacity < 0.3) { bulletOpacity = 0.3; }
        else if (bulletOpacity > 0.8) { bulletOpacity = 0.8; }

        var bulletMargin = (<Text style={[styles.verseBullet, this.props.theme.verseBullet, {opacity:bulletOpacity}]}>
                            {"●"}
                          </Text>);


        let numberMargin = (<Text style={[styles.verseNumber, this.props.textLanguage == "hebrew" ? styles.hebrewVerseNumber : null, this.props.theme.verseNumber]}>
                                {(this.props.textLanguage == "hebrew" ? Sefaria.hebrew.encodeHebrewNumeral(index+1) :index+1) } </Text>);

        let textStyle = [styles.textSegment];
        if (this.props.activeSheetNode == item.node && this.props.textListVisible) {
            textStyle.push(this.props.theme.segmentHighlight);
        }
        if (this.props.biLayout === 'sidebyside') {
          textStyle.push({flexDirection: "row"})
        } else if (this.props.biLayout === 'sidebysiderev') {
          textStyle.push({flexDirection: "row-reverse"})
        }


        if ("ref" in item) {
            return (
                <SheetSource
                    key={index}
                    source={item}
                    sourceNum={index + 1}
                    onLongPress={this.onLongPress}
                    sourceIndex = {index}
                    currentlyActive = {this.props.activeSheetNode == item.node}
                    textSegmentPressed={ this.onPressTextSegment}
                    theme={this.props.theme}
                    numberMargin={numberMargin}
                    bulletMargin = {bulletMargin}
                    textStyle={textStyle}
                    textLanguage={this.props.textLanguage}
                    biLayout={this.props.biLayout}
                    fontSize={this.props.fontSize}
                    segmentIndex={parseInt(item.ref.match(/\d+$/)[0])-1} //ugly hack to get segment index to properly display links in state.data & state.sectionArray
                    textType="english"
                />
            )
        }

        else if ("comment" in item) {
            return (
                <SheetComment
                    key={index}
                    sheetId = {this.props.sheet.id}
                    sourceNum={index + 1}
                    onLongPress={this.onLongPress}
                    source={item}
                    theme={this.props.theme}
                    fontSize={this.props.fontSize}
                    currentlyActive = {this.props.activeSheetNode == item.node}
                    numberMargin={numberMargin}
                    bulletMargin = {bulletMargin}
                    textStyle={textStyle}
                    sourceIndex = {index}
                    textSegmentPressed={ this.onPressTextSegment }
                />
            )
        }

        else if ("outsideText" in item) {
            return (
                <SheetOutsideText
                    key={index}
                    sheetId = {this.props.sheet.id}
                    sourceNum={index + 1}
                    onLongPress={this.onLongPress}
                    source={item}
                    theme={this.props.theme}
                    fontSize={this.props.fontSize}
                    currentlyActive = {this.props.activeSheetNode == item.node}
                    numberMargin={numberMargin}
                    bulletMargin = {bulletMargin}
                    textStyle={textStyle}
                    sourceIndex = {index}
                    textSegmentPressed={ this.onPressTextSegment }
                />
            )
        }

         else if ("outsideBiText" in item) {
         return (
                <SheetOutsideBiText
                    key={index}
                    sheetId = {this.props.sheet.id}
                    sourceNum={index + 1}
                    onLongPress={this.onLongPress}
                    numberMargin={numberMargin}
                    bulletMargin = {bulletMargin}
                    theme={this.props.theme}
                    fontSize={this.props.fontSize}
                    textStyle={textStyle}
                    source={item}
                    currentlyActive = {this.props.activeSheetNode == item.node}
                    sourceIndex = {index}
                    textSegmentPressed={ this.onPressTextSegment }
                />
         )
         }


         else if ("media" in item) {
         return (
                <SheetMedia
                    key={index}
                    sheetId = {this.props.sheet.id}
                    numberMargin={numberMargin}
                    bulletMargin = {bulletMargin}
                    theme={this.props.theme}
                    textStyle={textStyle}
                    sourceNum={index + 1}
                    onLongPress={this.onLongPress}
                    currentlyActive = {this.props.activeSheetNode == item.node}
                    source={item}
                    sourceIndex = {index}
                    textSegmentPressed={ this.onPressTextSegment }
                />
         )
         }

         else {
             return null
        }
  };

  handleScroll = (e) => {
      console.log(e)
  };

  onViewableItemsChanged = ({viewableItems, changed}) => {
      var featuredNode = viewableItems[1] ? viewableItems[1].item.node : viewableItems[0].item.node
      this.props.updateActiveSheetNode(featuredNode);

  };


  _keyExtractor = (item, index) => item.node;

  componentDidUpdate() {
//      console.log(this.props.textLanguage)
  }
    render() {
        return (
            <View style={styles.sheet}>
                <FlatList
                  ref={this._getSheetListRef}
                  data={this.props.sheet.sources}
                  renderItem={this.renderSource}
                  keyExtractor={this._keyExtractor}
                  ListHeaderComponent={
                      <View>
                        <Text style={styles.sheetTitle}><HebrewInEnglishText text={this.props.sheet.title} stylesHe={[styles.heInEn]} stylesEn={[]}/></Text>
                        <Text style={styles.sheetAuthor}>{this.props.sheetMeta.ownerName}</Text>
                      </View>
                  }
                  onViewableItemsChanged={this.onViewableItemsChanged}
                />
            </View>
        )

    }
}

class SheetSource extends Component {
  componentDidUpdate(prevProps, prevState) {
    if (this.props.currentlyActive && !prevProps.currentlyActive) {
      this.onPress(false);
    }
  }

  onPress = (toggle=true) => {
    this.props.textSegmentPressed(this.props.source.ref, this.props.sourceIndex, this.props.segmentIndex, toggle)
  }

    render() {


        var enText = this.props.source.text.en ? Sefaria.util.cleanSheetHTML(this.props.source.text.en) : "";
        var heText = this.props.source.text.he ? Sefaria.util.cleanSheetHTML(this.props.source.text.he) : "";

    //let numLinks = this.props.rowData.content.links ? this.props.rowData.content.links.length : 0;
    let numLinks = 40

    let segment = [];
    let textLanguage = Sefaria.util.getTextLanguageWithContent(this.props.textLanguage, enText, heText);

    let bulletOpacity = (numLinks-20) / (70-20);
    if (numLinks == 0) { bulletOpacity = 0; }
    else if (bulletOpacity < 0.3) { bulletOpacity = 0.3; }
    else if (bulletOpacity > 0.8) { bulletOpacity = 0.8; }

    var bulletMargin = (<Text ref={this.props.source.ref}
                                   style={[styles.verseBullet, this.props.theme.verseBullet, {opacity:bulletOpacity}]}
                                   key={this.props.source.ref + "|segment-dot"}>
                        {"●"}
                      </Text>);

        const showHe = textLanguage == "hebrew" || textLanguage == "bilingual";
        const showEn = textLanguage == "english" || textLanguage == "bilingual";


        const isStacked = this.props.biLayout === 'stacked';
        const lineHeightMultiplierHe = Platform.OS === 'android' ? 1.3 : 1.2;
        const style = this.props.textType == "hebrew" ?
          [styles.hebrewText, this.props.theme.text, (isStacked && Platform.OS === 'ios') ? styles.justifyText : {textAlign: 'right'}, {fontSize: this.props.fontSize, lineHeight: this.props.fontSize * lineHeightMultiplierHe}] :
          [styles.englishText, this.props.theme.text, isStacked ? styles.justifyText : {textAlign: 'left'}, {fontSize: 0.8 * this.props.fontSize, lineHeight: this.props.fontSize * 1.04 }];
        if (this.props.bilingual && this.props.textType == "english") {
          if (isStacked) {
            style.push(styles.bilingualEnglishText);
          }
          style.push(this.props.theme.bilingualEnglishText);
        }
        const smallSheet = {
          small: {
            fontSize: this.props.fontSize * 0.8 * (this.props.textType === "hebrew" ? 1 : 0.8)
          },
          hediv: {
            ...styles.hediv,
            textAlign: (isStacked && Platform.OS === 'ios') ? 'justify' : 'right',
          },
          endiv: {
            ...styles.endiv,
            textAlign: isStacked ? 'justify' : 'left',
          }
        };

    return (
      <View
        style={styles.verseContainer}
      >
        <View
          style={[styles.numberSegmentHolderEn, {flexDirection: this.props.textLanguage === 'english' ? 'row' : 'row-reverse'}]}
        >
          { this.props.numberMargin }
            <View style={this.props.textStyle}>

                {heText != "" && ['hebrew','bilingual'].includes(this.props.textLanguage) ?
                    <View style={{flex:1}}>
                    <Text style={[styles.hebrewText,styles.sheetRef]}>{this.props.source.heRef}</Text>

                    <HTMLView
                        value={"<hediv>"+heText+"</hediv>"}
                        stylesheet={{...styles, ...smallSheet}}
                        rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed(this.props.source.ref, this.props.sourceIndex, this.props.segmentIndex),
                 onLongPress: () => this.props.onLongPress(heText),
                 delayPressIn: 200,
               }
             }
                        RootComponent={TouchableOpacity}
                        textComponentProps={
               {
                 suppressHighlighting: false,
                 key:this.props.segmentKey,
                 style: [styles.hebrewText, this.props.theme.text, styles.justifyText, {fontSize: this.props.fontSize, lineHeight: this.props.fontSize * lineHeightMultiplierHe}]
               }
             }
                        style={{flex: this.props.textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
                    /></View> : null}


                {enText !="" && ['english','bilingual'].includes(this.props.textLanguage) ?
                    <View style={{flex:1, marginTop: isStacked ? 10:0}}>
                    <Text style={[styles.englishText,styles.sheetRef]}>{this.props.source.ref}</Text>
                    <HTMLView
                        value={"<endiv>&#x200E;"+enText+"</endiv>"}
                        stylesheet={{...styles, ...smallSheet}}
                        rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed(this.props.source.ref, this.props.sourceIndex,this.props.segmentIndex),
                 onLongPress: () => this.props.onLongPress(enText),
                 delayPressIn: 200,
               }
             }
                        RootComponent={TouchableOpacity}
                        textComponentProps={
               {
                 suppressHighlighting: false,
                 key:this.props.segmentKey,
                 style: [styles.englishText, this.props.theme.text, styles.justifyText, {fontSize: 0.8 * this.props.fontSize, lineHeight: this.props.fontSize * 1.04 }]
               }
             }
                        style={{flex: this.props.textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
                    /></View> : null}

                   </View>
            { this.props.bulletMargin }
        </View>
      </View>
    )
  }
}

class SheetComment extends Component {
    componentDidUpdate(prevProps, prevState) {
        if (this.props.currentlyActive && !prevProps.currentlyActive) {
            this.props.textSegmentPressed("Sheet "+this.props.sheetId+"."+this.props.source.node, this.props.sourceIndex, 0, false)
        }
    }

    render() {
        var lang = Sefaria.hebrew.isHebrew(Sefaria.util.stripHtml(this.props.source.comment)) ? "he" : "en";
        var comment = Sefaria.util.cleanSheetHTML(this.props.source.comment);

    return (
      <View
        style={styles.verseContainer}
      >
        <View style={[styles.numberSegmentHolderEn, {flexDirection: this.props.textLanguage === 'english' ? 'row' : 'row-reverse'}]}>
          { this.props.numberMargin }
            <View style={this.props.textStyle}>
              <HTMLView
                value={lang == "en" ? "<endiv>&#x200E;"+comment+"</endiv>" : "<hediv>&#x200E;"+comment+"</hediv>"}
                stylesheet={{...styles}}
                rootComponentProps={{
                  hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                  onPress: this.onPress,
                  onLongPress: () => this.props.onLongPress(comment),
                  delayPressIn: 200,
                }}
                RootComponent={TouchableOpacity}
                textComponentProps={{
                  suppressHighlighting: false,
                  key:this.props.segmentKey,
                  style: [styles.englishText, this.props.theme.text, styles.justifyText, {fontSize: 0.8 * this.props.fontSize, lineHeight: this.props.fontSize * 1.04 }]
                }}
                style={{flex: this.props.textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
              />
            </View>
            { this.props.bulletMargin }
        </View>
      </View>
    )
  }
}

class SheetOutsideText extends Component {
    componentDidUpdate(prevProps, prevState) {
        if (this.props.currentlyActive && !prevProps.currentlyActive) {
            this.props.textSegmentPressed("Sheet "+this.props.sheetId+"."+this.props.source.node, this.props.sourceIndex, 0, false)
        }
    }
    render() {
        var lang = Sefaria.hebrew.isHebrew(Sefaria.util.stripHtml(this.props.source.outsideText)) ? "he" : "en";

        var outsideText = Sefaria.util.cleanSheetHTML(this.props.source.outsideText);

    return (
      <View style={styles.verseContainer}>
        <View style={[styles.numberSegmentHolderEn, {flexDirection: this.props.textLanguage === 'english' ? 'row' : 'row-reverse'}]}>
          { this.props.numberMargin }
          <View style={[this.props.textStyle,{flex:1}]}>
            <HTMLView
              value={lang == "en" ? "<endiv>&#x200E;"+outsideText+"</endiv>" : "<hediv>&#x200E;"+outsideText+"</hediv>"}
              stylesheet={{...styles}}
              rootComponentProps={{
                hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                onPress: this.onPress,
                onLongPress: () => this.props.onLongPress(outsideText),
                delayPressIn: 200,
              }}
              RootComponent={TouchableOpacity}
              textComponentProps={{
                suppressHighlighting: false,
                key:this.props.segmentKey,
                style: [styles.englishText, this.props.theme.text, styles.justifyText, {fontSize: 0.8 * this.props.fontSize, lineHeight: this.props.fontSize * 1.04 }]
              }}
              style={{flex: this.props.textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
            />
          </View>
          { this.props.bulletMargin }
        </View>
      </View>
    )
  }
}

class SheetOutsideBiText extends Component {
  componentDidUpdate(prevProps, prevState) {
    if (this.props.currentlyActive && !prevProps.currentlyActive) {
      this.onPress(false);
    }
  }

  onPress = (toggle=true) => {
    this.props.textSegmentPressed("Sheet "+this.props.sheetId+"."+this.props.source.node, this.props.sourceIndex, 0, toggle);
  }

    render() {
        var enText = this.props.source.outsideBiText.en ? Sefaria.util.cleanSheetHTML(this.props.source.outsideBiText.en) : "";
        var heText = this.props.source.outsideBiText.he ? Sefaria.util.cleanSheetHTML(this.props.source.outsideBiText.he) : "";

    return (
      <View style={styles.verseContainer}>
        <View style={[styles.numberSegmentHolderEn, {flexDirection: this.props.textLanguage === 'english' ? 'row' : 'row-reverse'}]}>
          { this.props.numberMargin }
          <View style={this.props.textStyle}>
            {heText != "" && ['hebrew','bilingual'].includes(this.props.textLanguage) ?
              <HTMLView
                value={"<hediv>"+heText+"</hediv>"}
                stylesheet={{...styles}}
                rootComponentProps={{
                  hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                  onPress: this.onPress,
                  onLongPress: () => this.props.onLongPress(heText),
                  delayPressIn: 200,
                }}
                RootComponent={TouchableOpacity}
                textComponentProps={{
                  suppressHighlighting: false,
                  key:this.props.segmentKey,
                  style: [styles.hebrewText, this.props.theme.text, styles.justifyText, {fontSize: this.props.fontSize, lineHeight: this.props.fontSize * lineHeightMultiplierHe}]
                }}
                style={{flex: this.props.textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
              /> :
            null}
            {enText != ""&& ['english','bilingual'].includes(this.props.textLanguage) ?
              <HTMLView
                value={"<endiv>&#x200E;"+enText+"</endiv>"}
                stylesheet={{...styles}}
                rootComponentProps={{
                  hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                  onPress: this.onPress,
                  onLongPress: () => this.props.onLongPress(enText),
                  delayPressIn: 200,
                }}
                RootComponent={TouchableOpacity}
                textComponentProps={{
                  suppressHighlighting: false,
                  key:this.props.segmentKey,
                  style: [styles.englishText, this.props.theme.text, styles.justifyText, {fontSize: 0.8 * this.props.fontSize, lineHeight: this.props.fontSize * 1.04 }]
                }}
                style={{flex: this.props.textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
              /> :
            null}
          </View>
          { this.props.bulletMargin }
        </View>
      </View>
    )
  }

}

class SheetMedia extends Component {
    state = {
      appState: AppState.currentState
    }

      componentDidMount() {
          AppState.addEventListener('change', this._handleAppStateChange);
      }

      componentWillUnmount() {
          AppState.removeEventListener('change', this._handleAppStateChange);
      }

      _handleAppStateChange = (nextAppState) => {
          this.setState({appState: nextAppState});
      }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.currentlyActive && !prevProps.currentlyActive) {
            this.props.textSegmentPressed("Sheet "+this.props.sheetId+"."+this.props.source.node, this.props.sourceIndex, 0, false)
        }
    }

    onShouldStartLoadWithRequest = (navigator) => {
        if (navigator.url.indexOf('embed') !== -1
        ) {
            return true;
        } else {
            this.webview.stopLoading(); //Some reference to your WebView to make it stop loading that URL
            return false;
        }
    }

    _getWebViewRef = ref => {
      this.webview = ref;
    }
    makeMediaEmbedLink(mediaURL) {
        var mediaLink;

        if (mediaURL.match(/\.(jpeg|jpg|gif|png)$/i) != null) {
            mediaLink = (
                <Image
                  style={{
                    flex: 1,
                    width: null,
                    height: null,
                    resizeMode: 'contain'
                  }}
                  source={{uri: mediaURL}}
                />
            )
        }

        else if (mediaURL.toLowerCase().indexOf('youtube') > 0) {
            mediaLink = (
                            <WebView
                            ref={this._getWebViewRef}
                            scrollEnabled={false}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            style={{ marginStart: 30, width: 320, height: 230 }}
                            source={{uri: mediaURL}}
                            onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest} //for iOS
                            onNavigationStateChange ={this.onShouldStartLoadWithRequest} //for Android
                            />
                        )
        }

        else if (mediaURL.toLowerCase().indexOf('soundcloud') > 0) {
            var htmlData = '<iframe width="100%" height="166" scrolling="no" frameborder="no" src="' + mediaURL + '"></iframe>';
            mediaLink =  ( <WebView
                            originWhitelist={['*']}
                            source={{ html: htmlData }}
                           />)


        }

        else if (mediaURL.match(/\.(mp3)$/i) != null) {
            var htmlData = '<audio src="' + mediaURL + '" type="audio/mpeg" controls>Your browser does not support the audio element.</audio>';
            mediaLink =  ( <WebView
                            originWhitelist={['*']}
                            source={{ html: htmlData }}
                           />)
        }

        else {
            mediaLink = 'Error loading media...';
        }

        return mediaLink
    }

    render() {
        return (

            <View style={{width:ViewPort.width-40, height: 200, marginTop:20}}>
                {this.makeMediaEmbedLink(this.props.source.media)}
            </View>
        )
    }
}

export {
  SheetComment,
  SheetOutsideText,
  SheetOutsideBiText,
  SheetMedia,
};
