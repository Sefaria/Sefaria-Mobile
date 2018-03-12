'use strict';
import PropTypes from 'prop-types';
import React from 'react';

import {
  TouchableOpacity,
  Text,
  View,
  FlatList,
} from 'react-native';


import styles from './Styles';
import strings from './LocalizedStrings';

class AutocompleteList extends React.Component {
  static propTypes = {
    query:    PropTypes.string,
    openRef:  PropTypes.func.isRequired,
    openTextTocDirectly: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      completions: [],
    }
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
        this.setState({completions: results.completions.map(c => ({key: c}))})
      })
      .catch(error => {
        console.log(error);
        this.setState({completions: []})
      })
    } else {
      this.setState({completions: []})
    }
  };
  openRef = query => {
    console.log('before', query);
    Sefaria.api.name(query).then(d => {
      // If the query isn't recognized as a ref, but only for reasons of capitalization. Resubmit with recognizable caps.
      if (Sefaria.api.isACaseVariant(query, d)) {
        this.openRef(Sefaria.api.repairCaseVariant(query, d));
        return;
      }
      console.log(query, d);
        //Sefaria.track.event("Search", action, query);
      if (d["is_book"]) { this.props.openTextTocDirectly(d["book"])}
      else if (d["is_ref"]) { this.props.openRef(d["ref"])}
      /*else if (d["type"] == "Person") {
        Sefaria.track.event("Search", "Search Box Navigation - Person", query);
        this.closeSearchAutocomplete();
        this.showPerson(d["key"]);
      } else if (d["type"] == "TocCategory") {
        Sefaria.track.event("Search", "Search Box Navigation - Category", query);
        this.closeSearchAutocomplete();
        this.showLibrary(d["key"]);  // "key" holds the category path
      } else {
        Sefaria.track.event("Search", "Search Box Search", query);
        this.closeSearchAutocomplete();
        this.showSearch(query);
      }*/
    });
  };

  renderItem = ({ item }) => {
    return (
      <TouchableOpacity style={{flex:1}} onPress={()=>{ this.openRef(item.key); }}>
        <Text style={{fontSize: 20, padding: 10}}>
          { item.key }
        </Text>
      </TouchableOpacity>
    )
  };

  render() {
    return (
      this.state.completions.length ?
        <FlatList
          style={[styles.readerDisplayOptionsMenu, {maxHeight: 300}]}
          data={this.state.completions}
          renderItem={this.renderItem}/> : null
    );
  }
}

export default AutocompleteList;
