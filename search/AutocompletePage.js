'use strict';
import PropTypes from 'prop-types';
import React from 'react';

import {
  TouchableOpacity,
  Text,
  View,
} from 'react-native';

import {
  CategoryColorLine, Header, PageHeader,
} from '../Misc';

import AutocompleteList from './AutocompleteList';
import SearchBar from './SearchBar';
import styles from '../Styles';
import strings from '../LocalizedStrings';

class AutocompletePage extends React.Component {
  static propTypes = {
    interfaceLanguage:   PropTypes.oneOf(["english", "hebrew"]).isRequired,
    theme:           PropTypes.object.isRequired,
    themeStr:        PropTypes.string.isRequired,
    onBack:          PropTypes.func.isRequired,
    openSearch:      PropTypes.func.isRequired,
    setIsNewSearch:  PropTypes.func.isRequired,
    query:           PropTypes.string.isRequired,
    onChange:        PropTypes.func.isRequired,
    openRef:         PropTypes.func.isRequired,
    openTextTocDirectly: PropTypes.func.isRequired,
    openTopic:       PropTypes.func.isRequired,
    setCategories:   PropTypes.func.isRequired,
    openUri:         PropTypes.func.isRequired,
    searchType:      PropTypes.oneOf(['text', 'sheet']).isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      queryRef: null,
      shouldQueryOpenToc: false,
      queryIndex: null,
    };
  }

  componentDidMount() {
    this._originalQuery = this.props.query;
    this._autocomplete.onQueryChange(this.props.query);
  }

  setQueryRef = (queryRef, queryIndex, shouldQueryOpenToc) => {
    this.setState({queryRef, queryIndex, shouldQueryOpenToc});
  };

  back = () => {
    const q = this.props.query || this._originalQuery;
    if (!q) {
      this.props.openNav();
    } else {
      this.search(q);
    }
  };

  search = query => {
    this.props.openSearch('text', query);
    this.props.openSearch('sheet', query);
  };

  onSearchPress = (...openSearchParams) => {
    if (this.state.queryRef) {
      if (this.state.shouldQueryOpenToc) {
        this.props.openTextTocDirectly(this.state.queryIndex);
      } else {
        this.props.openRef(this.state.queryRef);
      }
    } else {
      this.props.openSearch(...openSearchParams);
    }
  };

  _getAutocompleteRef = ref => {
    this._autocomplete = ref;
  }

  render() {
    return (
      <View style={[styles.menu, {paddingHorizontal: 15}, this.props.theme.mainTextPanel]}>
        <PageHeader><Header titleKey={"search"}/></PageHeader>
        <SearchBar
          autoFocus
          onBack={this.props.onBack}
          leftMenuButton="back"
          search={this.onSearchPress}
          query={this.props.query}
          searchType={this.props.searchType}
          setIsNewSearch={this.props.setIsNewSearch}
          onChange={this.props.onChange}
          hideSearchButton={true}
        />
        <AutocompleteList
          openUri={this.props.openUri}
          interfaceLanguage={this.props.interfaceLanguage}
          ref={this._getAutocompleteRef}
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          query={this.props.query}
          openRef={this.props.openRef}
          openTextTocDirectly={this.props.openTextTocDirectly}
          openTopic={this.props.openTopic}
          setCategories={this.props.setCategories}
          setQueryRef={this.setQueryRef}
          search={this.search}
        />
      </View>
    );
  }
}

export default AutocompletePage;
