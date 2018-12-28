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


    render() {

        var sources = this.props.sheet.sources.length ? this.props.sheet.sources.map(function (source, i) {

            if ("ref" in source) {
                return (
                    <SheetSource
                        key={i}
                        source={source}
                        sourceNum={i + 1}
                        textSegmentPressed={ this.onPressTextSegment}
                    />
                )
            }

            else if ("comment" in source) {
                return (
                    <SheetComment
                        key={i}
                        sourceNum={i + 1}
                        source={source}
                        textSegmentPressed={ this.onPressTextSegment }
                    />
                )
            }

            else if ("outsideText" in source) {
                return (
                    <SheetOutsideText
                        key={i}
                        sourceNum={i + 1}
                        source={source}
                        textSegmentPressed={ this.onPressTextSegment }
                    />
                )
            }

             else if ("outsideBiText" in source) {
             return (
             <SheetOutsideBiText
             key={i}
             sourceNum={i + 1}
             source={source}
                        textSegmentPressed={ this.onPressTextSegment }
             />
             )
             }


             else if ("media" in source) {
             return (
             <SheetMedia
             key={i}
             sourceNum={i + 1}
             source={source}
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

        return (
            <View>

                {this.props.source.text && this.props.source.text.he ?
                    <HTMLView
                        value={"<hediv>"+this.props.source.text.he+"</hediv>"}
                        stylesheet={{...styles}}
                        rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed(this.props.source.ref, this.props.sourceNum),
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

                {this.props.source.text && this.props.source.text.en ?
                    <HTMLView
                        value={"<endiv>&#x200E;"+this.props.source.text.en+"</endiv>"}
                        stylesheet={{...styles}}
                        rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed(this.props.source.ref, this.props.sourceNum),
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

class SheetComment extends Component {

    render() {
        var lang = Sefaria.hebrew.isHebrew(Sefaria.util.stripHtml(this.props.source.comment)) ? "he" : "en";

        return (
            <View>

                <HTMLView
                    value={lang == "en" ? "<endiv>&#x200E;"+this.props.source.comment+"</endiv>" : "<hediv>&#x200E;"+this.props.source.comment+"</hediv>"}
                    stylesheet={{...styles}}
                    rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed("Genesis 1:1", this.props.sourceNum),
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


        return (
            <View>

                <HTMLView
                    value={lang == "en" ? "<endiv>&#x200E;"+this.props.source.outsideText+"</endiv>" : "<hediv>&#x200E;"+this.props.source.outsideText+"</hediv>"}
                    stylesheet={{...styles}}
                    rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed("Genesis 1:1", this.props.sourceNum),
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
        return (

            <View>

                {this.props.source.outsideBiText && this.props.source.outsideBiText.he ?
                    <HTMLView
                        value={"<hediv>"+this.props.source.outsideBiText.he+"</hediv>"}
                        stylesheet={{...styles}}
                        rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed("Genesis 1:1", this.props.sourceNum),
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

                {this.props.source.outsideBiText && this.props.source.outsideBiText.en ?
                    <HTMLView
                        value={"<endiv>&#x200E;"+this.props.source.outsideBiText.en+"</endiv>"}
                        stylesheet={{...styles}}
                        rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:() => this.props.textSegmentPressed("Genesis 1:1", this.props.sourceNum),
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
