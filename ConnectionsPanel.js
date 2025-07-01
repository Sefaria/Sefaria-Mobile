'use strict';
import PropTypes from 'prop-types';
import React, {useState} from 'react';
import {
  View,
  ScrollView,
  Text,
  Image,
} from 'react-native';
import styles from './Styles';
import strings from './LocalizedStrings';
import ConnectionsPanelHeader from './ConnectionsPanelHeader';
import TextList from './TextList';
import { LinkFilter } from './Filter';
import TranslationsBox from './TranslationsBox';
import AboutBox from './AboutBox';
import SheetListInConnections from './SheetListInConnections';
import TopicList from './TopicList';
import LexiconBox from './LexiconBox';
import {iconData} from "./IconData";
import {useGlobalState} from "./Hooks";


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
    translations:         PropTypes.object,
  };

  reloadRelated = () => this.props.loadRelated(this.props.sectionRef);
  toggleShowAllRelated = () => this.setState((prevState) => ({showAllRelated: !prevState.showAllRelated}));

  render() {
    let recentFilters, filterIndex, listContents, loadContent, updateCat;
    const isMainMenu= this.props.connectionsMode === null;
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
            <TranslationsBox
              currVersionObjects={this.props.currVersionObjects}
              segmentRef={this.props.segmentRef}
              openFilter={this.props.openFilter}
              openUri={this.props.openUri}
              openRef={this.props.openRef}
              translations={this.props.translations}
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
              openFilter={this.props.openFilter}
              openUri={this.props.openUri}
              segmentRef={this.props.segmentRef}
              versions={this.props.versions}
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
          let buttons;
          if (isMainMenu) {
            buttons = (<MainMenuButtons
                relatedHasError={this.props.relatedHasError}
                sheet={this.props.sheet}
                themeStr={this.props.themeStr}
                translations={this.props.translations}
                setConnectionsMode={this.props.setConnectionsMode}
                reloadRelated={this.reloadRelated}
                relatedData={this.props.relatedData}
                shareCurrentSegment={this.props.shareCurrentSegment}
                viewOnSite={this.props.viewOnSite}
                reportError={this.props.reportError}
                linkSummary={this.props.linkSummary}
                connectionsMode={this.props.connectionsMode}
                openFilter={this.props.openFilter}
            />);
          } else {
            let navButtonPropsList= getLibraryNavButtonPropsList(this.props.linkSummary, this.props.connectionsMode, this.props.openFilter, this.props.setConnectionsMode);
            buttons = navButtonPropsList.map(props => makeLibraryNavButton(props));
          }
          content = (
            <ScrollView
              style={styles.scrollViewPaddingInOrderToScroll}
              key={""+this.props.connectionsMode}
              contentContainerStyle={styles.textListSummaryScrollView}>
                {buttons}
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


const getLibraryNavButtonCatProps = (cat, connectionsMode, catFilterSelected, openFilter, setConnectionsMode) => {
  const isMainMenu = connectionsMode === null;
  const enText = (isMainMenu) ? cat.category : cat.category.toUpperCase();
  const heText = Sefaria.hebrewCategory(cat.category);
  const filter = new LinkFilter(cat.category, heText, cat.category, heText, cat.refList, cat.heRefList, cat.category);
  const catColor = Sefaria.palette.categoryColor(cat.category);
  const count = !catFilterSelected && cat.totalCount || cat.count;
  const hasEn = cat.hasEn;
  const onPress = (catFilterSelected) ? () => openFilter(filter, "link") : () => setConnectionsMode(cat.category);
  const buttonStyle = {margin: 0, padding: 0};
  const key = cat.category;
  return {enText, heText, catColor, count, hasEn, onPress, buttonStyle, key, isMainMenu};
}

const getLibraryNavButtonBookProps = (book, cat, connectionsMode, catFilterSelected, openFilter) => {
  const enText = book.collectiveTitle ? book.collectiveTitle : book.title;
  const heText = book.heCollectiveTitle ? book.heCollectiveTitle : book.heTitle;
  const filter = new LinkFilter(book.title, book.heTitle, book.collectiveTitle, book.heCollectiveTitle, book.refList, book.heRefList, cat.category);
  const count = book.count;
  const hasEn = book.hasEn;
  const onPress = () => openFilter(filter, "link");
  const buttonStyle = {margin: 0, padding: 0};
  const key = `${book.title}|${cat.category}`;
  return {enText, heText, count, hasEn, onPress, buttonStyle, key};
}

const getLibraryNavButtonPropsList = (linkSummary, connectionsMode, openFilter, setConnectionsMode) => {
  connectionsMode = connectionsMode && connectionsMode.indexOf(" Commentary") !== -1 ? "Commentary" : connectionsMode;
  const isMainMenu = connectionsMode === null;
  let navButtonPropsList = [];
  if (!isMainMenu && !linkSummary.find(cat => cat.category === connectionsMode)) {
    linkSummary = linkSummary.concat([{category: connectionsMode, count: 0, refList: [], heRefList: [], books: []}]);
  }
  for (let i = 0; i < linkSummary.length; i++) {
    const cat = linkSummary[i];
    const catFilterSelected = (cat.category === connectionsMode || (connectionsMode === "Commentary" && cat.category.indexOf(" Commentary") !== -1));
    if (!catFilterSelected && (cat.category === "Quoting Commentary" || cat.category === "Modern Commentary")) {
      continue;   // skip these categories in the main link summary and only include them under Commentary
    }
    if (!isMainMenu && !catFilterSelected) {
      continue;
    }
    navButtonPropsList.push(getLibraryNavButtonCatProps(cat, connectionsMode, catFilterSelected, openFilter, setConnectionsMode));
    if (catFilterSelected) {
      //if true, means we have a category filter selected
      navButtonPropsList = navButtonPropsList.concat(cat.books.map((book) =>
        getLibraryNavButtonBookProps(book, cat, connectionsMode, catFilterSelected, openFilter)
      ));
   }
  }
  return navButtonPropsList;
}

const makeLibraryNavButton = (props) => {
  /**
   * Must pass `key` prop explicitly
   */
  const key = props.key;
  delete props.key;
  return (
      <LibraryNavButton
          key={key}
          {...props}
      />
  );
};

const MainMenuButtons = ({linkSummary,
                           connectionsMode,
                           openFilter,
                           relatedHasError,
                           sheet,
                           themeStr,
                           translations,
                           setConnectionsMode,
                           reloadRelated,
                           relatedData,
                           shareCurrentSegment,
                           viewOnSite,
                           reportError}) => {
  const [showAllRelated, setShowAllRelated] = useState(false);
  const toggleShowAllRelated = () => setShowAllRelated(!showAllRelated);
  let navButtonPropsList = getLibraryNavButtonPropsList(linkSummary, connectionsMode, openFilter, setConnectionsMode, showAllRelated);
  const collapsedTopLevelLimit = 3;
  const buttonsOverload = navButtonPropsList.length > collapsedTopLevelLimit;
  let string, icon;
  if (buttonsOverload && !showAllRelated) {
    navButtonPropsList = navButtonPropsList.slice(0, collapsedTopLevelLimit);
    string = 'more';
    icon = 'more';
  } else if (buttonsOverload) {
    string = 'less';
    icon = 'up'
  }
  const navButtons = navButtonPropsList.map(props => makeLibraryNavButton(props));
  if (buttonsOverload) {navButtons.push(<ToolsButton
        onPress={toggleShowAllRelated}
        text={strings[string]}
        icon={iconData.get(icon, themeStr)}
        key='showMreLessButton'
    />)}
  return (<>
    <TopButtons
      relatedHasError={relatedHasError}
      sheet={sheet}
      themeStr={themeStr}
      versionsCount={translations.versions.length}
      setConnectionsMode={setConnectionsMode}
      reloadRelated={reloadRelated}
    />
    <ConnectionsPanelSection title={strings.relatedTexts}>{navButtons}</ConnectionsPanelSection>
    <ResourcesList
      themeStr={themeStr}
      topicsCount={relatedData.topics ? Sefaria.links.topicsCount(relatedData.topics) : 0}
      sheetsCount={relatedData.sheets ? relatedData.sheets.length : 0}
      setConnectionsMode={setConnectionsMode}
    />
    <ToolsList
      themeStr={themeStr}
      sheet={sheet}
      shareCurrentSegment={shareCurrentSegment}
      viewOnSite={viewOnSite}
      reportError={reportError}
    />
  </>);
}
MainMenuButtons.propTypes = {
  linkSummary: PropTypes.array.isRequired,
  connectionsMode: PropTypes.string,
  openFilter: PropTypes.func.isRequired,
  relatedHasError: PropTypes.bool.isRequired,
  sheet: PropTypes.object,
  themeStr: PropTypes.string.isRequired,
  translations: PropTypes.object.isRequired,
  setConnectionsMode: PropTypes.func.isRequired,
  reloadRelated: PropTypes.func.isRequired,
  relatedData: PropTypes.object.isRequired,
  shareCurrentSegment: PropTypes.func.isRequired,
  viewOnSite: PropTypes.func.isRequired,
  reportError: PropTypes.func.isRequired,
}

const ToolsButton = ({ text, onPress, icon, count }) => {
  const { theme, themeStr, interfaceLanguage } = useGlobalState();
  const textStyle = interfaceLanguage === "english" ? styles.enInt : styles.heInt;
  const flexDir = interfaceLanguage === "english" ? null : styles.rtlRow;
  const hasIcon = !!icon;
  icon = icon || iconData.get('sheet', themeStr);  // default to arbitrary icon that will be invisible if icon wasn't passed
  const iconComp = (<View style={[styles.toolsButtonIcon, flexDir, hasIcon ? null : styles.readerNavSectionMoreInvisible]}><Image source={icon} style={styles.menuButton} resizeMode={'contain'}></Image></View>);
  const countComp = !!count || count === 0 ? <Text style={[styles.enInt, theme.secondaryText, styles.spacedText]}>{` (${count}) `}</Text> : null
  return (
    <SefariaPressable
      extraStyles={[styles.searchFilterCat, styles.toolsButton, flexDir, theme.bordered, {height: 36}]}
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
  const { theme, interfaceLanguage } = useGlobalState();
  return (
    <View style={styles.connectionPanelSection} >
      {!!title &&
        <View style={[styles.connectionPanelTitle, theme.lightGreyBorder]}>
          <Text style={[interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt, theme.tertiaryText]}>
            {title}
          </Text>
        </View>
      }
      <View style={styles.connectionPanelSectionFirstButton}>
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
      {relatedHasError && <ToolsButton
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
    sheet:              PropTypes.object,
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
        {!!topicsCount && <ToolsButton
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
  sheet:              PropTypes.object,
};

export default ConnectionsPanel;
