'use strict';
import PropTypes from 'prop-types';
import React, {useContext, useState} from 'react';
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
  constructor(props) {
    super(props);
    this.state = {
      showAllRelated: false,
    };
  }
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
  onPresshShowMoreLess = () => this.setState((prevState) => ({showAllRelated: !prevState.showAllRelated}));

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
      case 'filter': return; // fall-through
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
              handleOpenURL={this.props.handleOpenURL}
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
            const enText = (this.props.connectionsMode === null) ? cat.category : cat.category.toUpperCase();
            viewList.push(
              <LibraryNavButton
                enText={enText}
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
                isMainMenu={this.props.connectionsMode === null}
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
              const collapsedTopLevelLimit = 3;
              if (viewList.length > collapsedTopLevelLimit) {
                const { showAllRelated } = this.state;
                if (!showAllRelated) {
                  viewList = viewList.slice(0, collapsedTopLevelLimit);
                  viewList.push((
                      <ToolsButton
                          onPress={this.onPresshShowMoreLess}
                          text={strings.more}
                          icon={iconData.get('more', this.props.themeStr)}
                      />
                  ));
                } else {
                  viewList.push((
                      <ToolsButton
                          onPress={this.onPresshShowMoreLess}
                          text={strings.less}
                          icon={iconData.get('up', this.props.themeStr)}
                      />
                  ));
                }
              }
              viewList = [
                (<TopButtons
                  relatedHasError={this.props.relatedHasError}
                  sheet={this.props.sheet}
                  themeStr={this.props.themeStr}
                  versionsCount={this.props.versions.length}
                  setConnectionsMode={this.props.setConnectionsMode}
                  reloadRelated={this.reloadRelated}
                />),
                (<ConnectionsPanelSection title={strings.relatedTexts}>{viewList}</ConnectionsPanelSection>),
                (<ResourcesList
                  themeStr={this.props.themeStr}
                  topicsCount={this.props.relatedData.topics ? Sefaria.links.topicsCount(this.props.relatedData.topics) : 0}
                  sheetsCount={this.props.relatedData.sheets ? this.props.relatedData.sheets.length : 0}
                  setConnectionsMode={this.props.setConnectionsMode}
                />),
                (<ToolsList
                  themeStr={this.props.themeStr}
                  sheet={this.props.sheet}
                  shareCurrentSegment={this.props.shareCurrentSegment}
                  viewOnSite={this.props.viewOnSite}
                  reportError={this.props.reportError}
                />)
              ]
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
              {flex: this.props.textListFlex}]}
            onStartShouldSetResponderCapture={this.props.onStartShouldSetResponderCapture}>
            {connectionsPanelHeader}
            {content}
          </View>);
    }
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

const ConnectionsPanelSection = ({ title, children }) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  return (
    <View style={styles.connectionPanelSection}  flexdir={interfaceLanguage === "english" ? null : styles.rtlRow}>
      {title &&
        <View style={styles.connectionPanelTitle}>
          <Text style={[interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt, theme.tertiaryText]}>
            {title}
          </Text>
        </View>
      }
      <View>
        {children}
      </View>
    </View>
  );
};
ConnectionsPanelSection.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
};

const TopButtons = ({relatedHasError, reloadRelated, themeStr, setConnectionsMode, sheet, versionsCount}) => {
  return (
    <ConnectionsPanelSection>
      {!relatedHasError ? null : <ToolsButton
        text={strings.resourcesFailedToLoad}
        onPress={reloadRelated}
      /> }
      <ToolsButton
        text={strings.aboutThisText}
        icon={iconData.get('info', themeStr)}
        onPress={()=> {setConnectionsMode("about"); }}
      />
      {sheet ? null : <ToolsButton
        text={strings.translations}
        icon={iconData.get('translations', themeStr)}
        count={versionsCount}
        onPress={()=> {setConnectionsMode("versions"); }}
      /> }
    </ConnectionsPanelSection>
  )
};
TopButtons.propTypes = {
    themeStr:           PropTypes.string.isRequired,
    setConnectionsMode: PropTypes.func.isRequired,
    versionsCount:      PropTypes.number.isRequired,
    relatedHasError:    PropTypes.bool,
    reloadRelated:      PropTypes.func.isRequired,
  // what is sheet?
};

const ResourcesList = ({themeStr, sheetsCount, setConnectionsMode, topicsCount}) => {
  return (
      <ConnectionsPanelSection title={strings.resources}>
        <ToolsButton
          text={strings.sheets}
          icon={iconData.get('sheet', themeStr)}
          count={sheetsCount}
          onPress={()=>{ setConnectionsMode("sheetsByRef"); }}
        />
        {!topicsCount ? null : <ToolsButton
            text={strings.topics} count={topicsCount}
            icon={iconData.get('hashtag', themeStr)}
            onPress={() => setConnectionsMode("topicsByRef")}
        /> }
      </ConnectionsPanelSection>
  )
};
ResourcesList.propTypes = {
  themeStr:           PropTypes.string.isRequired,
  setConnectionsMode: PropTypes.func.isRequired,
  sheetsCount:        PropTypes.number.isRequired,
  topicsCount:        PropTypes.number.isRequired,
};

const ToolsList = ({themeStr, shareCurrentSegment, sheet, reportError, viewOnSite}) => {
  return (
      <ConnectionsPanelSection title={strings.tools}>
        <ToolsButton
          text={strings.share}
          icon={iconData.get('share-full', themeStr)}
          onPress={() => shareCurrentSegment()}
        />
        {sheet ? null : <ToolsButton
          text={strings.reportError}
          icon={iconData.get('bubble', themeStr)}
          onPress={reportError}
        />}
        <ToolsButton
          text={strings.viewOnSite}
          icon={iconData.get('externalLink', themeStr)}
          onPress={viewOnSite}
        />
      </ConnectionsPanelSection>
  )
};
ToolsList.propTypes = {
  themeStr:           PropTypes.string.isRequired,
  shareCurrentSegment:PropTypes.func.isRequired,
  viewOnSite:         PropTypes.func.isRequired,
  reportError:        PropTypes.func.isRequired,
  // what is sheet?
};

export default ConnectionsPanel;
