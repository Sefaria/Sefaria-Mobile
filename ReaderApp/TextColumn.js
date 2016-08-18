'use strict';
import React, { Component } from 'react';
import { 	AppRegistry,
  StyleSheet,
  View,
  ScrollView,
  Text,
  ListView
} from 'react-native';


var TextRange = require('./TextRange');
var TextRangeContinuous = require('./TextRangeContinuous');
var segmentRefPositionArray = {};

var TextColumn = React.createClass({

  getInitialState: function() {
    return {
      dataSource: new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2})
    };
  },

  componentDidMount: function() {

  },


  componentWillReceiveProps: function(nextProps) {


  },

  generateDataSource: function() {
    var curTextRange;
    var sourceArray = [];

    if (this.props.textFlow == 'continuous') {
      curTextRange = <TextRangeContinuous data={this.props.data} segmentRef={this.props.segmentRef}
                                          columnLanguage={this.props.columnLanguage}
                                          TextSegmentPressed={ this.props.TextSegmentPressed }
                                          generateSegmentRefPositionArray={this.generateSegmentRefPositionArray}/>;
    } else {
      curTextRange =
        <TextRange data={this.props.data} segmentRef={this.props.segmentRef} columnLanguage={this.props.columnLanguage}
                   TextSegmentPressed={ this.props.TextSegmentPressed }
                   generateSegmentRefPositionArray={this.generateSegmentRefPositionArray}/>;
    }

    sourceArray.push(curTextRange);


    return (sourceArray)

  },

  handleScroll: function(e) {


    if (segmentRefPositionArray[this.props.segmentRef + 1] < e.nativeEvent.contentOffset.y) {
      this.props.TextSegmentPressed(this.props.segmentRef + 1);
    }
    else if (segmentRefPositionArray[this.props.segmentRef] > e.nativeEvent.contentOffset.y && this.props.segmentRef != 0) {
      this.props.TextSegmentPressed(this.props.segmentRef - 1);
    }

//		console.log(segmentRefPositionArray[this.props.segmentRef+1] + " " + e.nativeEvent.contentOffset.y)

  },


  onEndReached: function() {
    if (this.props.loadingTextTail) {
      //already loading tail
      return;
    }
    this.props.setLoadTextTail(true);

    Sefaria.data(this.props.next).then(function(data) {

      this.props.updateData(this.props.data.concat(data.content),this.props.next,data.next,this.props.prev); //combined data content, new section title, the next section to be loaded on end , the previous section to load on top
     }.bind(this)).catch(function(error) {
      console.log('oh no', error);
    });

  },

  generateSegmentRefPositionArray: function(key, y) {
    segmentRefPositionArray[key] = y;

  },

  render: function() {
    var dataSourceRows = this.state.dataSource.cloneWithRows(this.generateDataSource({}));

    return (
      <ListView style={styles.listview}
                dataSource={dataSourceRows}
                renderRow={(rowData) =>  <View style={styles.verseContainer}>{rowData}</View>}
                onScroll={this.handleScroll}
                onEndReached={this.onEndReached}
                onEndReachedThreshold={300}

      />

    );
  }
});


var styles = StyleSheet.create({
  listView: {
    flex: 1,
    padding: 20,
    alignSelf: 'stretch'
  },

  verseContainer: {
    flex: 1,
//        flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 20,
    alignItems: "flex-start"

  },


  container: {}

});

module.exports = TextColumn;
