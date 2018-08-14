'use strict';
import PropTypes from 'prop-types';
import React from 'react';

import {
  TouchableOpacity,
  Text,
  View,
} from 'react-native';

import {
  CategoryColorLine,
} from './Misc';

import AutocompleteList from './AutocompleteList';
import SearchBar from './SearchBar';
import styles from './Styles';
import strings from './LocalizedStrings';

class AutocompletePage extends React.Component {
  static propTypes = {
    interfaceLang:   PropTypes.oneOf(["english", "hebrew"]).isRequired,
    theme:           PropTypes.object.isRequired,
    themeStr:        PropTypes.string.isRequired,
    onBack:          PropTypes.func.isRequired,
    search:          PropTypes.func.isRequired,
    setIsNewSearch:  PropTypes.func.isRequired,
    query:           PropTypes.string.isRequired,
    onChange:        PropTypes.func.isRequired,
    openRef:         PropTypes.func.isRequired,
    openTextTocDirectly: PropTypes.func.isRequired,
    setCategories:   PropTypes.func.isRequired,
    openSearch:      PropTypes.func.isRequired,
    openUri:         PropTypes.func.isRequired,
  };

  componentDidMount() {
    this._originalQuery = this.props.query;
    this._searchBar.focus();
    this._autocomplete.onQueryChange(this.props.query);
  }

  back = () => {
    const q = this.props.query || this._originalQuery;
    if (!q) {
      this.props.openNav();
    } else {
      this.props.search(q, true, false);
      this.props.openSearch();
    }
  };

  _getSearchBarRef = ref => {
    this._searchBar = ref;
  };

  _getAutocompleteRef = ref => {
    this._autocomplete = ref;
  }

  render() {
    return (
      <View style={[styles.menu, this.props.theme.menu]}>
        <CategoryColorLine category={"Other"} />
        <SearchBar
          ref={this._getSearchBarRef}
          interfaceLang={this.props.interfaceLang}
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          onBack={this.props.onBack}
          leftMenuButton="back"
          search={this.props.search}
          query={this.props.query}
          setIsNewSearch={this.props.setIsNewSearch}
          onChange={this.props.onChange}
          hideSearchButton={true}
        />
        <AutocompleteList
          openUri={this.props.openUri}
          interfaceLang={this.props.interfaceLang}
          ref={this._getAutocompleteRef}
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          query={this.props.query}
          openRef={this.props.openRef}
          openTextTocDirectly={this.props.openTextTocDirectly}
          setCategories={this.props.setCategories}
          search={this.props.search}
        />
      </View>
    );
  }
}

export default AutocompletePage;
