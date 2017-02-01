'use strict';
import React, { Component } from 'react';
import {
  View,
  ScrollView,
  ListView,
  Text,
  TouchableOpacity,
  Dimensions
} from 'react-native';
const HTMLView       = require('react-native-htmlview');
const Orientation    = require('react-native-orientation');
const styles         = require('./Styles');
const strings        = require('./LocalizedStrings');
const TextListHeader = require('./TextListHeader');
const LinkFilter     = require('./LinkFilter');

const {
  CategoryColorLine,
  TwoBox,
  LoadingView,
} = require('./Misc.js');


var TextList = React.createClass({
  propTypes: {
    settings:        React.PropTypes.object,
    openRef:         React.PropTypes.func.isRequired,
    openCat:         React.PropTypes.func.isRequired,
    closeCat:        React.PropTypes.func.isRequired,
    updateCat:       React.PropTypes.func.isRequired,
    linkSummary:     React.PropTypes.array,
    linkContents:    React.PropTypes.array,
    loading:         React.PropTypes.bool,
    segmentIndexRef: React.PropTypes.number,
    filterIndex:     React.PropTypes.number,
    recentFilters:   React.PropTypes.array, /* of the form [{title,heTitle,refList}...] */
    textLanguage:    React.PropTypes.oneOf(["english","hebrew","bilingual"]),
    onDragStart:     React.PropTypes.func.isRequired,
    onDragMove:      React.PropTypes.func.isRequired,
    onDragEnd:       React.PropTypes.func.isRequired
  },
  getInitialState: function() {
    Sefaria = this.props.Sefaria; //Is this bad practice to use getInitialState() as an init function
    var {height, width} = Dimensions.get('window');
    return {
      dataSource: new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2}),
      isNewSegment: false,
      width: width,
      height: height,
    };
  },
  componentDidMount: function() {
    Orientation.addOrientationListener(this._orientationDidChange);
    Orientation.getOrientation(this._verifyDimensions);
  },
  componentWillUnmount: function() {
    Orientation.removeOrientationListener(this._orientationDidChange);
  },
  componentWillReceiveProps: function(nextProps) {
    if (this.props.segmentIndexRef !== nextProps.segmentIndexRef) {
      this.setState({isNewSegment:true});
    }
  },
  componentDidUpdate: function() {
    if (this.state.isNewSegment)
      this.setState({isNewSegment:false});
  },
  _orientationDidChange: function(orientation) {
    this.setState({
      width: this.state.height,
      height: this.state.width
    })
  },
  _verifyDimensions: function(err, orientation) {
    // Dimensions seems to often swap height/width. This checks them against the orientation and swaps them if they're wrong.
    var {height, width} = Dimensions.get('window');
    //console.log(orientation, "h: ",height,"w: ",width);
    if ((width > height && orientation !== "LANDSCAPE") ||
        (width < height && orientation == "LANDSCAPE")) {
      [height, width] = [width, height];
    }
    //console.log(orientation, "h: ",height,"w: ",width);
    this.setState({height: height, width: width});
  },
  renderRow: function(linkContentObj, sectionId, rowId) {
    var linkFilter = this.props.recentFilters[this.props.filterIndex];
    var ref = linkFilter.refList[rowId];
    var isCommentaryBook = linkFilter.category === "Commentary" && linkFilter.title !== "Commentary";
    var loading = false;
    if (linkContentObj == null) {
      loading = true;
      this.props.loadLinkContent(ref, rowId);
      linkContentObj = {en: "Loading...", he: "טוען...", sectionRef: ""};
    }

    return (<LinkContent
              theme={this.props.theme}
              settings={this.props.settings}
              openRef={this.props.openRef}
              refStr={ref}
              linkContentObj={linkContentObj}
              textLanguage={this.props.textLanguage}
              loading={loading}
              isCommentaryBook={isCommentaryBook}
              key={rowId} />);
  },
  render: function() {
    var isSummaryMode = this.props.filterIndex == null;
    if (isSummaryMode) {

      var viewList = [];
      this.props.linkSummary.map((cat)=>{
        let heCategory = Sefaria.hebrewCategory(this.props.category);
        let filter = new LinkFilter(cat.category,heCategory,cat.refList,cat.category);

        var innerViewList = cat.books.map((obook)=>{
          let filter = new LinkFilter(obook.title, obook.heTitle, obook.refList, cat.category);
          return (
          <LinkBook
            theme={this.props.theme}
            title={obook.title}
            heTitle={obook.heTitle}
            count={obook.count}
            language={this.props.settings.language}
            onPress={function(filter,title) {
              this.props.openCat(filter);
              Sefaria.track.event("Reader","Text Filter Click",title);
            }.bind(this,filter,obook.title)}
            key={obook.title} />);
        });

        viewList.push(
          <View style={styles.textListSummarySection} key={cat.category+"-container"}>
            <LinkCategory
              theme={this.props.theme}
              category={cat.category}
              refList={cat.refList}
              count={cat.count}
              language={this.props.settings.language}
              onPress={function(filter,category) {
                this.props.openCat(filter);
                Sefaria.track.event("Reader","Category Filter Click",category);
              }.bind(this,filter,cat.category)}
              key={cat.category} />
            <TwoBox content={innerViewList} />
          </View>);

      });
      if (viewList.length == 0) { viewList = <EmptyLinksMessage theme={this.props.theme} />; }
    } else {
      var dataSourceRows = this.state.dataSource.cloneWithRows(this.props.linkContents);
    }

    var textListHeader = (
      <View
        onStartShouldSetResponder={(evt)=>this.props.onDragStart(evt)}
        onResponderMove={(evt)=>this.props.onDragMove(evt)}
        onResponderRelease={(evt)=>this.props.onDragEnd(evt)}>

        <TextListHeader
          Sefaria={Sefaria}
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          updateCat={this.props.updateCat}
          closeCat={this.props.closeCat}
          category={isSummaryMode ? null : this.props.recentFilters[this.props.filterIndex].category}
          filterIndex={this.props.filterIndex}
          recentFilters={this.props.recentFilters}
          language={this.props.settings.language}
          isSummaryMode={isSummaryMode} />
      </View>
    );

    if (isSummaryMode) {
      var content = this.props.loading ?
                      <LoadingView /> :
                      <ScrollView style={styles.textListSummaryScrollView}>{viewList}</ScrollView>;
      return (
        <View style={[styles.textListSummary, this.props.theme.textListSummary]}>
          {textListHeader}
          {content}
        </View>);

    } else if (!this.state.isNewSegment) {
      // Using Dimensions to adjust marings on text at maximum line width because I can't figure out
      // how to get flex to center a component with maximum width without allows breaking the stretch
      // behavior of its contents, result in rows in the list view with small width if their content is small.
      var marginAdjust = this.state.width > 800 ? (this.state.width-800)/2 : 0
      var listViewStyles = [styles.textListContentListView, {marginLeft: marginAdjust}];
      return (
      <View style={[styles.textListContentOuter, this.props.theme.textListContentOuter]}>
        {textListHeader}
        {this.props.linkContents.length == 0 ?
          <View style={styles.noLinks}><EmptyLinksMessage theme={this.props.theme} /></View> :
          <ListView style={listViewStyles}
            dataSource={dataSourceRows}
            renderRow={this.renderRow}
            contentContainerStyle={{justifyContent: "center"}} />
        }
      </View>
      );
    } else {
      return null;
    }
  }
});


