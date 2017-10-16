'use strict';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ReactNative, {
  View,
  Text,
  SectionList,
  Button,
  RefreshControl,
  findNodeHandle,
} from 'react-native';

const queryLayoutByID = require('queryLayoutByID');
const styles = require('./Styles.js');
const TextRange = require('./TextRange');
const TextRangeContinuous = require('./TextRangeContinuous');
const TextSegment = require('./TextSegment');
const TextHeightMeasurer = require('./TextHeightMeasurer');

const {
  LoadingView,
} = require('./Misc.js');

class TextColumn extends React.Component {
  static propTypes = {
    theme:              PropTypes.object.isRequired,
    themeStr:           PropTypes.string,
    settings:           PropTypes.object,
    data:               PropTypes.array,
    textReference:      PropTypes.string,
    sectionArray:       PropTypes.array,
    sectionHeArray:     PropTypes.array,
    offsetRef:          PropTypes.string,
    segmentRef:         PropTypes.string,
    segmentIndexRef:    PropTypes.number,
    textTitle:          PropTypes.string,
    heTitle:            PropTypes.string,
    heRef:              PropTypes.string,
    textFlow:           PropTypes.oneOf(["segmented","continuous"]),
    textLanguage:       PropTypes.oneOf(["hebrew","english","bilingual"]),
    updateData:         PropTypes.func,
    updateTitle:        PropTypes.func,
    textSegmentPressed: PropTypes.func,
    textListVisible:    PropTypes.bool,
    next:               PropTypes.string,
    prev:               PropTypes.string,
    loadingTextTail:    PropTypes.bool,
    loadingTextHead:    PropTypes.bool,
    linksLoaded:     PropTypes.array,
  };

  constructor(props, context) {
    super(props, context);
    this.previousY = 0; // for measuring scroll speed
    this.rowRefs = {}; //hash table of currently loaded row refs.
    let {dataSource, componentsToMeasure} = this.generateDataSource(props);

    this.state = {
      nextDataSource: dataSource,
      dataSource: [],
      componentsToMeasure: componentsToMeasure,
      scrollingToTargetRef: !!props.offsetRef,
      targetRef: props.offsetRef || null,
      measuringHeights: false,
      debugUseJumpList: true,
    };
  }

  setMeasuringHeights = (measuring) => {
    this.setState({measuringHeights : measuring});
  }

  generateDataSource = (props) => {
    // Returns data representing sections and rows to be passed into ListView.DataSource.cloneWithSectionsAndRows
    // Takes `props` as an argument so it can generate data with `nextProps`.
    var data = props.data;
    var dataSource = [];

    var offsetRef = this._standardizeOffsetRef(props.offsetRef);

    if (props.textFlow == 'continuous' && Sefaria.canBeContinuous(props.textTitle)) {
      var highlight = null;
      for (var sectionIndex = 0; sectionIndex < data.length; sectionIndex++) {
        var rows = [];
        var rowID = props.sectionArray[sectionIndex] + ":" + "wholeSection";
        var rowData = {
          sectionIndex: sectionIndex,
          segmentData: [],
          changeString: [rowID, props.textLanguage, props.textFlow, props.settings.fontSize, props.themeStr].join("|")
        };

        for (var i = 0; i < data[sectionIndex].length; i++) {
          if (!data[sectionIndex][i].text && !data[sectionIndex][i].he) { continue; } // Skip empty segments
          var segmentData = {
            content: data[sectionIndex][i],
            highlight: offsetRef == rowID.replace("wholeSection", i+1) || (props.textListVisible && props.segmentRef == rowID.replace("wholeSection", i+1))
          }
          highlight = segmentData.highlight ? i : highlight;
          rowData.segmentData.push(segmentData);
        }
        rowData.changeString += highlight ? "|highlight:" + highlight : "";
        rows.push({ref: rowID, data: rowData});
        dataSource.push({ref: props.sectionArray[section], data: rows, sectionIndex: sectionIndex});
      }
    }

    else { // segmented
      for (var sectionIndex = 0; sectionIndex < data.length; sectionIndex++) {
        var rows = [];
        for (var i = 0; i < data[sectionIndex].length; i++) {
          if (i !== 0 && !data[sectionIndex][i].text && !data[sectionIndex][i].he) { continue; } // Skip empty segments
          var rowID = props.sectionArray[sectionIndex] + ":" + data[sectionIndex][i].segmentNumber;
          // console.log("ROW ID",rowID,props.segmentRef);
          var rowData = {
            content: data[sectionIndex][i], // Store data in `content` so that we can manipulate other fields without manipulating the original data
            sectionIndex: sectionIndex,
            rowIndex: i,
            highlight: offsetRef == rowID || (props.textListVisible && props.segmentRef == rowID),

          };
          // excluding b/c they don't change height: props.themeStr, props.linksLoaded[sectionIndex]
          //rowData.changeString += rowData.highlight ? "|highlight" : "";
          rows.push({ref: rowID, data: rowData, changeString: [rowID, props.textLanguage, props.textFlow, props.settings.fontSize].join("|")});
        }
        dataSource.push({ref: props.sectionArray[sectionIndex], heRef: props.sectionHeArray[sectionIndex], data: rows, sectionIndex: sectionIndex, changeString: [props.sectionArray[sectionIndex], props.textLanguage].join("|")});
      }
    }
    //console.log(sections);
    let componentsToMeasure = [];
    for (let section of dataSource) {
      componentsToMeasure.push({ref: section.ref, id: section.changeString, generator: this.renderSectionHeader, param: {section: section}})
      for (let segment of section.data) {
        componentsToMeasure.push({ref: segment.ref, id: segment.changeString, generator: this.renderSegmentedRow, param: {item: segment}});
      }
    }


    return {dataSource: dataSource, componentsToMeasure: componentsToMeasure};

  };

