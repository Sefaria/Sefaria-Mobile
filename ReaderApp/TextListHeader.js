'use strict';
import React, { Component } from 'react';
import { 	
  View
} from 'react-native';
var styles = require('./Styles.js');
var {
  CategoryColorLine,
  CloseButton
} = require('./Misc.js');

var TextListHeader = React.createClass({
	propTypes: {
		Sefaria:   React.PropTypes.object.isRequired,
		closeCat:  React.PropTypes.func.isRequired,
		category:  React.PropTypes.string
	},
	getInitialState: function() {
		Sefaria = this.props.Sefaria; //Is this bad practice to use getInitialState() as an init function
		return {
			
		};
	},
	render: function() {
		var style = {"borderColor": Sefaria.palette.categoryColor(this.props.category)};
		return (
			<View style={[styles.textListHeader, style]}>
				<CloseButton onPress={()=>this.props.closeCat()}/>
			 </View>
			);
	}
});

module.exports = TextListHeader;