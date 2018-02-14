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
const COMMENTARY_LINE_THRESHOLD = 150;

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
    this.currentY = 0; // for measuring scroll speed
    this.rowRefs = {}; //hash table of currently loaded row refs.
    this.continuousRowYHash = {};
    this.continuousSectionYHash = {}; //hash table of currently loaded section refs.
    this.backupItemLayoutList = []; // backup for race condition when itemLayoutList is set to null but SectionList still thinks it exists so it tries to call getItemLayout()
    this.onTopReaching = false; // true when measuring heights for infinite scroll up
    let {dataSource, componentsToMeasure, jumpInfoMap} = this.generateDataSource(props, !!props.offsetRef);
    this.measuringHeights = !!props.offsetRef;
    this.state = {
      nextDataSource: dataSource,
      dataSource: !!props.offsetRef ? [] : dataSource,
      jumpInfoMap,
      componentsToMeasure,
      jumpState: { // if jumping is true, then look at jumpState when allHeightsMeasuredCallback is called
        jumping: !!props.offsetRef,
        targetRef: this._standardizeOffsetRef(props.offsetRef) || null,
        viewPosition: 0.1,
        animated: false,
      },
    };
  }
  componentDidMount() {
    this._isMounted = true;
  }
  componentWillUnmount() {
    this._isMounted = false;
  }
  generateDataSource = (props, gonnaJump) => {
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
          const segmentRef = props.sectionArray[sectionIndex] + ":" + data[sectionIndex][i].segmentNumber;

          let segmentData = {
            segmentNumber: i,
            ref: segmentRef,
            content: data[sectionIndex][i],
            highlight: offsetRef == segmentRef || (props.textListVisible && props.segmentRef == segmentRef)
          }
          highlight = segmentData.highlight ? i : highlight;
          rowData.segmentData.push(segmentData);
        }
        const changeString = rowID;
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
          var rowData = {
            content: data[sectionIndex][i], // Store data in `content` so that we can manipulate other fields without manipulating the original data
            sectionIndex: sectionIndex,
            rowIndex: i,
            highlight: offsetRef == rowID || (props.textListVisible && props.segmentRef == rowID),
          };
          // excluding b/c they don't change height: props.themeStr, props.linksLoaded[sectionIndex]
          //rowData.changeString += rowData.highlight ? "|highlight" : "";
          rows.push({ref: rowID, data: rowData, changeString: rowID});
        }
        dataSource.push({ref: props.sectionArray[sectionIndex], heRef: props.sectionHeArray[sectionIndex], data: rows, sectionIndex: sectionIndex, changeString: props.sectionArray[sectionIndex]});
      }
      segmentGenerator = this.renderSegmentedRow;
    }
    const jumpInfoMap = this.updateJumpInfoMap(dataSource);
    //console.log(sections);
    const componentsToMeasure = [];
    if (gonnaJump) {
      for (let section of dataSource) {
        componentsToMeasure.push({ref: section.ref, id: section.changeString, generator: this.renderSectionHeader, param: {section: section}})
        for (let segment of section.data) {
          componentsToMeasure.push({ref: segment.ref, id: segment.changeString, generator: segmentGenerator, param: {item: segment}});
        }
      }

    }

    return {dataSource, componentsToMeasure, jumpInfoMap};

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
      if (this.props.textFlow === 'continuous') {
        const targetY = this.continuousRowYHash[segmentRef] + this.state.itemLayoutList[this.state.jumpInfoMap.get(this.props.sectionArray[section])].offset;
        if (targetY) {
          this.sectionListRef.scrollToOffset({
            animated: false,
            offset: targetY,
          });
        } else {
          console.log("target Y is no good :(", segmentRef);
        }
      } else {
        const targetIndex = this.state.jumpInfoMap.get(segmentRef);
        if (!targetIndex) { debugger; }
        this.sectionListRef.scrollToLocation({
            animated: false,
            sectionIndex: 0,
            itemIndex: targetIndex-1,
            viewPosition: 0.1,
        });
      }

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
        this.props.textListVisible !== nextProps.textListVisible ||
        this.props.segmentIndexRef !== nextProps.segmentIndexRef ||
        this.props.segmentRef !== nextProps.segmentRef ||
        this.props.themeStr !== nextProps.themeStr ||
        this.props.linksLoaded !== nextProps.linksLoaded) {
      // Only update dataSource when a change has occurred that will result in different data
      //TODO how to optimize this function when fontSize is changing?
      let {dataSource, componentsToMeasure, jumpInfoMap} = this.generateDataSource(nextProps, this.state.jumpState.jumping);
      if (this.props.data.length !== nextProps.data.length && this.state.jumpState.jumping) {
        this.measuringHeights = true;
        this.setState({nextDataSource: dataSource, componentsToMeasure, jumpInfoMap});
      } else {
        this.setState({dataSource, jumpInfoMap});
      }
    }
  }
  updateHighlightedSegmentContinuous = (secData) => {
    for (let i = 0; i < secData.sections.length; i++) {
      let sectionIndex = secData.indexes[i];
      //let firstSegRefOffset = this.state.dataSource[sectionIndex].data[0].data.segmentData.length > 0 ? this.continuousRowYHash[this.state.dataSource[sectionIndex].data[0].data.segmentData[0].ref] : null;
      for (let j = 0; j < this.state.dataSource[sectionIndex].data[0].data.segmentData.length; j++) {
        let segment = this.state.dataSource[sectionIndex].data[0].data.segmentData[j];
        const sectionOffset = this.state.itemLayoutList[this.state.jumpInfoMap.get(this.props.sectionArray[sectionIndex])].offset;
        //console.log(segment.ref, this.continuousRowYHash[segment.ref], this.currentY, sectionOffset, firstSegRefOffset);
        if (this.continuousRowYHash[segment.ref] + sectionOffset - this.currentY > -20) {
          this.props.textSegmentPressed(sectionIndex, segment.segmentNumber, segment.ref);
          //console.log("I choose you,", segment.ref, "!!!!")
          return;
        }
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
    if (secData.sections.length > 0 && secData.sections[0].length > 0) {
      let handle = findNodeHandle(this.rowRefs[secData.sections[0][0].ref]);
      if (handle) {
        queryLayoutByID(
           handle,
           null, /*Error callback that doesn't yet have a hook in native so doesn't get called */
           (left, top, width, height, pageX, pageY) => {
             const seg = pageY + height > COMMENTARY_LINE_THRESHOLD || secData.sections[0].length === 1 ? secData.sections[0][0] : secData.sections[0][1];
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
    const previousY = this.currentY;
    this.currentY = e.nativeEvent.contentOffset.y;
    if (this.props.textListVisible && this.viewableSectionData) {
      if (Math.abs(previousY - this.currentY) > 40) {
        return;
      }
      if (this.props.textFlow === 'continuous') {
        this.updateHighlightedSegmentContinuous(this.viewableSectionData);
      } else {
        this.updateHighlightedSegment(this.viewableSectionData);
      }
    }
  };

  onTopReached = () => {
    if (this.props.loadingTextHead === true || !this.props.prev || this.state.jumpState.jumping) {
      //already loading tail, or nothing above
      return;
    }
    this.onTopReaching = true;
    this.setState({
      jumpState: {
        jumping: true,
        targetRef: this.props.textReference,
        viewPosition: 0.1,
        animated: false,
      }
    });
    this.props.updateData("prev");
  };

  onEndReached = () => {
    this.props.updateData("next");
  };

  sectionsCoverScreen = (startSectionInd, endSectionInd) => {
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
    const sectionRef = item.ref.replace("|content","");
    return (
      <TextRangeContinuous
        theme={this.props.theme}
        themeStr={this.props.themeStr}
        settings={this.props.settings}
        rowData={item.data}
        sectionRef={sectionRef}
        textLanguage={this.props.textLanguage}
        showSegmentNumbers={Sefaria.showSegmentNumbers(this.props.textTitle)}
        textSegmentPressed={this.textSegmentPressed}
        setRowRef={(key, ref)=>{this.rowRefs[key]=ref}}
        setRowRefInitY={(key, y)=>{this.continuousRowYHash[key] = y}}
        Sefaria={Sefaria}
      />
    );
  };

  renderSegmentedRow = ({ item }) => {
    // In segmented case, rowData represents a segments of text
    return (
      <TextRange
        theme={this.props.theme}
        themeStr={this.props.themeStr}
        settings={this.props.settings}
        rowData={item.data}
        segmentRef={item.ref}
        textLanguage={this.props.textLanguage}
        showSegmentNumbers={Sefaria.showSegmentNumbers(this.props.textTitle)}
        textSegmentPressed={this.textSegmentPressed}
        setRowRef={(key, ref)=>{this.rowRefs[key]=ref}}
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
        //console.log("too big", index);
        return {length: itemHeight, offset: itemHeight * index, index};
      } else {
        const yo = this.state.itemLayoutList[index];
        if (!yo) {
          console.log("yo non existant", index, this.state.itemLayoutList);
        }
        return yo;
      }
    } else {
      const yo = this.backupItemLayoutList[index];
      if (!yo) {
        let itemHeight = 100;
        console.log("race condition");
        return {length: itemHeight, offset: itemHeight * index, index};
      }
      return yo;

    }
  }

  updateJumpInfoMap = (dataSource) => {
    let jumpInfoMap = new Map();
    let currIndex = 0;
    for (let section of dataSource) {
      jumpInfoMap.set(section.ref, currIndex);
      currIndex++; //sections are counted in the index count
      for (let segment of section.data) {
        jumpInfoMap.set(segment.ref, currIndex);
        currIndex++;
      }
      currIndex++;
    }
    return jumpInfoMap;
  }

  waitForScrollToLocation = (i) => {
    if (!this._isMounted) { return; }

    let viewableIndices;
    try {
      viewableIndices = this.sectionListRef._wrapperListRef._listRef._viewabilityTuples[0].viewabilityHelper._viewableIndices;
    } catch (e) {
      if (i < 50) {
        setTimeout(()=>{this.waitForScrollToLocation(i+1)}, 5);
      }
      return;
    }

    if (viewableIndices.indexOf(this.targetScrollIndex) !== -1) {
      this.onScrollToLocation();
      /*this.sectionListRef.scrollToLocation({
          animated: false,
          sectionIndex: 0,
          itemIndex: this.targetScrollIndex,
          viewPosition: 0.1,
      });*/
    } else if (i < 50) { // if it's running more than 250ms, kill the recursion
      setTimeout(()=>{this.waitForScrollToLocation(i+1)}, 5);
    }
  }
  onScrollToLocation = () => {
    this.onTopReaching = false;
    this.setState({itemLayoutList: null});
  }

  allHeightsMeasured = (componentsToMeasure, textToHeightMap) => {
    if (!this.measuringHeights) { return; } //sometimes allHeightsMeasured() gets called but we don't care
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
    this.backupItemLayoutList = itemLayoutList;
    this.measuringHeights = false;
    this.setState({itemLayoutList, jumpInfoMap, dataSource: this.state.nextDataSource},
      ()=>{
        const { jumping, animated, viewPosition, targetRef } = this.state.jumpState;
        if (jumping) {
          const targetIndex = jumpInfoMap.get(targetRef);
          if (targetIndex === undefined || targetIndex === null || targetIndex >= itemLayoutList.length) {
            console.log("FAILED to find targetIndex", targetRef, targetIndex, jumpInfoMap);
            this.onScrollToLocation();
          } else {
            this.targetScrollIndex = targetIndex-1;
            this.sectionListRef._wrapperListRef._listRef.scrollToOffset({
              offset: this.getItemLayout(null, targetIndex).offset - 100,
              animated,
            });
            this.waitForScrollToLocation(0);
          }
          this.setState({jumpState: { jumping: false }});
        }
      }
    );
  }

  onScrollToIndexFailed = ({ index, highestMeasuredFrameIndex, averageItemLength }) => {
    console.log("scroll to", index, "FAILED! highest is", highestMeasuredFrameIndex);
  }

  _getSectionListRef = (ref) => {
    this.sectionListRef = ref;
  }

  _getTextHeightMeasurerRef = (ref) => {
    this.textHeightMeasurerRef = ref;
  }

  _keyExtractor = (item, index) => {
    return item.changeString;
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
            onEndReached={this.onEndReached}
            onEndReachedThreshold={2.0}
            onScroll={this.handleScroll}
            scrollEventThrottle={100}
            onViewableItemsChanged={this.onViewableItemsChanged}
            onScrollToIndexFailed={this.onScrollToIndexFailed}
            keyExtractor={this._keyExtractor}
            stickySectionHeadersEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={this.props.loadingTextHead || this.onTopReaching}
                onRefresh={this.onTopReached}
                tintColor="#CCCCCC"
                style={{ backgroundColor: 'transparent' }} />
            }/>
        { this.state.jumpState.jumping ?
          <TextHeightMeasurer
            ref={this._getTextHeightMeasurerRef}
            componentsToMeasure={this.state.componentsToMeasure}
            allHeightsMeasuredCallback={this.allHeightsMeasured}/> : null
        }
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
