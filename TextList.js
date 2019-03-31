import React from 'react';
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

import HTMLView from 'react-native-htmlview';
import strings from './LocalizedStrings';
import styles from './Styles.js';

const DEFAULT_LINK_CONTENT = {en: strings.loading, he: "", sectionRef: ""};
const NO_CONTENT_LINK_CONTENT = {en: strings.noContent, he: "", sectionRef: ""}

class TextList extends React.Component {
  static propTypes = {
    theme:           PropTypes.object.isRequired,
    themeStr:        PropTypes.string.isRequired,
    fontSize:        PropTypes.number.isRequired,
    textLanguage:    PropTypes.oneOf(["english", "hebrew", "bilingual"]),
    menuLanguage:    PropTypes.oneOf(["english", "hebrew"]).isRequired,
    interfaceLang:   PropTypes.oneOf(["english", "hebrew"]).isRequired,
    recentFilters:   PropTypes.array.isRequired,
    filterIndex:     PropTypes.number,
    listContents:    PropTypes.array,
    openRef:         PropTypes.func.isRequired,
    loadContent:     PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    const dataSource = this.generateDataSource(props);
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
      const updateScrollPosKey = this.props.segmentRef !== nextProps.segmentRef ? !this.state.updateScrollPosKey : this.state.updateScrollPosKey;
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
    return (<ListItem
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              fontSize={this.props.fontSize}
              openRef={this.props.openRef}
              refStr={item.ref}
              heRefStr={item.heRef}
              category={item.category}
              versionTitle={item.versionTitle}
              versionLanguage={item.versionLanguage}
              linkContentObj={linkContentObj}
              menuLanguage={this.props.menuLanguage}
              textLanguage={this.props.textLanguage}
              interfaceLang={this.props.interfaceLang}
              loading={loading}
              displayRef={item.displayRef}
    />);
  };

  onViewableItemsChanged = ({viewableItems, changed}) => {
    for (let vItem of viewableItems) {
      const { item } = vItem;
      if (item.content === null) {
        this.props.loadContent(item.ref, item.pos, item.versionTitle, item.versionLanguage);
      }
    }
  };

  render() {
    return (
      <FlatList
        key={this.state.updateScrollPosKey}
        style={styles.scrollViewPaddingInOrderToScroll}
        data={this.state.dataSource}
        renderItem={this.renderItem}
        contentContainerStyle={{justifyContent: "center"}}
        onViewableItemsChanged={this.onViewableItemsChanged}
        ListEmptyComponent={
          <View style={styles.noLinks}>
            <EmptyListMessage theme={this.props.theme} />
          </View>
        }
      />
    );
  }
}

class EmptyListMessage extends React.Component {
  static propTypes = {
    theme:         PropTypes.object.isRequired,
    interfaceLang: PropTypes.string
  };

  render() {
    return (<Text style={[styles.emptyLinksMessage, this.props.theme.secondaryText]}>{strings.noConnectionsMessage}</Text>);
  }
}

class ListItem extends React.PureComponent {
  static propTypes = {
    theme:             PropTypes.object.isRequired,
    fontSize:          PropTypes.number.isRequired,
    openRef:           PropTypes.func.isRequired,
    refStr:            PropTypes.string,
    heRefStr:          PropTypes.string,
    versionTitle:      PropTypes.string,
    category:          PropTypes.string,
    versionLanguage:   PropTypes.oneOf(["en", "he"]),
    linkContentObj:    PropTypes.object, /* of the form {en,he} */
    textLanguage:      PropTypes.string,
    menuLanguage:      PropTypes.string,
    interfaceLang:     PropTypes.string,
    loading:           PropTypes.bool,
    displayRef:        PropTypes.bool
  };
  constructor(props) {
    super(props);
    this.state = {
      resetKeyEn: 0,
      resetKeyHe: 1,
    };
  }
  componentWillReceiveProps(nextProps) {
    if (this.props.themeStr !== nextProps.themeStr ||
        this.props.fontSize !== nextProps.fontSize) {
      this.setState({ resetKeyEn: Math.random(), resetKeyHe: Math.random() }); //hacky fix to reset htmlview when theme colors change
    }
  }
  openRef = () => {
    // versionLanguage should only be defined when TextList is in VersionsBox. Otherwise you should open default version for that link
    const versions = this.props.versionLanguage ? {[this.props.versionLanguage]: this.props.versionTitle} : null;
    this.props.openRef(this.props.refStr, versions);
  }
  openActionSheet = () => {
    ActionSheet.showActionSheetWithOptions({
      options: [`${strings.open} ${this.props.versionLanguage ? strings.version :
        Sefaria.getTitle(this.props.refStr, this.props.heRefStr, this.props.category === 'Commentary', this.props.interfaceLang === "hebrew")}`,strings.cancel],
      cancelButtonIndex: 1,
    },
    (buttonIndex) => {
      if (buttonIndex === 0) { this.openRef(); }
    });
  }
  render() {
    var lco = this.props.linkContentObj;
    var lang = Sefaria.util.getTextLanguageWithContent(this.props.textLanguage,lco.en,lco.he);
    var textViews = [];
    const he = Sefaria.util.getDisplayableHTML(lco.he, "hebrew");
    const en = Sefaria.util.getDisplayableHTML(lco.en, "english");
    const lineHeightMultiplierHe = Platform.OS === 'android' ? 1.3 : 1.2;
    const smallEnSheet = {
      small: {
        fontSize: this.props.fontSize * 0.8 * 0.8
      }
    };
    const smallHeSheet = {
      small: {
        fontSize: this.props.fontSize * 0.8
      }
    };
    var hebrewElem =  <HTMLView
                        key={this.state.resetKeyHe}
                        stylesheet={{...styles, ...smallHeSheet}}
                        value={he}
                        textComponentProps={
                          {
                            style: [styles.hebrewText, styles.linkContentText, this.props.theme.text, {fontSize: this.props.fontSize, lineHeight: this.props.fontSize * lineHeightMultiplierHe}],
                            key: this.props.refStr+"-he"
                          }
                        }
                      />;
    var englishElem = <HTMLView
                        key={this.state.resetKeyEn}
                        stylesheet={{...styles, ...smallEnSheet}}
                        value={en}
                        textComponentProps={
                          {
                            style: [styles.englishText, styles.linkContentText, this.props.theme.text, {fontSize: 0.8 * this.props.fontSize, lineHeight: this.props.fontSize * 1.04}],
                            key: this.props.refStr+"-en"
                          }
                        }
                      />;
    if (lang == "bilingual") {
      textViews = [hebrewElem, englishElem];
    } else if (lang == "hebrew") {
      textViews = [hebrewElem];
    } else if (lang == "english") {
      textViews = [englishElem];
    }

    const refTitleStyle = this.props.menuLanguage === 'hebrew' ? styles.he : styles.en;
    const refStr = this.props.menuLanguage === 'hebrew' ? this.props.heRefStr : this.props.refStr;
    return (
      <TouchableOpacity style={[styles.textListItem, this.props.theme.searchTextResult]} onPress={this.openActionSheet} delayPressIn={200}>
        {this.props.displayRef ? null : <Text style={[refTitleStyle, styles.textListCitation, this.props.theme.textListCitation]}>{refStr}</Text>}
        {textViews}
      </TouchableOpacity>
    );
  }
}

export default TextList;
