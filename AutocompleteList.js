'use strict';
import PropTypes from 'prop-types';
import React from 'react';

import {
  TouchableOpacity,
  Text,
  View,
  FlatList,
  Linking,
  Image,
  ActionSheetIOS,
  KeyboardAvoidingView,
} from 'react-native';


import styles from './Styles';
import strings from './LocalizedStrings';

class AutocompleteList extends React.Component {
  static propTypes = {
    interfaceLang:   PropTypes.oneOf(["english", "hebrew"]).isRequired,
    theme:    PropTypes.object.isRequired,
    themeStr: PropTypes.string.isRequired,
    query:    PropTypes.string,
    openRef:  PropTypes.func.isRequired,
    openTextTocDirectly: PropTypes.func.isRequired,
    setCategories: PropTypes.func.isRequired,
    search:   PropTypes.func.isRequired,
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

  componentWillReceiveProps(nextProps) {
    if (this.props.query !== nextProps.query) {
      this.onQueryChange(nextProps.query);
    }
  }

  onQueryChange = q => {
    if (q.length >= 3) {
      Sefaria.api.name(q, true)
      .then(results => {
        if (this._isMounted) {
          const typeToValue = { "ref": 1, "person": 3, "toc": 2 }
          this.setState({completions: results.completions.map((c,i) =>
            {
              let type = "ref";
              if (!!Sefaria.people[c.toLowerCase()]) {
                type = "person";
              } else if (!!Sefaria.englishCategories[c] || !!Sefaria.hebrewCategories[c]) {
                type = "toc";
              }
              if (i === 0) {typeToValue[type] = 0;}  // priveledge the first results' type
              return {query: c, type, loading: false};
            })
            .stableSort((a,b) => typeToValue[a.type] - typeToValue[b.type])
            .concat([{query: `Search for: "${this.props.query}"`, type: "searchFor", loading: false}]), // always add a searchFor element at the bottom
          completionsLang: results.lang})
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
  openRef = (query, index) => {
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
        //Sefaria.track.event("Search", action, query);
      let recentType;
      if (d.is_book) {
        this.props.openTextTocDirectly(d.book);
        recentType = "book";
      }
      else if (d.is_ref) {
        this.props.openRef(d.ref);
        recentType = "ref";
      }
      else if (d.type == "Person") {
        recentType = "person";
        ActionSheetIOS.showActionSheetWithOptions({
          options: [strings.cancel, `View '${d.key}' on Sefaria site`],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) { Linking.openURL(`https://www.sefaria.org/person/${d.key}`); }
        });
      } else if (d.type == "TocCategory") {
        this.props.setCategories(d.key);
        recentType = "toc";
      }
      Sefaria.saveRecentQuery(query, recentType);
    });
  };

  renderItem = ({ item, index }) => {
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
      case "toc":
        src = this.props.themeStr === "white" ? require("./img/book.png") : require("./img/book-light.png");
        break;
      case "person":
        src = this.props.themeStr === "white" ? require("./img/user.png") : require("./img/user-light.png");
        break;
    }
    return (
      <TouchableOpacity
        style={[{flexDirection: isHeb ? 'row-reverse' : 'row'}, styles.autocompleteItem, this.props.theme.bordered]}
        onPress={()=>{
          if (item.type === 'query') {
            this.props.search(item.query);
          } else if (item.type === 'searchFor') {
            this.props.search(this.props.query);
          } else {
            this.openRef(item.query, index);
          }
        }}>
        <Image source={src}
          style={[styles.menuButtonMargined]}
          resizeMode={Image.resizeMode.contain}
        />
        <Text style={[styles.autocompleteItemText, this.props.theme.text, {textAlign: isHeb ? 'right' : 'left', fontFamily: isHeb ? 'Heebo' : 'Amiri'}]}>
          { item.type === 'toc' ? item.query.toUpperCase() : item.query }
        </Text>
        {item.loading ? <Text style={[{paddingHorizontal: 10}, this.props.theme.secondaryText, !isHeb ? styles.enInt : styles.heInt]}>
          { strings.loading }
        </Text> : null}
      </TouchableOpacity>
    )
  };

  _keyExtractor = (item, pos) => {
    return item.query + "|" + pos;
  };

  render() {
    const isheb = this.props.interfaceLang === "hebrew";
    const langStyle = !isheb ? styles.enInt : styles.heInt;
    return (
      <KeyboardAvoidingView style={[styles.autocompleteList, this.props.theme.container, this.props.theme.bordered]} behavior="padding">
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
        };
      </KeyboardAvoidingView>
    );
  }
}

export default AutocompleteList;
