'use strict';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import styles from './Styles';
import strings from './LocalizedStrings';
import ConnectionsPanelHeader from './ConnectionsPanelHeader';
import TextList from './TextList';
import { LinkFilter } from './Filter';
import VersionsBox from './VersionsBox';
import AboutBox from './AboutBox';

const {
  CategoryColorLine,
  LoadingView,
  LibraryNavButton,
} = require('./Misc.js');

class ConnectionsPanel extends React.Component {
  static propTypes = {
    textToc:              PropTypes.object,
    theme:                PropTypes.object.isRequired,
    themeStr:             PropTypes.oneOf(["white", "black"]).isRequired,
    interfaceLang:        PropTypes.oneOf(["english", "hebrew"]).isRequired,
    menuLanguage:         PropTypes.oneOf(["english", "hebrew"]).isRequired,
    fontSize:             PropTypes.number.isRequired,
    openRef:              PropTypes.func.isRequired,
    setConnectionsMode:   PropTypes.func.isRequired,
    openFilter:           PropTypes.func.isRequired,
    closeCat:             PropTypes.func.isRequired,
    updateLinkCat:        PropTypes.func.isRequired,
    updateVersionCat:     PropTypes.func.isRequired,
    loadLinkContent:      PropTypes.func.isRequired,
    loadVersionContent:   PropTypes.func.isRequired,
    linkSummary:          PropTypes.array,
    linkContents:         PropTypes.array,
    versionContents:      PropTypes.array,
    loading:              PropTypes.bool,
    segmentRef:           PropTypes.string.isRequired,
    heSegmentRef:         PropTypes.string.isRequired,
    connectionsMode:      PropTypes.string,
    filterIndex:          PropTypes.number,
    recentFilters:        PropTypes.array.isRequired, /* of the form [{title,heTitle,refList}...] */
    versionRecentFilters: PropTypes.array.isRequired,
    versionFilterIndex:   PropTypes.number,
    currVersions:         PropTypes.object.isRequired,
    versions:             PropTypes.array.isRequired,
    versionsApiError:     PropTypes.bool.isRequired,
    textLanguage:         PropTypes.oneOf(["english","hebrew","bilingual"]),
    onDragStart:          PropTypes.func.isRequired,
    onDragMove:           PropTypes.func.isRequired,
    onDragEnd:            PropTypes.func.isRequired,
    textTitle:            PropTypes.string.isRequired,
    categories:           PropTypes.array.isRequired,
    openUri:              PropTypes.func.isRequired,
    textListFlex:         PropTypes.number.isRequired,
    onStartShouldSetResponderCapture: PropTypes.func.isRequired,
  };

