'use strict';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';
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
import SheetListInConnections from './SheetListInConnections';
import TopicList from './TopicList';
import LexiconBox from './LexiconBox';
import { GlobalStateContext, getTheme } from './StateManager';
import {iconData} from "./IconData";

const {
  CategoryColorLine,
  LoadingView,
  LibraryNavButton,
  SefariaPressable,
} = require('./Misc.js');

class ConnectionsPanel extends React.PureComponent {
  static whyDidYouRender = true;
  static propTypes = {
    textToc:              PropTypes.object,
    theme:                PropTypes.object.isRequired,
    themeStr:             PropTypes.oneOf(["white", "black"]).isRequired,
    interfaceLanguage:        PropTypes.oneOf(["english", "hebrew"]).isRequired,
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
    relatedHasError:      PropTypes.bool,
    sectionRef:           PropTypes.string.isRequired,
    segmentRef:           PropTypes.string.isRequired,
    heSegmentRef:         PropTypes.string.isRequired,
    connectionsMode:      PropTypes.string,
    filterIndex:          PropTypes.number,
    recentFilters:        PropTypes.array.isRequired, /* of the form [{title,heTitle,refList}...] */
    versionRecentFilters: PropTypes.array.isRequired,
    versionFilterIndex:   PropTypes.number,
    currVersionObjects:   PropTypes.object.isRequired,
    versions:             PropTypes.array.isRequired,
    versionsApiError:     PropTypes.bool.isRequired,
    textLanguage:         PropTypes.oneOf(["english","hebrew","bilingual"]),
    onDragStart:          PropTypes.func.isRequired,
    onDragMove:           PropTypes.func.isRequired,
    onDragEnd:            PropTypes.func.isRequired,
    textTitle:            PropTypes.string.isRequired,
    categories:           PropTypes.array.isRequired,
    openUri:              PropTypes.func.isRequired,
    handleOpenURL:         PropTypes.func.isRequired,
    textListFlex:         PropTypes.number.isRequired,
    onStartShouldSetResponderCapture: PropTypes.func.isRequired,
    dictLookup:           PropTypes.string,
    shareCurrentSegment:  PropTypes.func.isRequired,
    viewOnSite:           PropTypes.func.isRequired,
    reportError:          PropTypes.func.isRequired,
    loadRelated:          PropTypes.func.isRequired,
    openTopic:            PropTypes.func.isRequired,
  };

