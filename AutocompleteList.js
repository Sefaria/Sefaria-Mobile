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
  SText,
} from './Misc';
import styles from './Styles';
import strings from './LocalizedStrings';
import { Topic } from './Topic';

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

  onQueryChange = q => {
    if (q.length >= 3) {
      Sefaria.api.name(q, true)
      .then(results => {
        if (this._isMounted) {
          const typeToValue = { "ref": 1, "person": 4, "toc": 3, "topic": 2, "user": 5 };
          let completions = results.completion_objects.map((c,i) =>
          {
            c.type = c.type.toLowerCase()
            if (i === 0) {typeToValue[c.type] = 0;}  // priveledge the first results' type
            return c;
          })
          .stableSort((a,b) => typeToValue[a.type] - typeToValue[b.type])
          .concat([{title: `Search for: "${this.props.query}"`, type: "searchFor"}]); // always add a searchFor element at the bottom
          if (results.is_ref && results.ref) {
            // manually add ref item to list
            completions.unshift({
              title: results.ref,
              key: results.ref,
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
    } else if (item.type == "topic") {
      recentType = "topic";
      this.props.openTopic(new Topic({ slug: item.key }));
    } else if (item.type == "user") {
      recentType = "user";
      this.props.openUri(`https://www.sefaria.org/profile/${item.key}`);
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
      else if (d.type == "Person" || d.type == "Group") {
        recentType = d.type.toLowerCase;
        ActionSheet.showActionSheetWithOptions(
          {
            options: [`View '${d.key}' on Sefaria site`,strings.cancel],
            cancelButtonIndex: 1,
          },
          (buttonIndex) => {
            if (buttonIndex === 0) {
              if (d.type == "Person") {
                this.props.openUri(`https://www.sefaria.org/person/${d.key}`);
              } else if (d.type == "Group") {
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
      } else if (d.type == "Topic") {
        recentType = "topic";
        this.props.openTopic(new Topic({slug: d.key}));
      } else if (d.type == "User") {
        recentType = "user";
        this.props.openUri(`https://www.sefaria.org/profile/${d.key}`);
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
        src = this.props.themeStr === "white" ? require("./img/search.png") : require("./img/search-light.png");
        break;
      case "ref":
      case "book":
        src = this.props.themeStr === "white" ? require("./img/book.png") : require("./img/book-light.png");
        break;
      case "toc":
      case "toccategory":
        src = this.props.themeStr === "white" ? require("./img/category.png") : require("./img/category-light.png");
        break;
      case "group":
        src = this.props.themeStr === "white" ? require("./img/group.png") : require("./img/group-light.png");
        break;        
      case "person":
        src = this.props.themeStr === "white" ? require("./img/quill.png") : require("./img/quill-light.png");
        break;
      case "topic":
        src = this.props.themeStr === "white" ? require("./img/hashtag.png") : require("./img/hashtag-light.png");
        break;
      case "user":
        src = {uri: item.pic};
        break;
    }
    return (
      <TouchableOpacity
        style={[{flexDirection: isHeb ? 'row-reverse' : 'row'}, styles.autocompleteItem, this.props.theme.bordered]}
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
        <SText lang={isHeb ? "hebrew" : "english"} style={[styles.autocompleteItemText, this.props.theme.text, {textAlign: isHeb ? 'right' : 'left', fontFamily: isHeb ? 'Heebo' : 'Amiri', paddingTop: 5, marginTop: isHeb ? 0 : 5}]}>
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

            (<KeyboardAvoidingView style={[styles.autocompleteList, this.props.theme.container, this.props.theme.bordered]} behavior="padding">
              {!!this.state.completions.length ?
                <FlatList
                  keyExtractor={this._keyExtractor}
                  contentContainerStyle={{paddingBottom: 20}}
                  keyboardShouldPersistTaps={'handled'}
                  data={this.state.completions}
                  renderItem={this.renderItem}
                />
                :
                <View style={{flex:1}}>
                  <View style={[{paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: 1}, this.props.theme.bordered]}>
                    <Text style={[this.props.theme.searchResultSummaryText, langStyle, this.props.theme.secondaryText]}>{strings.recentSearches}</Text>
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
                <View style={{flex:1}}>
                  <View style={[{paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: 1}, this.props.theme.bordered]}>
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
