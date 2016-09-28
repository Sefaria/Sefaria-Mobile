'use strict';
import React, { Component } from 'react';
import ReactNative, { 	AppRegistry,
  StyleSheet,
  View,
  ScrollView,
  Text,
  findNodeHandle,
  ListView,
  LayoutAnimation
} from 'react-native';

const styles = require('./Styles.js');
const queryLayoutByID = require('queryLayoutByID');
const TextRange = require('./TextRange');
const TextRangeContinuous = require('./TextRangeContinuous');
const TextSegment = require('./TextSegment');

const {
  LoadingView,
} = require('./Misc.js');

const MAX_NUM_SECTIONS = 200; //num sections that can be in this.props.data
var counter = 0;
var segmentIndexRefPositionArray = {};

var CustomLayoutAnimation = {
  duration: 100,
  create: {
    type: LayoutAnimation.Types.linear,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.linear,
  },
};


var TextColumn = React.createClass({
  propTypes: {
    theme:              React.PropTypes.object.isRequired,
    settings:           React.PropTypes.object,
    data:               React.PropTypes.array,
    textReference:      React.PropTypes.string,
    sectionArray:       React.PropTypes.array,
    sectionHeArray:     React.PropTypes.array,
    offsetRef:          React.PropTypes.string,
    segmentIndexRef:    React.PropTypes.number,
    textTitle:          React.PropTypes.string,
    heTitle:            React.PropTypes.string,
    heRef:              React.PropTypes.string,
    textFlow:           React.PropTypes.oneOf(["segmented","continuous"]),
    columnLanguage:     React.PropTypes.oneOf(["hebrew","english","bilingual"]),
    updateData:         React.PropTypes.func,
    updateTitle:        React.PropTypes.func,
    textSegmentPressed: React.PropTypes.func,
    textListVisible:    React.PropTypes.bool,
    next:               React.PropTypes.string,
    prev:               React.PropTypes.string,
    loadingTextTail:    React.PropTypes.bool,
  },
  getInitialState: function() {
    this.rowRefs = {}; //hash table of currently loaded row refs.
    return {
      dataSource: new ListView.DataSource({
          rowHasChanged: this.rowHasChanged,
          sectionHeaderHasChanged: (s1, s2) => s1 !== s2
        }).cloneWithRowsAndSections(this.generateDataSource(this.props)),
      height: 0,
      prevHeight:0,
      targetSectionRef: "",
      scrollingToTargetRef:false,
      scrolledAtLeastOnceToTargetRef: false,
      scrolledToOffsetRef:false,
      scrollOffset:0
    };
  },
  componentDidMount: function() {
    this.scrollToRef(this.props.offsetRef,true,false);
  },
  componentDidUpdate:function() {
    this.scrollToRef(this.props.offsetRef,false,false);
  },
  componentWillReceiveProps: function(nextProps) {
    //console.log("TextColumn Will Receive Props");
    //console.log("data length: " + this.props.data.length + " -> " + nextProps.data.length)
    if (this.props.data.length !== nextProps.data.length ||
        this.props.textFlow !== nextProps.textFlow ||
        this.props.columnLanguage !== nextProps.columnLanguage ||
        this.props.settings.fontSize !== nextProps.settings.fontSize ||
        this.props.textListVisible !== nextProps.textListVisible ||
        this.props.segmentIndexRef !== nextProps.segmentIndexRef) {
      // Only update dataSource when a change has occurred that will result in different data
      var newData = this.generateDataSource(nextProps);
      this.setState({dataSource: this.state.dataSource.cloneWithRowsAndSections(newData)});
    }
  },
  /*findDataSectionIndex: function(sectionName) {
    for (let i = 0; i < this.props.data.length; i++) {
      if
    }
  },*/
  /*note segNum is a numerical string */
  findDataSegmentIndex: function (secIndex,segNum) {
    let start = this.props.data[secIndex].length-1;
    for (let i = start; i >= 0; i--) {
      if (this.props.data[secIndex][i].segmentNumber === segNum) {
        return i;
      }
    }
    return -1;
  },

  handleScroll: function(e) {
    if (e.nativeEvent.contentOffset.y < -50) {
       this.onTopReached();
    }

    var visibleRows = this.refs._listView._visibleRows;

    var nameOfFirstSection = Object.keys(visibleRows)[0];
    var nameOfSecondSection = Object.keys(visibleRows)[1] || null;

    if (!nameOfFirstSection) {
      console.log("HELP ME!!!");
      //this.props.setColumnLanguage(this.props.columnLanguage == "english" ? "hebrew" : "english");
    }
    if (nameOfSecondSection != null) {
      let firstInd = this.props.sectionArray.indexOf(nameOfFirstSection);
      let secondInd = this.props.sectionArray.indexOf(nameOfSecondSection);
      if (firstInd > secondInd) {
        console.log("SWAP",nameOfFirstSection,nameOfSecondSection);
        let tempFirst = nameOfFirstSection;
        nameOfFirstSection = nameOfSecondSection;
        nameOfSecondSection = tempFirst;
      }
    }
    console.log("VISIBLE TITLES",nameOfFirstSection,nameOfSecondSection,Object.keys(this.refs._listView._visibleRows));

    if (!visibleRows[nameOfFirstSection]) return; //look at ListView implementation. renderScrollComponent runs before visibleRows is populated
    var numberOfVisibleSegmentsInFirstSection = Object.keys(visibleRows[nameOfFirstSection]).length;
    if (nameOfSecondSection !== null) {
      var numberOfVisibleSegmentsInSecondSection = Object.keys(visibleRows[nameOfSecondSection]).length;
    }
    else {
      var numberOfVisibleSegmentsInSecondSection = 0;
    }

    // update title
    if (numberOfVisibleSegmentsInFirstSection > numberOfVisibleSegmentsInSecondSection) {
      var enTitle = nameOfFirstSection;
      var heTitle = this.props.sectionHeArray[this.props.sectionArray.indexOf(nameOfFirstSection)];
      if (enTitle !== this.props.textReference) {
        this.props.updateTitle(enTitle, heTitle);
      }
    } else {
      var enTitle = nameOfSecondSection;
      var heTitle = this.props.sectionHeArray[this.props.sectionArray.indexOf(nameOfSecondSection)];
      if (enTitle !== this.props.textReference) {
        this.props.updateTitle(enTitle, heTitle);
      }
    }

    //auto highlight middle visible segment
   if (this.props.textListVisible) {

      // Measure scroll velocity, don't update unless we're moving slowly.
      if (Math.abs(this.previousY - e.nativeEvent.contentOffset.y) > 200) {
        this.previousY = e.nativeEvent.contentOffset.y;
        return;
      }
      this.previousY = e.nativeEvent.contentOffset.y;

      var allVisibleRows = [];



      for (let seg of Object.keys(visibleRows[nameOfFirstSection])) {
        let segNum = parseInt(seg.replace(nameOfFirstSection+"_",""));

        allVisibleRows.push({"segIndex":this.findDataSegmentIndex(0,""+segNum),"secIndex":0,"sortNum":segNum});
      }
      if (nameOfSecondSection != null) {
        for (let seg of Object.keys(visibleRows[nameOfSecondSection])) {
          let segNum = parseInt(seg.replace(nameOfSecondSection+"_",""));
          allVisibleRows.push({"segIndex":this.findDataSegmentIndex(1,""+segNum),"secIndex":1,"sortNum":10000*segNum});
        }
      }
      allVisibleRows.sort((a,b)=>a.sortNum-b.sortNum);

      let highlightIndex = allVisibleRows.length >= 2 ? 1 : 0;
      var segmentToLoad = allVisibleRows[highlightIndex].segIndex; //we now know the first element has the lowest segment number
      var sectionToLoad = allVisibleRows[highlightIndex].secIndex;
      console.log("VISIBLE",this.props.sectionArray);

      if (segmentToLoad !== this.props.segmentIndexRef) {
        this.props.textSegmentPressed(sectionToLoad, segmentToLoad);
      }

    }
  },
  scrollToTarget: function() {
      //console.log(Object.keys(this.refs._listView._visibleRows)[0]);
      //console.log(this.state.targetSectionRef)
      //if current section not visible
      if (this.state.targetSectionRef !== Object.keys(this.refs._listView._visibleRows)[0] && this.state.targetSectionRef !== Object.keys(this.refs._listView._visibleRows)[1]) {
        this.refs._listView.scrollTo({
          x: 0,
          y: this.refs._listView.scrollProperties.offset + (this.refs._listView.scrollProperties.visibleLength),
          animated: false
        });
        this.state.scrolledAtLeastOnceToTargetRef = true;
      }
      else if (this.state.scrolledAtLeastOnceToTargetRef == true) {
        var handler = findNodeHandle(this.refs[(Object.keys(this.refs._listView._visibleRows[Object.keys(this.refs._listView._visibleRows)[1]])[0])])
        queryLayoutByID(
           handler,
           null, /*Error callback that doesn't yet have a hook in native so doesn't get called */
           (left, top, width, height, pageX, pageY) => {
             //console.log(left, top, width, height, pageX, pageY)
             this.refs._listView.scrollTo({
               x: 0,
               y: this.refs._listView.scrollProperties.offset+pageY-150,
               animated: false
             });
           }
        );
        this.setState({
          scrollingToTargetRef: false,
          scrolledAtLeastOnceToTargetRef: false,
          targetSectionRef: ""
        });
      }


  },
  updateHeight: function(newHeight) {
    if (this.props.loadingTextTail == false && this.state.targetSectionRef != "" && this.state.scrollingToTargetRef == true) {
      this.scrollToTarget();
    }
  },
  onTopReached: function() {
    if (this.props.loadingTextTail) {
      //already loading tail
      return;
    }

    // this.refs._listView.scrollTo({x: 0, y: this.calculateOffset(), animated: false}) //TODO replace 363 with the height of textColumn

    this.state.scrollingToTargetRef = true;
    this.state.targetSectionRef=this.props.textReference;

    this.props.updateData("prev");
  },
  onEndReached: function() {
    if (this.props.loadingTextTail) {
      //already loading tail
      return;
    }
    this.props.updateData("next");
  },
  visibleRowsChanged: function(visibleRows, changedRows) {
    counter++;
    console.log(counter,"VISIBLE ROWS CHANGED",Object.keys(visibleRows),Object.keys(changedRows));
    if (this.props.loadingTextTail == false && this.state.targetSectionRef != "" && this.state.scrollingToTargetRef == true) {
      this.scrollToTarget();
    }
  },
  scrollOneScreenDown: function(initialScroll) {
    this.refs._listView.scrollTo({
      x: 0,
      y: initialScroll ? 1 :this.refs._listView.scrollProperties.offset+(1.5*this.refs._listView.scrollProperties.visibleLength),
      animated: false
    });
    this.setState({continueScrolling:true}); //needed to continue rendering after each success scroll
  },
  scrollToRef: function(rowRef,didMount,isClickScroll) {
    /* Warning, this function is hacky. anyone who knows how to improve it, be my guest
    didMount - true if comint from componentDidMount. it seems that none of the rows have heights (even if they're on screen) at the did mount stage. so I scroll by one pixel so that the rows get measured

    the function looks to see if this.props.offsetRef is on screen. it determines if its on screen by measuring the row. if it's height is 0, it is probably not on screen. right now I can't find a better way to do this
    if on screen, it jumps to it
    if not, it jumps a whole screen downwards (except if didMount is true, see above). on the next render it will check again
    */

    if (rowRef && rowRef != null && (!this.state.scrolledToOffsetRef || isClickScroll)) {
      let ref = this.rowRefs[rowRef];
      let handle = findNodeHandle(ref);
      if (handle != null) {
        queryLayoutByID(
           handle,
           null, /*Error callback that doesn't yet have a hook in native so doesn't get called */
           (left, top, width, height, pageX, pageY) => {
             if (pageY == 0) { //I'm forced to assume this means it's not on screen, though it could also be at the top of the page...
                this.scrollOneScreenDown(didMount);
             } else {
               //LayoutAnimation.configureNext(CustomLayoutAnimation);
               this.setState({scrolledToOffsetRef:true});
               this.refs._listView.scrollTo({
                 x: 0,
                 y: this.refs._listView.scrollProperties.offset+pageY-100,
                 animated: false
               });
             }
           }
        );
      } else {
        //console.log("FAIL!!!");
        //this.scrollOneScreenDown(didMount);
      }
    }
  },
  generateDataSource: function(props) {
    // Returns data representing sections and rows to be passed into ListView.DataSource.cloneWithSectionsAndRows
    // Takes `props` as an argument so it can generate data with `nextProps`.
    var start = new Date();
    var data = props.data;
    var sections = {};

    var highlightedRow = props.textReference + "_" + (props.segmentIndexRef+1);

    if (props.textFlow == 'continuous') {
      var rows = {};
      var highlight = null;
      for (var section = 0; section < data.length; section++) {
        var rowID = props.sectionArray[section] + "_" + "wholeSection";
        var rowData = {
          section: section,
          segmentData: [],
          changeString: [section, props.columnLanguage, props.textFlow, props.settings.fontSize].join("|")
        };

        for (var i = 0; i < data[section].length; i++) {
          var segmentData = {
            content: data[section][i],
            highlight: props.offsetRef == rowID.replace("wholeSection", i+1) || (props.textListVisible && highlightedRow == rowID.replace("wholeSection", i+1))
          }
          highlight = segmentData.highlight ? i : highlight;
          rowData.segmentData.push(segmentData);
        }
        rowData.changeString += highlight ? "|highlight:" + highlight : "";
        rows[rowID] = rowData;
        sections[this.props.sectionArray[section]] = rows;
      }
    }

    else if (props.textFlow == 'segmented') {
      for (var section = 0; section < data.length; section++) {
        var rows = {};
        for (var i = 0; i < data[section].length; i++) {
          var rowID = props.sectionArray[section] + "_" + data[section][i].segmentNumber;
          var rowData = {
            content: data[section][i], // Store data in `content` so that we can manipulate other fields without manipulating the original data
            section: section,
            row: i,
            highlight: props.offsetRef == rowID || (props.textListVisible && highlightedRow == rowID),
            changeString: [rowID, props.columnLanguage, props.textFlow, props.settings.fontSize].join("|")
          };
          rowData.changeString += rowData.highlight ? "|highlight" : "";
          rows[rowID] = rowData;
        }
        sections[this.props.sectionArray[section]] = rows;
      }
    }
    //console.log("generateDataSource finished in " + (new Date() - start));
    //console.log(sections);
    return sections;

  },
  renderContinuousRow: function(rowData, sID, rID) {
    // In continuous case, rowData represent an entire section of text
    var segments = [];
    for (var i = 0; i < rowData.segmentData.length; i++) {
      var segmentText = [];
      var currSegData = rowData.segmentData[i];
      currSegData.text = currSegData.content.text || "";
      currSegData.he = currSegData.content.he || "";
      var columnLanguage = Sefaria.util.getColumnLanguageWithContent(this.props.columnLanguage, currSegData.text, currSegData.he);
      var refSection = rowData.section + ":" + i;
      var reactRef = this.props.sectionArray[rowData.section] + "_" + this.props.data[rowData.section][i].segmentNumber; //TODO use : instead of _ for seperator
      segmentText.push(<Text ref={this.props.sectionArray[rowData.section] + "_" + currSegData.segmentNumber}
                                     style={[styles.verseNumber,this.props.theme.verseNumber]}
                                     key={refSection+"segment-number"}>
        {currSegData.segmentNumber}
      </Text>);


      if (columnLanguage == "hebrew" || columnLanguage == "bilingual") {
        segmentText.push(<TextSegment
          theme={this.props.theme}
          segmentIndexRef={this.props.segmentIndexRef}
          rowRef={reactRef}
          scrollToRef={this.scrollToRef}
          segmentKey={refSection}
          key={refSection+"-he"}
          data={currSegData.he}
          textType="hebrew"
          textSegmentPressed={ this.props.textSegmentPressed }
          textListVisible={this.props.textListVisible}
          settings={this.props.settings}/>);
      }

      if (columnLanguage == "english" || columnLanguage == "bilingual") {
        segmentText.push(<TextSegment
          theme={this.props.theme}
          style={styles.TextSegment}
          segmentIndexRef={this.props.segmentIndexRef}
          rowRef={reactRef}
          scrollToRef={this.scrollToRef}
          segmentKey={refSection}
          key={refSection+"-en"}
          data={currSegData.text}
          textType="english"
          textSegmentPressed={ this.props.textSegmentPressed }
          textListVisible={this.props.textListVisible}
          settings={this.props.settings}/>);
      }

      segmentText.push(<Text> </Text>);
      // Highlight within continuous isn't working yet
      var style = rowData.highlight ? [this.props.theme.segmentHighlight] : [];
      segments.push(<Text style={style} ref={(view)=>this.rowRefs[reactRef]=view}>{segmentText}</Text>);

    }
    return <View style={[styles.verseContainer, styles.numberSegmentHolderEnContinuous]} key={rowData.section + ":" + 1}>
              <View style={styles.sectionHeader} key={rowData.section+"header"}>
                <Text style={[styles.sectionHeaderText, this.props.theme.sectionHeaderText]}>
                  {columnLanguage == "hebrew" ?
                    this.props.sectionHeArray[rowData.section] :
                    this.props.sectionArray[rowData.section].replace(this.props.textTitle, '')}
                </Text>
              </View>
              <Text>{segments}</Text>
           </View>;
  },
  renderSegmentedRow: function(rowData, sID, rID) {
    // In segmented case, rowData represents a segments of text
    rowData.text = rowData.content.text || "";
    rowData.he = rowData.content.he || "";
    var segment = [];
    var columnLanguage = Sefaria.util.getColumnLanguageWithContent(this.props.columnLanguage, rowData.text, rowData.he);
    var refSection = rowData.section + ":" + rowData.row;
    var reactRef = this.props.sectionArray[rowData.section] + "_" + this.props.data[rowData.section][rowData.row].segmentNumber; //TODO use : instead of _ for seperator

    if (rowData.row == 0) {
      segment.push(<View style={styles.sectionHeader} key={rowData.section+"header"}>
        <Text style={[styles.sectionHeaderText, this.props.theme.sectionHeaderText]}>
          {columnLanguage == "hebrew" ?
            this.props.sectionHeArray[rowData.section] :
            this.props.sectionArray[rowData.section].replace(this.props.textTitle, '')}
        </Text>
      </View>);
    }

    var numberSegmentHolder = [];

    numberSegmentHolder.push(<Text ref={this.props.sectionArray[rowData.section] + "_"+ rowData.content.segmentNumber}
                                   style={[styles.verseNumber,this.props.theme.verseNumber]}
                                   key={refSection + "segment-number"}>
      {rowData.content.segmentNumber}
    </Text>);


    var segmentText = [];

    if (columnLanguage == "hebrew" || columnLanguage == "bilingual") {
      segmentText.push(<TextSegment
        rowRef={reactRef}
        theme={this.props.theme}
        segmentIndexRef={this.props.segmentIndexRef}
        segmentKey={refSection}
        scrollToRef={this.scrollToRef}
        key={refSection+"-he"}
        data={rowData.he}
        textType="hebrew"
        textSegmentPressed={ this.props.textSegmentPressed }
        textListVisible={this.props.textListVisible}
        settings={this.props.settings}/>);
    }

    if (columnLanguage == "english" || columnLanguage == "bilingual") {
      segmentText.push(<TextSegment
        rowRef={reactRef}
        theme={this.props.theme}
        style={styles.TextSegment}
        segmentIndexRef={this.props.segmentIndexRef}
        segmentKey={refSection}
        scrollToRef={this.scrollToRef}
        key={refSection+"-en"}
        data={rowData.text}
        textType="english"
        textSegmentPressed={ this.props.textSegmentPressed }
        textListVisible={this.props.textListVisible}
        settings={this.props.settings} />);
    }
    numberSegmentHolder.push(<View style={styles.TextSegment} key={refSection}>{segmentText}</View>);

    segment.push(<View style={styles.numberSegmentHolderEn} key={refSection}>{numberSegmentHolder}</View>);

    let style = [styles.verseContainer];
    if (rowData.highlight) {
        style.push(this.props.theme.segmentHighlight);
    }

    return <View style={style} ref={(view)=>this.rowRefs[reactRef]=view}>{segment}</View>;
  },
  rowHasChanged: function(r1, r2) {
    //console.log(r1.changeString + " vs. " + r2.changeString);
    var changed = (r1.changeString !== r2.changeString);
    return (changed);
  },
  renderRow: function(rowData, sID, rID) {
    //console.log("Rendering " + rID);
    if (this.props.textFlow == 'continuous') {
      var row = this.renderContinuousRow(rowData);
    } else if (this.props.textFlow == 'segmented') {
      var row = this.renderSegmentedRow(rowData);
    }
    return row;
  },
  renderFooter: function() {
    return this.props.next ? <LoadingView theme={this.props.theme} /> : null;
  },
  render: function() {
    //console.log("HASHSIZE",Object.keys(this.rowRefs).length);
    //ref={this.props.textReference+"_"+this.props.data[this.state.sectionArray.indexOf(sID)][this.props.segmentRef].segmentNumber}
    return (
      <ListView ref='_listView'
                dataSource={this.state.dataSource}
                renderRow={this.renderRow}
                onScroll={this.handleScroll}
                onChangeVisibleRows={this.visibleRowsChanged}
                onEndReached={this.onEndReached}
                renderFooter={this.renderFooter}
                /*renderScrollComponent={props => <ScrollView {...props} contentOffset={{y:this.state.scrollOffset}}/>}*/
                initialListSize={40}
                onContentSizeChange={(w, h) => {this.updateHeight(h)}}
                onEndReachedThreshold={1000}
                scrollEventThrottle={100} />
    );
  }
});


module.exports = TextColumn;
