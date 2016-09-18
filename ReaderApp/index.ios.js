/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';
import React, { Component } from 'react';
import {
  AppRegistry,
	StyleSheet,
	ScrollView,
	Text,
	View,
	ListView,
	Modal,
	TextInput,
	TouchableOpacity,
	ActivityIndicatorIOS,
    StatusBar
} from 'react-native';

var styles  = require('./Styles.js');
var Sefaria = require('./sefaria');

var ReaderPanel = require('./ReaderPanel');

var {
  LoadingView,
  CategoryColorLine,
} = require('./Misc.js');

var ReaderApp = React.createClass({
    getInitialState: function () {
        Sefaria.init().then(function() {
            this.setState({loaded: true});
        }.bind(this));

        return {
            offsetRef: null, /* used to jump to specific ref when opening a link*/
            segmentIndexRef: 0,
            links: [],
            textReference: "",
            textTitle: "",
            loaded: false,
            menuOpen: "navigation",
            navigationCategories: [],
            loadingTextTail: false,
            textListVisible: false,
            data: null,
            interfaceLang: "english", // TODO check device settings for Hebrew: ### import {NativeModules} from 'react-native'; console.log(NativeModules.SettingsManager.settings.AppleLocale);
            filterIndex: null, /* index of filter in recentFilters */
            recentFilters: [],
            linkContents: [],
            theme: "white"
        };
    },
    componentDidMount: function () {
      Sefaria._deleteAllFiles().then(function() {

         }).catch(function(error) {
          console.error('Error caught from Sefaria_deleteAllFiles', error);
        });
    },
    TextSegmentPressed: function(section,segment,shouldToggle) {
        if (!this.state.data[section][segment]) {
          return;
        }
        var links = Sefaria.links.linkSummary(this.state.data[section][segment].links);
        console.log(section,segment)

        let stateObj = {segmentIndexRef: segment,links:links};
        if (shouldToggle) {
          stateObj.textListVisible = !this.state.textListVisible;
          stateObj.offsetRef = null; //offsetRef is used to highlight. once you open textlist, you should remove the highlight
        }


        this.setState(stateObj);
    },
    /*isSegmentLevel is true when you loadNewText() is triggered by a link click or search item click that needs to jump to a certain ref*/
    loadNewText: function(ref,isSegmentLevel=false) {
        let segmentNum;
        let sectionRef = ref;
        if (isSegmentLevel === true) {
          let dashSplit = ref.split("-");
          segmentNum = dashSplit[0].split(":")[1];
          sectionRef = dashSplit[0].split(":")[0];
        }

        this.setState({loaded: false, data: [], textReference: sectionRef});
        Sefaria.data(ref).then(function(data) {
            var links = [];
            if (data.content) {
                links = Sefaria.links.linkSummary(data.content[this.state.segmentIndexRef].links);
            }


            this.setState({
                data:            [data.content],
                links:           links,
                textTitle:       data.indexTitle,
                next:            data.next,
                prev:            data.prev,
                heTitle:         data.heTitle,
                heRef:           data.heRef,
                loaded:          true,
                filterIndex:     null, /*Reset link state */
                recentFilters:   [],
                linkContents:    [],
                textListVisible: false,
                offsetRef:       segmentNum ? sectionRef + "_" + segmentNum : null
            });

            // Preload Text TOC data into memory
            Sefaria.textToc(data.indexTitle, function() {});

            Sefaria.saveRecentItem({ref: ref, heRef: data.heRef, category: data.categories[0]});
        }.bind(this)).catch(function(error) {
          console.error('Error caught frome Sefaria.data', error);
        });

    },
    updateData: function(data, ref, next, prev) {
        //var links = Sefaria.links.linkSummary(data[this.state.segmentIndexRef].links);
        this.setState({
            data:            data,
            textReference:   ref,
            loaded:          true,
            loadingTextTail: false,
            next:            next,
            prev:            prev
        });
    },
    updateTitle: function(ref) {
        this.setState({
          textReference: ref
        });
    },
    /*  isSegmentLevel - see explanation in loadNewText()*/
    openRef: function(ref,isSegmentLevel=false) {
        let sectionRef = ref;
        if (isSegmentLevel === true) {
          sectionRef = ref.split(":")[0];
        }

        this.setState({
            loaded: false,
            textReference: sectionRef
        }, function() {
            this.closeMenu(); // Don't close until these values are in state, so we know if we need to load defualt text
        }.bind(this));

        this.loadNewText(ref,isSegmentLevel);
    },
    openMenu: function(menu) {
        this.setState({menuOpen: menu});
    },
    closeMenu: function() {
        this.clearMenuState();
        this.openMenu(null);
        if (!this.state.textReference) {
            this.openDefaultText();
        }
    },
    openNav: function() {
        this.openMenu("navigation");
    },
    setNavigationCategories: function(categories) {
        this.setState({navigationCategories: categories});
    },
    openTextToc: function() {
        this.openMenu("text toc");
    },
    openSearch: function(query) {
        this.openMenu("search");
    },
    clearMenuState: function() {
        this.setState({
            navigationCategories: []
        });
    },
    openDefaultText: function() {
        this.loadNewText("Genesis 1");
    },
    setLoadTextTail: function(setting) {
        this.setState({
            loadingTextTail: setting
        });
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
      if (links == null) links = this.state.links;
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
    /* used after TextList has used the offsetRef to render initially*/
    clearOffsetRef: function() {
      this.setState({offsetRef:null});
    },
    setTheme: function(theme) {

    },
    render: function () {
        return (
            <View style={styles.container}>
                <StatusBar
                    barStyle="light-content" />
                <ReaderPanel
                    textReference={this.state.textReference}
                    textTitle={this.state.textTitle}
                    heTitle={this.state.heTitle}
                    heRef={this.state.heRef}
                    data={this.state.data}
                    links={this.state.links}
                    next={this.state.next}
                    prev={this.state.prev}
                    offsetRef={this.state.offsetRef}
                    segmentIndexRef={this.state.segmentIndexRef}
                    textList={0}
                    menuOpen={this.state.menuOpen}
                    navigationCategories={this.state.navigationCategories}
                    style={styles.mainTextPanel}
                    updateData={this.updateData}
                    updateTitle={this.updateTitle}
                    TextSegmentPressed={ this.TextSegmentPressed }
                    openRef={ this.openRef }
                    interfaceLang={this.state.interfaceLang}
                    openMenu={this.openMenu}
                    closeMenu={this.closeMenu}
                    openNav={this.openNav}
                    setNavigationCategories={this.setNavigationCategories}
                    openTextToc={this.openTextToc}
                    openSearch={this.openSearch}
                    loadingTextTail={this.state.loadingTextTail}
                    setLoadTextTail={this.setLoadTextTail}
                    textListVisible={this.state.textListVisible}
                    loading={!this.state.loaded}
                    openLinkCat={this.openLinkCat}
                    closeLinkCat={this.closeLinkCat}
                    updateLinkCat={this.updateLinkCat}
                    onLinkLoad={this.onLinkLoad}
                    filterIndex={this.state.filterIndex}
                    recentFilters={this.state.recentFilters}
                    linkContents={this.state.linkContents}
                    setTheme={this.setTheme}
                    theme={this.state.theme}
                    Sefaria={Sefaria} />
            </View>
        );
    },
});

//this warning was really annoying me. There doesn't seem to be anything wrong with the code, so I'm ignoring it for now
console.ignoredYellowBox = ['Warning: Each child in an array or iterator should have a unique "key" prop.'];
AppRegistry.registerComponent('ReaderApp', () => ReaderApp);
