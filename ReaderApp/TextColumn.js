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

const MAX_NUM_SECTIONS = 200; //num sections that can be in this.props.data

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
    setLoadTextTail:    React.PropTypes.func
  },
  getInitialState: function() {
    return {
      dataSource: new ListView.DataSource({
        rowHasChanged: (r1, r2) => r1!== r2,
        sectionHeaderHasChanged: (s1, s2) => s1!==s2
      }),
      sectionArray: [this.props.textReference],
      sectionHeArray: [this.props.heRef],
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
    this.scrollToOffsetRef(true);
  },
  componentDidUpdate:function() {
    this.scrollToOffsetRef(false);
  },
  componentWillReceiveProps: function(nextProps) {

  },
  generateDataSource: function() {
    var data = this.props.data;
    var sections = {};

    if (this.props.textFlow == 'continuous') {
      for (var section = 0; section < data.length; section++) {
        var rows = {};
        var segmentText = [];

        for (var i = 0; i < data[section].length; i++) {
          var currSegData = data[section][i];
          currSegData.text = currSegData.text || "";
          currSegData.he = currSegData.he || "";
          var columnLanguage = Sefaria.util.getColumnLanguageWithContent(this.props.columnLanguage, currSegData.text, currSegData.he);

          if (i == 0) {
            segmentText.push(<Text style={styles.sectionHeader} key={section+"header"}>
              <Text style={[styles.sectionHeaderText, this.props.theme.sectionHeaderText]}>
                {columnLanguage == "hebrew" ?
                  this.state.sectionHeArray[section] :
                  this.state.sectionArray[section].replace(this.props.textTitle, '')}
              </Text>
            </Text>);
          }

          segmentText.push(<Text ref={this.state.sectionArray[section]+"_"+data[section][i].segmentNumber}
                                         style={[styles.verseNumber,this.props.theme.verseNumber]}
                                         key={section+":"+i+"segment-number"}>
            {data[section][i].segmentNumber}
          </Text>);


          if (columnLanguage == "hebrew" || columnLanguage == "bilingual") {
            segmentText.push(<TextSegment
              theme={this.props.theme}
              segmentIndexRef={this.props.segmentIndexRef}
              segmentKey={section+":"+i}
              key={section+":"+i}
              data={currSegData.he}
              textType="hebrew"
              textSegmentPressed={ this.props.textSegmentPressed }
              settings={this.props.settings}/>);
          }

          if (columnLanguage == "english" || columnLanguage == "bilingual") {
            segmentText.push(<TextSegment
              theme={this.props.theme}
              style={styles.TextSegment}
              segmentIndexRef={this.props.segmentIndexRef}
              segmentKey={section+":"+i}
              key={section+":"+i}
              data={currSegData.text}
              textType="english"
              textSegmentPressed={ this.props.textSegmentPressed }
              settings={this.props.settings}/>);
          }

          segmentText.push(<Text> </Text>);



          // rows.push(segment);
          rows[this.state.sectionArray[section] + "_" + "wholeSection"] = <View style={styles.numberSegmentHolderEnContinuous} key={section+":"+1}><Text>{segmentText}</Text></View>;

        }
        sections[this.state.sectionArray[section]] = rows;
      }
      return sections;
    }

    else if (this.props.textFlow == 'segmented') {
      for (var section = 0; section < data.length; section++) {
        var rows = {};
        for (var i = 0; i < data[section].length; i++) {
          var currSegData = data[section][i];
          currSegData.text = currSegData.text || "";
          currSegData.he = currSegData.he || "";
          var segment = [];
          var columnLanguage = Sefaria.util.getColumnLanguageWithContent(this.props.columnLanguage, currSegData.text, currSegData.he);

          if (i == 0) {
            segment.push(<View style={styles.sectionHeader} key={section+"header"}>
              <Text style={[styles.sectionHeaderText, this.props.theme.sectionHeaderText]}>
                {columnLanguage == "hebrew" ?
                  this.state.sectionHeArray[section] :
                  this.state.sectionArray[section].replace(this.props.textTitle, '')}
              </Text>
            </View>);
          }

          var numberSegmentHolder = [];

          numberSegmentHolder.push(<Text ref={this.state.sectionArray[section]+"_"+data[section][i].segmentNumber}
                                         style={[styles.verseNumber,this.props.theme.verseNumber]}
                                         key={section+":"+i+"segment-number"}>
            {data[section][i].segmentNumber}
          </Text>);

          var segmentText = [];

          if (columnLanguage == "hebrew" || columnLanguage == "bilingual") {
            segmentText.push(<TextSegment
              theme={this.props.theme}
              segmentIndexRef={this.props.segmentIndexRef}
              segmentKey={section+":"+i}
              key={section+":"+i}
              data={currSegData.he}
              textType="hebrew"
              textSegmentPressed={ this.props.textSegmentPressed }
              settings={this.props.settings}/>);
          }

          if (columnLanguage == "english" || columnLanguage == "bilingual") {
            segmentText.push(<TextSegment
              theme={this.props.theme}
              style={styles.TextSegment}
              segmentIndexRef={this.props.segmentIndexRef}
              segmentKey={section+":"+i}
              key={section+":"+i}
              data={currSegData.text}
              textType="english"
              textSegmentPressed={ this.props.textSegmentPressed }
              settings={this.props.settings}/>);
          }
          numberSegmentHolder.push(<View style={styles.TextSegment} key={section+":"+i}>{segmentText}</View>)

          segment.push(<View style={styles.numberSegmentHolderEn} key={section+":"+i}>{numberSegmentHolder}</View>)

          // rows.push(segment);
          rows[this.state.sectionArray[section] + "_" + data[section][i].segmentNumber] = segment;
        }
        sections[this.state.sectionArray[section]] = rows;
      }
      return sections;
    }


  },
  handleScroll: function(e) {
    if (e.nativeEvent.contentOffset.y < -50) {
       this.onTopReached();
    }

    var visibleRows = this.refs._listView._visibleRows;

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

    //update title
    if (numberOfVisibleSegmentsInFirstSection > numberOfVisibleSegmentsInSecondSection) {
      var enTitle = nameOfFirstSection;
      var heTitle = this.state.sectionHeArray[this.state.sectionArray.indexOf(nameOfFirstSection)];
      this.props.updateTitle(enTitle, heTitle);
    }
    else {
      var enTitle = nameOfSecondSection;
      var heTitle = this.state.sectionHeArray[this.state.sectionArray.indexOf(nameOfSecondSection)];
      this.props.updateTitle(enTitle, heTitle);
    }

    //auto highlight middle visible segment
   if (this.props.textListVisible) {

      var indexOfMiddleVisibleSegment = parseInt((numberOfVisibleSegmentsInFirstSection + numberOfVisibleSegmentsInSecondSection) / 2);
      //    console.log(indexOfMiddleVisibleSegment);
      //console.log(visibleRows);

      if (indexOfMiddleVisibleSegment < numberOfVisibleSegmentsInFirstSection) {
        var segmentToLoad = parseInt(Object.keys(visibleRows[nameOfFirstSection])[indexOfMiddleVisibleSegment].replace(nameOfFirstSection+"_",""));
        this.props.textSegmentPressed(this.state.sectionArray.indexOf(nameOfFirstSection), segmentToLoad);
      }
      else {
        var segmentToLoad = parseInt(Object.keys(visibleRows[nameOfSecondSection])[indexOfMiddleVisibleSegment - numberOfVisibleSegmentsInFirstSection].replace(nameOfSecondSection+"_",""));
        this.props.textSegmentPressed(this.state.sectionArray.indexOf(nameOfSecondSection), segmentToLoad);
      }
    }
  },
  scrollToTarget: function() {
      console.log(Object.keys(this.refs._listView._visibleRows)[0]);
      console.log(this.state.targetSectionRef)
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
             console.log(left, top, width, height, pageX, pageY)
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
    this.props.setLoadTextTail(true);
//    this.refs._listView.scrollTo({x: 0, y: this.calculateOffset(), animated: false}) //TODO replace 363 with the height of textColumn

    this.state.scrollingToTargetRef = true;
    this.state.targetSectionRef=this.props.textReference;

    Sefaria.data(this.props.prev).then(function(data) {

      var updatedData = this.props.data;
      updatedData.unshift(data.content);

      var newTitleArray = this.state.sectionArray;
      var newHeTitleArray = this.state.sectionHeArray;
      newTitleArray.unshift(data.sectionRef);
      newHeTitleArray.unshift(data.heRef);
      if (updatedData.length > MAX_NUM_SECTIONS) {
        updatedData.pop();
        newTitleArray.pop();
        newHeTitleArray.pop();
      }

      this.setState({
        sectionArray: newTitleArray,
        sectionHeArray: newHeTitleArray
      });

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
      var newHeTitleArray = this.state.sectionHeArray;
      newTitleArray.push(data.sectionRef);
      newHeTitleArray.push(data.heRef);

      if (updatedData.length > MAX_NUM_SECTIONS) {
        updatedData.shift();
        newTitleArray.shift();
        newHeTitleArray.shift();
      }


      this.setState({
        sectionArray: newTitleArray,
        sectionHeArray: newHeTitleArray
      });


      this.props.updateData(updatedData,this.props.next,data.next,this.props.prev); //combined data content, new section title, the next section to be loaded on end , the previous section to load on top




     }.bind(this)).catch(function(error) {
      console.log('oh no', error);
    });

  },
  visibleRowsChanged: function(visibleRows, changedRows) {
    if (this.props.loadingTextTail == false && this.state.targetSectionRef != "" && this.state.scrollingToTargetRef == true) {
      this.scrollToTarget();
    }
  },
  scrollToOffsetRef: function(didMount) {
    /* Warning, this function is hacky. anyone who knows how to improve it, be my guest
    didMount - true if comint from componentDidMount. it seems that none of the rows have heights (even if they're on screen) at the did mount stage. so I scroll by one pixel so that the rows get measured

    the function looks to see if this.props.offsetRef is on screen. it determines if its on screen by measuring the row. if it's height is 0, it is probably not on screen. right now I can't find a better way to do this
    if on screen, it jumps to it
    if not, it jumps a whole screen downwards (except if didMount is true, see above). on the next render it will check again
    */
    if (this.props.offsetRef != null && !this.state.scrolledToOffsetRef) {
      let ref = this.refs[this.props.offsetRef];
      let handle = findNodeHandle(ref);
      if (handle != null) {
        queryLayoutByID(
           handle,
           null, /*Error callback that doesn't yet have a hook in native so doesn't get called */
           (left, top, width, height, pageX, pageY) => {
             if (pageY == 0) { //I'm forced to assume this means it's not on screen, though it could also be at the top of the page...
              this.refs._listView.scrollTo({
                x: 0,
                y: didMount ? 1 :this.refs._listView.scrollProperties.offset+this.refs._listView.scrollProperties.visibleLength,
                animated: false
              });
             } else {
               //LayoutAnimation.configureNext(CustomLayoutAnimation);
               //this.setState({scrolledToOffsetRef:true,scrollOffset:this.refs._listView.scrollProperties.offset+pageY-100});
               this.refs._listView.scrollTo({
                 x: 0,
                 y: this.refs._listView.scrollProperties.offset+pageY-100,
                 animated: false
               });
             }
           }
        );
      } else {
        //console.log("FAIL","fail...");
      }
    }
  },
  renderRow: function(rowData, sID, rID) {
    let seg = this.props.data[this.state.sectionArray.indexOf(sID)][this.props.segmentIndexRef];

    let style = [styles.verseContainer];
    if ((seg && rID === sID+"_"+seg.segmentNumber && this.props.textListVisible) || this.props.offsetRef == rID) {
        style.push(this.props.theme.segmentHighlight);
    }
    return <View style={style}>{rowData}</View>;
  },
  render: function() {
    this.state.dataSourceRows = this.state.dataSource.cloneWithRowsAndSections(this.generateDataSource({}));
    if (this.props.offsetRef != null) {
      //console.log("NOAHL",this.props.offsetRef);
      //console.log("NOAHL2",this.dataSource[this.state.sectionArray[0]][this.props.offsetRef]);
    }
    //ref={this.props.textReference+"_"+this.props.data[this.state.sectionArray.indexOf(sID)][this.props.segmentRef].segmentNumber}
    return (
      <ListView ref='_listView'
                dataSource={this.state.dataSourceRows}
                renderRow={this.renderRow}
                onScroll={this.handleScroll}
                onChangeVisibleRows={(visibleRows, changedRows) => this.visibleRowsChanged(visibleRows, changedRows)}
                onEndReached={this.onEndReached}
                /*renderScrollComponent={props => <ScrollView {...props} contentOffset={{y:this.state.scrollOffset}}/>}*/
                initialListSize={40}
                onContentSizeChange={(w, h) => {this.updateHeight(h)}}
                onEndReachedThreshold={500}
                scrollEventThrottle={200} />
    );
  }
});


module.exports = TextColumn;