  reloadRelated = () => this.props.loadRelated(this.props.sectionRef);
  
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
          textLanguage={this.props.textLanguage}
          interfaceLanguage={this.props.interfaceLanguage}
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
              interfaceLanguage={this.props.interfaceLanguage}
              segmentRef={this.props.segmentRef}
              openRef={this.props.openRef}
              connectionsMode={this.props.connectionsMode}
              loadContent={loadContent}
              recentFilters={recentFilters}
              filterIndex={filterIndex}
              listContents={listContents}
            />
          </View>
        );
      case 'dictionary':
        const ref = (this.props.sheet && this.props.segmentRefOnSheet) ? this.props.segmentRefOnSheet : this.props.segmentRef;
        const categories = Sefaria.categoriesForTitle(Sefaria.textTitleForRef(ref));
        return (
          <View style={[styles.mainTextPanel, styles.textColumn, this.props.theme.textListContentOuter, {maxWidth: null, flex: this.props.textListFlex}]}>
            {connectionsPanelHeader}
            <LexiconBox
              openRef={this.props.openRef}
              handleOpenURL={this.props.handleOpenURL}
              selectedWords={this.props.dictLookup}
              oref={{ref, categories}}
            />
          </View>
        );
      case 'versions':
        return (
          <View style={[styles.mainTextPanel, styles.textColumn, this.props.theme.textListContentOuter, {maxWidth: null, flex: this.props.textListFlex}]}>
            {connectionsPanelHeader}
            <VersionsBox
              mode={this.props.connectionsMode}
              currVersionObjects={this.props.currVersionObjects}
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
              textToc={this.props.textToc}
              currVersionObjects={this.props.currVersionObjects}
              textTitle={this.props.textTitle}
              openUri={this.props.openUri}
            />
          </View>
        );
      case 'sheetsByRef':
        return (
          <View style={[styles.mainTextPanel, styles.textColumn, this.props.theme.textListContentOuter, {maxWidth: null, flex: this.props.textListFlex}]}>
            {connectionsPanelHeader}
            <SheetListInConnections
              sheets={this.props.relatedData.sheets}
              openRefSheet={this.props.openRefSheet}
              openTopic={this.props.openTopic}
            />
          </View>
        );
      case 'topicsByRef':
        return (
          <View style={[styles.mainTextPanel, styles.textColumn, this.props.theme.textListContentOuter, {maxWidth: null, flex: this.props.textListFlex}]}>
            {connectionsPanelHeader}
            <TopicList
              topics={this.props.relatedData.topics}
              openTopic={this.props.openTopic}
              segmentRef={this.props.segmentRef}
              heSegmentRef={this.props.heSegmentRef}
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
              <LibraryNavButton
                enText={cat.category.toUpperCase()}
                heText={heCategory}
                catColor={Sefaria.palette.categoryColor(cat.category)}
                count={!catFilterSelected && cat.totalCount || cat.count}
                hasEn={cat.hasEn}
                onPress={function(filter,category) {
                  if (catFilterSelected) {
                    this.props.openFilter(filter, "link");
                  } else {
                    this.props.setConnectionsMode(category);
                  }
                }.bind(this,filter,cat.category)}
                withArrow={false}
                buttonStyle={{margin: 0, padding: 0}}
                key={cat.category}
              />
            );
            if (catFilterSelected) {
              //if true, means we have a category filter selected
              viewList = viewList.concat(cat.books.map((obook)=>{
                const filter = new LinkFilter(obook.title, obook.heTitle, obook.collectiveTitle, obook.heCollectiveTitle, obook.refList, obook.heRefList, cat.category);
                return (
                  <LibraryNavButton
                    enText={obook.collectiveTitle ? obook.collectiveTitle : obook.title} //NOTE backwards compatibility
                    heText={obook.heCollectiveTitle ? obook.heCollectiveTitle : obook.heTitle}
                    count={obook.count}
                    hasEn={obook.hasEn}
                    onPress={function(filter,title) {
                      this.props.openFilter(filter, "link");
                    }.bind(this,filter,obook.title)}
                    withArrow={false}
                    buttonStyle={{margin: 0, padding: 0}}
                    key={`${obook.title}|${cat.category}`}
                  />
                )
              }));
            }
          }
          if (this.props.connectionsMode === null) {
            viewList.push(
              <ResourcesList
                key={"resourcesList"}
                relatedHasError={this.props.relatedHasError}
                sheet={this.props.sheet}
                themeStr={this.props.themeStr}
                versionsCount={this.props.versions.length}
                sheetsCount={this.props.relatedData.sheets ? this.props.relatedData.sheets.length : 0}
                topicsCount={this.props.relatedData.topics ? Sefaria.links.topicsCount(this.props.relatedData.topics) : 0}
                setConnectionsMode={this.props.setConnectionsMode}
                segmentRef={this.props.segmentRef}
                heSegmentRef={this.props.heSegmentRef}
                categories={this.props.categories}
                shareCurrentSegment={this.props.shareCurrentSegment}
                reportError={this.props.reportError}
                viewOnSite={this.props.viewOnSite}
                reloadRelated={this.reloadRelated}
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


class ResourcesList extends React.PureComponent {
  static whyDidYouRender = true;
  static propTypes = {
    themeStr:           PropTypes.string.isRequired,
    setConnectionsMode: PropTypes.func.isRequired,
    versionsCount:      PropTypes.number.isRequired,
    sheetsCount:        PropTypes.number.isRequired,
    topicsCount:        PropTypes.number.isRequired,
    segmentRef:         PropTypes.string.isRequired,
    segmentRefOnSheet:  PropTypes.string,
    heSegmentRef:       PropTypes.string.isRequired,
    categories:         PropTypes.array.isRequired,
    shareCurrentSegment:PropTypes.func.isRequired,
    viewOnSite:         PropTypes.func.isRequired,
    reportError:        PropTypes.func.isRequired,
    relatedHasError:    PropTypes.bool,
    reloadRelated:      PropTypes.func.isRequired,
  }

  render() {
    return (
      <View>
        {
          this.props.relatedHasError ? (
            <ToolsButton
            text={strings.resourcesFailedToLoad}
            onPress={this.props.reloadRelated}
          />
          ) : null
        }
        <ToolsButton
          text={strings.sheets}
          icon={iconData.get('sheet', this.props.themeStr)}
          count={this.props.sheetsCount}
          onPress={()=>{ this.props.setConnectionsMode("sheetsByRef"); }}
        />
        {this.props.topicsCount && this.props.topicsCount > 0 ? (
          <ToolsButton
            text={strings.topics} count={this.props.topicsCount}
            icon={iconData.get('hashtag', this.props.themeStr)}
            onPress={() => this.props.setConnectionsMode("topicsByRef")}
          />) : null
        }
        <ToolsButton
          text={strings.about}
          icon={iconData.get('book', this.props.themeStr)}
          onPress={()=>{ this.props.setConnectionsMode("about"); }}
        />
        {this.props.sheet ? null : <ToolsButton
          text={strings.translations}
          icon={iconData.get('layers', this.props.themeStr)}
          count={this.props.versionsCount}
          onPress={()=>{ this.props.setConnectionsMode("versions"); }}
        /> }
        <ToolsButton
          text={strings.share}
          icon={iconData.get('share', this.props.themeStr)}
          onPress={() => this.props.shareCurrentSegment()}
        />
        {this.props.sheet ? null : <ToolsButton
          text={strings.reportError}
          icon={iconData.get('bubble', this.props.themeStr)}
          onPress={this.props.reportError}
        />}
        <ToolsButton
          text={strings.viewOnSite}
          icon={iconData.get('externalLink', this.props.themeStr)}
          onPress={this.props.viewOnSite}
        />
      </View>
    );
  }
}

const ToolsButton = ({ text, onPress, icon, count }) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const textStyle = interfaceLanguage === "english" ? styles.enInt : styles.heInt;
  const flexDir = interfaceLanguage === "english" ? null : styles.rtlRow;
  const hasIcon = !!icon;
  icon = icon || iconData.get('sheet', themeStr);  // default to arbitrary icon that will be invisible if icon wasn't passed
  const iconComp = (<View style={[styles.toolsButtonIcon, hasIcon ? null : styles.readerNavSectionMoreInvisible]}><Image source={icon} style={styles.menuButton} resizeMode={'contain'}></Image></View>);
  const countComp = !!count || count === 0 ? <Text style={[styles.enInt, theme.secondaryText, styles.spacedText]}>{` (${count}) `}</Text> : null
  return (
    <SefariaPressable
      extraStyles={[styles.searchFilterCat, styles.toolsButton, flexDir, theme.bordered]}
      onPress={onPress}
    >
      { iconComp }
      <Text style={[textStyle, styles.spacedText, styles.toolsButtonText, theme.tertiaryText]}>{text}</Text>
      { countComp }
    </SefariaPressable>
  );
};
ToolsButton.propTypes = {
  text:          PropTypes.string.isRequired,
  onPress:       PropTypes.func.isRequired,
  icon:          PropTypes.number,
  count:         PropTypes.number,
};

export default ConnectionsPanel;
