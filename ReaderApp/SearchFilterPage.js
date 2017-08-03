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
	DirectedArrow,
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
		settings:         PropTypes.object.isRequired,
		subMenuOpen:      PropTypes.string.isRequired,
		updateFilter:     PropTypes.func.isRequired,
		openSubMenu:      PropTypes.func.isRequired,
		clearAllFilters:  PropTypes.func.isRequired,
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
      {name: false, text: strings.off, onPress: () => {
				this.props.setSearchOptions(this.props.sort, false, ()=>this.props.onQueryChange(this.props.query, true, false, true));
			}},
      {name: true, text: strings.on, onPress: () => {
				this.props.setSearchOptions(this.props.sort, true, ()=>this.props.onQueryChange(this.props.query, true, false, true));
			}}
    ];
  }


  backFromFilter = () => {
		let backPage = this.props.subMenuOpen == "filter" ? null : "filter"; // if you're at a category filter page, go back to main filter page
		this.props.openSubMenu(backPage);
		if (backPage == null) {
			//TODO consider only firing new query if you actually touched a button on the filter page
			this.props.onQueryChange(this.props.query, true, false);
		}
	};

  render() {
    var isheb = this.props.interfaceLang === "hebrew" && false; //TODO enable when we properly handle interface hebrew throughout app
    var langStyle = !isheb ? styles.enInt : styles.heInt;
    var backImageStyle = isheb ? styles.directedButtonWithTextHe : styles.directedButtonWithTextEn;
		var loadingMessage = (<Text style={[langStyle, this.props.theme.searchResultSummaryText]}>{strings.loadingFilters}</Text>);
		var content = null;
		switch (this.props.subMenuOpen) {
			case "filter":
				content =
				(<View>
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
								this.props.availableFilters.map((filter, ifilter)=>{
									return (
										<SearchFilter
											key={ifilter}
											theme={this.props.theme}
											themeStr={this.props.themeStr}
											settings={this.props.settings}
											filterNode={filter}
											openSubMenu={this.props.openSubMenu}
											updateFilter={this.props.updateFilter}
										/>);
								}) : loadingMessage
							}
						</View>
					</View>
				</View>);
				break;
			default:
			  var currFilter = FilterNode.findFilterInList(this.props.availableFilters, this.props.subMenuOpen);
        var filterList =
				[(<SearchFilter
					key={0}
					theme={this.props.theme}
					themeStr={this.props.themeStr}
					settings={this.props.settings}
					filterNode={currFilter}
					updateFilter={this.props.updateFilter}
					/>)];
				content =
				(<View>
					{ this.props.filtersValid ?
						filterList.concat(currFilter.getLeafNodes().map((filter, ifilter)=>{
							return (
								<SearchFilter
									key={ifilter+1}
									theme={this.props.theme}
									themeStr={this.props.themeStr}
									settings={this.props.settings}
									filterNode={filter}
									updateFilter={this.props.updateFilter}
								/>);
						})) : loadingMessage
					}
				</View>);
		}
    return (<View style={{flex:1}}>
      <View style={[styles.header, this.props.theme.header, {justifyContent: "space-between"}]}>
        <DirectedButton
          onPress={this.backFromFilter}
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          text={strings.back}
          direction="back"
          language="english"
          textStyle={[this.props.theme.searchResultSummaryText, langStyle]}
          imageStyle={[styles.menuButton, backImageStyle]}/>
				<TouchableOpacity onPress={this.props.clearAllFilters} style={{marginLeft: 12, marginRight: 12}}>
          <Text style={[this.props.theme.searchResultSummaryText, langStyle]}>{strings.clearAll}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView key={this.props.subMenuOpen} contentContainerStyle={styles.menuContent}>
				{content}
      </ScrollView>
    </View>);
  }
}

class SearchFilter extends React.Component {
	static propTypes = {
			theme:        PropTypes.object,
			themeStr:     PropTypes.string,
			settings:     PropTypes.object.isRequired,
			filterNode:   FilterNode.checkPropType,
			openSubMenu:  PropTypes.func,
			updateFilter: PropTypes.func.isRequired,
	};

	clickCheckBox = () => {
		this.props.updateFilter(this.props.filterNode);
	}

	render() {
    let language = this.props.settings.language == "hebrew" ? "hebrew" : "english";
		let filter = this.props.filterNode;
		let isCat = filter.children.length > 0;
		let title = isCat ? filter.title.toUpperCase() : filter.title;
		let heTitle = filter.heTitle;
		let count = filter.docCount;

		let colorCat = Sefaria.palette.categoryColor(filter.title.replace(" Commentaries", ""));
		let colorStyle = isCat ? [{"borderColor": colorCat}] : [this.props.theme.searchResultSummary, {"borderTopWidth": 1}];
		let textStyle  = [isCat ? styles.spacedText : null];
		let flexDir = language == "english" ? "row" : "row-reverse";
		return (
			<TouchableOpacity
				disabled={!this.props.openSubMenu}
				onPress={()=>{ this.props.openSubMenu ? this.props.openSubMenu(filter.title) : ()=>{} }}
				style={[styles.searchFilterCat, {flexDirection: flexDir}].concat(colorStyle)}>
				<View style={{flexDirection: flexDir, alignItems: "center"}}>
					<View style={{paddingHorizontal: 10}}>
						<IndeterminateCheckBox theme={this.props.theme} state={this.props.filterNode.selected} onPress={this.clickCheckBox} />
					</View>
					{language == "english"?
						(<Text style={[styles.englishText].concat([this.props.theme.tertiaryText, textStyle, {paddingTop:3}])}>{`${title} `}<Text style={[styles.englishText].concat([this.props.theme.secondaryText, textStyle])}>{`(${count})`}</Text></Text>
					   ) :
						(<Text style={[styles.hebrewText].concat([this.props.theme.tertiaryText, textStyle, {paddingTop:13}])}>{`${heTitle} `}<Text style={[styles.englishText].concat([this.props.theme.secondaryText, textStyle])}>{`(${count})`}</Text></Text>

				  )}
				</View>
				{ this.props.openSubMenu ?
					<DirectedArrow themeStr={this.props.themeStr} imageStyle={{opacity: 0.5}} language={language} direction={"forward"} />
					: null
				}
		 </TouchableOpacity>);
	}
}

module.exports = SearchFilterPage;
