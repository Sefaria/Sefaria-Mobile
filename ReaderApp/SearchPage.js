'use strict';

var React            = require('react-native');
var SearchBar        = require('./SearchBar');
var SearchResultList = require('./SearchResultList');
var styles           = require('./Styles.js');
var {
	View,
	Text
} = React;



var SearchPage = React.createClass({
	propTypes: {
		closeNav:      React.PropTypes.func.isRequired,
		onQueryChange: React.PropTypes.func.isRequired,
		setLoadTail:   React.PropTypes.func.isRequired,
		searchQuery:   React.PropTypes.string,
		queryResult:   React.PropTypes.array,
		loadingQuery:  React.PropTypes.bool,
		loadingTail:   React.PropTypes.bool
	},
	render: function() {
		return (
			<View style={styles.menu}>
				<SearchBar 
					closeNav={this.props.closeNav}
					onQueryChange={this.props.onQueryChange}/>
				{this.props.loadingQuery ?
					<Text>Loading!!!</Text>
					: <SearchResultList
					queryResult={this.props.queryResult}
					loadingTail={this.props.loadingTail}
					onQueryChange={this.props.onQueryChange}
					setLoadTail={this.props.setLoadTail}
					/>
				}
				
			</View>
		);
	}
});

module.exports = SearchPage;