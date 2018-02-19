import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
} from 'react-native';

import {
  LoadingView,
} from './Misc.js';

import HTMLView from 'react-native-htmlview';
import strings from './LocalizedStrings';
import styles from './Styles.js';

const DEFAULT_LINK_CONTENT = {en: "Loading...", he: "טוען...", sectionRef: ""};

class TextList extends React.Component {
  static propTypes = {
    theme:           PropTypes.object.isRequired,
    themeStr:        PropTypes.string.isRequired,
    settings:        PropTypes.object.isRequired,
    textLanguage:    PropTypes.oneOf(["english", "hebrew", "bilingual"]),
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
      isNewSegment: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.segmentRef !== nextProps.segmentRef) {
      this.setState({isNewSegment:true});
    } else if (this.props.recentFilters !== nextProps.recentFilters ||
               this.props.connectionsMode !== nextProps.connectionsMode ||
               this.props.filterIndex !== nextProps.filterIndex ||
               this.props.listContents !== nextProps.listContents) {
      this.setState({dataSource: this.generateDataSource(nextProps)});
    }
  }

  componentDidUpdate() {
    if (this.state.isNewSegment)
      this.setState({isNewSegment:false});
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
        //changeString: [linkRef, loading, props.settings.fontSize, props.textLanguage].join("|"),
        versionTitle: filter.versionTitle,
        versionLanguage: filter.versionLanguage,
        pos: index,
        displayRef,
        content: props.listContents[index],
      };
    });
  };

  renderItem = ({ item }) => {
    const loading = item.content == null;
    const linkContentObj = loading ? DEFAULT_LINK_CONTENT : item.content;
    return (<ListItem
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              settings={this.props.settings}
              openRef={this.props.openRef}
              refStr={item.ref}
              versionTitle={item.versionTitle}
              versionLanguage={item.versionLanguage}
              linkContentObj={linkContentObj}
              textLanguage={this.props.textLanguage}
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
    if (this.state.isNewSegment) { return null; } // hacky way to reset scroll postion
    return (
      <FlatList
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
    settings:          PropTypes.object,
    openRef:           PropTypes.func.isRequired,
    refStr:            PropTypes.string,
    versionTitle:      PropTypes.string,
    versionLanguage:   PropTypes.string,
    linkContentObj:    PropTypes.object, /* of the form {en,he} */
    textLanguage:      PropTypes.string,
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
        this.props.settings.fontSize !== nextProps.settings.fontSize) {
      this.setState({ resetKeyEn: Math.random(), resetKeyHe: Math.random() }); //hacky fix to reset htmlview when theme colors change
    }
  }
  render() {
    var lco = this.props.linkContentObj;
    var lang = Sefaria.util.getTextLanguageWithContent(this.props.textLanguage,lco.en,lco.he);
    var textViews = [];

    var hebrewElem =  <HTMLView
                        key={this.state.resetKeyHe}
                        stylesheet={styles}
                        value={"<hediv>"+lco.he+"</hediv>"}
                        textComponentProps={
                          {
                            style: [styles.hebrewText, styles.linkContentText, this.props.theme.text, {fontSize: this.props.settings.fontSize, lineHeight: this.props.settings.fontSize * 1.1}],
                            key: this.props.refStr+"-he"
                          }
                        }
                      />;
    var englishElem = <HTMLView
                        key={this.state.resetKeyEn}
                        stylesheet={styles}
                        value={"<endiv>"+"&#x200E;"+lco.en+"</endiv>"}
                        textComponentProps={
                          {
                            style: [styles.englishText, styles.linkContentText, this.props.theme.text, {fontSize: 0.8 * this.props.settings.fontSize, lineHeight: this.props.settings.fontSize}],
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

    // versionLanguage should only be defined when TextList is in VersionsBox. Otherwise you should open default version for that link
    const versions = this.props.versionLanguage ? {[this.props.versionLanguage]: this.props.versionTitle} : null;
    return (
      <TouchableOpacity style={[styles.searchTextResult, this.props.theme.searchTextResult]} onPress={()=>{this.props.openRef(this.props.refStr, versions)}}>
        {this.props.displayRef ? null : <Text style={[styles.en, styles.textListCitation, this.props.theme.textListCitation]}>{this.props.refStr}</Text>}
        {textViews}
      </TouchableOpacity>
    );
  }
}

export default TextList;
