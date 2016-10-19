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
const styles         = require('./Styles.js');
const HTMLView       = require('react-native-htmlview');
const TextListHeader = require('./TextListHeader');
const ViewPort = Dimensions.get('window');
const LinkFilter = require('./LinkFilter');

const {
  CategoryColorLine,
  TwoBox
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
    columnLanguage:  React.PropTypes.oneOf(["english","hebrew","bilingual"])
  },
  getInitialState: function() {
    Sefaria = this.props.Sefaria; //Is this bad practice to use getInitialState() as an init function
    return {
      dataSource: new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2}),
      isNewSegment: false
    };
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
  renderRow: function(linkContentObj, sectionId, rowId) {
    var ref = this.props.recentFilters[this.props.filterIndex].refList[rowId];
    var loading = false;
    if (linkContentObj == null) {
      loading = true;
      this.props.loadLinkContent(ref, rowId);
      linkContentObj = {en: "Loading...", he: "טוען..."};
    }

    return (<LinkContent
              theme={this.props.theme}
              settings={this.props.settings}
              openRef={this.props.openRef}
              refStr={ref}
              linkContentObj={linkContentObj}
              columnLanguage={this.props.columnLanguage}
              loading={loading}
              key={rowId} />);
  },
  render: function() {
    var isSummaryMode = this.props.filterIndex == null;
    if (isSummaryMode) {

      var viewList = [];
      this.props.linkSummary.map((cat)=>{
        let heCategory = Sefaria.hebrewCategory(this.props.category);
        let filter = new LinkFilter(cat.category,heCategory,cat.refList,cat.category);
        viewList.push(
          <LinkCategory
            theme={this.props.theme}
            category={cat.category}
            refList={cat.refList}
            count={cat.count}
            language={this.props.settings.language}
            onPress={this.props.openCat.bind(null,filter)}
            key={cat.category} />);
        var innerViewList = cat.books.map((obook)=>{
          let filter = new LinkFilter(obook.title,obook.heTitle,obook.refList,cat.category);
          return (
          <LinkBook
            theme={this.props.theme}
            title={obook.title}
            heTitle={obook.heTitle}
            count={obook.count}
            language={this.props.settings.language}
            onPress={this.props.openCat.bind(null,filter)}
            key={obook.title} />);
        });
        viewList.push(<TwoBox content={innerViewList} key={cat.category+"-container"} />);

      });
    } else {
      var dataSourceRows = this.state.dataSource.cloneWithRows(this.props.linkContents);
    }

    if (isSummaryMode) {
      if (this.props.loading) {
        var content = <Text>Loading...</Text>;
      } else {
        var content = (<ScrollView style={styles.textListSummaryScrollView}>{viewList}</ScrollView>);
      }
      return <View style={[styles.textListSummary, this.props.theme.textListSummary]}>{content}</View>;

    } else if (!this.state.isNewSegment){
      return (
      <View style={[styles.textListContentOuter, this.props.theme.textListContentOuter]}>
        <TextListHeader
          Sefaria={Sefaria}
          theme={this.props.theme}
          updateCat={this.props.updateCat}
          closeCat={this.props.closeCat}
          category={this.props.recentFilters[this.props.filterIndex].category}
          filterIndex={this.props.filterIndex}
          recentFilters={this.props.recentFilters}
          columnLanguage={this.props.columnLanguage} />
        {this.props.linkContents.length == 0 ?
          <View style={styles.noLinks}><EmptyLinksMessage theme={this.props.theme} /></View> :
          <ListView style={styles.textListContentListView}
            dataSource={dataSourceRows}
            renderRow={this.renderRow}
            /*scrollRenderAheadDistance={500}*/ />
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
      (<Text style={[styles.he, this.props.theme.text]}>{heCategory + countStr}</Text>) :
      (<Text style={[styles.en, this.props.theme.text]}>{this.props.category.toUpperCase() + countStr}</Text>);

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
        style={[styles.textBlockLink,this.props.theme.textBlockLink]}
        onPress={this.props.onPress}>
        { this.props.language == "hebrew" ?
          <Text style={[styles.he, styles.centerText, textStyle]}>{this.props.heTitle + countStr}</Text> :
          <Text style={[styles.en, styles.centerText, textStyle]}>{this.props.title + countStr}</Text> }
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
    columnLanguage:    React.PropTypes.string,
    loading:           React.PropTypes.bool
  },
  render: function() {
    var lco = this.props.linkContentObj;
    var lang = Sefaria.util.getColumnLanguageWithContent(this.props.columnLanguage,lco.en,lco.he);
    var textViews = [];

    var hebrewElem =  <Text style={[styles.hebrewText, this.props.theme.text, {fontSize:this.props.settings.fontSize}]} key={this.props.refStr+"-he"}><HTMLView stylesheet={styles} value={lco.he}/></Text>;
    var englishElem = <Text style={[styles.englishText, this.props.theme.text, {fontSize:0.8*this.props.settings.fontSize}]} key={this.props.refStr+"-en"}><HTMLView stylesheet={styles} value={lco.en}/></Text>;
    if (lang == "bilingual") {
      textViews = [hebrewElem,englishElem];
    } else if (lang == "hebrew") {
      textViews = [hebrewElem];
    } else if (lang == "english") {
      textViews = [englishElem];
    }

    return (
      <TouchableOpacity style={[styles.searchTextResult, this.props.theme.searchTextResult]} onPress={()=>{this.props.openRef(this.props.refStr, true)}}>
        <Text style={[styles.en, this.props.theme.textListCitation]}>{this.props.refStr}</Text>
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
    // TODO hebrew interface language
    return (<Text style={[styles.emptyLinksMessage, this.props.theme.text]}>No connections available.</Text>);
  }
});


module.exports = TextList;
