import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import ActionSheet from 'react-native-action-sheet';

import {
  LoadingView,
} from './Misc.js';
import { GlobalStateContext, getTheme } from './StateManager';
import HTMLView from 'react-native-htmlview';
import strings from './LocalizedStrings';
import styles from './Styles.js';

const DEFAULT_LINK_CONTENT = {en: strings.loading, he: "", sectionRef: ""};
const NO_CONTENT_LINK_CONTENT = {en: strings.noContent, he: "", sectionRef: ""}

class TextList extends React.Component {
  static whyDidYouRender = true;
  static propTypes = {
    recentFilters:   PropTypes.array.isRequired,
    filterIndex:     PropTypes.number,
    listContents:    PropTypes.array,
    openRef:         PropTypes.func.isRequired,
    loadContent:     PropTypes.func.isRequired,
    textLanguage:    PropTypes.oneOf(['english', 'bilingual', 'hebrew']).isRequired,
    themeStr:        PropTypes.string.isRequired,
    fontSize:        PropTypes.number.isRequired,
  };

  constructor(props) {
    super(props);
    const dataSource = this.generateDataSource(props);
    this._savedHistorySegments = new Set();
    this._visibleSegments = [];
    this.state = {
      dataSource,
      updateScrollPosKey: true,
    };
  }


  componentWillReceiveProps(nextProps) {
    if (this.props.segmentRef !== nextProps.segmentRef ||
        this.props.recentFilters !== nextProps.recentFilters ||
        this.props.connectionsMode !== nextProps.connectionsMode ||
        this.props.filterIndex !== nextProps.filterIndex ||
        this.props.listContents !== nextProps.listContents) {
      let updateScrollPosKey = this.state.updateScrollPosKey;
      if (this.props.segmentRef !== nextProps.segmentRef) {
        // changed segments
        updateScrollPosKey = !this.state.updateScrollPosKey;
        this._visibleSegments = [];
        this._savedHistorySegments = new Set();
      }
      this.setState({dataSource: this.generateDataSource(nextProps), updateScrollPosKey});
    }
  }

  generateDataSource = (props) => {
    const filter = props.recentFilters[props.filterIndex];
    if (!filter) {
      return [];
    }
    const displayRef = filter.displayRef();
    return filter.refList.map((ref, index) => {
      const key = filter.listKey(index);
      const loading = props.listContents[index] === null;
      return {
        key,
        ref,
        heRef: filter.heRefList[index],
        //changeString: [ref, loading, props.fontSize, props.textLanguage].join("|"),
        versionTitle: filter.versionTitle,
        versionLanguage: filter.versionLanguage,
        pos: index,
        displayRef,
        category: filter.category,
        content: props.listContents[index],
      };
    });
  };

  renderItem = ({ item }) => {
    const loading = item.content === null;
    const noContent = !loading && item.content.he.length === 0 && item.content.en.length === 0;
    const linkContentObj = loading ? DEFAULT_LINK_CONTENT : (noContent ? NO_CONTENT_LINK_CONTENT : item.content);
    const visibleSeg = this._visibleSegments.find(seg => seg.item.ref === item.ref);
    if (!!visibleSeg && !loading) {
      visibleSeg.loaded = !loading;
      Sefaria.history.saveHistoryItem(this.getHistoryObject.bind(this, visibleSeg), true, this.onHistorySave);
    }
    return (
      <ListItem
        openRef={this.props.openRef}
        refStr={item.ref}
        heRefStr={item.heRef}
        category={item.category}
        versionTitle={item.versionTitle}
        versionLanguage={item.versionLanguage}
        linkContentObj={linkContentObj}
        loading={loading}
        displayRef={item.displayRef}
      />
    );
  };

  onViewableItemsChanged = ({viewableItems, changed}) => {
    for (let vItem of viewableItems) {
      const { item } = vItem;
      if (item.content === null) {
        this.props.loadContent(item.ref, item.pos, item.versionTitle, item.versionLanguage);
      }
    }
    for (let cItem of changed) {
      const ind = this._visibleSegments.findIndex(i => cItem.item.ref === i.item.ref);
      if (!cItem.isViewable) {
        if (ind !== -1) { this._visibleSegments.splice(ind, 1); }
        continue;
      }
      const loaded = cItem.item.content !== null;
      let visibleSeg = this._visibleSegments[ind];
      if (!visibleSeg) {
        visibleSeg = { item: cItem.item, loaded };
        this._visibleSegments.push(visibleSeg);
      } else {
        visibleSeg.loaded = loaded;
      }
      if (loaded) {
        Sefaria.history.saveHistoryItem(this.getHistoryObject.bind(this, visibleSeg), true, this.onHistorySave);
      }
    }
  };

