'use strict';

var React = require('react-native');

var {
  StyleSheet,
  View,
  ScrollView,
  Text,
  ListView
} = React;

var TextRange = require('./TextRange');
var TextRangeContinuous = require('./TextRangeContinuous');
var segmentRefPositionArray = {};

var TextColumn = React.createClass({

  componentDidMount: function () {

  },


  componentWillReceiveProps: function (nextProps) {


  },

  generateDataSource: function () {

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

  handleScroll: function (e) {


    if (segmentRefPositionArray[this.props.segmentRef + 1] < e.nativeEvent.contentOffset.y) {
      this.props.TextSegmentPressed(this.props.segmentRef + 1);
    }
    else if (segmentRefPositionArray[this.props.segmentRef] > e.nativeEvent.contentOffset.y && this.props.segmentRef != 0) {
      this.props.TextSegmentPressed(this.props.segmentRef - 1);
    }

//		console.log(segmentRefPositionArray[this.props.segmentRef+1] + " " + e.nativeEvent.contentOffset.y)

  },


  onEndReached: function () {
    console.log("end of section")
    console.log(this.props.data);
  },

  generateSegmentRefPositionArray: function (key, y) {
    segmentRefPositionArray[key] = y;

  },


  render: function () {

    var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

    var curTextRange;


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


    return (
      <ListView style={styles.listview}
                dataSource={ds.cloneWithRows(this.generateDataSource({}))}
                renderRow={(rowData) =>  <View style={styles.verseContainer}>{rowData}</View>}
                onScroll={this.handleScroll}
                onEndReached={this.onEndReached}
                onEndReachedThreshold={150}

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