var LinkCategory = React.createClass({
  propTypes: {
    theme:    React.PropTypes.object.isRequired,
    onPress:  React.PropTypes.func.isRequired,
    category: React.PropTypes.string,
    language: React.PropTypes.string,
    count:    React.PropTypes.number
  },
  render: function() {
    let countStr = " | " + this.props.count;
    let style = {"borderColor": Sefaria.palette.categoryColor(this.props.category)};
    let heCategory = Sefaria.hebrewCategory(this.props.category);
    let content = this.props.language == "hebrew"?
      (<Text style={[styles.hebrewText, this.props.theme.text]}>{heCategory + countStr}</Text>) :
      (<Text style={[styles.englishText, this.props.theme.text]}>{this.props.category.toUpperCase() + countStr}</Text>);

    return (<TouchableOpacity
              style={[styles.readerNavCategory, this.props.theme.readerNavCategory, style]}
              onPress={this.props.onPress}>
              {content}
            </TouchableOpacity>);
  }
});


var LinkBook = React.createClass({
  propTypes: {
    theme:    React.PropTypes.object.isRequired,
    onPress:  React.PropTypes.func.isRequired,
    title:    React.PropTypes.string,
    heTitle:  React.PropTypes.string,
    language: React.PropTypes.string,
    count:    React.PropTypes.number
  },
  render: function() {
    let countStr = this.props.count == 0 ? "" : " (" + this.props.count + ")";
    let textStyle = this.props.count == 0 ? this.props.theme.verseNumber : this.props.theme.text;
    return (
      <TouchableOpacity
        style={[styles.textBlockLink, this.props.theme.textBlockLink]}
        onPress={this.props.onPress}>
        { this.props.language == "hebrew" ?
          <Text style={[styles.hebrewText, styles.centerText, textStyle]}>{this.props.heTitle + countStr}</Text> :
          <Text style={[styles.englishText, styles.centerText, textStyle]}>{this.props.title + countStr}</Text> }
      </TouchableOpacity>
    );
  }
});


