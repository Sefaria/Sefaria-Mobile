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

import { RecyclerListView, DataProvider, LayoutProvider } from "recyclerlistview";


const styles =                require('./Styles.js');
const TextRange =            require('./TextRange');
const TextRangeContinuous = require('./TextRangeContinuous');
const TextHeightMeasurer = require('./TextHeightMeasurer');
const queryLayoutByID =   require('queryLayoutByID');
const ViewPort  = Dimensions.get('window');
const COMMENTARY_LINE_THRESHOLD = 150;

const {
  LoadingView,
} = require('./Misc.js');

const ViewTypes = {
    SECTIONHEADER: -1,
    SEGMENT: 1,
};

const ROW_LAYOUT_CONSTANTS = {
  margin: 20,
  he_padding: 5,
  en_padding: 5,
  section_header: 100,
}
const ERRORS = [];


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
    let { dataSource, dataTypeMap, componentsToMeasure, jumpInfoMap } = this.generateDataSource(props, !!props.offsetRef);

    let { width } = Dimensions.get("window");

    this._dataProvider = new DataProvider((r1, r2) => {
        return r1.changeString !== r2.changeString;
    });

    this._layoutProvider = new LayoutProvider(
        index => {
          if (this.state.dataTypeMap && index < this.state.dataTypeMap.length) {
            const type = this.state.dataTypeMap[index];
            if (type === ViewTypes.SEGMENT) {
              return index;
            }
            return type;
          }
          return ViewTypes.SECTIONHEADER;
        },
        (type, dim) => {
          dim.width = width;
          switch (type) {
            case ViewTypes.SECTIONHEADER:
              dim.height = ROW_LAYOUT_CONSTANTS.section_header;
              break;
            default:
              // in SEGMENT case, type is actually index in list
              const row = this.state.dataSource[type];
              const index = type;
              if (this.state.itemLayoutList) {
                if (index >= this.state.itemLayoutList.length) {
                  dim.height = 100;
                } else {
                  const height = this.state.itemLayoutList[index];
                  if (!height) {
                    debugger;
                    //console.log("yo non existant", index, this.state.itemLayoutList);
                    dim.height = 100;
                  }
                  dim.height = height;
                }
              } else {
                dim.height = 100;
              }
              break;
          }
        }
    );

    let initialRenderIndex;
    if (!!props.offsetRef) {
      for (let irow = 0; irow < dataSource.length; irow++) {
        const row = dataSource[irow];
        if (row.ref === props.offsetRef) {
          initialRenderIndex = irow;
          break;
        }
      }
    }


    this.state = {
      nextDataSource: dataSource,
      dataSource: !!props.offsetRef ? [] : dataSource,
      dataProvider: this._dataProvider.cloneWithRows(!!props.offsetRef ? [] : dataSource),
      dataTypeMap,
      jumpInfoMap,
      initialRenderIndex,
      initialHeightsMeasured: !props.offsetRef,
      componentsToMeasure,
      jumpState: { // if jumping is true, then look at jumpState when allHeightsMeasuredCallback is called
        jumping: !!props.offsetRef,
        targetRef: props.offsetRef || null,
        viewPosition: 0,
        animated: false,
      },
      changingTextFlow: false, // true while waiting for continuous data to be measured
    };
  }

  generateDataSource = (props, measureFirstSec) => {
    // Returns data representing sections and rows to be passed into ListView.DataSource.cloneWithSectionsAndRows
    // Takes `props` as an argument so it can generate data with `nextProps`.
    let data = props.data;
    let dataSource = [];
    let dataTypeMap = [];  // mapping from row index to dataType
    let numComponentsToMeasure = 0;
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
        const changeString = [rowID, props.textLanguage, props.textFlow, props.settings.fontSize].join("|");
        rows.push({ref: rowID + "|content", data: rowData, changeString: changeString + "|content" });
        dataSource.push({ref: props.sectionArray[sectionIndex], heRef: props.sectionHeArray[sectionIndex], data: rows, sectionIndex, changeString});
      }
    }

    else { // segmented
      for (let sectionIndex = 0; sectionIndex < data.length; sectionIndex++) {
        dataSource.push({
          ref: props.sectionArray[sectionIndex],
          heRef: props.sectionHeArray[sectionIndex],
          sectionIndex,
          changeString: [props.sectionArray[sectionIndex], props.textLanguage, props.themeStr].join("|")
        });
        dataTypeMap.push(ViewTypes.SECTIONHEADER);
        if (measureFirstSec && sectionIndex === 1) {
          numComponentsToMeasure = data[sectionIndex-1].length + 2;
        }
        for (var i = 0; i < data[sectionIndex].length; i++) {
          if (i !== 0 && !data[sectionIndex][i].text && !data[sectionIndex][i].he) { continue; } // Skip empty segments
          var rowID = props.sectionArray[sectionIndex] + ":" + data[sectionIndex][i].segmentNumber;
          // console.log("ROW ID",rowID,props.segmentRef);
          var rowData = {
            content: data[sectionIndex][i], // Store data in `content` so that we can manipulate other fields without manipulating the original data
            rowIndex: i,
            sectionIndex,
            highlight: offsetRef == rowID || (props.textListVisible && props.segmentRef == rowID),
            listIndex: dataSource.length,
          };
          dataSource.push({
            ref: rowID,
            sectionIndex,
            data: rowData,
            changeString: [rowID, props.textLanguage, props.textFlow, props.settings.fontSize, props.linksLoaded[sectionIndex], (rowData.highlight ? "highlight" : "nohighlight"), props.themeStr].join("|")
          });
          dataTypeMap.push(ViewTypes.SEGMENT);
          if (measureFirstSec && sectionIndex === 0 && i === data[sectionIndex].length - 1) {
            numComponentsToMeasure = i + 2; // data[sectionIndex].length + section_header
          }
        }
      }
    }

    //console.log(sections);
    let componentsToMeasure = [];
    for (let j = 0; j < numComponentsToMeasure; j++) {
      let row = dataSource[j];
      componentsToMeasure.push({ref: row.ref, id: row.changeString, generator: dataTypeMap[j] === ViewTypes.SECTIONHEADER ? this.renderSectionHeader : this.renderSegmentedRow, param: row});
    }
    const jumpInfoMap = this.updateJumpInfoMap(dataSource);
    return { dataSource, dataTypeMap, componentsToMeasure, jumpInfoMap };
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

  textSegmentPressed = (section, segment, segmentRef, shouldToggle, listIndex) => {
    if (!this.props.textListVisible) {
      if (this.props.textFlow === 'continuous') {
        const targetY = this.continuousRowYHash[segmentRef] + this.state.itemLayoutList[this.state.jumpInfoMap.get(this.props.sectionArray[section])].offset;
        if (targetY) {
          // yes this is ridiculous. hopefully scrollToOffset() will get implemented on SectionList soon.
          // see https://github.com/facebook/react-native/issues/13151#issuecomment-337442644
          this.sectionListRef._wrapperListRef._listRef.scrollToOffset({
            animated: false,
            offset: targetY,
          });
        } else {
          console.log("target Y is no good :(", segmentRef);
        }
      } else {
        this.recyclerRef.scrollToIndex(listIndex);
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
        this.props.settings.fontSize !== nextProps.settings.fontSize ||
        this.props.textListVisible !== nextProps.textListVisible ||
        this.props.segmentIndexRef !== nextProps.segmentIndexRef ||
        this.props.segmentRef !== nextProps.segmentRef ||
        this.props.themeStr !== nextProps.themeStr ||
        this.props.linksLoaded !== nextProps.linksLoaded) {
      // Only update dataSource when a change has occurred that will result in different data

      const { dataSource, dataTypeMap, componentsToMeasure, jumpInfoMap } = this.generateDataSource(nextProps);
      this.setState({
        dataSource,
        dataProvider: this._dataProvider.cloneWithRows(dataSource),
        dataTypeMap,
        jumpInfoMap,
        componentsToMeasure,
        changingTextFlow: this.props.textFlow !== nextProps.textFlow
      });
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

  updateHighlightedSegment = (visibleRows) => {
    let setHighlight = function (sectionIndex, segmentIndex, ref) {
      //console.log("VISIBLE", allVisibleRows, "TO LOAD", segmentToLoad,"Seg Ind Ref",this.props.segmentIndexRef);
      if (segmentIndex !== this.props.segmentIndexRef || ref !== this.props.segmentRef) {
        this.props.textSegmentPressed(sectionIndex, segmentIndex, ref);
      }
    }.bind(this);
    if (visibleRows.length > 0) {
      let handle = findNodeHandle(this.rowRefs[visibleRows[0].ref]);
      if (handle) {
        queryLayoutByID(
           handle,
           null, /*Error callback that doesn't yet have a hook in native so doesn't get called */
           (left, top, width, height, pageX, pageY) => {
             const seg = pageY + height > COMMENTARY_LINE_THRESHOLD || visibleRows.length === 1 ? visibleRows[0] : visibleRows[1];
             setHighlight(seg.data.sectionIndex, seg.data.rowIndex, seg.ref);
           }
         );
      } else {
        const seg = visibleRows.length === 1 ? visibleRows[0] : visibleRows[1];
        setHighlight(seg.data.sectionIndex, seg.data.rowIndex, seg.ref);
      }
    }
  };

  updateTitle = (visibleRows) => {
    if (!visibleRows.length) {
      return;
    }
    const topSectionCounts = Object.entries(visibleRows.reduce((accum, curr) => {
      if (!curr) return accum;
      if (!accum[curr.sectionIndex]) {
        accum[curr.sectionIndex] = 1;
      } else {
        accum[curr.sectionIndex] += 1;
      }
      return accum;
    }, {})).sort((a,b) => b[1] - a[1]);
    // update title
    let enTitle = this.props.sectionArray[topSectionCounts[0][0]];
    let heTitle = this.props.sectionHeArray[topSectionCounts[0][0]];

    if (enTitle !== this.props.textReference) {
      this.props.updateTitle(enTitle, heTitle);
    }
  };

  handleScroll = (e, offsetX, offsetY) => {
    const previousY = this.currentY;
    this.currentY = offsetY;
    if (this.props.textListVisible && this.visibleRows) {
      if (Math.abs(previousY - this.currentY) > 40) {
        return;
      }
      if (this.props.textFlow === 'continuous') {
        this.updateHighlightedSegmentContinuous(this.visibleRows);
      } else {
        this.updateHighlightedSegment(this.visibleRows);
      }
    }
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
    //let shouldCull = this.sectionsCoverScreen(0, this.state.dataSource.length - 2);
    this.props.updateData("prev", false);
  };

  onEndReached = () => {
    let shouldCull = false; //this.sectionsCoverScreen(1, this.state.dataSource.length - 1); TODO too glitchy to release
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

  onVisibleIndexesChanged = (all, now, notNow) => {
    this.visibleRows = all.map(index=>this.state.dataSource[index]);
    this.updateTitle(this.visibleRows);
  };

  /******************
  RENDER
  *******************/

  renderRow = (type, data) => {
    if (type === ViewTypes.SECTIONHEADER) {
      return this.renderSectionHeader(data);
    }
    return (this.props.textFlow == 'continuous' && Sefaria.canBeContinuous(this.props.textTitle)) ? this.renderContinuousRow(data) : this.renderSegmentedRow(data);
  };

  renderContinuousRow = (data) => {
    // In continuous case, rowData represent an entire section of text
    const sectionRef = data.ref.replace("|content","");
    return (
      <TextRangeContinuous
        theme={this.props.theme}
        themeStr={this.props.themeStr}
        settings={this.props.settings}
        rowData={data.data}
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

  onSegmentRowLayout = (listIndex, height) => {
    const row = this.state.dataSource[listIndex];
    const heLen = row.data.content.he ? Sefaria.hebrew.stripNikkud(row.data.content.he).length : 0;
    const enLen = row.data.content.text ? row.data.content.text.length : 0;
    const layoutConstant = ROW_LAYOUT_CONSTANTS.margin + (!!heLen * ROW_LAYOUT_CONSTANTS.he_padding) + (!!enLen * ROW_LAYOUT_CONSTANTS.en_padding);
    if (this._hebrewRatio === undefined) {
      this._hebrewRatio = (height - layoutConstant) / (heLen + enLen);
      this._englishRatio = this._hebrewRatio;
      this._numSeen = 0;
    }
    const prevHebrewRatio = this._hebrewRatio;
    const prevEnglishRatio = this._englishRatio;
    if (heLen > 0) {
      this._hebrewRatio = ((this._numSeen  * prevHebrewRatio) + (height - layoutConstant - (enLen * prevEnglishRatio))/heLen) / (this._numSeen + 1);
    }
    if (enLen > 0) {
      this._englishRatio = ((this._numSeen * prevEnglishRatio) + (height - layoutConstant - (heLen * prevHebrewRatio))/enLen) / (this._numSeen + 1);
    }
    this._numSeen += 1;

    // debug
    const estimatedHeight = layoutConstant + (this._hebrewRatio * heLen) + (this._englishRatio * enLen);
    const percentError = 100*(estimatedHeight - height) / (height);
    //console.log("Percent Error:", percentError, "%", row.data.rowIndex+1);
    ERRORS.push(percentError);
    console.log("Avg:", ERRORS.reduce((accum, curr) => accum + curr, 0)/ERRORS.length, row.data.rowIndex+1);
  }

  renderSegmentedRow = (data) => {

    // In segmented case, rowData represents a segments of text
    return (
      <TextRange
        theme={this.props.theme}
        themeStr={this.props.themeStr}
        settings={this.props.settings}
        rowData={data.data}
        segmentRef={data.ref}
        textLanguage={this.props.textLanguage}
        showSegmentNumbers={Sefaria.showSegmentNumbers(this.props.textTitle)}
        textSegmentPressed={this.textSegmentPressed}
        setRowRef={(key, ref)=>{this.rowRefs[key]=ref}}
        Sefaria={Sefaria}
      />
    );
  };

  renderSectionHeader = (data) => {
    return (
      <SectionHeader
        title={this.props.textLanguage == "hebrew" ?
                this.inlineSectionHeader(data.heRef) :
                this.inlineSectionHeader(data.ref)}
        isHebrew={this.props.textLanguage == "hebrew"}
        theme={this.props.theme}
        />
    );
  };

  renderFooter = () => {
    return this.props.next ? <LoadingView theme={this.props.theme} /> : null;
  };

  updateJumpInfoMap = (dataSource) => {
    let jumpInfoMap = new Map();
    let currIndex = 0;
    for (let item of dataSource) {
      jumpInfoMap.set(item.ref, currIndex);
      currIndex++;
    }
    return jumpInfoMap;
  }
  allHeightsMeasured = (componentsToMeasure, textToHeightMap) => {
    let currOffset = 0;
    let itemLayoutList = [];
    let jumpInfoMap = new Map();
    let currIndex = 0;
    for (let item of this.state.nextDataSource) {
      let height = textToHeightMap.get(item.changeString);
      itemLayoutList[currIndex] = height;
      jumpInfoMap.set(item.ref, currIndex);
      currOffset += height;
      currIndex++; //sections are counted in the index count
    }
    const prevInitialHeightsMeasured = this.state.initialHeightsMeasured;
    this.setState({itemLayoutList: itemLayoutList, jumpInfoMap: jumpInfoMap, dataSource: this.state.nextDataSource, dataProvider: this._dataProvider.cloneWithRows(this.state.nextDataSource), changingTextFlow: false, initialHeightsMeasured: true},
      ()=>{
        const { jumping, animated, targetRef } = this.state.jumpState;
        if (jumping && prevInitialHeightsMeasured) {
          const targetIndex = this.state.jumpInfoMap.get(targetRef);
          if (targetIndex) {
            this.recyclerRef.scrollToIndex(targetIndex, animated);
          }
          this.setState({jumpState: { jumping: false }});
        }
      }
    );
  }

  _getRecyclerRef = (ref) => {
    this.recyclerRef = ref;
  }

  render() {
    return (
        <View style={styles.textColumn} >
          { this.state.initialHeightsMeasured ?
            <RecyclerListView
              ref={this._getRecyclerRef}
              initialRenderIndex={this.state.initialRenderIndex}
              forceNonDeterministicRendering={true}
              layoutProvider={this._layoutProvider}
              dataProvider={this.state.dataProvider}
              rowRenderer={this.renderRow}
              onEndReached={this.onEndReached}
              renderFooter={this.renderFooter}
              onEndReachedThreshold={10}
              scrollEventThrottle={100}
              onScroll={this.handleScroll}
              onVisibleIndexesChanged={this.onVisibleIndexesChanged}
              refreshControl={
                <RefreshControl
                  refreshing={this.props.loadingTextHead}
                  onRefresh={this.onTopReached}
                  tintColor="#CCCCCC"
                  style={{ backgroundColor: 'transparent' }} />
              }
            /> : null
          }
          { this.state.jumpState.jumping ?
            <TextHeightMeasurer
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
