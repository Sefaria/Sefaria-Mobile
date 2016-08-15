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
  		var queryArray = this.props.queryResult.map(function(r) {return {"title": r._source.ref, "text": r.highlight.content[0]}});

  		console.log("queryArray",queryArray);

  		return {
    		dataSource: ds.cloneWithRows(queryArray),
    		currPage: 0
  		};
	},
	handleScroll: function(event) {
		var y = event.nativeEvent.contentOffset.y;
		console.log(y);
	},
	onEndReached: function() {
		console.log("done scrollingg.....");
	},
	render: function() {
		return (
			<ListView
      			dataSource={this.state.dataSource}
      			renderRow={(rowData) => <SearchTextResult title={rowData.title} text={rowData.text}/>}
      			onEndReached={this.onEndReached}/>
    	);
	}

});

module.exports = SearchResultList;