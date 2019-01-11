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
    Dimensions,

} from 'react-native';

import {
    CategoryColorLine,
    TwoBox,
    LanguageToggleButton,
    MenuButton,
    LoadingView
} from './Misc.js';

import styles from './Styles.js';
import strings from "./LocalizedStrings";
import {DirectedButton} from "./Misc";
import HTMLView from 'react-native-htmlview';
import TextColumn from "./TextColumn"; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)
const ViewPort    = Dimensions.get('window');


class Sheet extends React.Component {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        themeStr: PropTypes.string.isRequired,
        menuLanguage: PropTypes.string.isRequired,
    };

    constructor(props) {
        super(props);
    }

    componentDidMount() {
    }

    onPressTextSegment = (ref, key) => {
        this.props.textSegmentPressed(ref, key);
    };

    cleanSheetHTML(html) {
        var cleaned = html.replace(/(\r\n|\n|\r|<p>&nbsp;<\/p>)/gm, "");
        return cleaned
    }




    render() {

        var sources = this.props.sheet.sources.length ? this.props.sheet.sources.map(function (source, i) {

            if ("ref" in source) {
                return (
                    <SheetSource
                        key={i}
                        source={source}
                        sourceNum={i + 1}
                        sourceIndex = {i}
                        textSegmentPressed={ this.onPressTextSegment}
                        theme={this.props.theme}
                        textLanguage={this.props.textLanguage}
                        cleanSheetHTML={this.cleanSheetHTML}
                        textLanguage={this.props.textLanguage}
                        biLayout={this.props.biLayout}
                        fontSize={this.props.fontSize}
                        textType="english"
                    />
                )
            }

            else if ("comment" in source) {
                return (
                    <SheetComment
                        key={i}
                        sourceNum={i + 1}
                        source={source}
                        sourceIndex = {i}
                        textSegmentPressed={ this.onPressTextSegment }
                        cleanSheetHTML={this.cleanSheetHTML}
                    />
                )
            }

            else if ("outsideText" in source) {
                return (
                    <SheetOutsideText
                        key={i}
                        sourceNum={i + 1}
                        source={source}
                        sourceIndex = {i}
                        textSegmentPressed={ this.onPressTextSegment }
                        cleanSheetHTML={this.cleanSheetHTML}
                    />
                )
            }

             else if ("outsideBiText" in source) {
             return (
                    <SheetOutsideBiText
                        key={i}
                        sourceNum={i + 1}
                        source={source}
                        sourceIndex = {i}
                        textSegmentPressed={ this.onPressTextSegment }
                        cleanSheetHTML={this.cleanSheetHTML}
                    />
             )
             }


             else if ("media" in source) {
             return (
                    <SheetMedia
                        key={i}
                        sourceNum={i + 1}
                        source={source}
                        sourceIndex = {i}
                        textSegmentPressed={ this.onPressTextSegment }
                    />
             )
             }

        }, this) : null;


        return (
            <View>
                <ScrollView>
                    <Text>{Sefaria.util.stripHtml(this.props.sheet.title)}</Text>
                    <Text>{this.props.sheetMeta.ownerName}</Text>
                    <Text>{this.props.sheet.id}</Text>
                    <View>
                        {sources}
                    </View>
                </ScrollView>
            </View>
        )

    }
}

class SheetSource extends Component {
    render() {
        var segmentIndex = parseInt(this.props.source.ref.match(/\d+$/)[0])-1 //ugly hack to get segment index to properly display links in state.data & state.sectionArray

        var enText = this.props.source.text.en ? this.props.cleanSheetHTML(this.props.source.text.en) : "";
        var heText = this.props.source.text.he ? this.props.cleanSheetHTML(this.props.source.text.he) : "";

        //let numLinks = this.props.rowData.content.links ? this.props.rowData.content.links.length : 0;
        let numLinks = 40

        let segment = [];
        let textLanguage = Sefaria.util.getTextLanguageWithContent(this.props.textLanguage, enText, heText);
                let numberMargin = (<Text ref={this.props.segmentRef}
                                       style={[styles.verseNumber, this.props.textLanguage == "hebrew" ? styles.hebrewVerseNumber : null, this.props.theme.verseNumber]}
                                       key={this.props.segmentRef + "|segment-number"}>
                            {(this.props.textLanguage == "hebrew" ?
                             Sefaria.hebrew.encodeHebrewNumeral(this.props.sourceNum) :
                             this.props.sourceNum) }
                          </Text>);

        let bulletOpacity = (numLinks-20) / (70-20);
        if (numLinks == 0) { bulletOpacity = 0; }
        else if (bulletOpacity < 0.3) { bulletOpacity = 0.3; }
        else if (bulletOpacity > 0.8) { bulletOpacity = 0.8; }

        var bulletMargin = (<Text ref={this.props.source.ref}
                                       style={[styles.verseBullet, this.props.theme.verseBullet, {opacity:bulletOpacity}]}
                                       key={this.props.source.ref + "|segment-dot"}>
                            {"●"}
                          </Text>);

        let textStyle = [styles.textSegment];
        /*if (this.props.rowData.highlight) {
            textStyle.push(this.props.theme.segmentHighlight);
        }*/
        if (this.props.biLayout === 'sidebyside') {
          textStyle.push({flexDirection: "row"})
        } else if (this.props.biLayout === 'sidebysiderev') {
          textStyle.push({flexDirection: "row-reverse"})
        }
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
            textAlign: (isStacked && Platform.OS === 'ios') ? 'justify' : 'right'  // justify looks bad hebrew with small screens in side-by-side layout
          },
          endiv: {
            textAlign: isStacked ? 'justify' : 'left'
          }
        };




        return (
      <View
        style={styles.verseContainer}
      >
            <Text>{textLanguage} {this.props.textLanguage}</Text>
        <View
          style={[styles.numberSegmentHolderEn, {flexDirection: this.props.textLanguage === 'english' ? 'row' : 'row-reverse'}]}
        >
          { numberMargin }
            <View style={textStyle}>

                {heText != "" ?
                    <View>
                    <Text>{this.props.source.heRef}</Text>

                    <HTMLView
                        value={"<hediv>"+heText+"</hediv>"}
                        stylesheet={{...styles, ...smallSheet}}
                        rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed(this.props.source.ref, [this.props.sourceIndex, segmentIndex]),
                 onLongPress:this.props.onLongPress,
                 delayPressIn: 200,
               }
             }
                        RootComponent={TouchableOpacity}
                        textComponentProps={
               {
                 suppressHighlighting: false,
                 key:this.props.segmentKey,
                 style: styles.hebrewText,

               }
             }
                        style={{flex: this.props.textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
                    /></View> : null}


                {enText !="" ?
                    <View>
                    <Text>{this.props.source.ref}</Text>
                    <HTMLView
                        value={"<endiv>&#x200E;"+enText+"</endiv>"}
                        stylesheet={{...styles, ...smallSheet}}
                        rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed(this.props.source.ref, [this.props.sourceIndex,segmentIndex]),
                 onLongPress:this.props.onLongPress,
                 delayPressIn: 200,
               }
             }
                        RootComponent={TouchableOpacity}
                        textComponentProps={
               {
                 suppressHighlighting: false,
                 key:this.props.segmentKey,
                 style: styles.englishText,

               }
             }
                        style={{flex: this.props.textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
                    /></View> : null}

                    </View>


            </View>
      </View>

        )
    }
}

