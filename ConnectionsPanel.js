'use strict';
import PropTypes from 'prop-types';
import React, { useContext, useReducer } from 'react';
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

import {
  CategoryColorLine,
  LoadingView,
  LibraryNavButton,
} from './Misc.js';
import { GlobalStateContext } from './StateManager';

const ConnectionsPanel = props => {
  const { theme, themeStr, textLanguage, fontSize } = useContext(GlobalStateContext);
  let recentFilters, filterIndex, listContents, loadContent, updateCat;
  switch (props.connectionsMode) {
    case 'filter':
      recentFilters = props.recentFilters;
      filterIndex = props.filterIndex;
      listContents = props.linkContents;
      loadContent = props.loadLinkContent;
      updateCat    = props.updateLinkCat;
      break;
    case 'version open':
      recentFilters = props.versionRecentFilters;
      filterIndex = props.versionFilterIndex;
      listContents = props.versionContents;
      loadContent = props.loadVersionContent;
      updateCat    = props.updateVersionCat;
      break;
  }
  const connectionsPanelHeader = (
    <View
      onStartShouldSetResponder={props.onDragStart}
      onResponderMove={props.onDragMove}
      onResponderRelease={props.onDragEnd}>
      <ConnectionsPanelHeader
        setConnectionsMode={props.setConnectionsMode}
        closeCat={props.closeCat}
        updateCat={updateCat}
        category={!recentFilters ? null : recentFilters[filterIndex].category}
        filterIndex={filterIndex}
        recentFilters={recentFilters}
        connectionsMode={props.connectionsMode} />
    </View>
  );
  switch (props.connectionsMode) {
    case 'filter': // fall-through
    case 'version open':
      return (
        <View style={[styles.mainTextPanel, styles.textColumn, theme.textListContentOuter, {maxWidth: null, flex: props.textListFlex}]}>
          {connectionsPanelHeader}
          <TextList
            segmentRef={props.segmentRef}
            openRef={props.openRef}
            connectionsPanelHeader={connectionsPanelHeader}
            connectionsMode={props.connectionsMode}
            loadContent={loadContent}
            recentFilters={recentFilters}
            filterIndex={filterIndex}
            listContents={listContents}
            textLanguage={textLanguage}
            themeStr={themeStr}
            fontSize={fontSize}
          />
        </View>
      );
    case 'versions':
      return (
        <View style={[styles.mainTextPanel, styles.textColumn, theme.textListContentOuter, {maxWidth: null, flex: props.textListFlex}]}>
          {connectionsPanelHeader}
          <VersionsBox
            mode={props.connectionsMode}
            currVersions={props.currVersions}
            vFilterIndex={props.versionFilterIndex}
            recentVFilters={props.versionRecentFilters}
            versions={props.versions}
            versionsApiError={props.versionsApiError}
            setConnectionsMode={props.setConnectionsMode}
            segmentRef={props.segmentRef}
            openFilter={props.openFilter}
            openUri={props.openUri}
          />
        </View>
      );
    case 'about':
      return (
        <View style={[styles.mainTextPanel, styles.textColumn, theme.textListContentOuter, {maxWidth: null, flex: props.textListFlex}]}>
          {connectionsPanelHeader}
          <AboutBox
            sheet={props.sheet}
            sheetMeta={props.sheetMeta}
            textToc={props.textToc}
            currVersions={props.currVersions}
            textTitle={props.textTitle}
            openUri={props.openUri}
          />
        </View>
      );
    default:
      // either `null` or equal to a top-level category
      let content;
      if (props.loading) {
        content = (<LoadingView />);
      } else {
        // if you're in Modern Commentary, switch to Commentary
        const connectionsMode = props.connectionsMode && props.connectionsMode.indexOf(" Commentary") !== -1 ? "Commentary" : props.connectionsMode;
        let viewList = [];
        let linkSummary = props.linkSummary;
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
                enText={cat.category.toUpperCase()}
                heText={heCategory}
                catColor={Sefaria.palette.categoryColor(cat.category)}
                count={!catFilterSelected && cat.totalCount || cat.count}
                onPress={function(filter,category) {
                  if (catFilterSelected) {
                    props.openFilter(filter, "link");
                  } else {
                    props.setConnectionsMode(category);
                  }
                }.bind(null,filter,cat.category)}
                key={cat.category} />);
          if (catFilterSelected) {
            //if true, means we have a category filter selected
            viewList = viewList.concat(cat.books.map((obook)=>{
              const filter = new LinkFilter(obook.title, obook.heTitle, obook.collectiveTitle, obook.heCollectiveTitle, obook.refList, obook.heRefList, cat.category);
              return (
                <LinkNavButton
                  enText={obook.collectiveTitle ? obook.collectiveTitle : obook.title} //NOTE backwards compatibility
                  heText={obook.heCollectiveTitle ? obook.heCollectiveTitle : obook.heTitle}
                  count={obook.count}
                  onPress={function(filter,title) {
                    props.openFilter(filter, "link");
                  }.bind(null,filter,obook.title)}
                  key={obook.title}
                />
              );
            }));
          }
        }
        if (props.connectionsMode === null) {
          viewList.push(
            <ResourcesList
              key={"resourcesList"}
              sheet={props.sheet}
              versionsCount={props.versions.length}
              setConnectionsMode={props.setConnectionsMode}
              segmentRef={props.segmentRef}
              heSegmentRef={props.heSegmentRef}
              categories={props.categories}
            />
          );
        }
        content = (
          <ScrollView
            style={styles.scrollViewPaddingInOrderToScroll}
            key={""+props.connectionsMode}
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
            theme.commentaryTextPanel,
            theme.textListSummary,
            {flex: props.textListFlex}]}
          onStartShouldSetResponderCapture={props.onStartShouldSetResponderCapture}>
          {connectionsPanelHeader}
          {content}
        </View>);
  }
}
ConnectionsPanel.propTypes = {
  textToc:              PropTypes.object,
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
  onDragStart:          PropTypes.func.isRequired,
  onDragMove:           PropTypes.func.isRequired,
  onDragEnd:            PropTypes.func.isRequired,
  textTitle:            PropTypes.string.isRequired,
  categories:           PropTypes.array.isRequired,
  openUri:              PropTypes.func.isRequired,
  textListFlex:         PropTypes.number.isRequired,
  onStartShouldSetResponderCapture: PropTypes.func.isRequired,
};

