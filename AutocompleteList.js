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

  openRef = ref => {
    //TODO if title === ref, open texttoc
    //if ref is full ref, open it verbatim
    //if ref is partial ref, complete it to the section level
    const title = Sefaria.textTitleForRef(ref);
    let refToOpen = Sefaria.getRecentRefForTitle(title);
    if (!refToOpen) {
      const index = Sefaria.index(title);
      refToOpen = { ref: index.firstSection };
    }
    console.log(ref);
    this.props.openRef(ref);
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
