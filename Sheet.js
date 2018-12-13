'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    FlatList,
    Image, Platform,

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
import HTMLView from 'react-native-htmlview'; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)


class Sheet extends React.Component {
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    themeStr:       PropTypes.string.isRequired,
    menuLanguage:   PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);
  }

  componentDidMount() {
   }


    render() {

      var sources = this.props.sheet.sources.length ? this.props.sheet.sources.map(function(source, i) {

      if ("ref" in source) {
        return (
          <SheetSource
            key={i}
            source={source}
            sourceNum={i + 1}
          />
        )
      }

      else if ("comment" in source) {
        return (
          <SheetComment
            key={i}
            sourceNum={i + 1}
            source={source}
          />
        )
      }

      else if ("outsideText" in source) {
        return (
          <SheetOutsideText
            key={i}
            sourceNum={i + 1}
            source={source}
         />
        )
      }
/*
      else if ("outsideBiText" in source) {
        return (
          <SheetOutsideBiText
            key={i}
            sourceNum={i + 1}
            source={source}
          />
        )
      }

      else if ("media" in source) {
        return (
          <SheetMedia
            key={i}
            sourceNum={i + 1}
            source={source}
          />
        )
      }
      */

else {return (<Text>Placeholder</Text>)}

    }, this) : null;



      return(
            <View>
              <ScrollView>
                <Text>{this.props.sheet.title}</Text>
                <Text>{this.props.sheetMeta.ownerName}</Text>
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
             key={this.props.sourceNum}
             value= {"<hediv>"+this.props.source.text.he+"</hediv>"}
             stylesheet={{...styles}}
             rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:this.onPressTextSegment,
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
             key={this.props.sourceNum}
             value= {"<endiv>&#x200E;"+this.props.source.text.en+"</endiv>"}
             stylesheet={{...styles}}
             rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:this.onPressTextSegment,
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
      var lang = Sefaria.hebrew.isHebrew(Sefaria.util.stripHtml(this.props.source.comment).replace(/\s+/g, ' ')) ? "he" : "en";

    return (
        <View>

 <HTMLView
             key={this.props.sourceNum}
             value= {lang == "en" ? "<endiv>&#x200E;"+this.props.source.comment+"</endiv>" : "<hediv>&#x200E;"+this.props.source.comment+"</hediv>"}
             stylesheet={{...styles}}
             rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:this.onPressTextSegment,
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
    var lang = Sefaria.hebrew.isHebrew(Sefaria.util.stripHtml(this.props.source.outsideText).replace(/\s+/g, ' ')) ? "he" : "en";


    return (
        <View>

 <HTMLView
             key={this.props.sourceNum}
             value= {lang == "en" ? "<endiv>&#x200E;"+this.props.source.outsideText+"</endiv>" : "<hediv>&#x200E;"+this.props.source.outsideText+"</hediv>"}
             stylesheet={{...styles}}
             rootComponentProps={{
                 hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
                 onPress:this.onPressTextSegment,
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
  sheetSourceClick(event) {
    if(event.target.tagName.toLowerCase() === 'a') {
      if( !(location.hostname === event.target.hostname || !event.target.hostname.length) ) {
        window.open(event.target.href, "_blank");
        event.preventDefault();
      }
    }

    else {
        this.props.onSegmentClick(this.props.source);
    }
  }

  render() {
      var containerClasses = classNames("sheetItem",
          "segment",
          this.props.highlightedNodes == this.props.source.node ? "highlight" : null,
          this.props.source.options ? this.props.source.options.indented : null
      )
    return (
      <div className={containerClasses} onClick={this.sheetSourceClick} aria-label={"Click to see " + this.props.linkCount +  " connections to this source"} tabIndex="0" onKeyPress={function(e) {e.charCode == 13 ? this.sheetSourceClick(e):null}.bind(this)} >
            <div className="segmentNumber sheetSegmentNumber sans">
              <span className="en"> <span className="segmentNumberInner">{this.props.sheetNumbered == 0 ? null : this.props.sourceNum}</span> </span>
              <span className="he"> <span
                className="segmentNumberInner">{this.props.sheetNumbered == 0 ? null : Sefaria.hebrew.encodeHebrewNumeral(this.props.sourceNum)}</span> </span>
            </div>
        <div className="he sourceContentText" dangerouslySetInnerHTML={ {__html: this.props.cleanHTML(this.props.source.outsideBiText.he)} }></div>
        <div className="en sourceContentText" dangerouslySetInnerHTML={ {__html: this.props.cleanHTML(this.props.source.outsideBiText.en)} }></div>
        <div className="clearFix"></div>
        {this.props.source.addedBy ?
            <div className="addedBy"><small><em>{Sefaria._("Added by")}: <span dangerouslySetInnerHTML={ {__html: this.props.cleanHTML(this.props.source.userLink)} }></span></em></small></div>
            : null
        }

      </div>
    )
  }

}

class SheetMedia extends Component {
  sheetSourceClick(event) {
    if(event.target.tagName.toLowerCase() === 'a') {
      if( !(location.hostname === event.target.hostname || !event.target.hostname.length) ) {
        window.open(event.target.href, "_blank");
        event.preventDefault();
      }
    }

    else {
        this.props.onSegmentClick(this.props.source);
    }
  }

  makeMediaEmbedLink(mediaURL) {
    var mediaLink;

    if (mediaURL.match(/\.(jpeg|jpg|gif|png)$/i) != null) {
      mediaLink = '<img class="addedMedia" src="' + mediaURL + '" />';
    }

    else if (mediaURL.toLowerCase().indexOf('youtube') > 0) {
      mediaLink = '<div class="youTubeContainer"><iframe width="100%" height="100%" src=' + mediaURL + ' frameborder="0" allowfullscreen></iframe></div>'
    }

    else if (mediaURL.toLowerCase().indexOf('soundcloud') > 0) {
      mediaLink = '<iframe width="100%" height="166" scrolling="no" frameborder="no" src="' + mediaURL + '"></iframe>'
    }

    else if (mediaURL.match(/\.(mp3)$/i) != null) {
      mediaLink = '<audio src="' + mediaURL + '" type="audio/mpeg" controls>Your browser does not support the audio element.</audio>';
    }

    else {
      mediaLink = 'Error loading media...';
    }

    return mediaLink
  }

  render() {
      var containerClasses = classNames("sheetItem",
          "segment",
          this.props.highlightedNodes == this.props.source.node ? "highlight" : null,
          this.props.source.options ? this.props.source.options.indented : null
      )
    return (
      <div className={containerClasses} onClick={this.sheetSourceClick} aria-label={"Click to  " + this.props.linkCount +  " connections to this source"} tabIndex="0" onKeyPress={function(e) {e.charCode == 13 ? this.sheetSourceClick(e):null}.bind(this)} >
            <div className="segmentNumber sheetSegmentNumber sans">
              <span className="en"> <span className="segmentNumberInner">{this.props.sheetNumbered == 0 ? null : this.props.sourceNum}</span> </span>
              <span className="he"> <span
                className="segmentNumberInner">{this.props.sheetNumbered == 0 ? null : Sefaria.hebrew.encodeHebrewNumeral(this.props.sourceNum)}</span> </span>
            </div>

        <div className="sourceContentText centeredSheetContent" dangerouslySetInnerHTML={ {__html: this.makeMediaEmbedLink(this.props.source.media)} }></div>
        <div className="clearFix"></div>
        {this.props.source.addedBy ?
            <div className="addedBy"><small><em>{Sefaria._("Added by")}: <span dangerouslySetInnerHTML={ {__html: this.props.cleanHTML(this.props.source.userLink)} }></span></em></small></div>
            : null
        }

      </div>

    )
  }
}





export default Sheet;
