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
  Dimensions
} from 'react-native';
const styles         = require('./Styles');
const strings        = require('./LocalizedStrings');
const ConnectionsPanelHeader = require('./ConnectionsPanelHeader');
const TextList       = require('./TextList');
const { LinkFilter } = require('./Filter');
const VersionsBox    = require('./VersionsBox');

const {
  CategoryColorLine,
  LoadingView,
  LibraryNavButton,
} = require('./Misc.js');

class ConnectionsPanel extends React.Component {
  static propTypes = {
    theme:                PropTypes.object.isRequired,
    themeStr:             PropTypes.oneOf(["white", "black"]).isRequired,
    interfaceLang:        PropTypes.oneOf(["english", "hebrew"]).isRequired,
    settings:             PropTypes.object,
    openRef:              PropTypes.func.isRequired,
    setConnectionsMode:   PropTypes.func.isRequired,
    openFilter:           PropTypes.func.isRequired,
    closeCat:             PropTypes.func.isRequired,
    updateLinkCat:        PropTypes.func.isRequired,
    updateVersionCat:     PropTypes.func.isRequired,
    loadLinkContent:      PropTypes.func.isRequired,
    loadVersionContent:   PropTypes.func.isRequired,
    loadNewVersion:       PropTypes.func.isRequired,
    linkSummary:          PropTypes.array,
    linkContents:         PropTypes.array,
    versionContents:      PropTypes.array,
    loading:              PropTypes.bool,
    segmentRef:           PropTypes.string.isRequired,
    connectionsMode:      PropTypes.string,
    filterIndex:          PropTypes.number,
    recentFilters:        PropTypes.array.isRequired, /* of the form [{title,heTitle,refList}...] */
    versionRecentFilters: PropTypes.array.isRequired,
    versionFilterIndex:   PropTypes.number,
    currVersions:         PropTypes.object.isRequired,
    versions:             PropTypes.array.isRequired,
    textLanguage:         PropTypes.oneOf(["english","hebrew","bilingual"]),
    onDragStart:          PropTypes.func.isRequired,
    onDragMove:           PropTypes.func.isRequired,
    onDragEnd:            PropTypes.func.isRequired,
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
    const isSummaryMode = this.props.connectionsMode === null;
    const connectionsPanelHeader = (
      <View
        onStartShouldSetResponder={(evt)=>this.props.onDragStart(evt)}
        onResponderMove={(evt)=>this.props.onDragMove(evt)}
        onResponderRelease={(evt)=>this.props.onDragEnd(evt)}>
        <ConnectionsPanelHeader
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          settings={this.props.settings}
          interfaceLang={this.props.interfaceLang}
          setConnectionsMode={this.props.setConnectionsMode}
          closeCat={this.props.closeCat}
          updateCat={updateCat}
          category={isSummaryMode || true ? null : this.props.recentFilters[this.props.filterIndex].category}
          filterIndex={filterIndex}
          recentFilters={recentFilters}
          language={this.props.settings.language}
          connectionsMode={this.props.connectionsMode} />
      </View>
    );
    switch (this.props.connectionsMode) {
      case 'filter': // fall-through
      case 'version open':
        return (
          <View style={[styles.textColumn, this.props.theme.textListContentOuter, {maxWidth: null}]}>
            {connectionsPanelHeader}
            <TextList
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              settings={this.props.settings}
              textLanguage={this.props.textLanguage}
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
          <View style={[styles.textColumn, this.props.theme.textListContentOuter, {maxWidth: null}]}>
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
              setConnectionsMode={this.props.setConnectionsMode}
              segmentRef={this.props.segmentRef}
              openFilter={this.props.openFilter}
              loadNewVersion={this.props.loadNewVersion}
              onRangeClick={()=>{}}
            />
          </View>
        );
      default:
        // either `null` or equal to a top-level category
        let content;
        if (this.props.loading) {
          content = (<LoadingView />);
        } else {
          let viewList = [];
          for (let i = 0; i < this.props.linkSummary.length; i++) {
            const cat = this.props.linkSummary[i];
            const catFilterSelected = cat.category === this.props.connectionsMode;
            if (this.props.connectionsMode !== null && !catFilterSelected) { continue; }
            const heCategory = Sefaria.hebrewCategory(cat.category);
            const filter = new LinkFilter(cat.category, heCategory, cat.category, heCategory, cat.refList,cat.category);
            viewList.push(
                <LinkNavButton
                  theme={this.props.theme}
                  themeStr={this.props.themeStr}
                  settings={this.props.settings}
                  enText={cat.category}
                  heText={Sefaria.hebrewCategory(cat.category)}
                  isCat={true}
                  count={cat.count}
                  language={this.props.settings.language}
                  onPress={function(filter,category) {
                    if (catFilterSelected) {
                      this.props.openFilter(filter, "link");
                    } else {
                      this.props.setConnectionsMode(category);
                    }
                    Sefaria.track.event("Reader","Category Filter Click",category);
                  }.bind(this,filter,cat.category)}
                  key={cat.category} />);
            if (catFilterSelected) {
              //if true, means we have a category filter selected
              viewList = viewList.concat(cat.books.map((obook)=>{
                const filter = new LinkFilter(obook.title, obook.heTitle, obook.collectiveTitle, obook.heCollectiveTitle, obook.refList, cat.category);
                return (
                  <LinkNavButton
                    theme={this.props.theme}
                    themeStr={this.props.themeStr}
                    settings={this.props.settings}
                    enText={obook.collectiveTitle ? obook.collectiveTitle : obook.title} //NOTE backwards compatibility
                    heText={obook.heCollectiveTitle ? obook.heCollectiveTitle : obook.heTitle}
                    isCat={false}
                    count={obook.count}
                    language={this.props.settings.language}
                    onPress={function(filter,title) {
                      this.props.openFilter(filter, "link");
                      Sefaria.track.event("Reader","Text Filter Click",title);
                    }.bind(this,filter,obook.title)}
                    key={obook.title}
                  />
                );
              }));
              break;
            }
          }
          if (this.props.connectionsMode === null) {
            viewList.push(
              <ResourcesList
                key={"resourcesList"}
                theme={this.props.theme}
                themeStr={this.props.themeStr}
                interfaceLang={this.props.interfaceLang}
                versionsCount={this.props.versions.length}
                setConnectionsMode={this.props.setConnectionsMode}
              />
            );
          }
          content = (
            <ScrollView
              key={""+this.props.connectionsMode}
              contentContainerStyle={styles.textListSummaryScrollView}>
                {viewList}
            </ScrollView>
          );
        }
        return (
          <View style={[styles.textListSummary, this.props.theme.textListSummary]}>
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
    settings: PropTypes.object.isRequired,
    onPress:  PropTypes.func.isRequired,
    enText:   PropTypes.string,
    heText:   PropTypes.string,
    language: PropTypes.string,
    count:    PropTypes.number,
    isCat:    PropTypes.bool.isRequired,
  };

  render() {
    return (
      <LibraryNavButton
        theme={this.props.theme}
        themeStr={this.props.themeStr}
        settings={this.props.settings}
        isCat={this.props.isCat}
        onPress={this.props.onPress}
        enText={this.props.enText}
        heText={this.props.heText}
        count={this.props.count}
        withArrow={false}
        buttonStyle={{margin: 0}} />
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
  }

  render() {
    const isWhite = this.props.themeStr === "white";
    return (
      <View>
        <ToolsButton
          interfaceLang={this.props.interfaceLang}
          text={strings.versions}
          icon={isWhite ? require("./img/layers.png") : require("./img/layers-light.png")}
          theme={this.props.theme}
          count={this.props.versionsCount}
          onPress={()=>{ this.props.setConnectionsMode("versions"); }}
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
    const iconComp = icon ? (<Image source={icon} style={styles.menuButton} resizeMode={Image.resizeMode.contain}></Image>) : null;
    const countComp = !!count || count === 0 ? <Text style={[styles.enInt, theme.secondaryText, styles.spacedText]}>{`(${count})`}</Text> : null
    return (
      <TouchableOpacity style={[styles.searchFilterCat, styles.toolsButton, flexDir, theme.bordered]} onPress={this.props.onPress}>
        { iconComp }
        <Text style={[textStyle, styles.spacedText, styles.toolsButtonText, theme.tertiaryText]}>{this.props.text}</Text>
        { countComp }
      </TouchableOpacity>
    );
  }
}


module.exports = ConnectionsPanel;
