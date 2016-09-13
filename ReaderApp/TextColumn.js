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
const UIManager = require('NativeModules').UIManager;

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
    offsetRef:        React.PropTypes.string,
    textTitle:        React.PropTypes.string,
    heTitle:          React.PropTypes.string,
    heRef:            React.PropTypes.string,
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
      sectionArray: [[this.props.textReference,this.props.heRef]],
      height: 0,
      prevHeight:0,
    };
  },

  componentDidMount: function() {


  },

  componentDidUpdate: function() {
    if (this.props.offsetRef != null) {

    }
  },

  componentWillReceiveProps: function(nextProps) {


  },

  generateDataSource: function() {

    var data = this.props.data;
    var sections = {};
    for (var section=0; section < data.length; section++) {
      var rows = [];
      for (var i = 0; i < data[section].length; i++) {
        var currSegData = data[section][i];
        var segment = []
        var columnLanguage = Sefaria.util.getColumnLanguageWithContent(this.props.columnLanguage,currSegData.text,currSegData.he);
        var sectionArrayLangToggleIndex;
        columnLanguage == "hebrew" ? sectionArrayLangToggleIndex = 1 : sectionArrayLangToggleIndex = 0;
//        console.log(this.state.sectionArray)
        if (i==0) {
          segment.push(<View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{this.state.sectionArray[section][sectionArrayLangToggleIndex].replace(this.props.textTitle,'')}</Text></View>);
        }

        var numberSegmentHolder = [];

        numberSegmentHolder.push(<Text style={styles.verseNumber}>{data[section][i].segmentNumber}</Text>)

        var segmentText = [];

        if (columnLanguage == "hebrew" || columnLanguage == "bilingual") {
          segmentText.push(<TextSegment
                          segmentRef={this.props.segmentRef}
                          segmentKey={section+":"+data[section][i].segmentNumber}
                          data={currSegData.he}
                          textType="hebrew"
                          TextSegmentPressed={ this.props.TextSegmentPressed }
                          settings={this.props.settings}
                        />);

        }


        if (columnLanguage == "english" || columnLanguage == "bilingual") {
          segmentText.push(<TextSegment
                          style={styles.TextSegment}
                          segmentRef={this.props.segmentRef}
                          segmentKey={section+":"+data[section][i].segmentNumber}
                          data={currSegData.text}
                          textType="english"
                          TextSegmentPressed={ this.props.TextSegmentPressed }
                          settings={this.props.settings}
                        />);
        }
        numberSegmentHolder.push(<View style={styles.TextSegment}>{segmentText}</View>)

        segment.push(<View style={styles.numberSegmentHolderEn}>{numberSegmentHolder}</View>)

        rows.push(segment);
      }
    sections[this.state.sectionArray[section][sectionArrayLangToggleIndex]] = rows;
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

    var visibleRows = this.refs._listView._visibleRows;
//    var numberOfVisibleSections = Object.keys(visibleRows).length;
    var nameOfFirstSection = Object.keys(visibleRows)[0];
    var nameOfSecondSection = Object.keys(visibleRows)[1] || null;
    if (!visibleRows[nameOfFirstSection]) return; //look at ListView implementation. renderScrollComponent runs before visibleRows is populated
    var numberOfVisibleSegmentsInFirstSection = Object.keys(visibleRows[nameOfFirstSection]).length;
    if (nameOfSecondSection !== null) {
      var numberOfVisibleSegmentsInSecondSection = Object.keys(visibleRows[nameOfSecondSection]).length;
    }
    else {
      var numberOfVisibleSegmentsInSecondSection = 0;
    }

   // console.log(visibleRows)

    //update title
    if (numberOfVisibleSegmentsInFirstSection > numberOfVisibleSegmentsInSecondSection) {
      this.props.updateTitle(nameOfFirstSection)
    }
    else {
      this.props.updateTitle(nameOfSecondSection)
    }

    //auto highlight middle visible segment
    if (this.props.textListVisible) {

      var indexOfMiddleVisibleSegment = parseInt((numberOfVisibleSegmentsInFirstSection + numberOfVisibleSegmentsInSecondSection) / 2);
      //    console.log(indexOfMiddleVisibleSegment);
      //console.log(visibleRows);

      //manually check for index of nameOfFirstSection because elements of this.state.sectionArray are of the form [engTitle,heTitle] and not simple strings
      let sectionIndex = -1;
      for (let i = 0; i < this.state.sectionArray.length; i++) {
        if (this.state.sectionArray[i][0] === nameOfFirstSection) {
          sectionIndex = i;
          break;
        }
      }

      if (indexOfMiddleVisibleSegment < numberOfVisibleSegmentsInFirstSection) {
        var segmentToLoad = parseInt(Object.keys(visibleRows[nameOfFirstSection])[indexOfMiddleVisibleSegment]);
        this.props.TextSegmentPressed(sectionIndex, segmentToLoad);
      }
      else {
        var segmentToLoad = parseInt(Object.keys(visibleRows[nameOfSecondSection])[indexOfMiddleVisibleSegment - numberOfVisibleSegmentsInFirstSection]);
        this.props.TextSegmentPressed(sectionIndex, segmentToLoad);
      }
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
    console.log(this.refs._listView.getMetrics());


    Sefaria.data(this.props.prev).then(function(data) {

      var updatedData = this.props.data;
      updatedData.unshift(data.content);


      var newTitleArray = this.state.sectionArray;
      newTitleArray.unshift([data.sectionRef,data.heRef]);
      this.setState({sectionArray: newTitleArray});

      this.props.updateData(updatedData,this.props.prev,this.props.next,data.prev); //combined data content, new section title, the next section to be loaded on end , the previous section to load on top


        console.log(this.refs._listView.getMetrics());

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
      newTitleArray.push([data.sectionRef,data.heRef]);
      this.setState({sectionArray: newTitleArray});

      this.props.updateData(updatedData,this.props.next,data.next,this.props.prev); //combined data content, new section title, the next section to be loaded on end , the previous section to load on top




     }.bind(this)).catch(function(error) {
      console.log('oh no', error);
    });

  },

  visibleRowsChanged: function(visibleRows, changedRows) {
//    console.log(visibleRows)


  },

  render: function() {
    var dataSourceRows = this.state.dataSource.cloneWithRowsAndSections(this.generateDataSource({}));

    if (this.props.offsetRef != null) {
      console.log("NOAHLUVSLITAL",this.props.offsetRef);
      const handle = React.findNodeHandle(this.refs[this.props.offsetRef]);
      /*UIManager.measureLayoutRelativeToParent(
        handle,
        (e) => {console.error(e)},
        (x, y, w, h) => {
          console.log('offset', x, y, w, h);
        });*/
    }

    return (
      <ListView ref='_listView'
                dataSource={dataSourceRows}
                renderRow={(rowData, sID, rID) =>  <View style={rID == this.props.segmentRef && this.props.textListVisible == true ? [styles.verseContainer,styles.segmentHighlight] : styles.verseContainer}>{rowData}</View>}
                onScroll={this.handleScroll}
                onChangeVisibleRows={(visibleRows, changedRows) => this.visibleRowsChanged(visibleRows, changedRows)}
                onContentSizeChange={(w, h) => {this.updateHeight(h)}}
                onEndReached={this.onEndReached}
                renderScrollComponent={props => <ScrollView {...props} contentOffset={{y:100}}/>}
                onEndReachedThreshold={300}
                scrollEventThrottle={200}
      />

    );
  }
});


module.exports = TextColumn;
