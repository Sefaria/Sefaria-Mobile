'use strict';
import PropTypes from 'prop-types';
import React from 'react';

import {
  TouchableOpacity,
  Text,
  View,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import ActionSheet from 'react-native-action-sheet';

import {
  InterfaceText,
  SText,
} from '../Misc';
import styles from '../Styles';
import strings from '../LocalizedStrings';
import { Topic } from '../Topic';
import {iconData} from "../IconData";

class AutocompleteList extends React.Component {
  static propTypes = {
    interfaceLanguage:   PropTypes.oneOf(["english", "hebrew"]).isRequired,
    theme:    PropTypes.object.isRequired,
    themeStr: PropTypes.string.isRequired,
    query:    PropTypes.string,
    openRef:  PropTypes.func.isRequired,
    openTextTocDirectly: PropTypes.func.isRequired,
    openTopic:     PropTypes.func.isRequired,
    setCategories: PropTypes.func.isRequired,
    search:   PropTypes.func.isRequired,
    openUri: PropTypes.func.isRequired,
    setQueryRef: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      completions: [],
      completionsLang: null,
      recentQueries: Sefaria.recentQueries.map(q => ({...q})),
    }
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.query !== prevProps.query) {
      this.onQueryChange(this.props.query);
    }
  }

  shouldQueryOpenToc = ({ is_book, is_node, is_section, is_segment, is_range }) => {
    return is_book || (is_node && !(is_section || is_segment || is_range));
  }

  onQueryChange = q => {
    if (q.length >= 3) {
      Sefaria.api.name(q, true)
      .then(results => {
        if (this._isMounted) {
          const typeToValue = { "ref": 1, "toc": 3, "topic": 2, "persontopic": 2, "authortopic": 4, "user": 5, "collection": 6 };
          let completions = results.completion_objects.map((c,i) =>
          {
            c.type = c.type.toLowerCase()
            if (i === 0) {typeToValue[c.type] = 0;}  // priveledge the first results' type
            return c;
          })
          .stableSort((a,b) => typeToValue[a.type] - typeToValue[b.type])
          .concat([{title: `Search for: "${this.props.query}"`, type: "searchFor"}]); // always add a searchFor element at the bottom
          this.props.setQueryRef(null, false);
          if (results.is_ref && !!results.ref) {
            // manually add ref item to list
            function lastSectionName(data) {
              return data?.sectionNames?.[data.sections.length-1];
            }
            const queryRef = Sefaria.addPageToWholeDafRef(results.ref, lastSectionName(results));
            this.props.setQueryRef(queryRef, results.index, this.shouldQueryOpenToc(results));
            completions.unshift({
              title: results.ref,
              key: refQuery,
              type: 'ref',
              is_primary: true,
            });
          } else if (results.topic_slug) {
            // manually add topic item to list
            completions = completions.filter(c => !(c.key == results.topic_slug && c.type == 'topic'));
            completions.unshift({
              title: q.substring(1),
              key: results.topic_slug,
              type: 'topic',
            });

          }
          this.setState({completions, completionsLang: results.lang})
        }
      })
      .catch(error => {

      })
    } else {
      this.setState({completions: []});
    }
  };
  close = () => {
    this.setState({completions: []});
  }
  openItem = (item) => {
    let recentType;
    if ((item.type === 'ref' && !!Sefaria.booksDict[item.key]) || item.type == 'book') {
      // actually a book ref so open toc
      this.props.openTextTocDirectly(item.key);
      recentType = "book";
    }
    else if (item.type == 'ref') {
      this.props.openRef(item.key);
      recentType = "ref";
    }
    else if (item.type == "person" || item.type == "group") {
      recentType = item.type;
      ActionSheet.showActionSheetWithOptions(
        {
          options: [`View '${item.title}' on Sefaria site`,strings.cancel],
          cancelButtonIndex: 1,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            const uri = item.type == 'person' ? `https://www.sefaria.org/person/${item.key}` : `https://www.sefaria.org/groups/${item.key.split(' ').join('-')}`;
            this.props.openUri(uri);
          }
        }
      );
    } else if (item.type == "toccategory" || item.type == 'toc') {
      this.props.setCategories(item.key);
      recentType = "toc";
    } else if (item.type == "topic" || item.type == "persontopic" || item.type == "authortopic") {
      recentType = item.type;
      this.props.openTopic(new Topic({ slug: item.key }));
    } else if (item.type == "user") {
      recentType = "user";
      this.props.openUri(`${Sefaria.api._baseHost}profile/${item.key}`);
    } else if (item.type == "collection") {
      recentType = "collection";
      this.props.openUri(`${Sefaria.api._baseHost}collections/${item.key}`);
    }
    Sefaria.saveRecentQuery(item.title, recentType, item.key, item.pic);
  };

  openItemOLD = (query, index) => {
    // Older versions of the app only saved query and type for the recent item
    // this meant that the app needed to make an extra api call to get the key to open the relevant item
    const [currList, currListKey] = this.state.completions[index] ? [this.state.completions, "completions"] : [this.state.recentQueries, "recentQueries"];
    currList[index].loading = true;
    this.setState({[currListKey]: currList});
    Sefaria.api.name(query, false).then(d => {
      currList[index].loading = false;
      this.setState({[currListKey]: currList});
      // If the query isn't recognized as a ref, but only for reasons of capitalization. Resubmit with recognizable caps.
      if (Sefaria.api.isACaseVariant(query, d)) {
        this.openRef(Sefaria.api.repairCaseVariant(query, d));
        return;
      }
      let recentType;
      if (d.is_book) {
        this.props.openTextTocDirectly(d.book);
        recentType = "book";
      }
      else if (d.is_ref) {
        this.props.openRef(d.ref);
        recentType = "ref";
      }
      else if (d.type == "Group") {
        recentType = d.type.toLowerCase;
        ActionSheet.showActionSheetWithOptions(
          {
            options: [`View '${d.key}' on Sefaria site`,strings.cancel],
            cancelButtonIndex: 1,
          },
          (buttonIndex) => {
            if (buttonIndex === 0) {
              if (d.type == "Group") {
                this.props.openUri(`https://www.sefaria.org/groups/${d.key.split(' ').join('-')}`);
              }
            }
          }
        );
      } else if (d.type == "TocCategory") {
        this.props.setCategories(d.key);
        recentType = "toc";
      } else if (d.type == "Group") {
        recentType = "group"
      } else if (d.type == "Topic" || d.type == "PersonTopic" || d.type == "AuthorTopic") {
        recentType = d.type.toLowerCase();
        this.props.openTopic(new Topic({slug: d.key}));
      } else if (d.type == "User") {
        recentType = "user";
        this.props.openUri(`${Sefaria.api._baseHost}profile/${d.key}`);
      } else if (d.type == "Collection") {
        recentType = "collection";
        this.props.openUri(`${Sefaria.api._baseHost}collections/${d.key}`);
      }
      Sefaria.saveRecentQuery(query, recentType, d.key, d.pic);
    });
  };

  renderItem = ({ item, index }) => {
    if (item.query) { item.title = item.query; }
    // toc queries get saved as arrays
    const isHeb = this.state.completionsLang === 'he';
    let src;
    switch (item.type) {
      case "searchFor":
      case "query":
        src = iconData.get('search', this.props.themeStr);
        break;
      case "ref":
      case "book":
        src = iconData.get('book', this.props.themeStr);
        break;
      case "toc":
      case "toccategory":
        src = iconData.get('category', this.props.themeStr);
        break;
      case "group":
        src = iconData.get('group', this.props.themeStr);
        break;        
      case "authortopic":
        src = iconData.get('quill', this.props.themeStr);
        break;
      case "persontopic":
      case "topic":
        src = iconData.get('hashtag', this.props.themeStr);
        break;
      case "user":
        src = item.pic.length ? {uri: item.pic} : (iconData.get('user', this.props.themeStr));
        break;
      case "collection":
        src = iconData.get('layers', this.props.themeStr);
        break;
    }
    return (
      <TouchableOpacity
        style={[{flexDirection: this.props.interfaceLanguage === "hebrew" ? 'row-reverse' : 'row'}, styles.autocompleteItem, this.props.theme.lighterGreyBorder]}
        onPress={()=>{
          if (item.type === 'query') {
            this.props.search(item.title || item.query);
          } else if (item.type === 'searchFor') {
            this.props.search(this.props.query);
          } else {
            if (item.key) { this.openItem(item); }
            else {
              // dont have key, need to query for item again
              this.openItemOLD(item.query, index);
            }      
          }
        }}>
        <Image source={src}
          style={[styles.menuButtonMargined]}
          resizeMode={'contain'}
        />
        <SText lang={isHeb ? "hebrew" : "english"} style={[styles.autocompleteItemText, this.props.theme.text, {textAlign: this.props.interfaceLanguage === "hebrew" ? 'right' : 'left', fontFamily: isHeb ? 'Heebo' : 'Amiri', paddingTop: 5, marginTop: isHeb ? 0 : 5}]}>
          { (item.type === 'toc' || item.type === 'toccategory') ? item.title.toUpperCase() : item.title }
        </SText>
        {item.loading ? (<Text style={[{paddingHorizontal: 10}, this.props.theme.secondaryText, !isHeb ? styles.enInt : styles.heInt]}>
          { strings.loading }
        </Text>) : null}
      </TouchableOpacity>
    )
  };

  _keyExtractor = (item, pos) => {
    return (item.title || item.query) + "|" + pos;
  };

  render() {
    const isheb = this.props.interfaceLanguage === "hebrew";
    const langStyle = !isheb ? styles.enInt : styles.heInt;
    return (

        Platform.OS == "ios" ?

            (<KeyboardAvoidingView style={[styles.autocompleteList, this.props.theme.mainTextPanel, this.props.theme.lighterGreyBorder]} behavior="padding">
              {!!this.state.completions.length ?
                <FlatList
                  keyExtractor={this._keyExtractor}
                  contentContainerStyle={{paddingBottom: 20}}
                  keyboardShouldPersistTaps={'handled'}
                  data={this.state.completions}
                  renderItem={this.renderItem}
                />
                :
                <View style={styles.flex1}>
                  <View style={[{paddingVertical: 15, borderBottomWidth: 1}, this.props.theme.lighterGreyBorder]}>
                    <InterfaceText stringKey={"recentSearches"} extraStyles={[this.props.theme.tertiaryText, styles.fontBold, styles.fontSize16]} />
                  </View>
                  <FlatList
                    keyExtractor={this._keyExtractor}
                    contentContainerStyle={{paddingBottom: 20}}
                    keyboardShouldPersistTaps={'handled'}
                    data={this.state.recentQueries}
                    renderItem={this.renderItem}
                  />
                </View>
              }
            </KeyboardAvoidingView>)

        : (!!this.state.completions.length ?
                <FlatList
                  keyExtractor={this._keyExtractor}
                  contentContainerStyle={{paddingBottom: 20}}
                  keyboardShouldPersistTaps={'handled'}
                  data={this.state.completions}
                  renderItem={this.renderItem}
                />
                :
                <View style={styles.flex1}>
                  <View style={[{paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: 1}, this.props.theme.lighterGreyBorder]}>
                    <Text style={[this.props.theme.searchResultSummaryText, langStyle, this.props.theme.secondaryText]}>{strings.recentSearches}</Text>
                  </View>
                  <FlatList
                    keyExtractor={this._keyExtractor}
                    contentContainerStyle={{paddingBottom: 20}}
                    keyboardShouldPersistTaps={'handled'}
                    data={this.state.recentQueries}
                    renderItem={this.renderItem}
                  />
              </View>)


    );
  }
}

export default AutocompleteList;
