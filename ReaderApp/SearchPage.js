'use strict';

var React            = require('react-native');
var SearchBar        = require('./SearchBar');
var SearchResultList = require('./SearchResultList');
var styles           = require('./Styles.js');
var {
	View
} = React;



var SearchPage = React.createClass({
	propTypes: {
		closeNav: React.PropTypes.func.isRequired,
		onQueryChange: React.PropTypes.func.isRequired,
		searchQuery: React.PropTypes.string,
		searchQueryResult: React.PropTypes.string
	},
	render: function() {
		return (
			<View style={{marginTop:20,flex:1,flexDirection:'column',alignItems:'flex-start',borderWidth:4}}>
				<SearchBar 
					closeNav={this.props.closeNav}
					onQueryChange={this.props.onQueryChange}/>
				<SearchResultList
					queryResult={this.props.searchQueryResult}/>
			</View>
		);
	}
});

module.exports = SearchPage;