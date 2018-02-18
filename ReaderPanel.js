'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ListView,
  Modal,
} from 'react-native';
import {createResponder} from 'react-native-gesture-responder';

var ReaderDisplayOptionsMenu  = require('./ReaderDisplayOptionsMenu');
var ReaderNavigationMenu      = require('./ReaderNavigationMenu');
var ReaderTextTableOfContents = require('./ReaderTextTableOfContents');
var SearchPage                = require('./SearchPage');
var TextColumn                = require('./TextColumn');
var ConnectionsPanel          = require('./ConnectionsPanel');
var SettingsPage              = require('./SettingsPage');
var RecentPage                = require('./RecentPage');
var styles                    = require('./Styles.js');


var {
  MenuButton,
  DirectedButton,
  DisplaySettingsButton,
  LoadingView,
  CategoryColorLine,
  CategoryAttribution
} = require('./Misc.js');


class ReaderPanel extends React.Component {
  static propTypes = {
    menuOpen:              PropTypes.string,
    subMenuOpen:           PropTypes.string,
    openMenu:              PropTypes.func,
    openSubMenu:           PropTypes.func,
    segmentRef:            PropTypes.string,
    segmentIndexRef:       PropTypes.number,
    offsetRef:             PropTypes.string,
    data:                  PropTypes.array,
    textTitle:             PropTypes.string,
    heTitle:               PropTypes.string,
    heRef:                 PropTypes.string,
    openRef:               PropTypes.func.isRequired,
    openNav:               PropTypes.func.isRequired,
    openTextToc:           PropTypes.func.isRequired,
    openSettings:          PropTypes.func.isRequired,
    openRecent:            PropTypes.func.isRequired,
    interfaceLang:         PropTypes.oneOf(["english", "hebrew"]).isRequired,
    loading:               PropTypes.bool,
    defaultSettingsLoaded: PropTypes.bool,
    textListVisible:       PropTypes.bool,
    textListFlex:          PropTypes.number,
    onTextListDragStart:   PropTypes.func.isRequired,
    onTextListDragMove:    PropTypes.func.isRequired,
    onTextListDragEnd:     PropTypes.func.isRequired,
    setConnectionsMode:    PropTypes.func.isRequired,
    openFilter:            PropTypes.func.isRequired,
    closeLinkCat:          PropTypes.func.isRequired,
    updateLinkCat:         PropTypes.func.isRequired,
    updateVersionCat:      PropTypes.func.isRequired,
    loadLinkContent:       PropTypes.func.isRequired,
    loadVersionContent:    PropTypes.func.isRequired,
    loadNewVersion:        PropTypes.func.isRequired,
    connectionsMode:       PropTypes.string,
    filterIndex:           PropTypes.number,
    linkRecentFilters:     PropTypes.array,
    linkSummary:           PropTypes.array,
    linkContents:          PropTypes.array,
    versionContents:       PropTypes.array,
    loadingLinks:          PropTypes.bool,
    versionRecentFilters:  PropTypes.array.isRequired,
    versionFilterIndex:    PropTypes.number,
    currVersions:          PropTypes.object.isRequired,
    versions:              PropTypes.array.isRequired,
    setTheme:              PropTypes.func.isRequired,
    theme:                 PropTypes.object,
    themeStr:              PropTypes.oneOf(["white", "black"]),
    hasInternet:           PropTypes.bool,
    isQueryRunning:        PropTypes.bool,
    searchQuery:           PropTypes.string,
    searchSort:            PropTypes.string,
    searchIsExact:         PropTypes.bool,
    availableSearchFilters:PropTypes.array,
    appliedSearchFilters:  PropTypes.array,
    updateSearchFilter:    PropTypes.func,
    searchFiltersValid:    PropTypes.bool,
    isQueryLoadingTail:    PropTypes.bool,
    isNewSearch:           PropTypes.bool,
    numSearchResults:      PropTypes.number,
    searchQueryResult:     PropTypes.array,
    backStack:             PropTypes.array,
    goBack:                PropTypes.func.isRequired,
    onQueryChange:         PropTypes.func.isRequired,
    setLoadQueryTail:      PropTypes.func.isRequired,
    setIsNewSearch:        PropTypes.func.isRequired,
    search:                PropTypes.func.isRequired,
    setSearchOptions:      PropTypes.func.isRequired,
    clearAllSearchFilters: PropTypes.func.isRequired,
    Sefaria:               PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);
    Sefaria = props.Sefaria;

