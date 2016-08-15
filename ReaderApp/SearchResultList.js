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
		queryResult:   React.PropTypes.array,
		loadingTail:   React.PropTypes.bool,
		onQueryChange: React.PropTypes.func.isRequired,
		setLoadTail:   React.PropTypes.func.isRequired
	},
	getInitialState: function() {
  		return {
    		dataSource: new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2})
  		};
	},
	onEndReached: function() {
		if (this.props.loadingTail) {
			//already loading tail
			return;
		}
		this.props.setLoadTail(true);
	},
	renderRow: function(rowData) {
		return(
				<SearchTextResult textType={rowData.textType} title={rowData.title} text={rowData.text}/>
			);
	},
	render: function() {

		var queryArray = this.props.queryResult.map(function(r) {return {"title": r._source.ref, "text": r.highlight.content[0], "textType":r._id.includes("[he]") ? "hebrew" : "english"}});
    	var dataSourceRows = this.state.dataSource.cloneWithRows(queryArray);

		return (
			<ListView
      			dataSource={dataSourceRows}
      			renderRow={this.renderRow}
      			onEndReached={this.onEndReached}/>
    	);
	}

});

module.exports = SearchResultList;