  render() {
    let recentFilters, filterIndex, listContents, loadContent, updateCat;
    switch (this.props.connectionsMode) {
      case 'filter':
        recentFilters = this.props.recentFilters;
        filterIndex = this.props.filterIndex;
        listContents = this.props.linkContents;
        loadContent = this.props.loadLinkContent;
        updateCat    = this.props.updateLinkCat;
        break;
      case 'version open':
        recentFilters = this.props.versionRecentFilters;
        filterIndex = this.props.versionFilterIndex;
        listContents = this.props.versionContents;
        loadContent = this.props.loadVersionContent;
        updateCat    = this.props.updateVersionCat;
        break;
    }
    const connectionsPanelHeader = (
      <View
        onStartShouldSetResponder={this.props.onDragStart}
        onResponderMove={this.props.onDragMove}
        onResponderRelease={this.props.onDragEnd}>
        <ConnectionsPanelHeader
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          menuLanguage={this.props.menuLanguage}
          interfaceLang={this.props.interfaceLang}
          setConnectionsMode={this.props.setConnectionsMode}
          closeCat={this.props.closeCat}
          updateCat={updateCat}
          category={!recentFilters ? null : recentFilters[filterIndex].category}
          filterIndex={filterIndex}
          recentFilters={recentFilters}
          connectionsMode={this.props.connectionsMode} />
      </View>
    );
    switch (this.props.connectionsMode) {
      case 'filter': // fall-through
      case 'version open':
        return (
          <View style={[styles.mainTextPanel, styles.textColumn, this.props.theme.textListContentOuter, {maxWidth: null, flex: this.props.textListFlex}]}>
            {connectionsPanelHeader}
            <TextList
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              fontSize={this.props.fontSize}
              textLanguage={this.props.textLanguage}
              menuLanguage={this.props.menuLanguage}
              interfaceLang={this.props.interfaceLang}
              segmentRef={this.props.segmentRef}
              openRef={this.props.openRef}
              connectionsPanelHeader={connectionsPanelHeader}
              connectionsMode={this.props.connectionsMode}
              loadContent={loadContent}
              recentFilters={recentFilters}
              filterIndex={filterIndex}
              listContents={listContents}
            />
          </View>
        );
      case 'versions':
        return (
          <View style={[styles.mainTextPanel, styles.textColumn, this.props.theme.textListContentOuter, {maxWidth: null, flex: this.props.textListFlex}]}>
            {connectionsPanelHeader}
            <VersionsBox
              interfaceLang={this.props.interfaceLang}
              theme={this.props.theme}
              mode={this.props.connectionsMode}
              currVersions={this.props.currVersions}
              mainVersionLanguage={this.props.textLanguage}
              vFilterIndex={this.props.versionFilterIndex}
              recentVFilters={this.props.versionRecentFilters}
              versions={this.props.versions}
              versionsApiError={this.props.versionsApiError}
              setConnectionsMode={this.props.setConnectionsMode}
              segmentRef={this.props.segmentRef}
              openFilter={this.props.openFilter}
              openUri={this.props.openUri}
            />
          </View>
        );
      case 'about':
        return (
          <View style={[styles.mainTextPanel, styles.textColumn, this.props.theme.textListContentOuter, {maxWidth: null, flex: this.props.textListFlex}]}>
            {connectionsPanelHeader}
            <AboutBox
              sheet={this.props.sheet}
              sheetMeta={this.props.sheetMeta}
              textToc={this.props.textToc}
              theme={this.props.theme}
              interfaceLang={this.props.interfaceLang}
              contentLang={this.props.menuLanguage}
              currVersions={this.props.currVersions}
              mainVersionLanguage={this.props.textLanguage}
              textTitle={this.props.textTitle}
              openUri={this.props.openUri}
            />
          </View>
        );
      default:
        // either `null` or equal to a top-level category
        let content;
        if (this.props.loading) {
          content = (<LoadingView />);
        } else {
          // if you're in Modern Commentary, switch to Commentary
          const connectionsMode = this.props.connectionsMode && this.props.connectionsMode.indexOf(" Commentary") !== -1 ? "Commentary" : this.props.connectionsMode;
          let viewList = [];
          let linkSummary = this.props.linkSummary;
          if (connectionsMode !== null && !linkSummary.find(cat => cat.category === connectionsMode)) {
            linkSummary = linkSummary.concat([{category: connectionsMode, count: 0, refList: [], heRefList: [], books: []}]);
          }
          for (let i = 0; i < linkSummary.length; i++) {
            const cat = linkSummary[i];
            const catFilterSelected = (cat.category === connectionsMode || (connectionsMode === "Commentary" && cat.category.indexOf(" Commentary") !== -1));
            if (!catFilterSelected && (cat.category === "Quoting Commentary" || cat.category === "Modern Commentary")) { continue; }  // skip these categories in the main link summary and only include them under Commentary
            if (connectionsMode !== null && !catFilterSelected) { continue; }
            const heCategory = Sefaria.hebrewCategory(cat.category);
            const filter = new LinkFilter(cat.category, heCategory, cat.category, heCategory, cat.refList, cat.heRefList, cat.category);
            viewList.push(
                <LinkNavButton
                  theme={this.props.theme}
                  themeStr={this.props.themeStr}
                  menuLanguage={this.props.menuLanguage}
                  enText={cat.category.toUpperCase()}
                  heText={heCategory}
                  catColor={Sefaria.palette.categoryColor(cat.category)}
                  count={cat.count}
                  onPress={function(filter,category) {
                    if (catFilterSelected) {
                      this.props.openFilter(filter, "link");
                    } else {
                      this.props.setConnectionsMode(category);
                    }
                  }.bind(this,filter,cat.category)}
                  key={cat.category} />);
            if (catFilterSelected) {
              //if true, means we have a category filter selected
              viewList = viewList.concat(cat.books.map((obook)=>{
                const filter = new LinkFilter(obook.title, obook.heTitle, obook.collectiveTitle, obook.heCollectiveTitle, obook.refList, obook.heRefList, cat.category);
                return (
                  <LinkNavButton
                    theme={this.props.theme}
                    themeStr={this.props.themeStr}
                    menuLanguage={this.props.menuLanguage}
                    enText={obook.collectiveTitle ? obook.collectiveTitle : obook.title} //NOTE backwards compatibility
                    heText={obook.heCollectiveTitle ? obook.heCollectiveTitle : obook.heTitle}
                    count={obook.count}
                    onPress={function(filter,title) {
                      this.props.openFilter(filter, "link");
                    }.bind(this,filter,obook.title)}
                    key={obook.title}
                  />
                );
              }));
            }
          }
          if (this.props.connectionsMode === null) {
            viewList.push(
              <ResourcesList
                key={"resourcesList"}
                sheet={this.props.sheet}
                theme={this.props.theme}
                themeStr={this.props.themeStr}
                interfaceLang={this.props.interfaceLang}
                versionsCount={this.props.versions.length}
                setConnectionsMode={this.props.setConnectionsMode}
                segmentRef={this.props.segmentRef}
                heSegmentRef={this.props.heSegmentRef}
                categories={this.props.categories}
              />
            );
          }
          content = (
            <ScrollView
              style={styles.scrollViewPaddingInOrderToScroll}
              key={""+this.props.connectionsMode}
              contentContainerStyle={styles.textListSummaryScrollView}>
                {viewList}
            </ScrollView>
          );
        }

        return (
          <View
            style={[
              styles.mainTextPanel,
              styles.textListSummary,
              this.props.theme.commentaryTextPanel,
              this.props.theme.textListSummary,
              {flex: this.props.textListFlex}]}
            onStartShouldSetResponderCapture={this.props.onStartShouldSetResponderCapture}>
            {connectionsPanelHeader}
            {content}
          </View>);
    }
  }
}