const LinkNavButton = ({ onPress, enText, heText, count, catColor }) => (
  <LibraryNavButton
    catColor={catColor}
    onPress={onPress}
    enText={enText}
    heText={heText}
    count={count}
    withArrow={false}
    buttonStyle={{margin: 0, padding: 0}} />
);
LinkNavButton.propTypes = {
  onPress:  PropTypes.func.isRequired,
  enText:   PropTypes.string,
  heText:   PropTypes.string,
  count:    PropTypes.number,
  catColor: PropTypes.string,
};


const ResourcesList = ({
  sheet,
  setConnectionsMode,
  versionsCount,
  segmentRef,
  heSegmentRef,
  categories
}) => {
  const { themeStr, textLanguage } = useContext(GlobalStateContext);
  const [, forceUpdate] = useReducer(x => x + 1, 0);  // HACK
  const isWhite = themeStr === "white";
  const isSaved = Sefaria.history.indexOfSaved(segmentRef) !== -1;
  return (
    <View>
      <ToolsButton
        text={strings.about}
        icon={isWhite ? require("./img/book.png") : require("./img/book-light.png")}
        onPress={()=>{ setConnectionsMode("about"); }}
      />
      {sheet ? null : <ToolsButton
        text={strings.versions}
        icon={isWhite ? require("./img/layers.png") : require("./img/layers-light.png")}
        count={versionsCount}
        onPress={()=>{ setConnectionsMode("versions"); }}
      /> }
      <ToolsButton
        text={isSaved ? strings.saved : strings.save}
        icon={isWhite ?
                (isSaved ? require('./img/starFilled.png') : require('./img/starUnfilled.png')) :
                (isSaved ? require('./img/starFilled-light.png') : require('./img/starUnfilled-light.png'))}
        onPress={
          () => {
            const willBeSaved = !isSaved; // this func will toggle isSaved
            Sefaria.history.saveSavedItem(
              {
                ref: segmentRef,
                he_ref: heSegmentRef,
                language: textLanguage,
                book: Sefaria.textTitleForRef(segmentRef),
                saved: willBeSaved,
                versions: {},
              }, willBeSaved ? 'add_saved' : 'delete_saved'
            );
            forceUpdate();
          }
        }
      />
    </View>
  );
}
ResourcesList.propTypes = {
  sheet:              PropTypes.object,
  setConnectionsMode: PropTypes.func.isRequired,
  versionsCount:      PropTypes.number.isRequired,
  segmentRef:         PropTypes.string.isRequired,
  heSegmentRef:       PropTypes.string.isRequired,
  categories:         PropTypes.array.isRequired,
};

const ToolsButton = ({ text, onPress, icon, count }) => {
  const { theme, interfaceLanguage } = useContext(GlobalStateContext);
  const textStyle = interfaceLanguage === "english" ? styles.enInt : styles.heInt;
  const flexDir = interfaceLanguage === "english" ? null : styles.rtlRow;
  const iconComp = icon ? (<View style={styles.toolsButtonIcon}><Image source={icon} style={styles.menuButton} resizeMode={'contain'}></Image></View>) : null;
  const countComp = !!count || count === 0 ? <Text style={[styles.enInt, theme.secondaryText, styles.spacedText]}>{` (${count}) `}</Text> : null
  return (
    <TouchableOpacity style={[styles.searchFilterCat, styles.toolsButton, flexDir, theme.bordered]} onPress={onPress}>
      { iconComp }
      <Text style={[textStyle, styles.spacedText, styles.toolsButtonText, theme.tertiaryText]}>{text}</Text>
      { countComp }
    </TouchableOpacity>
  );
}
ToolsButton.propTypes = {
  text:          PropTypes.string.isRequired,
  onPress:       PropTypes.func.isRequired,
  icon:          PropTypes.number,
  count:         PropTypes.number,
};

export default ConnectionsPanel;