  _standardizeOffsetRef = (ref) => {
    // Since the code for setting this.rowRefs assumes we can construct a ref by adding ":" + segment index,
    // we generate weird refs internally for depth 1 texts like "Sefer HaBahir:2"
    // This functions returns that weird format for depth1 texts by assuming that `ref`
    // is segment level (which offsetRefs must be), so absense of ":" means it is depth 1.
    if (ref && ref.indexOf(":") == -1 ) {
      var lastSpace = ref.lastIndexOf(" ");
      var ref = ref.substring(0, lastSpace) + ":" + ref.substring(lastSpace+1, ref.length);
    }
    return ref;
  };

  inlineSectionHeader = (ref) => {
    // Returns a string to be used as an inline section header for `ref`.
    var heTitle = Sefaria.index(this.props.textTitle).heTitle;
    var trimmer = new RegExp("^(" + this.props.textTitle + "|" + heTitle + "),? ");
    return ref.replace(trimmer, '');
  };

  componentWillReceiveProps(nextProps) {

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
      let {dataSource, componentsToMeasure} = this.generateDataSource(nextProps);
      //console.log("new datasource", dataSource.length);
      this.setState({nextDataSource: dataSource, componentsToMeasure: componentsToMeasure});
    }
  }

  updateHighlightedSegmentContinuous = (e) => {
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

  };

  getViewableSectionData = (viewableItems) => {
    let secData = {
      indexes: [],
      sections: [],
    }
    let currSec;
    for (let seg of viewableItems) {
      if (seg.index === null) {
        continue; // apparently segments with null indexes are sections. who knew?
      }
      if (currSec !== seg.section.sectionIndex) {
        currSec = seg.section.sectionIndex;
        secData.indexes.push(currSec);
        secData.sections.push([seg.item]);
      } else {
        secData.sections[secData.sections.length-1].push(seg.item);
      }
    }
    return secData;
  };

  updateHighlightedSegment = (secData) => {
    let setHighlight = function (sectionIndex, segmentIndex, ref) {
      //console.log("VISIBLE", allVisibleRows, "TO LOAD", segmentToLoad,"Seg Ind Ref",this.props.segmentIndexRef);
      if (segmentIndex !== this.props.segmentIndexRef || ref !== this.props.segmentRef) {
        this.props.textSegmentPressed(sectionIndex, segmentIndex, ref);
      }
    }.bind(this);
    if (this.props.textFlow == 'segmented' && secData.sections.length > 0 && secData.sections[0].length > 0) {
      let handle = findNodeHandle(this.rowRefs[secData.sections[0][0].ref]);
      if (handle) {
        queryLayoutByID(
           handle,
           null, /*Error callback that doesn't yet have a hook in native so doesn't get called */
           (left, top, width, height, pageX, pageY) => {
             const seg = pageY + height > 150 || secData.sections[0].length === 1 ? secData.sections[0][0] : secData.sections[0][1];
             setHighlight(seg.data.sectionIndex, seg.data.rowIndex, seg.ref);
           }
         );
      } else {
        console.log("falling back to old highlighting method");
        const seg = secData.sections[0].length === 1 ? secData.sections[0][0] : secData.sections[0][1];
        setHighlight(seg.data.sectionIndex, seg.data.rowIndex, seg.ref);
      }
    }
  };

  updateTitle = (secData) => {
    if (secData.indexes.length == 0) {
      console.log("VISIBLE ROWS IS EMPTY!!! oh no!!!");
      return;
    }
    // update title
    let biggerSection = secData.sections.length >= 2 && secData.sections[1].length > secData.sections[0].length ? secData.indexes[1] : secData.indexes[0];
    let enTitle = this.props.sectionArray[biggerSection];
    let heTitle = this.props.sectionHeArray[biggerSection];

    if (enTitle !== this.props.textReference) {
      console.log(enTitle, heTitle);
      this.props.updateTitle(enTitle, heTitle);
    }
  };

  handleScroll = (e) => {
    if (this.props.textFlow == 'continuous') {
      //update highlightedSegment Continuous Style
      if (this.props.textListVisible) {
        this.updateHighlightedSegmentContinuous(e);
      }
    }

    //auto highlight middle visible segment
    if (this.props.textListVisible && this.viewableSectionData) {

      // Measure scroll speed, don't update unless we're moving slowly.
      if (Math.abs(this.previousY - e.nativeEvent.contentOffset.y) > 40) {
        this.previousY = e.nativeEvent.contentOffset.y;
        return;
      }
      this.previousY = e.nativeEvent.contentOffset.y;
      this.updateHighlightedSegment(this.viewableSectionData);
    }
  };

  onTopReached = () => {

    if (this.props.loadingTextHead == true || !this.props.prev || this.state.scrollingToTargetRef) {
      //already loading tail, or nothing above
      return;
    }
    this.setState({
      scrollingToTargetRef: true,
      targetRef: this.props.textReference
    });

    this.props.updateData("prev");
  };

  onEndReached = () => {
    if (this.props.loadingTextTail == true) {
      //already loading tail
      return;
    }
    this.props.updateData("next");
  };

  onViewableItemsChanged = ({viewableItems, changed}) => {
    let secData = this.getViewableSectionData(viewableItems);
    if (this.props.textFlow == 'continuous') {

    }
    this.updateTitle(secData);
    this.viewableSectionData = secData;
  };

  /******************
  RENDER
  *******************/

  renderContinuousRow = (rowData, sID, rID) => {
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
              <Text style={[textStyle, styles.continuousSectionRow]}>{segments}</Text>
           </View>;
  };

  renderSegmentForContinuousRow = (i, rowData) => {
      var segmentText = [];
      var currSegData = rowData.segmentData[i];
      currSegData.text = currSegData.content.text || "";
      currSegData.he = currSegData.content.he || "";
      currSegData.segmentNumber = currSegData.segmentNumber || this.props.data[rowData.sectionIndex][i].segmentNumber;
      var textLanguage = Sefaria.util.getTextLanguageWithContent(this.props.textLanguage, currSegData.text, currSegData.he);
      var refSection = rowData.sectionIndex + ":" + i;
      var reactRef = this.props.sectionArray[rowData.sectionIndex] + ":" + this.props.data[rowData.sectionIndex][i].segmentNumber;
      var style = [styles.continuousVerseNumber,
                   this.props.textLanguage == "hebrew" ? styles.continuousHebrewVerseNumber : null,
                   this.props.theme.verseNumber,
                   currSegData.highlight ? this.props.theme.segmentHighlight : null];
      var onSegmentLayout = (event) => {
        var {x, y, width, height} = event.nativeEvent.layout;
        // console.log(this.props.sectionArray[rowData.sectionIndex] + ":" + currSegData.segmentNumber + " y=" + y)
        this.rowRefs[reactRef]._initY = y;
        if (currSegData.highlight) {
          // console.log('scrollling...')
          this.refs._listView.scrollTo({
           x: 0,
           y: y+this.sectionRefsHash[rowData.sectionIndex].y,
           animated: false
          });
        }
      };
      segmentText.push(<View ref={this.props.sectionArray[rowData.sectionIndex] + ":" + currSegData.segmentNumber}
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

  };

  renderSegmentedRow = ({item, props}) => {
    // In segmented case, rowData represents a segments of text
    if (!props) { // when this is run from constructor, need to pass in props
      props = this.props;
    }
    return (
      <TextRange
        theme={this.props.theme}
        settings={this.props.settings}
        rowData={item.data}
        segmentRef={item.ref}
        textLanguage={this.props.textLanguage}
        showSegmentNumbers={Sefaria.showSegmentNumbers(this.props.textTitle)}
        textSegmentPressed={this.props.textSegmentPressed}
        setRowRef={(key, ref)=>{this.rowRefs[key]=ref; }}
        setRowRefInitY={(key, y)=>{this.rowRefs[key]._initY = y; }}
        Sefaria={Sefaria}
      />
    );
  };

  renderSectionHeader = ({section, props}) => {
    if (!props) {
      props = this.props;
    }

    return (
      <SectionHeader
        title={props.textLanguage == "hebrew" ?
                this.inlineSectionHeader(section.heRef) :
                this.inlineSectionHeader(section.ref)}
        isHebrew={props.textLanguage == "hebrew"}
        theme={props.theme}
        />
    )
  };

  renderFooter = () => {
    return this.props.next ? <LoadingView theme={this.props.theme} /> : null;
  };

  getItemLayout = (data, index) => {
    if (this.state.jumpInfoList) {
      if (index >= this.state.jumpInfoList.length) {
        console.log("INDEx too big", index, this.state.jumpInfoList.length);
        let itemHeight = 100;
        return {length: itemHeight, offset: itemHeight * index, index};
      } else {
        return this.state.jumpInfoList[index];
      }
    } else {
      let itemHeight = 100;
      //never seems to get here
      console.log("why are you here?", index);
      //return {length: itemHeight, offset: itemHeight * index, index};
    }
  }

  allHeightsMeasured = (componentsToMeasure, textToHeightMap) => {
    let currOffset = 0;
    let jumpInfoList = [];
    let jumpInfoMap = new Map();
    let currIndex = 0;
    for (let section of this.state.nextDataSource) {
      let currHeight = textToHeightMap.get(section.changeString);
      jumpInfoList[currIndex] = {index: currIndex, length: currHeight, offset: currOffset};
      jumpInfoMap.set(section.ref, currIndex);
      currOffset += currHeight;
      currIndex++; //sections are counted in the index count
      for (let segment of section.data) {
        let currHeight = textToHeightMap.get(segment.changeString);
        jumpInfoList[currIndex] = {index: currIndex, length: currHeight, offset: currOffset};
        jumpInfoMap.set(segment.ref, currIndex);
        currOffset += currHeight;
        currIndex++;
      }
      jumpInfoList[currIndex] = {index: currIndex, length: 0, offset: currOffset};
      currIndex++;
    }

    this.setState({jumpInfoList: jumpInfoList, jumpInfoMap: jumpInfoMap, dataSource: this.state.nextDataSource},
      ()=>{
        if (this.state.scrollingToTargetRef) {
          const targetIndex = this.state.jumpInfoMap.get(this.state.targetRef);
          if (targetIndex) {
            this.sectionListRef.scrollToLocation({animated: false, sectionIndex: 0, itemIndex: targetIndex-1});
            this.setState({scrollingToTargetRef: false});
          } else {
            // this doesn't seem to happen
            console.log(`PROBLEM, couldn't find ${this.state.targetRef}`);
          }
        }
      }
    );
  }

  _getSectionListRef = (ref) => {
    this.sectionListRef = ref;
  }

  _keyExtractor = (item, index) => {
    return item.ref;
  }

  render() {
    return (
        <View style={styles.textColumn} >
          <SectionList
            ref={this._getSectionListRef}
            sections={this.state.dataSource}
            renderItem={this.renderSegmentedRow}
            renderSectionHeader={this.renderSectionHeader}
            ListFooterComponent={this.renderFooter}
            getItemLayout={this.getItemLayout}
            onEndReached={this.onEndReached}
            onEndReachedThreshold={0.9}
            onScroll={this.handleScroll}
            scrollEventThrottle={100}
            onViewableItemsChanged={this.onViewableItemsChanged}
            keyExtractor={this._keyExtractor}
            stickySectionHeadersEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={this.props.loadingTextHead}
                onRefresh={this.onTopReached}
                tintColor="#CCCCCC"
                style={{ backgroundColor: 'transparent' }} />
            }/>
          <TextHeightMeasurer
            componentsToMeasure={this.state.componentsToMeasure}
            setMeasuringHeights={this.setMeasuringHeights}
            allHeightsMeasuredCallback={this.allHeightsMeasured}/>
        </View>
    );
  }

}

class SectionHeader extends React.PureComponent {
  static propTypes = {
    title:    PropTypes.string.isRequired,
    isHebrew: PropTypes.bool.isRequired,
    theme:    PropTypes.object.isRequired,
  };

  render() {
    return <View style={styles.sectionHeaderBox}>
            <View style={[styles.sectionHeader, this.props.theme.sectionHeader]}>
              <Text style={[styles.sectionHeaderText, this.props.isHebrew ? styles.hebrewSectionHeaderText : null, this.props.theme.sectionHeaderText]}>{this.props.title}</Text>
            </View>
          </View>;
  }
}

module.exports = TextColumn;