class SheetComment extends Component {

    render() {
        var lang = Sefaria.hebrew.isHebrew(Sefaria.util.stripHtml(this.props.source.comment)) ? "he" : "en";
        var comment = this.props.cleanSheetHTML(this.props.source.comment);

        return (
            <View>

                <HTMLView
                    value={lang == "en" ? "<endiv>&#x200E;"+comment+"</endiv>" : "<hediv>&#x200E;"+comment+"</hediv>"}
                    stylesheet={{...styles}}
                    rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed("SheetRef", [this.props.sourceIndex,0]),
                 onLongPress:this.props.onLongPress,
                 delayPressIn: 200,
               }
             }
                    RootComponent={TouchableOpacity}
                    textComponentProps={
               {
                 suppressHighlighting: false,
                 key:this.props.segmentKey,
                 style: styles.englishText,

               }
             }
                    style={{flex: this.props.textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
                />


            </View>
        )
    }
}

class SheetOutsideText extends Component {
    render() {
        var lang = Sefaria.hebrew.isHebrew(Sefaria.util.stripHtml(this.props.source.outsideText)) ? "he" : "en";

        var outsideText = this.props.cleanSheetHTML(this.props.source.outsideText);

        console.log(outsideText)

        return (
            <View>

                <HTMLView
                    value={lang == "en" ? "<endiv>&#x200E;"+outsideText+"</endiv>" : "<hediv>&#x200E;"+outsideText+"</hediv>"}
                    stylesheet={{...styles}}
                    rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed("SheetRef", [this.props.sourceIndex,0]),
                 onLongPress:this.props.onLongPress,
                 delayPressIn: 200,
               }
             }
                    RootComponent={TouchableOpacity}
                    textComponentProps={
               {
                 suppressHighlighting: false,
                 key:this.props.segmentKey,
                 style: styles.englishText,

               }
             }
                    style={{flex: this.props.textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
                />

            </View>
        )
    }
}

class SheetOutsideBiText extends Component {

    render() {
        var enText = this.props.source.outsideBiText.en ? this.props.cleanSheetHTML(this.props.source.outsideBiText.en) : "";
        var heText = this.props.source.outsideBiText.he ? this.props.cleanSheetHTML(this.props.source.outsideBiText.he) : "";

        return (

            <View>

                {heText != "" ?
                    <HTMLView
                        value={"<hediv>"+heText+"</hediv>"}
                        stylesheet={{...styles}}
                        rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed("SheetRef", [this.props.sourceIndex,0]),
                 onLongPress:this.props.onLongPress,
                 delayPressIn: 200,
               }
             }
                        RootComponent={TouchableOpacity}
                        textComponentProps={
               {
                 suppressHighlighting: false,
                 key:this.props.segmentKey,
                 style: styles.hebrewText,

               }
             }
                        style={{flex: this.props.textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
                    /> : null}

                {enText != "" ?
                    <HTMLView
                        value={"<endiv>&#x200E;"+enText+"</endiv>"}
                        stylesheet={{...styles}}
                        rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed("SheetRef", [this.props.sourceIndex,0]),
                 onLongPress:this.props.onLongPress,
                 delayPressIn: 200,
               }
             }
                        RootComponent={TouchableOpacity}
                        textComponentProps={
               {
                 suppressHighlighting: false,
                 key:this.props.segmentKey,
                 style: styles.englishText,

               }
             }
                        style={{flex: this.props.textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
                    /> : null}


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
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            source={{uri: mediaURL}}
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
            <View style={{width:ViewPort.width-40, height: 200, marginTop:20, marginLeft:20, marginRight: 20}}>
                {this.makeMediaEmbedLink(this.props.source.media)}
            </View>
        )
    }
}


export default Sheet;
