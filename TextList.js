'use strict';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  Text,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import HTMLView from 'react-native-htmlview';
const styles         = require('./Styles');
const strings        = require('./LocalizedStrings');
const TextListHeader = require('./TextListHeader');
const LinkFilter     = require('./LinkFilter');

const {
  CategoryColorLine,
  TwoBox,
  LoadingView,
  LibraryNavButton,
} = require('./Misc.js');

const DEFAULT_LINK_CONTENT = {en: "Loading...", he: "טוען...", sectionRef: ""};

class TextList extends React.Component {
  static propTypes = {
    theme:           PropTypes.object.isRequired,
    themeStr:        PropTypes.oneOf(["white", "black"]).isRequired,
    interfaceLang:   PropTypes.oneOf(["english", "hebrew"]).isRequired,
    settings:        PropTypes.object,
    openRef:         PropTypes.func.isRequired,
    openCat:         PropTypes.func.isRequired,
    openFilter:      PropTypes.func.isRequired,
    closeCat:        PropTypes.func.isRequired,
    updateCat:       PropTypes.func.isRequired,
    linkSummary:     PropTypes.array,
    linkContents:    PropTypes.array,
    loading:         PropTypes.bool,
    segmentIndexRef: PropTypes.number,
    connectionsMode: PropTypes.string,
    filterIndex:     PropTypes.number,
    recentFilters:   PropTypes.array, /* of the form [{title,heTitle,refList}...] */
    textLanguage:    PropTypes.oneOf(["english","hebrew","bilingual"]),
    onDragStart:     PropTypes.func.isRequired,
    onDragMove:      PropTypes.func.isRequired,
    onDragEnd:       PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    Sefaria = props.Sefaria; //Is this bad practice to use getInitialState() as an init function
    const dataSource = this.generateDataSource(props);

    this.state = {
      dataSource,
      isNewSegment: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.segmentIndexRef !== nextProps.segmentIndexRef) {
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
      const key = `${props.segmentIndexRef}|${linkRef}`;
      const loading = props.linkContents[index] == null;
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

  renderItem = ({ item }) => {
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

  onViewableItemsChanged = ({viewableItems, changed}) => {
    for (let item of viewableItems) {
      if (item.item.content === null) {
        this.props.loadLinkContent(item.item.ref, item.item.pos);
      }
    }
  };

  render() {
    const isSummaryMode = this.props.connectionsMode === null;
    const textListHeader = (
      <View
        onStartShouldSetResponder={(evt)=>this.props.onDragStart(evt)}
        onResponderMove={(evt)=>this.props.onDragMove(evt)}
        onResponderRelease={(evt)=>this.props.onDragEnd(evt)}>
        <TextListHeader
          Sefaria={Sefaria}
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          interfaceLang={this.props.interfaceLang}
          updateCat={this.props.updateCat}
          openCat={this.props.openCat}
          closeCat={this.props.closeCat}
          category={isSummaryMode || true ? null : this.props.recentFilters[this.props.filterIndex].category}
          filterIndex={this.props.filterIndex}
          recentFilters={this.props.recentFilters}
          language={this.props.settings.language}
          connectionsMode={this.props.connectionsMode} />
      </View>
    );
    switch (this.props.connectionsMode) {
      case ('filter'):
        if (!this.state.isNewSegment) {
          // Using Dimensions to adjust marings on text at maximum line width because I can't figure out
          // how to get flex to center a component with maximum width without allows breaking the stretch
          // behavior of its contents, result in rows in the list view with small width if their content is small.
          var listViewStyles = [styles.textListContentListView];
          return (
          <View style={[styles.textColumn, this.props.theme.textListContentOuter, {maxWidth: null}]}>
            {textListHeader}
            {this.props.linkContents.length == 0 ?
              <View style={styles.noLinks}><EmptyLinksMessage theme={this.props.theme} /></View> :
              <FlatList
                data={this.state.dataSource}
                renderItem={this.renderItem}
                getItemLayout={this.getItemLayout}
                contentContainerStyle={{justifyContent: "center"}}
                onViewableItemsChanged={this.onViewableItemsChanged}
              />
            }
          </View>
          );
        } else {
          return null;
        }
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
                      this.props.openFilter(filter);
                    } else {
                      this.props.openCat(category);
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
                      this.props.openFilter(filter);
                      Sefaria.track.event("Reader","Text Filter Click",title);
                    }.bind(this,filter,obook.title)}
                    key={obook.title}
                  />
                );
              }));
              break;
            }
          }
          if (viewList.length == 0) { viewList = <EmptyLinksMessage theme={this.props.theme} />; }
          content = (<ScrollView contentContainerStyle={styles.textListSummaryScrollView}>{viewList}</ScrollView>);
        }
        return (
          <View style={[styles.textListSummary, this.props.theme.textListSummary]}>
            {textListHeader}
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
        withArrow={false} />
    );
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

class EmptyLinksMessage extends React.Component {
  static propTypes = {
    theme:         PropTypes.object.isRequired,
    interfaceLang: PropTypes.string
  };

  render() {
    return (<Text style={[styles.emptyLinksMessage, this.props.theme.secondaryText]}>{strings.noConnectionsMessage}</Text>);
  }
}


module.exports = TextList;
