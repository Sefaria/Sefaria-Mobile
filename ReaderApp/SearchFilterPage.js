'use strict';

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView
} from 'react-native';

var {
	DirectedButton,
	ButtonToggleSet,
	IndeterminateCheckBox,
} = require('./Misc.js');

const FilterNode       = require('./FilterNode');
const styles           = require('./Styles');
const strings          = require('./LocalizedStrings');

//console.log("filternaodf", FilterNode.checkPropType({}, 'blah', 'hii'));

class SearchFilterPage extends React.Component {
  static propTypes = {
    theme:            PropTypes.object.isRequired,
    themeStr:         PropTypes.string.isRequired,
    query:            PropTypes.string,
    sort:             PropTypes.string,
    isExact:          PropTypes.bool,
		availableFilters: PropTypes.array,
		appliedFilters:   PropTypes.array,
		filtersValid:     PropTypes.bool,
    openSubMenu:      PropTypes.func,
    onQueryChange:    PropTypes.func,
    setSearchOptions: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.sortOptions = [
      {name: "chronological", text: strings.chronological, onPress: () => { this.props.setSearchOptions("chronological", this.props.isExact); }},
      {name: "relevance", text: strings.relevance, onPress: () => { this.props.setSearchOptions("relevance", this.props.isExact); }}
    ];
    this.exactOptions = [
      {name: false, text: strings.off, onPress: () => { this.props.setSearchOptions(this.props.sort, false); }},
      {name: true, text: strings.on, onPress: () => { this.props.setSearchOptions(this.props.sort, true); }}
    ];
  }


  backFromFilter = () => {
		this.props.openSubMenu(null);
		this.props.onQueryChange(this.props.query, true, false);
	};

  render() {
    var isheb = this.props.interfaceLang === "hebrew";
    var langStyle = !isheb ? styles.enInt : styles.heInt;
    var backImageStyle = isheb ? styles.directedButtonWithTextHe : styles.directedButtonWithTextEn;

    return (<View style={{flex:1}}>
      <View style={[styles.header, this.props.theme.header, {justifyContent: "space-between"}]}>
        <DirectedButton
          onPress={this.backFromFilter}
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          text="Back"
          direction="back"
          language="english"
          textStyle={[this.props.theme.searchResultSummaryText, langStyle]}
          imageStyle={[styles.menuButton, backImageStyle]}/>
        <TouchableOpacity onPress={this.backFromFilter} style={{marginLeft: 12, marginRight: 12}}>
          <Text style={[this.props.theme.searchResultSummaryText, langStyle]}>{"Apply"}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.menuContent}>
        <View style={styles.settingsSection}>
          <View>
            <Text style={[styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.sortBy}</Text>
          </View>
          <ButtonToggleSet
            theme={this.props.theme}
            options={this.sortOptions}
            contentLang={"english"}
            active={this.props.sort} />
        </View>
        <View style={styles.settingsSection}>
          <View>
            <Text style={[styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.exactSearch}</Text>
          </View>
          <ButtonToggleSet
            theme={this.props.theme}
            options={this.exactOptions}
            contentLang={"english"}
            active={this.props.isExact} />
        </View>
        <View style={styles.settingsSection}>
          <View>
            <Text style={[styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.filterByText}</Text>
          </View>
					<View>
						{ this.props.filtersValid ?
							this.props.availableFilters.map((filter)=>{
								return (
									<SearchFilter
										theme={this.props.theme}
										themeStr={this.props.themeStr}
										filterNode={filter}
									/>);
							}) : (<Text>{"Loading..."}</Text>)
						}
					</View>
        </View>
      </ScrollView>
    </View>);
  }
}

class SearchFilter extends React.Component {
	static propTypes = {
			theme:       PropTypes.object,
			themeStr:    PropTypes.string,
			filterNode:  FilterNode.checkPropType
	};

	constructor(props) {
		super(props);
		this.state = {
			state: true
		}
	}

	clickCheckBox = () => {
		var nextState;
		if (this.state.state === true) {
			nextState = null;
		} else if (this.state.state === false) {
			nextState = true;
		} else {
			nextState = false;
		}
		this.setState({state: nextState});
	}

	render() {
		let filter = this.props.filterNode;
		let isCat = filter.children.length > 0;
		let title = isCat ? filter.title.toUpperCase() : filter.title;
		let heTitle = filter.heTitle;
		let count = filter.docCount;

		let colorCat = Sefaria.palette.categoryColor(filter.title.replace(" Commentaries", ""));
		let colorStyle = {"borderColor": colorCat};
		let textStyle  = [this.props.theme.text, isCat ? styles.spacedText : null];

		return (
			<TouchableOpacity onPress={()=>{}} style={[styles.searchFilterCat, this.props.theme.readerNavCategory, colorStyle]}>
				<View style={{paddingHorizontal: 10}}>
					<IndeterminateCheckBox theme={this.props.theme} state={this.state.state} onPress={this.clickCheckBox} />
				</View>
				{"english" == "english"?
					(<Text style={[styles.englishText].concat(textStyle)}>{`${title} (${count})`}</Text>) :
					(<Text style={[styles.hebrewText].concat(textStyle)}>{`${heTitle} (${count})`}</Text>)}
			 </TouchableOpacity>);
	}
}

module.exports = SearchFilterPage;
