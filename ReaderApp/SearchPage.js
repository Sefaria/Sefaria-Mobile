'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	Image
} from 'react-native';

const SearchBar        = require('./SearchBar');
const SearchResultList = require('./SearchResultList');
const styles           = require('./Styles');
const strings          = require('./LocalizedStrings');

var {
  CategoryColorLine,
	DirectedButton
} = require('./Misc.js');

class SearchPage extends React.Component {
  static propTypes = {
		theme:               PropTypes.object.isRequired,
		themeStr:            PropTypes.string.isRequired,
		interfaceLang:       PropTypes.oneOf(["english", "hebrew"]).isRequired,
		subMenuOpen:         PropTypes.string,
		openSubMenu:         PropTypes.func,
		hasInternet:         PropTypes.bool,
		closeNav:            PropTypes.func.isRequired,
		onQueryChange:       PropTypes.func.isRequired,
		openRef:             PropTypes.func.isRequired,
		setLoadTail:         PropTypes.func.isRequired,
		setIsNewSearch:      PropTypes.func.isRequired,
		query:               PropTypes.string,
		queryResult:         PropTypes.array,
		loadingQuery:        PropTypes.bool,
		loadingTail:         PropTypes.bool,
		isNewSearch:         PropTypes.bool,
		numResults:          PropTypes.number
	};

	constructor(props) {
		super(props);
		this.state = {
			page: "main"
		};
	};

  numberWithCommas = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	};

	//setPage =

  render() {
		var status = this.props.hasInternet ?
						this.props.loadingQuery ? strings.loading
						: this.numberWithCommas(this.props.numResults) + " " + strings.results
					: strings.connectToSearchMessage;
		var isheb = this.props.interfaceLang === "hebrew";
    var langStyle = !isheb ? styles.enInt : styles.heInt;
		var summaryStyle = [styles.searchResultSummary, this.props.theme.searchResultSummary];
		if (isheb) {
			summaryStyle.push(styles.searchResultSummaryHe);
		}
    var forwardImageStyle = isheb ? styles.forwardButtonHe : styles.forwardButtonEn;
		var backImageStyle = isheb ? styles.directedButtonWithTextHe : styles.directedButtonWithTextEn;
    var content = null;
		switch (this.props.subMenuOpen) {
			case (null):
        content = (
					<View>
						<SearchBar
							theme={this.props.theme}
							themeStr={this.props.themeStr}
							openNav={this.props.openNav}
							closeNav={this.props.closeNav}
							leftMenuButton="back"
							onQueryChange={this.props.onQueryChange}
							query={this.props.query}
							setIsNewSearch={this.props.setIsNewSearch}/>
						<View style={summaryStyle}>
							<Text style={[this.props.theme.searchResultSummaryText, langStyle]} >{status}</Text>
							<DirectedButton
								text={strings.filter}
								direction="forward"
								language={this.props.interfaceLang}
								themeStr={this.props.themeStr}
								textStyle={[this.props.theme.searchResultSummaryText, langStyle]}
								imageStyle={forwardImageStyle}
								onPress={()=>this.props.openSubMenu("filter")}/>
						</View>
						<SearchResultList
							theme={this.props.theme}
							queryResult={this.props.queryResult}
							loadingTail={this.props.loadingTail}
							initSearchListSize={this.props.initSearchListSize}
		          initSearchScrollPos={this.props.initSearchScrollPos}
		          setInitSearchScrollPos={this.props.setInitSearchScrollPos}
							onQueryChange={this.props.onQueryChange}
							openRef={this.props.openRef}
							setLoadTail={this.props.setLoadTail}
							setIsNewSearch={this.props.setIsNewSearch}
							isNewSearch={this.props.isNewSearch} />
					  </View>);
			  break;
			case ("filter"):
				content = (
					<View style={[styles.header, this.props.theme.header, {justifyContent: "space-between"}]}>
						<DirectedButton
							onPress={()=>this.props.openSubMenu(null)}
							theme={this.props.theme}
							themeStr={this.props.themeStr}
							text="Back"
							direction="back"
							language="english"
							textStyle={[this.props.theme.searchResultSummaryText, langStyle]}
							imageStyle={[styles.menuButton, backImageStyle]}/>
						<TouchableOpacity onPress={()=>this.props.openSubMenu(null)} style={{marginLeft: 12, marginRight: 12}}>
							<Text style={[this.props.theme.searchResultSummaryText, langStyle]}>{"Apply"}</Text>
						</TouchableOpacity>
					</View>
				);
		}
		return (
			<View style={[styles.menu, this.props.theme.menu]}>
				<CategoryColorLine category={"Other"} />
        {content}
			</View>
		);
	}
}

module.exports = SearchPage;
