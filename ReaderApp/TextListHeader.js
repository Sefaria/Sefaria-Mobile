'use strict';
import React, { Component } from 'react';
import { 	
  View,
  Text
} from 'react-native';
var styles = require('./Styles.js');
var {
  CategoryColorLine,
  CloseButton
} = require('./Misc.js');

var TextListHeader = React.createClass({
	propTypes: {
		Sefaria:        React.PropTypes.object.isRequired,
		closeCat:       React.PropTypes.func.isRequired,
		category:       React.PropTypes.string,
		recentFilters:  React.PropTypes.array,
		columnLanguage: React.PropTypes.string
	},
	getInitialState: function() {
		Sefaria = this.props.Sefaria; //Is this bad practice to use getInitialState() as an init function
		return {
			
		};
	},
	render: function() {
		var style = {"borderColor": Sefaria.palette.categoryColor(this.props.category)};

		var viewList = this.props.recentFilters.map((filter)=>{
			return (<TextListHeaderItem 
						columnLanguage={this.props.columnLanguage}
						filter={filter}
					/>
					);
		});

		return (
			<View style={[styles.textListHeader, style]}>
				{viewList}
				<CloseButton onPress={()=>this.props.closeCat()}/>
			 </View>
			);
	}
});

var TextListHeaderItem = React.createClass({
	propTypes: {
		filter:         React.PropTypes.object,
		columnLanguage: React.PropTypes.string
	},
	render: function() {
		var filterStr = this.props.columnLanguage == "hebrew" ? 
			this.props.filter.heTitle : 
			this.props.filter.title;
		return (<Text>{filterStr}</Text>);
	}
});

module.exports = TextListHeader;