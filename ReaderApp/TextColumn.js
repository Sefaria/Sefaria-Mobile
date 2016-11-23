'use strict';
import React, { Component } from 'react';
import ReactNative, { 	AppRegistry,
  StyleSheet,
  View,
  ScrollView,
  Text,
  findNodeHandle,
  ActivityIndicator,
  ListView,
  RefreshControl,
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
    themeStr:           React.PropTypes.string,
    settings:           React.PropTypes.object,
    data:               React.PropTypes.array,
    textReference:      React.PropTypes.string,
    sectionArray:       React.PropTypes.array,
    sectionHeArray:     React.PropTypes.array,
    offsetRef:          React.PropTypes.string,
    segmentRef:         React.PropTypes.string,
    segmentIndexRef:    React.PropTypes.number,
    textTitle:          React.PropTypes.string,
    heTitle:            React.PropTypes.string,
    heRef:              React.PropTypes.string,
    textFlow:           React.PropTypes.oneOf(["segmented","continuous"]),
    textLanguage:       React.PropTypes.oneOf(["hebrew","english","bilingual"]),
    updateData:         React.PropTypes.func,
    updateTitle:        React.PropTypes.func,
    textSegmentPressed: React.PropTypes.func,
    textListVisible:    React.PropTypes.bool,
    next:               React.PropTypes.string,
    prev:               React.PropTypes.string,
    loadingTextTail:    React.PropTypes.bool,
    loadingTextHead:    React.PropTypes.bool,
    linksLoaded:     React.PropTypes.array,
  },
  getInitialState: function() {
    this.rowRefs = {}; //hash table of currently loaded row refs.
    this.sectionRefsHash= {}; //hash table of currently loaded section refs.
    this.previousY = 0; // for measuring scroll speed
    return {
      dataSource: new ListView.DataSource({
          rowHasChanged: this.rowHasChanged,
          sectionHeaderHasChanged: (s1, s2) => s1 !== s2
        }).cloneWithRowsAndSections(this.generateDataSource(this.props)),
      targetSectionRef: "",
      scrollingToTargetRef:false,
      scrolledToOffsetRef:false,
      scrollOffset:0,
      highlightRef: "",
    };
  },
  componentDidMount: function() {
    if (this._standardizeOffsetRef(this.props.offsetRef) && !this.state.scrolledToOffsetRef) {
      this.scrollToRef(this._standardizeOffsetRef(this.props.offsetRef), true, false);
    } else {
      // Scroll one pixel to ensure next section is loaded if current section is very short
      this.refs._listView.scrollTo({x: 0, y: 1, animated: false });
    }
  },
  componentDidUpdate:function(prevProps, prevState) {
    this.scrollToRef(this._standardizeOffsetRef(this.props.offsetRef), false, false);
  },

  componentWillReceiveProps: function(nextProps) {
    //console.log("TextColumn Will Receive Props",this.props.segmentRef + " -> " + nextProps.segmentRef);
    //console.log("data length: " + this.props.data.length + " -> " + nextProps.data.length)

    if (this.props.data.length !== nextProps.data.length ||
        this.props.textFlow !== nextProps.textFlow ||
        this.props.textLanguage !== nextProps.textLanguage ||
        this.props.settings.fontSize !== nextProps.settings.fontSize ||
        this.props.textListVisible !== nextProps.textListVisible ||
        this.props.segmentIndexRef !== nextProps.segmentIndexRef ||
        this.props.segmentRef !== nextProps.segmentRef ||
        this.props.themeStr !== nextProps.themeStr ||
        this.props.linksLoaded !== nextProps.linksLoaded) {
      // Only update dataSource when a change has occurred that will result in different data
      var newData = this.generateDataSource(nextProps);
      this.setState({dataSource: this.state.dataSource.cloneWithRowsAndSections(newData)});
    }
  },
  updateHighlightedSegmentContinuous: function(e) {
    var currentOffset = e.nativeEvent.contentOffset.y;
    var direction = currentOffset > this.offset ? 'down' : 'up';
    this.offset = currentOffset;


    var visibleSections = this.getVisibleSections();
    var nameOfFirstSection = visibleSections[0];
    var nameOfSecondSection = visibleSections[1] || null;

    var curRowRefs =  this.rowRefs

    var currentSectionSegmentsPos = [];


    for (var eachRow in curRowRefs) {
      if (eachRow.split(":")[0] == nameOfFirstSection) {
        currentSectionSegmentsPos.push([eachRow, this.rowRefs[eachRow]._initY])
      }
    }
    currentSectionSegmentsPos.sort(
        function(a, b) {
            return a[1] - b[1]
        }
    )


    for (var i = 0; i < currentSectionSegmentsPos.length; i++) {
      if (currentSectionSegmentsPos[i][1] + this.sectionRefsHash[nameOfFirstSection].y >= this.refs._listView.scrollProperties.offset) {

        if (i == currentSectionSegmentsPos.length -1) {
          console.log('loading last one!')
        }


        if (Math.abs(this.previousY - e.nativeEvent.contentOffset.y) > 40) {
          this.previousY = e.nativeEvent.contentOffset.y;
          return;
        }


        var sectionToLoad = this.props.sectionArray.indexOf(currentSectionSegmentsPos[i][0].split(":")[0]);
        var segmentToLoad = parseInt(currentSectionSegmentsPos[i][0].split(":")[1])-1;
        this.props.textSegmentPressed(sectionToLoad, segmentToLoad, currentSectionSegmentsPos[i][0]);

        return;

      }

    }

  },

  handleScroll: function(e) {

    if (this.props.textFlow == 'continuous') {
      //update highlightedSegment Continuous Style
      if (this.props.textListVisible) {
        this.updateHighlightedSegmentContinuous(e);
      }
    }

    this.updateTitle();
    //auto highlight middle visible segment
    if (this.props.textListVisible) {

      // Measure scroll speed, don't update unless we're moving slowly.
      if (Math.abs(this.previousY - e.nativeEvent.contentOffset.y) > 40) {
        this.previousY = e.nativeEvent.contentOffset.y;
        return;
      }
      this.previousY = e.nativeEvent.contentOffset.y;
      this.updateHighlightedSegment();
    }
  },
  updateTitle: function() {
    // Update title in header depending on what section is most visible.
    var visibleRows = this.refs._listView._visibleRows;
    var visibleSections = this.getVisibleSections();

    var nameOfFirstSection = visibleSections[0];
    var nameOfSecondSection = visibleSections[1] || null;

    if (visibleSections.length == 0) {
      console.log("VISIBLE ROWS IS EMPTY!!! oh no!!!");
      //this.props.setTextLanguage(this.props.textLanguage == "english" ? "hebrew" : "english");
    }

    //console.log("VISIBLE TITLES",nameOfFirstSection,nameOfSecondSection,Object.keys(this.refs._listView._visibleRows));

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
    } else {
      var enTitle = nameOfSecondSection;
      var heTitle = this.props.sectionHeArray[this.props.sectionArray.indexOf(nameOfSecondSection)];
    }

    if (enTitle !== this.props.textReference) {
      this.props.updateTitle(enTitle, heTitle);
    }
  },
  updateTitleALTERNATE: function() {
    // This method just sets the title base on the first visible section.
    // It has the benefit of simplicity and not giving a wrong title initially when loading short sections
    // like the beginning of Siddur. Not sure it yet if it's preferable.
    var visibleSections = this.getVisibleSections();
    if (visibleSections.length == 0) {
      console.log("VISIBLE ROWS IS EMPTY!!! oh no!!!");
      return;
    }
    var enTitle = visibleSections[0];
    var heTitle = this.props.sectionHeArray[this.props.sectionArray.indexOf(enTitle)];
    if (enTitle !== this.props.textReference) {
      this.props.updateTitle(enTitle, heTitle);
    }
  },
  updateHighlightedSegment: function() {
    var setHighlight = function (highlightIndex) {
      let segmentToLoad  = allVisibleRows[highlightIndex].segIndex; //we now know the first element has the lowest segment number
      let sectionToLoad  = allVisibleRows[highlightIndex].secIndex;
      let highlightRef   = allVisibleRows[highlightIndex].ref;
      //console.log("VISIBLE", allVisibleRows, "TO LOAD", segmentToLoad,"Seg Ind Ref",this.props.segmentIndexRef);
      if (segmentToLoad !== this.props.segmentIndexRef || highlightRef !== this.props.segmentRef) {
        this.props.textSegmentPressed(sectionToLoad, segmentToLoad, highlightRef);
      }
    }.bind(this);

    var visibleRows = this.refs._listView._visibleRows;
    var visibleSections = this.getVisibleSections();
    var allVisibleRows = [];

    if (this.props.textFlow == 'segmented') {
      for (var i = 0; i < visibleSections.length; i++) {
        var section = visibleSections[i];
        var secIndex = this.props.sectionArray.indexOf(section);
        for (let seg of Object.keys(visibleRows[section])) {
          let segNum = parseInt(seg.replace(section + ":", ""));
          allVisibleRows.push({
            "segIndex": this.findDataSegmentIndex(secIndex, "" + segNum),
            "secIndex": secIndex,
            "sortNum": segNum + (i * 10000),
            "ref": seg
          });
        }

      }

      if (allVisibleRows.length > 0) { //it should always be, but sometimes visibleRows is empty
        allVisibleRows.sort((a, b)=>a.sortNum - b.sortNum);
        let handle = findNodeHandle(this.rowRefs[allVisibleRows[0].ref]);
        if (handle) {
          queryLayoutByID(
             handle,
             null, /*Error callback that doesn't yet have a hook in native so doesn't get called */
             (left, top, width, height, pageX, pageY) => {
               let highlightIndex = pageY + height > 150 || allVisibleRows.length == 1 ? 0 : 1;
               setHighlight(highlightIndex);
             }
           );
        } else {
          console.log("falling back to old highlighting method");
          let highlightIndex = allVisibleRows.length >= 2 ? 1 : 0;
          setHighlight(highlightIndex);
        }
      }

    }
  },
  findDataSegmentIndex: function (secIndex, segNum) {
    // Returns the segment index (int) for `segNum` (a numerical string) within `this.props.data[secIndex]`
    let start = this.props.data[secIndex].length-1;
    for (let i = start; i >= 0; i--) {
      if (this.props.data[secIndex][i].segmentNumber === segNum) {
        return i;
      }
    }
    console.log("findDataSegmentIndex couldn't find ", secIndex, segNum, "in data:")
    //console.log(this.props.data);
    return -1;
  },
  scrollToTarget: function() {

    if (!this.state.scrollingToTargetRef) { return; }

    if (this.props.textFlow == 'segmented') {

      console.log("scrollToTarget", this.state.targetSectionRef);
      var visibleSections = this.getVisibleSections();
      console.log("visibleSections", visibleSections);

      if (visibleSections.indexOf(this.state.targetSectionRef) == -1) {
        //if current section is not visible
        console.log("scrolling one page down")
        this.scrollOneScreenDown();
      } else {
        console.log("scrolling to target")
        let ref = this.rowRefs[this.state.targetSectionRef + ":1"];
        let handle = findNodeHandle(ref);
        if (!handle) {
          console.log("Could't find ref handle!", this.state.targetSectionRef);
          console.log("scrolling one page down")
          this.scrollOneScreenDown();
          return;
        }
        queryLayoutByID(
          handle,
          null, /*Error callback that doesn't yet have a hook in native so doesn't get called */
          (left, top, width, height, pageX, pageY) => {
            //console.log(left, top, width, height, pageX, pageY)
            this.refs._listView.scrollTo({
              x: 0,
              y: this.refs._listView.scrollProperties.offset + pageY - 120,
              animated: false
            });
          }
        );
        this.setState({
          scrollingToTargetRef: false,
          targetSectionRef: ""
        });
        this.updateTitle();
      }
    }

    else /*if this.props.textFlow == 'continuous' */ {

      var ref = this.rowRefs[this.props.sectionArray[0]+":"+this.props.data[0].length];
      if (ref) {
        if (ref._initY != null) {
          console.log(ref._initY)
          this.refs._listView.scrollTo({
            x: 0,
            y: ref._initY,
            animated: false
          });
          this.setState({
            scrollingToTargetRef: false,
            targetSectionRef: ""
          });
        }

      else {
          console.log(this.props.sectionArray[0]+":"+this.props.data[0].length)
        console.log(this.props.data[0])
        console.log(this.rowRefs)
        this.refs._listView.scrollTo({
            x: 0,
            y: 100,
            animated: false
          });

          return
      }
          this.updateTitleALTERNATE();

      }

      else {
        console.log(this.props.data[0])
        console.log(this.rowRefs)
        console.log(this.refs._listView.scrollProperties.contentLength)
      }

    }

  },
  onTopReached: function() {
    if (this.props.loadingTextHead == true || !this.props.prev) {
      //already loading tail, or nothing above
      return;
    }
    console.log("onTopReached setting targetSectionRef", this.props.textReference)
    this.setState({
      scrollingToTargetRef: true,
      targetSectionRef: this.props.textReference
    });

    this.props.updateData("prev");
  },
  onEndReached: function() {
    if (this.props.loadingTextTail == true) {
      //already loading tail
      return;
    }
    this.props.updateData("next");
  },
  visibleRowsChanged: function(visibleRows, changedRows) {
    if (!this.props.loadingTextHead && this.state.targetSectionRef && this.state.scrollingToTargetRef) {
      this.scrollToTarget();
    } else if (this.props.offsetRef && !this.state.scrolledToOffsetRef) {
      this.scrollToRef(this._standardizeOffsetRef(this.props.offsetRef), false, false);
    }
  },
  getVisibleSections: function() {
    // Returns an array of strings naming the currently visible sections in proper order.
    var visibleSectionsObject = this.refs._listView._visibleRows;
    var visibleSections = Object.keys(visibleSectionsObject);
    visibleSections.sort((a, b) => (this.props.sectionArray.indexOf(a) - this.props.sectionArray.indexOf(b)));
    return visibleSections;
  },
  scrollOneScreenDown: function(initialScroll) {
    this.refs._listView.scrollTo({
      x: 0,
      y: initialScroll ? 1 : this.refs._listView.scrollProperties.offset+(1*this.refs._listView.scrollProperties.visibleLength),
      animated: false
    });
  },
  scrollToRef: function(rowRef, didMount, isClickScroll) {
    /* Warning, this function is hacky. anyone who knows how to improve it, be my guest
    didMount - true if coming from componentDidMount. it seems that none of the rows
    have heights (even if they're on screen) at the did mount stage. so I scroll by
    one pixel so that the rows get measured

    the function looks to see if `rowRef` is on screen. it determines if its
    on screen by measuring the row. if it's height is 0, it is probably not on screen.
    right now I can't find a better way to do this
    if on screen, it jumps to it
    if not, it jumps a whole screen downwards (except if didMount is true, see above).
    on the next render it will check again
    */
    if (rowRef && (!this.state.scrolledToOffsetRef || isClickScroll)) {
      let ref = this.rowRefs[rowRef];

      if (this.props.textFlow == 'segmented') {
        let handle = findNodeHandle(ref);
        if (handle != null) {
          queryLayoutByID(
            handle,
            null, /*Error callback that doesn't yet have a hook in native so doesn't get called */
            (left, top, width, height, pageX, pageY) => {
              if (pageY == 0) { //I'm forced to assume this means it's not on screen, though it could also be at the top of the page...
                this.scrollOneScreenDown(didMount);
                if (didMount) {
                  this.setState({continueScrolling: true});
                } //needed to continue rendering after each success scroll
                //console.log("Zerooo");
              } else {
                //console.log('yeshhh');
                //LayoutAnimation.configureNext(CustomLayoutAnimation);
                this.setState({scrolledToOffsetRef: true});
                this.refs._listView.scrollTo({
                  x: 0,
                  y: this.refs._listView.scrollProperties.offset + pageY - 100,
                  animated: false
                });
              }
            }
          );
        } else {
          console.log("scrollToRef couldn't find ref handle");
        }
      }

      /*
      continuous case is much easier to deal with because we know that all segments have been loaded and
      y position is generated/stored on layout.
      */
      else {
        this.setState({scrolledToOffsetRef: true});
        this.refs._listView.scrollTo({
          x: 0,
          y: ref._initY + this.sectionRefsHash[rowRef.split(":")[0]].y,
          animated: false
        });
      }
    }
  },
  _standardizeOffsetRef: function(ref) {
    // Since the code for setting this.rowRefs assumes we can construct a ref by adding ":" + segment index,
    // we generate weird refs internally for depth 1 texts like "Sefer HaBahir:2"
    // This functions returns that weird format for depth1 texts by assuming that `ref`
    // is segment level (which offsetRefs must be), so absense of ":" means it is depth 1.
    if (ref && ref.indexOf(":") == -1 ) {
      var lastSpace = ref.lastIndexOf(" ");
      var ref = ref.substring(0, lastSpace) + ":" + ref.substring(lastSpace+1, ref.length);
    }
    return ref;
  },
  textSegmentPressed: function(section, segment, segmentRef, shouldToggle) {
    if (!this.props.textListVisible) {
      this.scrollToRef(segmentRef, true, true);
    }
    this.props.textSegmentPressed(section, segment, segmentRef, true);
  },
  inlineSectionHeader: function(ref) {
    // Returns a string to be used as an inline section header for `ref`.
    var heTitle = Sefaria.index(this.props.textTitle).heTitle;
    var trimmer = new RegExp("^(" + this.props.textTitle + "|" + heTitle + "),? ");
    return ref.replace(trimmer, '');
  },
  generateDataSource: function(props) {
    // Returns data representing sections and rows to be passed into ListView.DataSource.cloneWithSectionsAndRows
    // Takes `props` as an argument so it can generate data with `nextProps`.
    var data = props.data;
    var sections = {};

    var offsetRef = this._standardizeOffsetRef(props.offsetRef);

    if (props.textFlow == 'continuous') {
      var highlight = null;
      for (var section = 0; section < data.length; section++) {
        var rows = {};
        var rowID = props.sectionArray[section] + ":" + "wholeSection";
        var rowData = {
          section: section,
          segmentData: [],
          changeString: [rowID, props.textLanguage, props.textFlow, props.settings.fontSize, props.themeStr].join("|")
        };

        for (var i = 0; i < data[section].length; i++) {
          var segmentData = {
            content: data[section][i],
            highlight: offsetRef == rowID.replace("wholeSection", i+1) || (props.textListVisible && props.segmentRef == rowID.replace("wholeSection", i+1))
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
          var rowID = props.sectionArray[section] + ":" + data[section][i].segmentNumber;
          // console.log("ROW ID",rowID,props.segmentRef);
          var rowData = {
            content: data[section][i], // Store data in `content` so that we can manipulate other fields without manipulating the original data
            section: section,
            row: i,
            highlight: offsetRef == rowID || (props.textListVisible && props.segmentRef == rowID),
            changeString: [rowID, props.textLanguage, props.textFlow, props.settings.fontSize, props.themeStr, props.linksLoaded[section]].join("|")
          };
          rowData.changeString += rowData.highlight ? "|highlight" : "";
          rows[rowID] = rowData;
        }
        sections[this.props.sectionArray[section]] = rows;
      }
    }
    //console.log(sections);
    return sections;

  },
  renderContinuousRow: function(rowData, sID, rID) {
    // In continuous case, rowData represent an entire section of text
    var segments = [];
    for (var i = 0; i < rowData.segmentData.length; i++) {
      segments.push(this.renderSegmentForContinuousRow(i, rowData));
    }
    var textStyle = this.props.textLanguage == "hebrew" ? styles.hebrewText : styles.englishText;
    var sectionRef = this.props.sectionArray[rowData.section];
    var onSectionLayout = (event) => {
      var {x, y, width, height} = event.nativeEvent.layout;
      var sectionName = this.props.sectionArray[rowData.section];

      //console.log(this.sectionRefsHash);

      this.sectionRefsHash[sectionName] = {height: height, y: y};
      //console.log(this.sectionRefsHash);
      /*                                    
      if (currSegData.highlight) {
        this.refs._listView.scrollTo({
         x: 0,
         y: y,
         animated: false
        });
      }
      */
    };
    return <View style={[styles.verseContainer, styles.continuousRowHolder]} key={sectionRef} onLayout={onSectionLayout} >
              <SectionHeader
                title={this.props.textLanguage == "hebrew" ?
                        this.inlineSectionHeader(this.props.sectionHeArray[rowData.section]) :
                        this.inlineSectionHeader(this.props.sectionArray[rowData.section])}
                isHebrew={this.props.textLanguage == "hebrew"}
                theme={this.props.theme}
                key={rowData.section+"header"} />

              <Text style={[textStyle, styles.continuousSectionRow]}>{segments}</Text>
           </View>;
  },
  renderSegmentForContinuousRow: function(i, rowData) {
      var segmentText = [];
      var currSegData = rowData.segmentData[i];
      currSegData.text = currSegData.content.text || "";
      currSegData.he = currSegData.content.he || "";
      currSegData.segmentNumber = currSegData.segmentNumber || this.props.data[rowData.section][i].segmentNumber;
      var textLanguage = Sefaria.util.getTextLanguageWithContent(this.props.textLanguage, currSegData.text, currSegData.he);
      var refSection = rowData.section + ":" + i;
      var reactRef = this.props.sectionArray[rowData.section] + ":" + this.props.data[rowData.section][i].segmentNumber;
      var style = [styles.continuousVerseNumber,
                   this.props.textLanguage == "hebrew" ? styles.continuousHebrewVerseNumber : null,
                   this.props.theme.verseNumber,
                   currSegData.highlight ? this.props.theme.segmentHighlight : null];
      var onSegmentLayout = (event) => {
        var {x, y, width, height} = event.nativeEvent.layout;
        // console.log(this.props.sectionArray[rowData.section] + ":" + currSegData.segmentNumber + " y=" + y)
        this.rowRefs[reactRef]._initY = y;
        if (currSegData.highlight) {
          console.log('scrollling...')
          this.refs._listView.scrollTo({
           x: 0,
           y: y+this.sectionRefsHash[rowData.section].y,
           animated: false
          });
        }
      };
      segmentText.push(<View ref={this.props.sectionArray[rowData.section] + ":" + currSegData.segmentNumber}
                             style={Sefaria.showSegmentNumbers(this.props.textTitle) ? styles.continuousVerseNumberHolder : styles.continuousVerseNumberHolderTalmud}
                             onLayout={onSegmentLayout}
                             key={reactRef+"|segment-number"} >
                          <Text style={style}>
                            {Sefaria.showSegmentNumbers(this.props.textTitle) ? (this.props.textLanguage == "hebrew" ?
                              Sefaria.hebrew.encodeHebrewNumeral(currSegData.segmentNumber) :
                              currSegData.segmentNumber) : ""}</Text>
      </View>);


      if (textLanguage == "hebrew" || textLanguage == "bilingual") {
        segmentText.push(<TextSegment
          theme={this.props.theme}
          segmentIndexRef={this.props.segmentIndexRef}
          rowRef={reactRef}
          segmentKey={refSection}
          key={reactRef+"-he"}
          data={currSegData.he}
          textType="hebrew"
          textSegmentPressed={ this.textSegmentPressed }
          textListVisible={this.props.textListVisible}
          settings={this.props.settings}/>);
      }

      if (textLanguage == "english" || textLanguage == "bilingual") {
        segmentText.push(<TextSegment
          theme={this.props.theme}
          style={styles.TextSegment}
          segmentIndexRef={this.props.segmentIndexRef}
          rowRef={reactRef}
          segmentKey={refSection}
          key={reactRef+"-en"}
          data={currSegData.text}
          textType="english"
          textSegmentPressed={ this.textSegmentPressed }
          textListVisible={this.props.textListVisible}
          settings={this.props.settings}/>);
      }

      segmentText.push(<Text> </Text>);
      var refSetter = function(key, ref) {
        //console.log("Setting ref for " + key);
        this.rowRefs[key] = ref;
      }.bind(this, reactRef);

      return (<Text style={style} ref={refSetter}>{segmentText}</Text>);

  },
  renderSegmentedRow: function(rowData, sID, rID) {
    // In segmented case, rowData represents a segments of text
    rowData.text = rowData.content.text || "";
    rowData.he = rowData.content.he || "";
    rowData.numLinks = rowData.content.links ? rowData.content.links.length : 0;

    var segment = [];
    var textLanguage = Sefaria.util.getTextLanguageWithContent(this.props.textLanguage, rowData.text, rowData.he);
    var refSection = rowData.section + ":" + rowData.row;
    var reactRef = this.props.sectionArray[rowData.section] + ":" + this.props.data[rowData.section][rowData.row].segmentNumber;
    if (rowData.row == 0) {
      segment.push(<SectionHeader
                      title={this.props.textLanguage == "hebrew" ?
                              this.inlineSectionHeader(this.props.sectionHeArray[rowData.section]) :
                              this.inlineSectionHeader(this.props.sectionArray[rowData.section])}
                      isHebrew={this.props.textLanguage == "hebrew"}
                      theme={this.props.theme}
                      key={rowData.section+"header"} />);
    }


    var numberMargin = (<Text ref={this.props.sectionArray[rowData.section] + ":"+ rowData.content.segmentNumber}
                                   style={[styles.verseNumber, this.props.textLanguage == "hebrew" ? styles.hebrewVerseNumber : null, this.props.theme.verseNumber]}
                                   key={reactRef + "|segment-number"}>
                        {Sefaria.showSegmentNumbers(this.props.textTitle) ? (this.props.textLanguage == "hebrew" ?
                         Sefaria.hebrew.encodeHebrewNumeral(rowData.content.segmentNumber) :
                         rowData.content.segmentNumber) : ""}
                      </Text>);

    let bulletOpacity = (rowData.numLinks-20) / (70-20);
    if (rowData.numLinks == 0) { bulletOpacity = 0; }
    else if (bulletOpacity < 0.3) { bulletOpacity = 0.3; }
    else if (bulletOpacity > 0.8) { bulletOpacity = 0.8; }

    var bulletMargin = (<Text ref={this.props.sectionArray[rowData.section] + ":"+ rowData.content.segmentNumber}
                                   style={[styles.verseBullet, this.props.theme.verseBullet, {opacity:bulletOpacity}]}
                                   key={reactRef + "|segment-dot"}>
                        {"●"}
                      </Text>);


    var segmentText = [];

    if (textLanguage == "hebrew" || textLanguage == "bilingual") {
      segmentText.push(<TextSegment
        rowRef={reactRef}
        theme={this.props.theme}
        segmentIndexRef={this.props.segmentIndexRef}
        segmentKey={refSection}
        key={reactRef+"|hebrew"}
        data={rowData.he}
        textType="hebrew"
        textSegmentPressed={ this.textSegmentPressed }
        textListVisible={this.props.textListVisible}
        settings={this.props.settings}/>);
    }

    if (textLanguage == "english" || textLanguage == "bilingual") {
      segmentText.push(<TextSegment
        rowRef={reactRef}
        theme={this.props.theme}
        style={styles.TextSegment}
        segmentIndexRef={this.props.segmentIndexRef}
        segmentKey={refSection}
        key={reactRef+"|english"}
        data={rowData.text}
        textType="english"
        bilingual={textLanguage === "bilingual"}
        textSegmentPressed={ this.textSegmentPressed }
        textListVisible={this.props.textListVisible}
        settings={this.props.settings} />);
    }

    let textStyle = [styles.textSegment];
    if (rowData.highlight) {
        textStyle.push(this.props.theme.segmentHighlight);
    }

    segmentText = <View style={textStyle} key={reactRef+"|text-box"}>{segmentText}</View>;

    let completeSeg = this.props.textLanguage == "english" ? [numberMargin, segmentText, bulletMargin] : [bulletMargin, segmentText, numberMargin];

    segment.push(<View style={styles.numberSegmentHolderEn} key={reactRef+"|inner-box"}>
                    {completeSeg}
                  </View>);

    //console.log("Rendering Row:", reactRef);

    return <View style={styles.verseContainer} key={reactRef} ref={(view)=>this.rowRefs[reactRef]=view}

                                             onLayout={(event) => {
                                       var {x, y, width, height} = event.nativeEvent.layout;
                                       this.rowRefs[reactRef]._initY = y;
                                       }
                                     }

    >{segment}</View>;
  },
  rowHasChanged: function(r1, r2) {
    // console.log(r1.changeString + " vs. " + r2.changeString);
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
    <View style={{flex:1}}>
      <ListView ref='_listView'
                dataSource={this.state.dataSource}
                renderRow={this.renderRow}
                onScroll={this.handleScroll}
                onChangeVisibleRows={this.visibleRowsChanged}
                onEndReached={this.onEndReached}
                renderFooter={this.renderFooter}
                /*renderScrollComponent={props => <ScrollView {...props} contentOffset={{y:this.state.scrollOffset}}/>}*/
                pageSize={10}
                initialListSize={this.props.segmentIndexRef || 40}
                onEndReachedThreshold={1000}
                scrollEventThrottle={100}
                refreshControl={
                  <RefreshControl
                    refreshing={this.props.loadingTextHead}
                    onRefresh={this.onTopReached}
                    tintColor="#CCCCCC"
                    style={{ backgroundColor: 'transparent' }} />
                }/>
      </View>
    );
  }
});


var SectionHeader = React.createClass({
  propTypes: {
    title:    React.PropTypes.string.isRequired,
    isHebrew: React.PropTypes.bool.isRequired,
    theme:    React.PropTypes.object.isRequired,
  },
  render: function() {
    return <View style={styles.sectionHeaderBox}>
            <View style={[styles.sectionHeader, this.props.theme.sectionHeader]}>
              <Text style={[styles.sectionHeaderText, this.props.isHebrew ? styles.hebrewSectionHeaderText : null, this.props.theme.sectionHeaderText]}>{this.props.title}</Text>
            </View>
          </View>;
  }
})


module.exports = TextColumn;
