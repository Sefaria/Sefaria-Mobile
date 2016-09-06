'use strict';

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ListView,
  Modal
} from 'react-native';

var ReaderDisplayOptionsMenu  = require('./ReaderDisplayOptionsMenu');
var ReaderNavigationMenu      = require('./ReaderNavigationMenu');
var ReaderTextTableOfContents = require('./ReaderTextTableOfContents');
var SearchPage                = require('./SearchPage');
var TextColumn                = require('./TextColumn');
var TextList                  = require('./TextList');
var styles                    = require('./Styles.js');

var {
  MenuButton,
  DisplaySettingsButton,
  LoadingView
} = require('./Misc.js');


var ReaderPanel = React.createClass({
  propTypes: {
    data:          React.PropTypes.array,
    links:         React.PropTypes.array,
    textTitle:     React.PropTypes.string,
    openRef:       React.PropTypes.func.isRequired,
    openNav:       React.PropTypes.func.isRequired,
    openTextToc:   React.PropTypes.func.isRequired,
    interfaceLang: React.PropTypes.string.isRequired,
    Sefaria:       React.PropTypes.object.isRequired
  },
  getInitialState: function () {
    Sefaria = this.props.Sefaria;
    return {
    	textFlow: this.props.textFlow || 'segmented', 	// alternative is 'continuous'
    	columnLanguage: this.props.columnLanguage || 'english', 	// alternative is 'hebrew' &  'bilingual'
      searchQuery: '',
      isQueryRunning: false,
      isQueryLoadingTail: false,
      isNewSearch: false,
      currSearchPage: 0,
      settings: {
        language:      "bilingual",
        layoutDefault: "segmented",
        layoutTalmud:  "continuous",
        layoutTanakh:  "segmented",
        color:         "light",
        fontSize:      62.5,
      },
      filterIndex: null, /* index of filter in recentFilters */
      recentFilters: [],
      linkContents: [],
      ReaderDisplayOptionsMenuVisible: false

    };
  },
  openReaderDisplayOptionsMenu: function () {
    if (this.state.ReaderDisplayOptionsMenuVisible == false) {
  	 this.setState({ReaderDisplayOptionsMenuVisible:  true})
  	} else {
  	 this.setState({ReaderDisplayOptionsMenuVisible:  false})}

      console.log(this.state.ReaderDisplayOptionsMenuVisible);
  },
  onQueryChange: function(query,resetQuery) {
    var newSearchPage = 0;
    if (!resetQuery)
      newSearchPage = this.state.currSearchPage+1;


    //var req = JSON.stringify(Sefaria.search.get_query_object(query,false,[],20,20*newSearchPage,"text"));

    var query_props = {
      query: query,
      size: 20,
      from: 20*newSearchPage,
      type: "text",
      get_filters: false,
      applied_filters: []
    }
    Sefaria.search.execute_query(query_props)
    .then((responseJson) => {
      var resultArray = resetQuery ? responseJson["hits"]["hits"] : this.state.searchQueryResult.concat(responseJson["hits"]["hits"]);
      //console.log("resultArray",resultArray);
      var numResults = responseJson["hits"]["total"]
      this.setState({isQueryLoadingTail: false, isQueryRunning: false, searchQueryResult:resultArray, numSearchResults: numResults});
    })
    .catch((error) => {
      console.log(error);
      //TODO: add hasError boolean to state
      this.setState({isQueryLoadingTail: false, isQueryRunning: false, searchQueryResult:[], numSearchResults: 0});
    });

    this.setState({searchQuery:query, currSearchPage: newSearchPage, isQueryRunning: true});
  },
  setLoadQueryTail: function(isLoading) {
    this.setState({isQueryLoadingTail: isLoading});
    if (isLoading) {
      this.onQueryChange(this.state.searchQuery,false);
    }
  },
  setIsNewSearch: function(isNewSearch) {
    this.setState({isNewSearch: isNewSearch});
  },
  search: function(query) {
    this.onQueryChange(query,true);
    this.props.openSearch();
  },
  openLinkCat: function(filter) {
    var filterIndex = null;
    for (let i = 0; i < this.state.recentFilters.length; i++) {
      let tempFilter = this.state.recentFilters[i];
      if (tempFilter.title == filter.title) {
        filterIndex = i;
        break;
      }
    }

    if (filterIndex == null) {
      this.state.recentFilters.push(filter);
      if (this.state.recentFilters.length > 5)
        this.state.recentFilters.shift();
      filterIndex = this.state.recentFilters.length-1;
    }


    var linkContents = filter.refList.map((ref)=>null);
    this.setState({filterIndex:filterIndex,recentFilters:this.state.recentFilters,linkContents:linkContents});
  },
  closeLinkCat: function() {
    this.setState({filterIndex:null});
  },
  updateLinkCat: function(links,filterIndex) {
    //search for the current filter in the the links object
    if (this.state.filterIndex == null) return;
    if (links == null) links = this.props.links;
    if (filterIndex == null) filterIndex = this.state.filterIndex;

    var filterStr = this.state.recentFilters[filterIndex].title;
    var filterStrHe = this.state.recentFilters[filterIndex].heTitle;
    var category = this.state.recentFilters[filterIndex].category;
    var nextRefList = [];



    for (let cat of links) {
      if (cat.category == filterStr) {
        nextRefList = cat.refList;
        break;
      }
      for (let book of cat.books) {
        if (book.title == filterStr) {
          nextRefList = book.refList;
          break;
        }
      }
    }
    var nextFilter = {title:filterStr,heTitle:filterStrHe,refList:nextRefList,category:category};

    this.state.recentFilters[filterIndex] = nextFilter;

    var linkContents = nextFilter.refList.map((ref)=>null);
    this.setState({filterIndex:filterIndex,recentFilters:this.state.recentFilters,linkContents:linkContents});

  },
  onLinkLoad: function(data,pos) {
    this.state.linkContents[pos] = data;
    this.setState({linkContents:this.state.linkContents});
  },
  toggleLanguage: function() {
    // Toggle current display language between english/hebrew only
    if (this.state.settings.language !== "hebrew") {
      this.state.settings.language = "hebrew";
    } else {
      this.state.settings.language = "english";
    }
    this.setState({settings: this.state.settings});
  },
  setTextFlow: function(textFlow) {
    this.setState({textFlow: textFlow});

    if (textFlow == "continuous" && this.state.columnLanguage == "bilingual") {
      this.setColumnLanguage("hebrew");
    }
  },
  setColumnLanguage: function(columnLanguage) {
    this.setState({columnLanguage: columnLanguage});
    if (columnLanguage == "bilingual" && this.state.textFlow == "continuous") {
      this.setTextFlow("segmented");
    }
  },
  render: function() {

    switch(this.props.menuOpen) {
      case (null):
        break;
      case ("navigation"):
        return (
          <ReaderNavigationMenu
            categories={this.props.navigationCategories}
            setCategories={this.props.setNavigationCategories}
            openRef={this.props.openRef}
            openNav={this.props.openNav}
            closeNav={this.props.closeMenu}
            openSearch={this.search}
            setIsNewSearch={this.setIsNewSearch}
            toggleLanguage={this.toggleLanguage}
            settings={this.state.settings}
            interfaceLang={this.props.interfaceLang}
            Sefaria={Sefaria} />);
        break;
      case ("text toc"):
        return (
          <ReaderTextTableOfContents
            title={this.props.textTitle}
            contentLang={this.state.settings.language == "hebrew" ? "hebrew" : "english"}
            interfaceLang={this.props.interfaceLang}
            close={this.props.closeMenu}
            openRef={this.props.openRef}
            toggleLanguage={this.toggleLanguage}
            Sefaria={Sefaria} />);
        break;
      case ("search"):
        return(
          <SearchPage
            closeNav={this.props.closeMenu}
            onQueryChange={this.onQueryChange}
            openRef={this.props.openRef}
            setLoadTail={this.setLoadQueryTail}
            setIsNewSearch={this.setIsNewSearch}
            query={this.state.searchQuery}
            loadingQuery={this.state.isQueryRunning}
            isNewSearch={this.state.isNewSearch}
            loadingTail={this.state.isQueryLoadingTail}
            queryResult={this.state.searchQueryResult}
            numResults={this.state.numSearchResults} />);
        break;
    }

    return (
  		<View style={styles.container}>
          <ReaderControls
            textReference={this.props.textReference}
            openNav={this.props.openNav}
            openTextToc={this.props.openTextToc}
            openReaderDisplayOptionsMenu={this.openReaderDisplayOptionsMenu} />

          <View style={styles.mainTextPanel}>
            <TextColumn
              data={this.props.data}
              textReference={this.props.textReference}
              segmentRef={this.props.segmentRef}
              textFlow={this.state.textFlow}
              columnLanguage={this.state.columnLanguage}
              updateData={this.props.updateData}
              updateTitle={this.props.updateTitle}
              TextSegmentPressed={ this.props.TextSegmentPressed }
              textListVisible={this.props.textListVisible}
              next={this.props.next}
              prev={this.props.prev}
              loadingTextTail={this.props.loadingTextTail}
              setLoadTextTail={this.props.setLoadTextTail} />
          </View>

          {this.state.ReaderDisplayOptionsMenuVisible ?
          (<ReaderDisplayOptionsMenu
            textFlow={this.state.textFlow}
            textReference={this.props.textReference}
            columnLanguage={this.state.columnLanguage}
            ReaderDisplayOptionsMenuVisible={this.state.ReaderDisplayOptionsMenuVisible}
            setTextFlow={this.setTextFlow}
            setColumnLanguage={this.setColumnLanguage}/>) : null }

          {this.props.textListVisible ?
            <View style={styles.commentaryTextPanel}>
              <TextList
                Sefaria={Sefaria}
                links={this.props.links}
                segmentRef={this.props.segmentRef}
                textFlow={this.state.textFlow}
                columnLanguage={this.state.columnLanguage}
                openRef={ this.props.openRef }
                openCat={this.openLinkCat}
                closeCat={this.closeLinkCat}
                updateCat={this.updateLinkCat}
                onLinkLoad={this.onLinkLoad}
                linkContents={this.state.linkContents}
                filterIndex={this.state.filterIndex}
                recentFilters={this.state.recentFilters} />
            </View>
          : null}
        </View>);
  }
});


var ReaderControls = React.createClass({
  propTypes: {
    textReference:                 React.PropTypes.string,
    openNav:                       React.PropTypes.func,
    openTextToc:                   React.PropTypes.func,
    openReaderDisplayOptionsMenu:  React.PropTypes.func,
  },
  render: function() {
    return (
        <View style={styles.header}>
          <MenuButton onPress={this.props.openNav} />
          <TouchableOpacity style={styles.headerTextTitle} onPress={this.props.openTextToc}>
            <Text>
              {this.props.textReference}
            </Text>
          </TouchableOpacity>
          <DisplaySettingsButton onPress={this.props.openReaderDisplayOptionsMenu} />
        </View>
    );
  }
});

module.exports = ReaderPanel;
