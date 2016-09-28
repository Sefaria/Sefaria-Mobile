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
var themeWhite  = require('./ThemeWhite');
var themeGrey   = require('./ThemeGrey');
var themeBlack  = require('./ThemeBlack');
var Sefaria     = require('./sefaria');
var ReaderPanel = require('./ReaderPanel');
var LinkFilter  = require('./LinkFilter');


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
            segmentIndexRef: -1,
            textReference: "",
            textTitle: "",
            loaded: false,
            menuOpen: "navigation",
            navigationCategories: [],
            loadingTextTail: false,
            textListVisible: false,
            data: null,
            interfaceLang: "english", // TODO check device settings for Hebrew: ### import {NativeModules} from 'react-native'; console.log(NativeModules.SettingsManager.settings.AppleLocale);
            filterIndex: null, /* index of filters in recentFilters */
            linkSummary: [],
            linkContents: [],
            linkRecentFilters: [],
            linkStaleRecentFilters: [], /*bool array indicating whether the corresponding filter in recentFilters is no longer synced up with the current segment*/
            loadingLinks: false,
            theme: themeWhite,
            themeStr: "white"
        };
    },
    componentDidMount: function () {
      Sefaria._deleteAllFiles().then(function() {

         }).catch(function(error) {
          console.error('Error caught from Sefaria._deleteAllFiles', error);
        });
    },
    textSegmentPressed: function(section, segment, shouldToggle) {
        console.log("textSegmentPressed",shouldToggle);
        if (!this.state.data[section][segment]) {
          console.log("data is UNDEFINED !!! oh noooooo!!!")
          return;
        }
        console.log(section, segment);
        let loadingLinks = false;
        if (segment !== this.state.segmentIndexRef) {
            loadingLinks = true;
            Sefaria.links.linkSummary(this.state.textReference,this.state.data[section][segment].links).then((data) => {
              this.setState({linkSummary:data,loadingLinks:false});
              this.updateLinkCat(data, null); // Set up `linkContents` in their initial state as an array of nulls
            });
        }
        let stateObj = {
            segmentIndexRef: segment,
            linkStaleRecentFilters: this.state.linkRecentFilters.map(()=>true),
            loadingLinks: loadingLinks
        };
        if (shouldToggle) {
          stateObj.textListVisible = !this.state.textListVisible;
          stateObj.offsetRef = null; //offsetRef is used to highlight. once you open textlist, you should remove the highlight
        }
        this.setState(stateObj);

    },
    /*isSegmentLevel is true when you loadNewText() is triggered by a link click or search item click that needs to jump to a certain ref*/
    loadNewText: function(ref, isSegmentLevel=false) {
        let segmentNum;
        let sectionRef = ref;
        if (isSegmentLevel === true) {
          let dashSplit = ref.split("-");
          segmentNum = dashSplit[0].split(":")[1];
          sectionRef = dashSplit[0].split(":")[0];
        }

        this.setState({
            loaded: false,
            data: [],
            textReference: sectionRef,
            textTitle: Sefaria.textTitleForRef(sectionRef)
        });
        Sefaria.data(ref).then(function(data) {
            var linkSummary = [];
            var loadingLinks = false;
            if (data.content && data.content.links) {
                loadingLinks = true;
                Sefaria.links.linkSummary(data.ref,data.content[this.state.segmentIndexRef].links).then(()=>
                  this.setState({linkSummary: linkSummary, loadingLinks: false})
                );
            }

            this.setState({
                data:              [data.content],
                textTitle:         data.indexTitle,
                next:              data.next,
                prev:              data.prev,
                heTitle:           data.heTitle,
                heRef:             data.heRef,
                sectionArray:      [data.ref],
                sectionHeArray:    [data.heRef],
                loaded:            true,
                filterIndex:       null, /*Reset link state */
                linkRecentFilters: [],
                linkSummary:       linkSummary,
                linkContents:      [],
                loadingLinks:      loadingLinks,
                textListVisible:   false,
                offsetRef:         segmentNum ? sectionRef + "_" + segmentNum : null
            });

            // Preload Text TOC data into memory
            Sefaria.textToc(data.indexTitle, function() {});
            Sefaria.saveRecentItem({ref: ref, heRef: data.heRef, category: Sefaria.categoryForRef(ref)});
        }.bind(this)).catch(function(error) {
          console.error('Error caught from ReaderApp.loadNewText', error);
        });

    },
    updateData: function(direction) {
        console.log("updating data -- " + direction);
        if (direction === "next") {
            this.updateDataNext();
        } else if (direction == "prev") {
            this.updateDataPrev();
        }
    },
    updateDataPrev: function() {
        this.setState({loadingTextTail: true});
        Sefaria.data(this.state.prev).then(function(data) {

          var updatedData = [data.content].concat(this.state.data);

          var newTitleArray = this.state.sectionArray;
          var newHeTitleArray = this.state.sectionHeArray;
          newTitleArray.unshift(data.sectionRef);
          newHeTitleArray.unshift(data.heRef);

          this.setState({
            data: updatedData,
            textReference: this.state.prev,
            prev: data.prev,
            sectionArray: newTitleArray,
            sectionHeArray: newHeTitleArray,
            loaded: true,
            loadingTextTail: false,
          });

        }.bind(this)).catch(function(error) {
          console.log('Error caught from ReaderApp.updateDataPrev', error);
        });
    },
    updateDataNext: function() {
        this.setState({loadingTextTail: true});
        Sefaria.data(this.state.next).then(function(data) {

          var updatedData = this.state.data.concat([data.content]);

          var newTitleArray = this.state.sectionArray;
          var newHeTitleArray = this.state.sectionHeArray;
          newTitleArray.push(data.sectionRef);
          newHeTitleArray.push(data.heRef);

          this.setState({
            data: updatedData,
            textReference: this.state.prev,
            next: data.next,
            sectionArray: newTitleArray,
            sectionHeArray: newHeTitleArray,
            loaded: true,
            loadingTextTail: false,
          });

        }.bind(this)).catch(function(error) {
          console.log('Error caught from ReaderApp.updateDataNext', error);
        });
    },
    updateTitle: function(ref, heRef) {
        console.log("updateTitle");
        this.setState({
          textReference: ref,
          heRef: heRef
        });
        Sefaria.saveRecentItem({ref: ref, heRef: heRef, category: Sefaria.categoryForRef(ref)});
    },
    openRef: function(ref, isSegmentLevel=false) {
        // Opens the text named by `ref`
        // `isSegmentLevel` - see explanation in loadNewText()
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

        this.loadNewText(ref, isSegmentLevel);
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
        //check if filter is already in recentFilters
        for (let i = 0; i < this.state.linkRecentFilters.length; i++) {
            let tempFilter = this.state.linkRecentFilters[i];
            if (tempFilter.title == filter.title) {
              filterIndex = i;
              if (this.state.linkStaleRecentFilters[i]) {
                this.state.linkRecentFilters[i] = filter;
                this.state.linkStaleRecentFilters[i] = false;
              }
              break;
            }
        }

        //if it's not in recentFilters, add it
        if (filterIndex == null) {
            this.state.linkRecentFilters.push(filter);
            if (this.state.linkRecentFilters.length > 5)
              this.state.linkRecentFilters.shift();
            filterIndex = this.state.linkRecentFilters.length-1;
        }

        var linkContents = filter.refList.map((ref)=>null);
        this.setState({
            filterIndex: filterIndex,
            recentFilters: this.state.linkRecentFilters,
            linkStaleRecentFilters: this.state.linkStaleRecentFilters,
            linkContents: linkContents
        });
    },
    closeLinkCat: function() {
      this.setState({filterIndex: null});
    },
    updateLinkCat: function(linkSummary, filterIndex) {
        //search for the current filter in the the links object
        if (this.state.filterIndex == null) return;
        if (linkSummary == null) linkSummary = this.state.linkSummary;
        if (filterIndex == null) filterIndex = this.state.filterIndex;

        var filterStr   = this.state.linkRecentFilters[filterIndex].title;
        var filterStrHe = this.state.linkRecentFilters[filterIndex].heTitle;
        var category    = this.state.linkRecentFilters[filterIndex].category;
        var nextRefList = [];

        for (let cat of linkSummary) {
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
        var nextFilter = new LinkFilter(filterStr, filterStrHe, nextRefList, category,);

        this.state.linkRecentFilters[filterIndex] = nextFilter;

        var linkContents = nextFilter.refList.map((ref)=>null);
        this.setState({
            filterIndex: filterIndex,
            linkRecentFilters: this.state.linkRecentFilters,
            linkContents: linkContents
        });
    },
    loadLinkContent: function(ref, pos) {
      // Loads text content for `ref` then inserts it into `this.state.linkContents[pos]`
      var isLinkCurrent = function(ref, pos) {
        // check that we haven't loaded a different link set in the mean time
        if (typeof this.state.linkRecentFilters[this.state.filterIndex] === "undefined") { return false;}
        var refList = this.state.linkRecentFilters[this.state.filterIndex].refList;
        if (pos > refList.length) { return false; }
        return (refList[pos] === ref);
      }.bind(this);
      var resolve = (data) => {
        if (isLinkCurrent(ref, pos)) {
            this.onLinkLoad(data, pos);
        }
      };
      var reject = (error) => {
        if (isLinkCurrent(ref, pos)) {
            this.onLinkLoad({en:JSON.stringify(error), he:JSON.stringify(error)}, pos);
        }
      };

      //here's the meat
      Sefaria.links.loadLinkData(ref).then(resolve).catch(reject);
    },
    onLinkLoad: function(data, pos) {
      this.state.linkContents[pos] = data;
      this.setState({linkContents: this.state.linkContents});
    },
    clearOffsetRef: function() {
      /* used after TextList has used the offsetRef to render initially*/
      this.setState({offsetRef:null});
    },
    setTheme: function(themeStr) {
      if (themeStr === "white") this.state.theme = themeWhite;
      else if (themeStr === "grey") this.state.theme = themeGrey;
      else if (themeStr === "black") this.state.theme = themeBlack;

      this.setState({theme: this.state.theme,themeStr: themeStr});
    },
    render: function () {
        return (
            <View style={[styles.container,this.state.theme.container]}>
                <StatusBar
                    barStyle="light-content" />
                <ReaderPanel
                    textReference={this.state.textReference}
                    textTitle={this.state.textTitle}
                    heTitle={this.state.heTitle}
                    heRef={this.state.heRef}
                    data={this.state.data}
                    next={this.state.next}
                    prev={this.state.prev}
                    sectionArray={this.state.sectionArray}
                    sectionHeArray={this.state.sectionHeArray}
                    offsetRef={this.state.offsetRef}
                    segmentIndexRef={this.state.segmentIndexRef}
                    textList={0}
                    menuOpen={this.state.menuOpen}
                    navigationCategories={this.state.navigationCategories}
                    style={styles.mainTextPanel}
                    updateData={this.updateData}
                    updateTitle={this.updateTitle}
                    textSegmentPressed={ this.textSegmentPressed }
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
                    loadLinkContent={this.loadLinkContent}
                    onLinkLoad={this.onLinkLoad}
                    filterIndex={this.state.filterIndex}
                    linkRecentFilters={this.state.linkRecentFilters}
                    linkSummary={this.state.linkSummary}
                    linkContents={this.state.linkContents}
                    loadingLinks={this.state.loadingLinks}
                    setTheme={this.setTheme}
                    theme={this.state.theme}
                    themeStr={this.state.themeStr}
                    Sefaria={Sefaria} />
            </View>
        );
    },
});

//this warning was really annoying me. There doesn't seem to be anything wrong with the code, so I'm ignoring it for now
console.ignoredYellowBox = ['Warning: Each child in an array or iterator should have a unique "key" prop.'];
AppRegistry.registerComponent('ReaderApp', () => ReaderApp);