    this.state = {
      ReaderDisplayOptionsMenuVisible: false,
      settings: {},
    };
  }

  componentWillMount() {
    this.gestureResponder = createResponder({
      onStartShouldSetResponder: (evt, gestureState) => { return gestureState.pinch; },
      onStartShouldSetResponderCapture: (evt, gestureState) => { return gestureState.pinch; },
      onMoveShouldSetResponder: (evt, gestureState) => { return gestureState.pinch; },
      onMoveShouldSetResponderCapture: (evt, gestureState) => { return gestureState.pinch; },

      onResponderGrant: (evt, gestureState) => {},
      onResponderMove: (evt, gestureState) => {
        if (gestureState.pinch && gestureState.previousPinch) {
          this.pendingIncrement *= gestureState.pinch / gestureState.previousPinch
          if (!this.incrementTimer) {
            const numSegments = this.props.data.reduce((prevVal, elem) => prevVal + elem.length, 0);
            const timeout = Math.min(50 + Math.floor(numSegments/50)*25, 200); // range of timeout is [50,200] or in FPS [20,5]
            this.incrementTimer = setTimeout(() => {
              this.incrementFont(this.pendingIncrement);
              this.pendingIncrement = 1;
              this.incrementTimer = null;
            }, timeout);
          }
        }
      },
      onResponderTerminationRequest: (evt, gestureState) => true,
      onResponderRelease: (evt, gestureState) => {},
      onResponderTerminate: (evt, gestureState) => {},
      onResponderSingleTapConfirmed: (evt, gestureState) => {},
    });
  }

  pendingIncrement = 1;

  componentWillReceiveProps(nextProps) {
    if (!this.props.defaultSettingsLoaded && nextProps.defaultSettingsLoaded) {
      this.setDefaultSettings();
    }

    if (nextProps.defaultSettingsLoaded && !this.props.textTitle !== nextProps.textTitle) {
      this.setState({textLanguage: Sefaria.settings.textLanguage(nextProps.textTitle)});
    }

    // Should track pageview? TODO account for infinite
    if (this.props.menuOpen          !== nextProps.menuOpen          ||
        this.props.textTitle         !== nextProps.textTitle         ||
        this.props.textFlow          !== nextProps.textFlow          ||
        this.props.textLanguage      !== nextProps.textLanguage      ||
        this.props.textListVisible   !== nextProps.textListVisible   ||
        this.props.segmentIndexRef   !== nextProps.segmentIndexRef   ||
        this.props.segmentRef        !== nextProps.segmentRef        ||
        this.props.linkRecentFilters !== nextProps.linkRecentFilters ||
        this.props.themeStr          !== nextProps.themeStr) {
          this.trackPageview();
    }
  }

  setDefaultSettings = () => {
    // This function is called only after Sefaria.settings.init() has returned and signaled readiness by setting
    // the prop `defaultSettingsLoaded: true`. Necessary because ReaderPanel is rendered immediately with `loading:true`
    // so getInitialState() is called before settings have finished init().
    this.setState({
      textFlow: 'segmented',   // alternative is 'continuous'
      textLanguage: Sefaria.settings.textLanguage(this.props.textTitle),
      settings: {
        language:      Sefaria.settings.menuLanguage,
        fontSize:      Sefaria.settings.fontSize,
      }
    });
    // Theme settings is set in ReaderApp.
  };

  toggleReaderDisplayOptionsMenu = () => {
    if (this.state.ReaderDisplayOptionsMenuVisible == false) {
  	 this.setState({ReaderDisplayOptionsMenuVisible:  true})
  	} else {
  	 this.setState({ReaderDisplayOptionsMenuVisible:  false})}

     //console.log(this.state.ReaderDisplayOptionsMenuVisible);
    this.trackPageview();
  };

  toggleMenuLanguage = () => {
    // Toggle current menu language between english/hebrew only
    if (this.state.settings.language !== "hebrew") {
      this.state.settings.language = "hebrew";
    } else {
      this.state.settings.language = "english";
    }
    Sefaria.track.event("Reader","Change Language", this.state.settings.language);

    this.setState({settings: {...this.state.settings, language: this.state.settings.language }});
    Sefaria.settings.set("menuLanguage", this.state.settings.language);
  };

  setTextFlow = (textFlow) => {
    this.setState({textFlow: textFlow});

    if (textFlow == "continuous" && this.state.textLanguage == "bilingual") {
      this.setTextLanguage("hebrew");
    }
    this.toggleReaderDisplayOptionsMenu();
    Sefaria.track.event("Reader","Display Option Click","layout - " + textFlow);
  };

  setTextLanguage = (textLanguage) => {
    Sefaria.settings.textLanguage(this.props.textTitle, textLanguage);
    this.setState({textLanguage: textLanguage});
    // Sefaria.settings.set("textLanguage", textLanguage); // Makes every language change sticky
    if (textLanguage == "bilingual" && this.state.textFlow == "continuous") {
      this.setTextFlow("segmented");
    }
    this.toggleReaderDisplayOptionsMenu();
    Sefaria.track.event("Reader", "Display Option Click", "language - " + textLanguage);
  };

  incrementFont = (increment) => {
    if (increment == "larger") {
      var x = 1.1;
    } else if (increment == "smaller") {
      var x = .9;
    } else {
      var x = increment;
    }
    var updatedSettings = Sefaria.util.clone(this.state.settings);
    updatedSettings.fontSize *= x;
    updatedSettings.fontSize = updatedSettings.fontSize > 60 ? 60 : updatedSettings.fontSize; // Max size
    updatedSettings.fontSize = updatedSettings.fontSize < 18 ? 18 : updatedSettings.fontSize; // Min size
    updatedSettings.fontSize = parseFloat(updatedSettings.fontSize.toFixed(2));
    this.setState({settings: updatedSettings});
    Sefaria.settings.set("fontSize", updatedSettings.fontSize);
    Sefaria.track.event("Reader","Display Option Click","fontSize - " + increment);
  };

  setTheme = (themeStr) => {
    this.props.setTheme(themeStr);
    this.toggleReaderDisplayOptionsMenu();
  };

  /*
  send current page stats to analytics
  */
  trackPageview = () => {
    let pageType  = this.props.menuOpen || (this.props.textListVisible ? "TextAndConnections" : "Text");
    let numPanels = this.props.textListVisible ? '1.1' : '1';
    let ref       = this.props.segmentRef !== '' ? this.props.segmentRef : this.props.textReference;
    let bookName  = this.props.textTitle;
    let index     = Sefaria.index(this.props.textTitle);
    let cats      = index ? index.categories : undefined;
    let primCat   = cats && cats.length > 0 ? ((cats[0] === "Commentary") ?
        cats[1] + " Commentary" : cats[0]) : "";
    let secoCat   = cats ? ((cats[0] === "Commentary")?
        ((cats.length > 2) ? cats[2] : ""):
        ((cats.length > 1) ? cats[1] : "")) : "";
    let contLang  = this.state.settings.language;
    let sideBar   = this.props.linkRecentFilters.length > 0 ? this.props.linkRecentFilters.map(filt => filt.title).join('+') : 'all';
    let versTit   = ''; //we don't support this yet

    Sefaria.track.pageview(pageType,
      {'Panels Open': numPanels, 'Book Name': bookName, 'Ref': ref, 'Version Title': versTit, 'Page Type': pageType, 'Sidebars': sideBar},
      {1: primCat, 2: secoCat, 3: bookName, 5: contLang}
    );

  };

  render() {
    switch(this.props.menuOpen) {
      case (null):
        break;
      case ("navigation"):
        return (
          this.props.loading ?
          <LoadingView theme={this.props.theme} /> :
          <ReaderNavigationMenu
            categories={this.props.navigationCategories}
            setCategories={this.props.setNavigationCategories}
            openRef={(ref, versions)=>this.props.openRef(ref,"navigation", versions)}
            goBack={this.props.goBack}
            openNav={this.props.openNav}
            closeNav={this.props.closeMenu}
            openSearch={this.props.search}
            setIsNewSearch={this.props.setIsNewSearch}
            toggleLanguage={this.toggleMenuLanguage}
            settings={this.state.settings}
            openSettings={this.props.openSettings}
            openRecent={this.props.openRecent}
            interfaceLang={this.props.interfaceLang}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            Sefaria={Sefaria} />);
        break;
      case ("text toc"):
        return (
          <ReaderTextTableOfContents
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            title={this.props.textTitle}
            currentRef={this.props.textReference}
            currentHeRef={this.props.heRef}
            textLang={this.state.textLanguage == "hebrew" ? "hebrew" : "english"}
            contentLang={this.state.settings.language == "hebrew" ? "hebrew" : "english"}
            interfaceLang={this.props.interfaceLang}
            close={this.props.closeMenu}
            openRef={(ref)=>this.props.openRef(ref,"text toc")}
            toggleLanguage={this.toggleMenuLanguage}
            Sefaria={Sefaria} />);
        break;
      case ("search"):
        return(
          <SearchPage
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            settings={this.state.settings}
            interfaceLang={this.props.interfaceLang}
            subMenuOpen={this.props.subMenuOpen}
            openSubMenu={this.props.openSubMenu}
            hasInternet={this.props.hasInternet}
            openNav={this.props.openNav}
            closeNav={this.props.closeMenu}
            onQueryChange={this.props.onQueryChange}
            openRef={(ref)=>this.props.openRef(ref,"search")}
            setLoadTail={this.props.setLoadQueryTail}
            setIsNewSearch={this.props.setIsNewSearch}
            setSearchOptions={this.props.setSearchOptions}
            query={this.props.searchQuery}
            sort={this.props.searchSort}
            isExact={this.props.searchIsExact}
            availableFilters={this.props.availableSearchFilters}
            appliedFilters={this.props.appliedSearchFilters}
            updateFilter={this.props.updateSearchFilter}
            filtersValid={this.props.searchFiltersValid}
            loadingQuery={this.props.isQueryRunning}
            isNewSearch={this.props.isNewSearch}
            loadingTail={this.props.isQueryLoadingTail}
            initSearchListSize={this.props.initSearchListSize}
            initSearchScrollPos={this.props.initSearchScrollPos}
            setInitSearchScrollPos={this.props.setInitSearchScrollPos}
            clearAllFilters={this.props.clearAllSearchFilters}
            queryResult={this.props.searchQueryResult}
            numResults={this.props.numSearchResults} />);
        break;
      case ("settings"):
        return(
          <SettingsPage
            close={this.props.openNav}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            toggleMenuLanguage={this.toggleMenuLanguage}
            Sefaria={Sefaria} />);
        break;
      case ("recent"):
        return(
          <RecentPage
            close={this.props.openNav}
            theme={this.props.theme}
            themeStr={this.props.themeStr}
            toggleLanguage={this.toggleMenuLanguage}
            openRef={this.props.openRef}
            language={this.state.settings.language}
            Sefaria={Sefaria} />
        );
        break;
    }
    let textColumnFlex = this.props.textListVisible ? 1.0 - this.props.textListFlex : 1.0;
    return (
  		<View style={[styles.container, this.props.theme.container]} {...this.gestureResponder}>
          <CategoryColorLine category={Sefaria.categoryForTitle(this.props.textTitle)} />
          <ReaderControls
            theme={this.props.theme}
            title={this.state.textLanguage == "hebrew" ? this.props.heRef : this.props.textReference}
            language={this.state.textLanguage}
            categories={Sefaria.categoriesForTitle(this.props.textTitle)}
            openNav={this.props.openNav}
            themeStr={this.props.themeStr}
            goBack={this.props.goBack}
            openTextToc={this.props.openTextToc}
            backStack={this.props.backStack}
            toggleReaderDisplayOptionsMenu={this.toggleReaderDisplayOptionsMenu} />

          { this.props.loading ?
          <LoadingView theme={this.props.theme} style={{flex: textColumnFlex}}/> :
          <View style={[{flex: textColumnFlex}, styles.mainTextPanel, this.props.theme.mainTextPanel]}
                onStartShouldSetResponderCapture={() => {
                  if (this.state.ReaderDisplayOptionsMenuVisible == true) {
                     this.toggleReaderDisplayOptionsMenu();
                     return true;
                  }
                }}
          >
            <TextColumn
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              settings={this.state.settings}
              data={this.props.data}
              textReference={this.props.textReference}
              sectionArray={this.props.sectionArray}
              sectionHeArray={this.props.sectionHeArray}
              offsetRef={this.props.offsetRef}
              segmentRef={this.props.segmentRef}
              segmentIndexRef={this.props.segmentIndexRef}
              textFlow={this.state.textFlow}
              textLanguage={this.state.textLanguage}
              updateData={this.props.updateData}
              updateTitle={this.props.updateTitle}
              textTitle={this.props.textTitle}
              heTitle={this.props.heTitle}
              heRef={this.props.heRef}
              textSegmentPressed={ this.props.textSegmentPressed }
              textListVisible={this.props.textListVisible}
              next={this.props.next}
              prev={this.props.prev}
              linksLoaded={this.props.linksLoaded}
              loadingTextTail={this.props.loadingTextTail}
              loadingTextHead={this.props.loadingTextHead}
              setTextLanguage={this.setTextLanguage} />
          </View> }

          {this.props.textListVisible ?
            <View style={[{flex:this.props.textListFlex}, styles.mainTextPanel, this.props.theme.commentaryTextPanel]}
                onStartShouldSetResponderCapture={() => {
                  if (this.state.ReaderDisplayOptionsMenuVisible == true) {
                     this.toggleReaderDisplayOptionsMenu();
                     return true;
                  }
                }}
            >
              <ConnectionsPanel
                Sefaria={Sefaria}
                settings={this.state.settings}
                theme={this.props.theme}
                themeStr={this.props.themeStr}
                interfaceLang={this.props.interfaceLang}
                segmentRef={this.props.segmentRef}
                textFlow={this.state.textFlow}
                textLanguage={this.state.textLanguage}
                openRef={(ref, versions)=>this.props.openRef(ref,"text list", versions)}
                setConnectionsMode={this.props.setConnectionsMode}
                openFilter={this.props.openFilter}
                closeCat={this.props.closeLinkCat}
                updateLinkCat={this.props.updateLinkCat}
                updateVersionCat={this.props.updateVersionCat}
                loadLinkContent={this.props.loadLinkContent}
                loadVersionContent={this.props.loadVersionContent}
                linkSummary={this.props.linkSummary}
                linkContents={this.props.linkContents}
                versionContents={this.props.versionContents}
                loadNewVersion={this.props.loadNewVersion}
                loading={this.props.loadingLinks}
                connectionsMode={this.props.connectionsMode}
                filterIndex={this.props.filterIndex}
                recentFilters={this.props.linkRecentFilters}
                versionRecentFilters={this.props.versionRecentFilters}
                versionFilterIndex={this.props.versionFilterIndex}
                currVersions={this.props.currVersions}
                versions={this.props.versions}
                onDragStart={this.props.onTextListDragStart}
                onDragMove={this.props.onTextListDragMove}
                onDragEnd={this.props.onTextListDragEnd}
                textTitle={this.props.textTitle} />
            </View> : null}

            {this.state.ReaderDisplayOptionsMenuVisible ?
            (<ReaderDisplayOptionsMenu
              theme={this.props.theme}
              textFlow={this.state.textFlow}
              textReference={this.props.textReference}
              textLanguage={this.state.textLanguage}
              setTextFlow={this.setTextFlow}
              setTextLanguage={this.setTextLanguage}
              incrementFont={this.incrementFont}
              setTheme={this.setTheme}
              canBeContinuous={Sefaria.canBeContinuous(this.props.textTitle)}
              themeStr={this.props.themeStr}/>) : null }
      </View>);
  }
}

