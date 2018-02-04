import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
} from 'react-native';

const {
  LoadingView,
} = require('./Misc.js');

import HTMLView from 'react-native-htmlview';
const strings = require('./LocalizedStrings');
const styles = require('./Styles.js');

const DEFAULT_LINK_CONTENT = {en: "Loading...", he: "טוען...", sectionRef: ""};

class TextList extends React.Component {
  static propTypes = {
    theme:           PropTypes.object.isRequired,
    themeStr:        PropTypes.string.isRequired,
    settings:        PropTypes.object.isRequired,
    textLanguage:    PropTypes.oneOf(["english", "hebrew", "bilingual"]),
    recentFilters:   PropTypes.array.isRequired,
    filterIndex:     PropTypes.number,
    linkContents:    PropTypes.array,
    openRef:         PropTypes.func.isRequired,
    loadLinkContent: PropTypes.func.isRequired,
    updateCat:       PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    switch (props.connectionsMode) {
      case "filter":
        this.renderItem = this.renderItemLink;
        this.onViewableItemsChanged = this.onViewableItemsChangedLink;
        break;
      case "version open":
        break;
    }

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
               this.props.linkContents !== nextProps.linkContents) {
      this.setState({dataSource: this.generateDataSource(nextProps)});
    }
  }

  componentDidUpdate() {
    if (this.state.isNewSegment)
      this.setState({isNewSegment:false});
  }

  generateDataSource = (props) => {
    const linkFilter = props.recentFilters[props.filterIndex];
    if (!linkFilter) {
      return [];
    }
    const isCommentaryBook = linkFilter.category === "Commentary" && linkFilter.title !== "Commentary"
    return linkFilter.refList.map((linkRef, index) => {
      const key = `${props.segmentRef}|${linkRef}`;
      const loading = props.linkContents[index] === null;
      return {
        key,
        ref: linkRef,
        //changeString: [linkRef, loading, props.settings.fontSize, props.textLanguage].join("|"),
        pos: index,
        isCommentaryBook: isCommentaryBook,
        content: props.linkContents[index],
      };
    });
  };

  renderItemLink = ({ item }) => {
    const loading = item.content == null;
    const linkContentObj = loading ? DEFAULT_LINK_CONTENT : item.content;
    return (<LinkContent
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              settings={this.props.settings}
              openRef={this.props.openRef}
              refStr={item.ref}
              linkContentObj={linkContentObj}
              textLanguage={this.props.textLanguage}
              loading={loading}
              isCommentaryBook={item.isCommentaryBook}
    />);
  };

  onViewableItemsChangedLink = ({viewableItems, changed}) => {
    for (let item of viewableItems) {
      if (item.item.content === null) {
        this.props.loadLinkContent(item.item.ref, item.item.pos);
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
            <EmptyLinksMessage theme={this.props.theme} />
          </View>
        }
      />
    );
  }
}

class EmptyLinksMessage extends React.Component {
  static propTypes = {
    theme:         PropTypes.object.isRequired,
    interfaceLang: PropTypes.string
  };

  render() {
    return (<Text style={[styles.emptyLinksMessage, this.props.theme.secondaryText]}>{strings.noConnectionsMessage}</Text>);
  }
}

class LinkContent extends React.PureComponent {
  static propTypes = {
    theme:             PropTypes.object.isRequired,
    settings:          PropTypes.object,
    openRef:           PropTypes.func.isRequired,
    refStr:            PropTypes.string,
    linkContentObj:    PropTypes.object, /* of the form {en,he} */
    textLanguage:      PropTypes.string,
    loading:           PropTypes.bool,
    isCommentaryBook:  PropTypes.bool
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

    return (
      <TouchableOpacity style={[styles.searchTextResult, this.props.theme.searchTextResult]} onPress={()=>{this.props.openRef(this.props.refStr, this.props.linkContentObj.sectionRef)}}>
        {this.props.isCommentaryBook ? null : <Text style={[styles.en, styles.textListCitation, this.props.theme.textListCitation]}>{this.props.refStr}</Text>}
        {textViews}
      </TouchableOpacity>
    );
  }
}

module.exports = TextList;