class LinkNavButton extends React.Component {
  static propTypes = {
    theme:    PropTypes.object.isRequired,
    themeStr: PropTypes.string.isRequired,
    menuLanguage: PropTypes.string.isRequired,
    onPress:  PropTypes.func.isRequired,
    enText:   PropTypes.string,
    heText:   PropTypes.string,
    count:    PropTypes.number,
    catColor: PropTypes.string,
  };

  render() {
    return (
      <LibraryNavButton
        theme={this.props.theme}
        themeStr={this.props.themeStr}
        menuLanguage={this.props.menuLanguage}
        catColor={this.props.catColor}
        onPress={this.props.onPress}
        enText={this.props.enText}
        heText={this.props.heText}
        count={this.props.count}
        withArrow={false}
        buttonStyle={{margin: 0, padding: 0}} />
    );
  }
}


class ResourcesList extends React.Component {
  static propTypes = {
    theme:              PropTypes.object.isRequired,
    themeStr:           PropTypes.string.isRequired,
    interfaceLang:      PropTypes.oneOf(["english", "hebrew"]).isRequired,
    setConnectionsMode: PropTypes.func.isRequired,
    versionsCount:      PropTypes.number.isRequired,
    segmentRef:         PropTypes.string.isRequired,
    heSegmentRef:       PropTypes.string.isRequired,
    categories:         PropTypes.array.isRequired,
  }

  render() {
    const isWhite = this.props.themeStr === "white";
    const isSaved = Sefaria.history.indexOfSaved(this.props.segmentRef) !== -1;
    return (
      <View>
        <ToolsButton
          interfaceLang={this.props.interfaceLang}
          text={strings.about}
          icon={isWhite ? require("./img/book.png") : require("./img/book-light.png")}
          theme={this.props.theme}
          onPress={()=>{ this.props.setConnectionsMode("about"); }}
        />
        {this.props.sheet ? null : <ToolsButton
          interfaceLang={this.props.interfaceLang}
          text={strings.versions}
          icon={isWhite ? require("./img/layers.png") : require("./img/layers-light.png")}
          theme={this.props.theme}
          count={this.props.versionsCount}
          onPress={()=>{ this.props.setConnectionsMode("versions"); }}
        /> }
        <ToolsButton
          interfaceLang={this.props.interfaceLang}
          text={isSaved ? strings.saved : strings.save}
          icon={isWhite ?
                  (isSaved ? require('./img/starFilled.png') : require('./img/starUnfilled.png')) :
                  (isSaved ? require('./img/starFilled-light.png') : require('./img/starUnfilled-light.png'))}
          theme={this.props.theme}
          onPress={
            () => {
              const willBeSaved = !isSaved; // this func will toggle isSaved
              Sefaria.history.saveSavedItem(
                {
                  ref: this.props.segmentRef,
                  he_ref: this.props.heSegmentRef,
                  language: this.props.textLanguage,
                  book: Sefaria.textTitleForRef(this.props.segmentRef),
                  saved: willBeSaved,
                  versions: {},
                }, willBeSaved ? 'add_saved' : 'delete_saved'
              );
              this.forceUpdate();
            }
          }
        />
      </View>
    );
  }
}

class ToolsButton extends React.Component {
  static propTypes = {
    interfaceLang: PropTypes.oneOf(["english", "hebrew"]).isRequired,
    theme:         PropTypes.object.isRequired,
    text:          PropTypes.string.isRequired,
    onPress:       PropTypes.func.isRequired,
    icon:          PropTypes.number,
    count:         PropTypes.number,
  }

  render() {
    const { count, theme, icon, interfaceLang } = this.props;
    const textStyle = interfaceLang === "english" ? styles.enInt : styles.heInt;
    const flexDir = interfaceLang === "english" ? null : styles.rtlRow;
    const iconComp = icon ? (<View style={styles.toolsButtonIcon}><Image source={icon} style={styles.menuButton} resizeMode={'contain'}></Image></View>) : null;
    const countComp = !!count || count === 0 ? <Text style={[styles.enInt, theme.secondaryText, styles.spacedText]}>{` (${count}) `}</Text> : null
    return (
      <TouchableOpacity style={[styles.searchFilterCat, styles.toolsButton, flexDir, theme.bordered]} onPress={this.props.onPress}>
        { iconComp }
        <Text style={[textStyle, styles.spacedText, styles.toolsButtonText, theme.tertiaryText]}>{this.props.text}</Text>
        { countComp }
      </TouchableOpacity>
    );
  }
}

export default ConnectionsPanel;
