'use strict';

var React            = require('react-native');
var styles           = require('./Styles.js');
var SearchTextResult = require('./SearchTextResult');
var {
	Text,
	ListView
} = React;

var SearchResultList = React.createClass({
	propTypes:{
		queryResult: React.PropTypes.array
	},
	getInitialState: function() {
  		var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
  		var queryArray = this.props.queryResult.map(r => r.highlight.content[0])

  		return {
    		dataSource: ds.cloneWithRows(queryArray)
  		};
	},
	render: function() {
		return (
			<ListView
      			dataSource={this.state.dataSource}
      			renderRow={(rowData) => <SearchTextResult text={rowData}/>}/>
    	);
	}

});

module.exports = SearchResultList;