var LinkContent = React.createClass({
  propTypes: {
    theme:             React.PropTypes.object.isRequired,
    settings:          React.PropTypes.object,
    openRef:           React.PropTypes.func.isRequired,
    refStr:            React.PropTypes.string,
    linkContentObj:    React.PropTypes.object, /* of the form {en,he} */
    textLanguage:      React.PropTypes.string,
    loading:           React.PropTypes.bool,
    isCommentaryBook:  React.PropTypes.bool
  },
  render: function() {
    var lco = this.props.linkContentObj;
    var lang = Sefaria.util.getTextLanguageWithContent(this.props.textLanguage,lco.en,lco.he);
    var textViews = [];

    var hebrewElem =  <Text style={[styles.hebrewText, styles.linkContentText, this.props.theme.text, {fontSize:this.props.settings.fontSize}]} key={this.props.refStr+"-he"}><HTMLView stylesheet={styles} value={lco.he}/></Text>;
    var englishElem = <Text style={[styles.englishText, styles.linkContentText, this.props.theme.text, {fontSize:0.8*this.props.settings.fontSize}]} key={this.props.refStr+"-en"}><HTMLView stylesheet={styles} value={"&#x200E;"+lco.en}/></Text>;
    if (lang == "bilingual") {
      textViews = [hebrewElem, englishElem];
    } else if (lang == "hebrew") {
      textViews = [hebrewElem];
    } else if (lang == "english") {
      textViews = [englishElem];
    }

    return (
      <TouchableOpacity style={[styles.searchTextResult, this.props.theme.searchTextResult]} onPress={()=>{this.props.openRef(this.props.refStr, this.props.linkContentObj.sectionRef)}}>
        {this.props.isCommentaryBook ? null : <Text style={[styles.en, styles.textListCitation, this.props.theme.textListCitation]}>{this.props.refStr}</Text>}
        {textViews}
      </TouchableOpacity>
    );
  }
});


var EmptyLinksMessage = React.createClass({
  propTypes: {
    theme:         React.PropTypes.object.isRequired,
    interfaceLang: React.PropTypes.string
  },
  render: function() {
    return (<Text style={[styles.emptyLinksMessage, this.props.theme.secondaryText]}>{strings.noConnectionsMessage}</Text>);
  }
});


module.exports = TextList;