  getHistoryObject = visibleSeg => {
    const { item, loaded } = visibleSeg;
    if (!loaded) { return {}; }
    if (this._savedHistorySegments.has(item.ref)) { return {}; }
    if (!this._visibleSegments.find(seg => seg.item.ref === item.ref)) { return {}; }
    return {
      book: Sefaria.textTitleForRef(item.ref),
      ref: item.ref,
      he_ref: item.heRef,
      versions: { [item.versionLanguage]: item.versionTitle },
      language: this.props.textLanguage,
      secondary: true,
    };
  };

  onHistorySave = history_item => {
    this._savedHistorySegments.add(history_item.ref);
  };

  render() {
    return (
      <FlatList
        key={this.state.updateScrollPosKey}
        style={styles.scrollViewPaddingInOrderToScroll}
        data={this.state.dataSource}
        extraData={`${this.props.fontSize}|${this.props.themeStr}`}
        renderItem={this.renderItem}
        contentContainerStyle={{justifyContent: "center"}}
        onViewableItemsChanged={this.onViewableItemsChanged}
        ListEmptyComponent={
          <View style={styles.noLinks}>
            <EmptyListMessage />
          </View>
        }
      />
    );
  }
}

const EmptyListMessage = () => (
  <GlobalStateContext.Consumer>
    {({ themeStr }) => (
      <Text
        style={[styles.emptyLinksMessage, getTheme(themeStr).secondaryText]}
      >
        {strings.noConnectionsMessage}
      </Text>
    )}
  </GlobalStateContext.Consumer>
);


const ListItem = ({
  openRef,
  refStr,
  heRefStr,
  versionTitle,
  category,
  versionLanguage,
  linkContentObj,
  loading,
  displayRef,
}) => {
  const { themeStr, fontSize, interfaceLanguage, textLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const tempOpenRef = () => {
    // versionLanguage should only be defined when TextList is in VersionsBox. Otherwise you should open default version for that link
    const versions = versionLanguage ? {[versionLanguage]: versionTitle} : null;
    openRef(refStr, versions);
  }
  const openActionSheet = () => {
    ActionSheet.showActionSheetWithOptions({
      options: [`${strings.open} ${versionLanguage ? strings.version :
        Sefaria.getTitle(refStr, heRefStr, category === 'Commentary', interfaceLanguage === "hebrew")}`,strings.cancel],
      cancelButtonIndex: 1,
    },
    (buttonIndex) => {
      if (buttonIndex === 0) { tempOpenRef(); }
    });
  }
  var lco = linkContentObj;
  var lang = Sefaria.util.getTextLanguageWithContent(textLanguage,lco.en,lco.he);
  var textViews = [];
  const he = Sefaria.util.getDisplayableHTML(lco.he, "hebrew");
  const en = Sefaria.util.getDisplayableHTML(lco.en, "english");
  const lineHeightMultiplierHe = Platform.OS === 'android' ? 1.3 : 1.2;
  const smallEnSheet = {
    small: {
      fontSize: fontSize * 0.8 * 0.8
    }
  };
  const smallHeSheet = {
    small: {
      fontSize: fontSize * 0.8
    }
  };
  var hebrewElem =  <HTMLView
                      key={"he"}
                      stylesheet={{...styles, ...smallHeSheet}}
                      value={he}
                      textComponentProps={{
                        style: [styles.hebrewText, styles.linkContentText, theme.text, {fontSize, lineHeight: fontSize * lineHeightMultiplierHe}],
                        key: refStr+"-he"
                      }}
                    />;
  var englishElem = <HTMLView
                      key={"en"}
                      stylesheet={{...styles, ...smallEnSheet}}
                      value={en}
                      textComponentProps={{
                        style: [styles.englishText, styles.linkContentText, theme.text, {fontSize: 0.8 * fontSize, lineHeight: fontSize * 1.04}],
                        key: refStr+"-en"
                      }}
                    />;
  if (lang == "bilingual") {
    textViews = [hebrewElem, englishElem];
  } else if (lang == "hebrew") {
    textViews = [hebrewElem];
  } else if (lang == "english") {
    textViews = [englishElem];
  }

  const refTitleStyle = textLanguage === 'hebrew' ? styles.he : styles.en;
  const tempRefStr = textLanguage === 'hebrew' ? heRefStr : refStr;
  return (
    <TouchableOpacity style={[styles.textListItem, theme.searchTextResult]} onPress={openActionSheet} delayPressIn={200}>
      {displayRef ? null : <Text style={[refTitleStyle, styles.textListCitation, theme.textListCitation]}>{tempRefStr}</Text>}
      {textViews}
    </TouchableOpacity>
  );
}
ListItem.propTypes = {
  openRef:           PropTypes.func.isRequired,
  refStr:            PropTypes.string,
  heRefStr:          PropTypes.string,
  versionTitle:      PropTypes.string,
  category:          PropTypes.string,
  versionLanguage:   PropTypes.oneOf(["en", "he"]),
  linkContentObj:    PropTypes.object, /* of the form {en,he} */
  loading:           PropTypes.bool,
  displayRef:        PropTypes.bool
};

export default TextList;
