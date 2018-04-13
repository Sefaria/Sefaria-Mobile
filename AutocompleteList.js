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
} from 'react-native';


import styles from './Styles';
import strings from './LocalizedStrings';

class AutocompleteList extends React.Component {
  static propTypes = {
    theme:    PropTypes.object.isRequired,
    themeStr: PropTypes.string.isRequired,
    query:    PropTypes.string,
    openRef:  PropTypes.func.isRequired,
    openTextTocDirectly: PropTypes.func.isRequired,
    setCategories: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      completions: [],
      completionsLang: null,
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
      Sefaria.api.name(q)
      .then(results => {
        if (this._isMounted) {
          this.setState({completions: results.completions.map(c => ({key: c})), completionsLang: results.lang})
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
  openRef = query => {
    Sefaria.api.name(query).then(d => {
      // If the query isn't recognized as a ref, but only for reasons of capitalization. Resubmit with recognizable caps.
      if (Sefaria.api.isACaseVariant(query, d)) {
        this.openRef(Sefaria.api.repairCaseVariant(query, d));
        return;
      }
      console.log(query, d);
        //Sefaria.track.event("Search", action, query);
      if (d.is_book) { this.props.openTextTocDirectly(d.book)}
      else if (d.is_ref) { this.props.openRef(d.ref)}
      else if (d.type == "Person") {
        ActionSheetIOS.showActionSheetWithOptions({
          options: [strings.cancel, `View '${d.key}' on Sefaria site`],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) { Linking.openURL(`https://www.sefaria.org/person/${d.key}`); }
        });
      } else if (d.type == "TocCategory") {
        this.props.setCategories(d.key);
      }
    });
  };

  renderItem = ({ item }) => {
    const isHeb = this.state.completionsLang === 'he';
    console.log(isHeb,'yoyoyo ma');
    return (
      <TouchableOpacity style={{flex:1, flexDirection: 'row'}} onPress={()=>{ this.openRef(item.key); }}>
        <Text style={[styles.autocompleteItem, this.props.theme.text, {textAlign: isHeb ? 'right' : 'left', fontFamily: isHeb ? 'Heebo' : 'Open Sans'}]}>
          { item.key }
        </Text>
      </TouchableOpacity>
    )
  };

  render() {
    return (
      !!this.state.completions.length ?
        (<View style={[styles.autocompleteList, this.props.theme.container, this.props.theme.bordered]}>
          <FlatList
            keyboardShouldPersistTaps={'handled'}
            data={this.state.completions}
            renderItem={this.renderItem}/>
        </View>) : null
    );
  }
}

export default AutocompleteList;