class ReaderControls extends React.Component {
  static propTypes = {
    theme:                           PropTypes.object,
    title:                           PropTypes.string,
    language:                        PropTypes.string,
    categories:                      PropTypes.array,
    openNav:                         PropTypes.func,
    openTextToc:                     PropTypes.func,
    goBack:                          PropTypes.func,
    themeStr:                        PropTypes.oneOf(["white", "black"]),
    toggleReaderDisplayOptionsMenu:  PropTypes.func,
    backStack:                       PropTypes.array,
  };

  render() {
    var langStyle = this.props.language === "hebrew" ? [styles.he, {marginTop: 4}] : [styles.en];
    var titleTextStyle = [langStyle, styles.headerTextTitleText, this.props.theme.text];
    if (this.props.backStack.length == 0) {
      var leftMenuButton = <MenuButton onPress={this.props.openNav} theme={this.props.theme} themeStr={this.props.themeStr}/>
    } else {
      var leftMenuButton =
        <DirectedButton
          onPress={this.props.goBack}
          themeStr={this.props.themeStr}
          imageStyle={[styles.menuButton, styles.directedButton]}
          language="english"
          direction="back"/>
    }
    return (
        <View style={[styles.header, this.props.theme.header]}>
          {leftMenuButton}
          <TouchableOpacity style={styles.headerTextTitle} onPress={this.props.openTextToc}>
            <View style={styles.headerTextTitleInner}>
              <Image source={this.props.themeStr == "white" ? require('./img/caret.png'): require('./img/caret-light.png') }
                       style={[styles.downCaret, this.props.language === "hebrew" ? null: {opacity: 0}]}
                       resizeMode={Image.resizeMode.contain} />
              <Text style={titleTextStyle} numberOfLines={1} ellipsizeMode={"tail"}>
                {this.props.title}
              </Text>
              <Image source={this.props.themeStr == "white" ? require('./img/caret.png'): require('./img/caret-light.png') }
                       style={[styles.downCaret, this.props.language === "hebrew" ? {opacity: 0} : null]}
                       resizeMode={Image.resizeMode.contain} />
            </View>
            <CategoryAttribution
              categories={this.props.categories}
              language={this.props.language === "hebrew" ? "hebrew" : "english"}
              context={"header"}
              linked={false} />
          </TouchableOpacity>
          <DisplaySettingsButton onPress={this.props.toggleReaderDisplayOptionsMenu} themeStr={this.props.themeStr}/>
        </View>
    );
  }
}

module.exports = ReaderPanel;
