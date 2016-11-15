/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';

import React, { Component } from 'react';
import {
  ActivityIndicatorIOS,
  Animated,
  AppRegistry,
  Dimensions,
	ListView,
	Modal,
  NetInfo,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

var styles      = require('./Styles.js');
var themeWhite  = require('./ThemeWhite');
var themeBlack  = require('./ThemeBlack');
var Sefaria     = require('./sefaria');
var ReaderPanel = require('./ReaderPanel');
var LinkFilter  = require('./LinkFilter');
const ViewPort  = Dimensions.get('window');

var {
  LoadingView,
  CategoryColorLine,
} = require('./Misc.js');


var ReaderApp = React.createClass({
    getInitialState: function () {
        Sefaria.init().then(function() {
            this.setState({loaded: true});
        }.bind(this));
//        Sefaria.track.init();
        NetInfo.isConnected.addEventListener(
          'change',
          this.networkChangeListener
        );
        return {
            offsetRef: null, /* used to jump to specific ref when opening a link*/
            segmentRef: "", /* only used for highlighting right now */
            segmentIndexRef: -1,
            textReference: "",
            textTitle: "",
            loaded: false,
            menuOpen: "navigation",
            navigationCategories: [],
            loadingTextTail: false,
            loadingTextHead: false,
            textListVisible: false,
            textListFlex: 0.6,
            textListAnimating: false,
            data: null,
            interfaceLang: "english", // TODO check device settings for Hebrew: ### import {NativeModules} from 'react-native'; console.log(NativeModules.SettingsManager.settings.AppleLocale);
            filterIndex: null, /* index of filters in recentFilters */
            linkSummary: [],
            linkContents: [],
            linkRecentFilters: [],
            linkStaleRecentFilters: [], /*bool array indicating whether the corresponding filter in recentFilters is no longer synced up with the current segment*/
            loadingLinks: false,
            loadingApiLinks: false,
            theme: themeWhite,
            themeStr: "white"
        };
    },
    componentDidMount: function () {
      Sefaria._deleteUnzippedFiles().then(function() {

         }).catch(function(error) {
          console.error('Error caught from Sefaria._deleteAllFiles', error);
        });
    },
    networkChangeListener: function (isConnected) {
      this.setState({hasInternet: isConnected});
    },
    textSegmentPressed: function(section, segment, segmentRef, shouldToggle) {
        //console.log("textSegmentPressed", section, segment, segmentRef, shouldToggle);
        if (shouldToggle && this.state.textListVisible) {
            this.setState({textListVisible: false});
            return; // Don't bother with other changes if we are simply closing the TextList
        }
        if (!this.state.data[section][segment]) {
          return;
        }
        let loadingLinks = false;
        if (segment !== this.state.segmentIndexRef) {
            loadingLinks = true;
            Sefaria.links.linkSummary(this.state.textReference, this.state.data[section][segment].links).then((data) => {
              this.setState({linkSummary: data, loadingLinks: false});
              this.updateLinkCat(data, null); // Set up `linkContents` in their initial state as an array of nulls
            });
        }
        let stateObj = {
            segmentRef: segmentRef,
            segmentIndexRef: segment,
            linkStaleRecentFilters: this.state.linkRecentFilters.map(()=>true),
            loadingLinks: loadingLinks
        };
        if (shouldToggle) {
          stateObj.textListVisible = !this.state.textListVisible;
          stateObj.offsetRef = null; //offsetRef is used to highlight. once you open textlist, you should remove the highlight
        }
        this.setState(stateObj);
        this.forceUpdate();
    },

    loadNewText: function(ref) {
        this.setState({
            loaded: false,
            data: [],
            textReference: ref,
            textTitle: Sefaria.textTitleForRef(ref),
            segmentIndexRef: -1,
        });

        if (ref.indexOf("-") != -1) {
          // Open ranged refs to their first segment (not ideal behavior, but good enough for now)
          ref = ref.split("-")[0];
        }

        Sefaria.data(ref).then(function(data) {
            var linkSummary = [];
            var loadingLinks = false;
            /*TODO these lines of code seem useless. I'll keep them here for a bit and see if it causes any issues (-Noah Nov 14, 2016) NOTE: If you are reading this (long) comment many months after this date, feel free to delete this useless code. Good luck!
            if (data.content && data.content.links) {
                console.log("HERE");
                loadingLinks = true;
                Sefaria.links.linkSummary(data.ref, data.content[this.state.segmentIndexRef].links).then(()=>
                  this.setState({linkSummary: linkSummary, loadingLinks: false})
                );
            }*/

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
                offsetRef:         !data.isSectionLevel ? data.requestedRef : null,
            });
            Sefaria.links.reset();
            // Preload Text TOC data into memory
            Sefaria.textToc(data.indexTitle, function() {});
            Sefaria.saveRecentItem({ref: ref, heRef: data.heRef, category: Sefaria.categoryForRef(ref)});
        }.bind(this)).catch(function(error) {
          console.error('Error caught from ReaderApp.loadNewText', error);
        });

    },
    updateData: function(direction) {
        //console.log("updating data -- " + direction);
        if (direction === "next" && this.state.next) {
            this.updateDataNext();
        } else if (direction == "prev" && this.state.prev) {
            this.updateDataPrev();
        }
    },
    updateDataPrev: function() {
        this.setState({loadingTextHead: true});
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
            loadingTextHead: false,
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
            textReference: this.state.next,
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
        //console.log("updateTitle");
        this.setState({
          textReference: ref,
          heRef: heRef
        });
        Sefaria.saveRecentItem({ref: ref, heRef: heRef, category: Sefaria.categoryForRef(ref)});
    },
    openRef: function(ref) {
        this.setState({
          loaded: false,
          textReference: ref
        }, function() {
            this.closeMenu(); // Don't close until these values are in state, so we know if we need to load defualt text
        }.bind(this));

        this.loadNewText(ref);
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
            this.state.linkRecentFilters.unshift(filter);
            if (this.state.linkRecentFilters.length > 5)
              this.state.linkRecentFilters.pop();
            filterIndex = 0;
        }

        var linkContents = filter.refList.map((ref)=>null);
        Sefaria.links.reset();
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
        var nextFilter = new LinkFilter(filterStr, filterStrHe, nextRefList, category);

        this.state.linkRecentFilters[filterIndex] = nextFilter;

        var linkContents = nextFilter.refList.map((ref)=>null);
        Sefaria.links.reset();
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
            this.onLinkLoad(pos, data);
        }
      };
      var reject = (error) => {
        if (error != 'inQueue') {
          if (isLinkCurrent(ref, pos)) {
              this.onLinkLoad(pos, {en:JSON.stringify(error), he:JSON.stringify(error), sectionRef: ""});
          }
        }
      };

      var resolveClosure = function(ref, pos, data) {
        resolve(data);
      }.bind(this,ref,pos);

      var rejectClosure = function(ref, pos, data) {
        reject(data);
      }.bind(this,ref,pos);

      Sefaria.links.loadLinkData(ref, pos, resolveClosure, rejectClosure).then(resolve).catch(reject);
    },
    onLinkLoad: function(pos, data) {
      this.state.linkContents[pos] = data;
      this.setState({linkContents: this.state.linkContents});
    },
    clearOffsetRef: function() {
      /* used after TextList has used the offsetRef to render initially*/
      this.setState({offsetRef:null});
    },
    setTheme: function(themeStr) {
      if (themeStr === "white") this.state.theme = themeWhite;
      else if (themeStr === "black") this.state.theme = themeBlack;

      this.setState({theme: this.state.theme,themeStr: themeStr});
    },
    onTextListDragStart: function(evt) {
      console.log("STARTTTT");
      return !this.state.textListAnimating;
    },
    onTextListDragMove: function(evt) {
      if (this.state.textListAnimating) return;

      let headerHeight = 75;
      let flex = 1.0 - (evt.nativeEvent.pageY-headerHeight)/(ViewPort.height-headerHeight);

      var onTextListAnimate = function(animVal,value) {
        //console.log("updating animation");
        this.setState({textListFlex:value.value});
        if (value.value > 0.999 || value.value < 0.001) {
          animVal.stopAnimation();
          let tempState = {textListAnimating:false,textListFlex: value.value > 0.999 ? 0.9999 : 0.3}; //important. if closing textlist, make sure to set the final flex to something visible
          if (value.value < 0.001)
            tempState.textListVisible = false;
          this.setState(tempState);
        }
      };

      if (flex > 0.9 || flex < 0.2) {
        this.setState({textListAnimating:true});
        let animVal = new Animated.Value(flex);
        animVal.addListener(onTextListAnimate.bind(this,animVal));
        Animated.timing(
          animVal,
          {toValue: flex > 0.9 ? 0.9999 : 0.0001}
        ).start();
        //console.log("STOPPP");
        return;
      }
      //console.log("moving!",evt.nativeEvent.pageY,ViewPort.height,flex);
      this.setState({textListFlex:flex});
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
                    segmentRef={this.state.segmentRef}
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
                    loadingTextHead={this.state.loadingTextHead}
                    textListVisible={this.state.textListVisible}
                    textListFlex={this.state.textListFlex}
                    onTextListDragStart={this.onTextListDragStart}
                    onTextListDragMove={this.onTextListDragMove}
                    loading={!this.state.loaded}
                    openLinkCat={this.openLinkCat}
                    closeLinkCat={this.closeLinkCat}
                    updateLinkCat={this.updateLinkCat}
                    loadLinkContent={this.loadLinkContent}
                    filterIndex={this.state.filterIndex}
                    linkRecentFilters={this.state.linkRecentFilters}
                    linkSummary={this.state.linkSummary}
                    linkContents={this.state.linkContents}
                    loadingLinks={this.state.loadingLinks}
                    setTheme={this.setTheme}
                    theme={this.state.theme}
                    themeStr={this.state.themeStr}
                    hasInternet={this.state.hasInternet}
                    Sefaria={Sefaria} />
            </View>
        );
    },
});

//this warning was really annoying me. There doesn't seem to be anything wrong with the code, so I'm ignoring it for now
console.ignoredYellowBox = ['Warning: Each child in an array or iterator should have a unique "key" prop.'];
AppRegistry.registerComponent('ReaderApp', () => ReaderApp);
