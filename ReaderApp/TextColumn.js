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
  Dimensions,
} from 'react-native';

const styles =                require('./Styles.js');
const TextRange =            require('./TextRange');
const TextRangeContinuous = require('./TextRangeContinuous');
const TextHeightMeasurer = require('./TextHeightMeasurer');
const queryLayoutByID =   require('queryLayoutByID');
const ViewPort  = Dimensions.get('window');
const now = require('performance-now');


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
    this.sectionRefsHash= {}; //hash table of currently loaded section refs.
    let {dataSource, componentsToMeasure} = this.generateDataSource(props);

    this.state = {
      nextDataSource: dataSource,
      dataSource: [],
      componentsToMeasure: componentsToMeasure,
      jumpState: { // if jumping is true, then look at jumpState when allHeightsMeasuredCallback is called
        jumping: !!props.offsetRef,
        targetRef: props.offsetRef || null,
        viewPosition: 0,
        animated: false,
      },
      changingTextFlow: false, // true while waiting for continuous data to be measured
    };
  }

  generateDataSource = (props) => {
    // Returns data representing sections and rows to be passed into ListView.DataSource.cloneWithSectionsAndRows
    // Takes `props` as an argument so it can generate data with `nextProps`.
    let data = props.data;
    let dataSource = [];

    let offsetRef = this._standardizeOffsetRef(props.offsetRef);
    let segmentGenerator;
    if (props.textFlow == 'continuous' && Sefaria.canBeContinuous(props.textTitle)) {
      let highlight = null;
      for (let sectionIndex = 0; sectionIndex < data.length; sectionIndex++) {
        let rows = [];
        let rowID = props.sectionArray[sectionIndex];
        let rowData = {
          sectionIndex: sectionIndex,
          segmentData: [],
        };

        for (let i = 0; i < data[sectionIndex].length; i++) {
          if (!data[sectionIndex][i].text && !data[sectionIndex][i].he) { continue; } // Skip empty segments
          const segmentRef = `${rowID}:${i}`;
          let segmentData = {
            segmentNumber: i,
            content: data[sectionIndex][i],
            highlight: offsetRef == segmentRef || (props.textListVisible && props.segmentRef == segmentRef)
          }
          highlight = segmentData.highlight ? i : highlight;
          rowData.segmentData.push(segmentData);
        }
        const changeString = [rowID, props.textLanguage, props.textFlow, props.settings.fontSize].join("|");
        rows.push({ref: rowID + "|content", data: rowData, changeString: changeString + "|content" });
        dataSource.push({ref: props.sectionArray[sectionIndex], heRef: props.sectionHeArray[sectionIndex], data: rows, sectionIndex, changeString});
      }
      segmentGenerator = this.renderContinuousRow;
    }

    else { // segmented
      for (let sectionIndex = 0; sectionIndex < data.length; sectionIndex++) {
        let rows = [];
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
      segmentGenerator = this.renderSegmentedRow;
    }
    //console.log(sections);
    let componentsToMeasure = [];
    for (let section of dataSource) {
      componentsToMeasure.push({ref: section.ref, id: section.changeString, generator: this.renderSectionHeader, param: {section: section}})
      for (let segment of section.data) {
        componentsToMeasure.push({ref: segment.ref, id: segment.changeString, generator: segmentGenerator, param: {item: segment}});
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

  textSegmentPressed = (section, segment, segmentRef, shouldToggle) => {
    if (!this.props.textListVisible) {
      const targetIndex = this.state.jumpInfoMap.get(segmentRef);
      this.sectionListRef.scrollToLocation({
          animated: false,
          sectionIndex: 0,
          itemIndex: targetIndex-1,
          viewPosition: 0.1,
      });
    }
    this.props.textSegmentPressed(section, segment, segmentRef, true);
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
      const nextState = {nextDataSource: dataSource, componentsToMeasure: componentsToMeasure};
      if (this.props.textFlow !== nextProps.textFlow) {
        nextState.changingTextFlow = true;
        nextState.dataSource = [];
      } else {
        nextState.changingTextFlow = false;
      }
      this.setState(nextState);
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
        const seg = secData.sections[0].length === 1 ? secData.sections[0][0] : secData.sections[0][1];
        setHighlight(seg.data.sectionIndex, seg.data.rowIndex, seg.ref);
      }
    }
  };

  updateTitle = (secData) => {
    if (secData.indexes.length == 0) {
      return;
    }
    // update title
    let biggerSection = secData.sections.length >= 2 && secData.sections[1].length > secData.sections[0].length ? secData.indexes[1] : secData.indexes[0];
    let enTitle = this.props.sectionArray[biggerSection];
    let heTitle = this.props.sectionHeArray[biggerSection];

    if (enTitle !== this.props.textReference) {
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

    // specifically handling this here and not in onEndReached callback because it was getting called too often
    /*if (e.nativeEvent.contentOffset.y + e.nativeEvent.layoutMeasurement.height > e.nativeEvent.contentSize.height &&
        this.hasScrolledSinceLastLoad &&  // for debouncing
        !this.props.loadingTextTail && this.props.next && !this.state.jumpState.jumping && !this.state.changingTextFlow) {
      this.onEndReached();
    }*/
  };

  onTopReached = () => {
    if (this.props.loadingTextHead === true || !this.props.prev || this.state.jumpState.jumping) {
      //already loading tail, or nothing above
      return;
    }
    this.setState({
      jumpState: {
        jumping: true,
        targetRef: this.props.textReference,
        viewPosition: 0,
        animated: false,
      }
    });
    let shouldCull = this.sectionsCoverScreen(0, this.state.dataSource.length - 2);
    this.props.updateData("prev", shouldCull);
  };

  onEndReached = () => {
    let shouldCull = false; //this.sectionsCoverScreen(1, this.state.dataSource.length - 1);
    if (shouldCull) {
      this.setState({
        jumpState: {
          jumping: true,
          targetRef: this.props.next,
          viewPosition: 1,
          animated: false,
        }
      });
    }
    this.props.updateData("next", shouldCull);
  };

  sectionsCoverScreen = (startSectionInd, endSectionInd, direction) => {
    // return true if there is enough space between the `startSectionInd` and `endSectionInd` to at least fill the screen.
    if (this.state.dataSource.length <= 1) {
      return false;
    }
    let extra
    const startSegRef = this.state.dataSource[startSectionInd].data[0].ref;
    const endSegRef = this.state.dataSource[endSectionInd].data.slice(-1)[0].ref;
    const firstSeg = this.state.itemLayoutList[this.state.jumpInfoMap.get(startSegRef)];
    const lastSeg = this.state.itemLayoutList[this.state.jumpInfoMap.get(endSegRef)];
    return (lastSeg.offset + lastSeg.length - firstSeg.offset) > ViewPort.height;
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

  renderRow = ({ item }) => {
    return (this.props.textFlow == 'continuous' && Sefaria.canBeContinuous(this.props.textTitle)) ? this.renderContinuousRow({ item }) : this.renderSegmentedRow({ item });
  };

  renderContinuousRow = ({ item }) => {
    // In continuous case, rowData represent an entire section of text
    return (
      <TextRangeContinuous
        theme={this.props.theme}
        settings={this.props.settings}
        rowData={item.data}
        sectionRef={item.ref.replace("|content","")}
        textLanguage={this.props.textLanguage}
        showSegmentNumbers={Sefaria.showSegmentNumbers(this.props.textTitle)}
        textSegmentPressed={this.textSegmentPressed}
        setSectionRef={(key, value)=>{ this.sectionRefsHash[key]=value; }}
        setRowRef={(key, ref)=>{this.rowRefs[key]=ref; }}
        Sefaria={Sefaria}
      />
    );
  };

  renderSegmentedRow = ({ item }) => {
    // In segmented case, rowData represents a segments of text
    return (
      <TextRange
        theme={this.props.theme}
        settings={this.props.settings}
        rowData={item.data}
        segmentRef={item.ref}
        textLanguage={this.props.textLanguage}
        showSegmentNumbers={Sefaria.showSegmentNumbers(this.props.textTitle)}
        textSegmentPressed={this.textSegmentPressed}
        setRowRef={(key, ref)=>{this.rowRefs[key]=ref;}}
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
    if (this.state.itemLayoutList) {
      if (index >= this.state.itemLayoutList.length) {
        let itemHeight = 100;
        return {length: itemHeight, offset: itemHeight * index, index};
      } else {
        return this.state.itemLayoutList[index];
      }
    }
  }

  allHeightsMeasured = (componentsToMeasure, textToHeightMap) => {
    let currOffset = 0;
    let itemLayoutList = [];
    let jumpInfoMap = new Map();
    let currIndex = 0;
    for (let section of this.state.nextDataSource) {
      let currHeight = textToHeightMap.get(section.changeString);
      itemLayoutList[currIndex] = {index: currIndex, length: currHeight, offset: currOffset};
      jumpInfoMap.set(section.ref, currIndex);
      currOffset += currHeight;
      currIndex++; //sections are counted in the index count
      for (let segment of section.data) {
        let currHeight = textToHeightMap.get(segment.changeString);
        itemLayoutList[currIndex] = {index: currIndex, length: currHeight, offset: currOffset};
        jumpInfoMap.set(segment.ref, currIndex);
        currOffset += currHeight;
        currIndex++;
      }
      itemLayoutList[currIndex] = {index: currIndex, length: 0, offset: currOffset};
      currIndex++;
    }

    this.setState({itemLayoutList: itemLayoutList, jumpInfoMap: jumpInfoMap, dataSource: this.state.nextDataSource, changingTextFlow: false},
      ()=>{
        const { jumping, animated, viewPosition, targetRef } = this.state.jumpState;
        if (jumping) {
          const targetIndex = this.state.jumpInfoMap.get(targetRef);
          if (targetIndex) {
            this.sectionListRef.scrollToLocation(
              {
                animated: animated,
                sectionIndex: 0,
                itemIndex: targetIndex-1,
                viewPosition: viewPosition
              }
            );
          }
          this.setState({jumpState: { jumping: false }});
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
            renderItem={this.renderRow}
            renderSectionHeader={this.renderSectionHeader}
            ListFooterComponent={this.renderFooter}
            getItemLayout={this.getItemLayout}
            onEndReached={this.onEndReached}
            onEndReachedThreshold={1.0}
            onScroll={this.handleScroll}
            //onMomentumScrollEnd={()=>{this.hasScrolledSinceLastLoad = true; }}
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
