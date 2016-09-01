'use strict';
import React, { Component } from 'react';
import { 	AppRegistry,
  StyleSheet,
  View,
  ScrollView,
  Text,
  ListView
} from 'react-native';

var styles = require('./Styles.js');


var TextRange = require('./TextRange');
var TextRangeContinuous = require('./TextRangeContinuous');
var segmentRefPositionArray = {};

var TextSegment = require('./TextSegment');

var TextColumn = React.createClass({

  getInitialState: function() {
    return {
      dataSource: new ListView.DataSource({rowHasChanged: (r1, r2) => r1!== r2}),
      height: 0,
      prevHeight:0,
    };
  },

  componentDidMount: function() {

  },


  componentWillReceiveProps: function(nextProps) {


  },

  generateDataSource: function() {

    var data = this.props.data;
    var columnLanguage = this.props.columnLanguage;

    var rows = [];
    for (var i = 0; i < data.length; i++) {
      var segment = []

      segment.push(<Text style={styles.verseNumber}>{data[i].segmentNumber}.</Text>)

      if (columnLanguage == "english" || columnLanguage == "bilingual") {
        segment.push(<TextSegment segmentRef={this.props.segmentRef} segmentKey={data[i].segmentNumber} data={data[i].text}
                               textType="english" TextSegmentPressed={ this.props.TextSegmentPressed }

        />);
      }

      if (columnLanguage == "hebrew" || columnLanguage == "bilingual") {
        segment.push(<TextSegment segmentRef={this.props.segmentRef} segmentKey={data[i].segmentNumber} data={data[i].he}
                               textType="hebrew" TextSegmentPressed={ this.props.TextSegmentPressed }

        />);

      }
      rows.push(segment);

    }

    return (rows)

/*
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
*/

  },

  handleScroll: function(e) {
     if (e.nativeEvent.contentOffset.y < -50) {
       this.onTopReached();
     }
  },

  updateHeight: function(newHeight) {
    this.setState({
      height: newHeight
    });

  },
  calculateOffset: function() {
    console.log(this.state.height - this.state.prevHeight);
    var offset = this.state.height - this.state.prevHeight;
    this.setState({
      prevHeight: this.state.height
    });
    return offset;
  },
  onTopReached: function() {
    if (this.props.loadingTextTail) {
      //already loading tail
      return;
    }
    this.props.setLoadTextTail(true);
    this.refs._listView.scrollTo({x: 0, y: this.calculateOffset()+363, animated: false}) //TODO replace 363 with the height of textColumn



    Sefaria.data(this.props.prev).then(function(data) {

      this.props.updateData(data.content.concat(this.props.data),this.props.prev,this.props.next,data.prev); //combined data content, new section title, the next section to be loaded on end , the previous section to load on top
     }.bind(this)).catch(function(error) {
      console.log('oh no', error);
    });

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

  visibleRowsChanged: function(visibleRows, changedRows) {

    for (var section in visibleRows) {
      var numberOfVisibleSegments = Object.keys(visibleRows[section]).length;
      this.props.TextSegmentPressed(Object.keys(visibleRows[section])[numberOfVisibleSegments-2])
    }
  },

  render: function() {
    var dataSourceRows = this.state.dataSource.cloneWithRows(this.generateDataSource({}));

    return (
      <ListView ref='_listView'
                style={styles.listview}
                dataSource={dataSourceRows}
                


                
                renderRow={(rowData, sID, rID) =>  <View style={rID == this.props.segmentRef ? [styles.verseContainer,styles.segmentHighlight] : styles.verseContainer}>{rowData}</View>}
                onScroll={this.handleScroll}
                onChangeVisibleRows={(visibleRows, changedRows) => this.visibleRowsChanged(visibleRows, changedRows)}
                onContentSizeChange={(w, h) => {this.updateHeight(h)}}
                onEndReached={this.onEndReached}
                onEndReachedThreshold={300}

      />

    );
  }
});


module.exports = TextColumn;
