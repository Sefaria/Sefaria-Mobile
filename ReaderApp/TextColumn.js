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
  propTypes: {
    settings:         React.PropTypes.object,
    data:             React.PropTypes.array,
    textReference:    React.PropTypes.string,
    segmentRef:       React.PropTypes.number,
    textFlow:         React.PropTypes.oneOf(["segmented","continuous"]),
    columnLanguage:   React.PropTypes.oneOf(["hebrew","english","bilingual"]),
    updateData:       React.PropTypes.func,
    updateTitle:      React.PropTypes.func,
    TextSegmentPressed:React.PropTypes.func,
    textListVisible:  React.PropTypes.bool,
    next:             React.PropTypes.string,
    prev:             React.PropTypes.string,
    loadingTextTail:  React.PropTypes.bool,
    setLoadTextTail:  React.PropTypes.func
  },
  getInitialState: function() {
    return {
      dataSource: new ListView.DataSource({
        rowHasChanged: (r1, r2) => r1!== r2,
        sectionHeaderHasChanged: (s1, s2) => s1!==s2
      }),
      sectionArray: [this.props.textReference],
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
    var sections = {};
    for (var section=0; section < data.length; section++) {
      var rows = [];
      for (var i = 0; i < data[section].length; i++) {
        var segment = []

        segment.push(<Text style={styles.verseNumber}>{data[section][i].segmentNumber}.</Text>)

        if (columnLanguage == "english" || columnLanguage == "bilingual") {
          segment.push(<TextSegment
                          segmentRef={this.props.segmentRef}
                          segmentKey={section+":"+data[section][i].segmentNumber}
                          data={data[section][i].text}
                          textType="english"
                          TextSegmentPressed={ this.props.TextSegmentPressed }
                          settings={this.props.settings}
                        />);
        }

        if (columnLanguage == "hebrew" || columnLanguage == "bilingual") {
          segment.push(<TextSegment
                          segmentRef={this.props.segmentRef}
                          segmentKey={section+":"+data[section][i].segmentNumber}
                          data={data[section][i].he}
                          textType="hebrew" TextSegmentPressed={ this.props.TextSegmentPressed }
                          settings={this.props.settings}
                        />);

        }
        rows.push(segment);
      }
    sections[this.state.sectionArray[section]] = rows;
    }
    return (sections)

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
//    this.refs._listView.scrollTo({x: 0, y: this.calculateOffset()+363, animated: false}) //TODO replace 363 with the height of textColumn


    Sefaria.data(this.props.prev).then(function(data) {

      var updatedData = this.props.data;
      updatedData.unshift(data.content);


      var newTitleArray = this.state.sectionArray;
      newTitleArray.unshift(this.props.prev);
      this.setState({sectionArray: newTitleArray});

      this.props.updateData(updatedData,this.props.prev,this.props.next,data.prev); //combined data content, new section title, the next section to be loaded on end , the previous section to load on top



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

      var updatedData = this.props.data;
      updatedData.push(data.content);

      var newTitleArray = this.state.sectionArray;
      newTitleArray.push(this.props.next);
      this.setState({sectionArray: newTitleArray});

      this.props.updateData(updatedData,this.props.next,data.next,this.props.prev); //combined data content, new section title, the next section to be loaded on end , the previous section to load on top




     }.bind(this)).catch(function(error) {
      console.log('oh no', error);
    });

  },

  visibleRowsChanged: function(visibleRows, changedRows) {

    //Change Title of ReaderPanel based on last visible section
    if (Object.keys(visibleRows)[0] != this.props.textReference) {
      this.props.updateTitle(Object.keys(visibleRows)[0])
    }

    //auto highlight the second to last visible segment
    if (this.props.textListVisible) {
      for (var section in visibleRows) {
        var numberOfVisibleSegments = Object.keys(visibleRows[section]).length;
        if (numberOfVisibleSegments < 2) {
          this.props.TextSegmentPressed(this.state.sectionArray.indexOf(section),0); //If there's only one verse from the new section, click it.
        }
        else {
          this.props.TextSegmentPressed(this.state.sectionArray.indexOf(section),parseInt(Object.keys(visibleRows[section])[numberOfVisibleSegments-2])); //click the second to last visible segment
        }
      }
    }


  },

  render: function() {
    var dataSourceRows = this.state.dataSource.cloneWithRowsAndSections(this.generateDataSource({}));

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
