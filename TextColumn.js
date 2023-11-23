'use strict';
import PropTypes from 'prop-types';
import React, { useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  Dimensions,
  AppState,
  Image,
} from 'react-native';
import {ViewPropTypes} from 'deprecated-react-native-prop-types';
import {ErrorBoundaryFallbackComponent} from "./ErrorBoundaryFallbackComponent";
import { WebView } from 'react-native-webview';
import styles from './Styles.js';
import TextRange from './TextRange';
import TextRangeContinuous from './TextRangeContinuous';
import TextHeightMeasurer from './TextHeightMeasurer';
import { VOCALIZATION } from './VocalizationEnum';
const ViewPort  = Dimensions.get('window');
const COMMENTARY_LINE_THRESHOLD = 100;

import {
  LoadingView,
  HebrewInEnglishText,
} from './Misc.js';
import { ErrorBoundary } from "react-error-boundary";

const ROW_TYPES = {
  SEGMENT: 1,
  ALIYA: 2,
  PARASHA: 3,
  SHEET_COMMENT: 4,
  SHEET_OUTSIDE_TEXT: 5,
  SHEET_OUTSIDE_BI_TEXT: 6,
  SHEET_MEDIA: 7
};

class TextColumn extends React.PureComponent {
  static whyDidYouRender = true;
  static propTypes = {
    showToast:          PropTypes.func,
    textToc:            PropTypes.object,
    theme:              PropTypes.object.isRequired,
    themeStr:           PropTypes.string,
    fontSize:           PropTypes.number.isRequired,
    data:               PropTypes.oneOfType([PropTypes.array, PropTypes.object]),  // can be object in the case of sheets
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
    interfaceLanguage:  PropTypes.oneOf(["hebrew","english"]),
    updateData:         PropTypes.func,
    updateTitle:        PropTypes.func,
    textSegmentPressed: PropTypes.func,
    textListVisible:    PropTypes.bool,
    next:               PropTypes.string,
    prev:               PropTypes.string,
    loadingTextTail:    PropTypes.bool,
    loadingTextHead:    PropTypes.bool,
    linksLoaded:        PropTypes.array,
    showAliyot:         PropTypes.bool.isRequired,
    handleOpenURL:       PropTypes.func.isRequired,
    shareCurrentSegment:PropTypes.func.isRequired,
    getDisplayedText:   PropTypes.func.isRequired,
    biLayout:           PropTypes.oneOf(["stacked", "sidebyside", "sidebysiderev"]),
    textUnavailableAlert: PropTypes.func.isRequired,
    vowelToggleAvailable: PropTypes.oneOf([VOCALIZATION.TAAMIM_AND_NIKKUD, VOCALIZATION.NIKKUD, VOCALIZATION.NONE]),
  };

  constructor(props) {
    super(props);
    this.currentY = 0; // for measuring scroll speed
    this.rowRefs = {}; //hash table of currently loaded row refs.
    this.rowYHash = {};
    this.dataSourceHash = {};
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
    if (this.props.data.length > 0 && this.state.dataSource.length === 0) {
      // sometimes when going back to textcolumn, constructor isn't run and props.data is not in sync with state.dataSource
      // manually perform update
      this.performUpdate(this.props);
    }
  }
  componentWillUnmount() {
    this._isMounted = false;
  }
  generateDataSource = (props, gonnaJump) => {
    // Returns data representing sections and rows to be passed into ListView.DataSource.cloneWithSectionsAndRows
    // Takes `props` as an argument so it can generate data with `nextProps`.
    const canHaveAliyot = Sefaria.canHaveAliyot(props.textTitle);
    const showAliyot = canHaveAliyot && props.showAliyot;
    const parashaDict = !!props.textToc && canHaveAliyot ? this._getParashaDict(props.textToc.alts.Parasha.nodes) : {};
    let data = props.data;
    let dataSource = [];

    let offsetRef = this._standardizeOffsetRef(props.offsetRef);
    let segmentGenerator;
    if (props.isSheet) {
      segmentGenerator = () => null;
      const sheetRef = `Sheet ${props.sheetMeta.sheetID}`;
      dataSource.push({
        ref: sheetRef,
        heRef: `דף ${props.data.id}`,
        sectionIndex: 0,
        data: props.data[0].map((source, segmentNumber) => {
          let type = null;
          const sheetNodeRef = `${sheetRef}:${segmentNumber}`;
          const highlightedWordID = props.highlightedWordSegmentRef === sheetNodeRef && props.highlightedWordID;
          const row = {
            ref: sheetNodeRef,
            data: {
              content: source,
              sectionIndex: 0,
              rowIndex: segmentNumber,
              highlight: props.textListVisible && props.segmentRef == sheetNodeRef,
              highlightedWordID,
            },
            changeString: sheetNodeRef,
          };
          if (source.type === 'ref')                { type = ROW_TYPES.SEGMENT; }
          else if (source.type === 'comment')       { type = ROW_TYPES.SHEET_COMMENT; }
          else if (source.type === 'outsideText')   { type = ROW_TYPES.SHEET_OUTSIDE_TEXT; }
          else if (source.type === 'outsideBiText') { type = ROW_TYPES.SHEET_OUTSIDE_BI_TEXT; }
          else if (source.type === 'media')         { type = ROW_TYPES.SHEET_MEDIA; }
          row.type = type;
          return row;
        }),
        changeString: sheetRef,
      });
    }
    else if (props.textFlow == 'continuous' && Sefaria.canBeContinuous(props.textTitle)) {
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
          const aliya = parashaDict[rowID];
          //if (!!aliya && aliya.type === ROW_TYPES.ALIYA) { debugger; }
          if (!!aliya && (aliya.type !== ROW_TYPES.ALIYA || showAliyot)) {
            //insert aliya
            rows.push(aliya);
          }
          const rowContent = data[sectionIndex][i];
          const highlight = offsetRef == rowID || (props.textListVisible && props.segmentRef == rowID);
          const highlightedWordID = props.highlightedWordSegmentRef === rowID && props.highlightedWordID;
          const changeString = `${rowID}|${!!rowContent.links && rowContent.links.length}|${highlight}|${this.props.fontSize}|${highlightedWordID}`;
          let rowData = this.dataSourceHash[changeString];
          if (!rowData) {
            rowData = {
              content: rowContent, // Store data in `content` so that we can manipulate other fields without manipulating the original data
              sectionIndex,
              rowIndex: i,
              highlight,
              highlightedWordID,
            };
            this.dataSourceHash[changeString] = rowData;           
          } else {
            // in the case where you loaded a previous section, this sectionIndex is no longer valid
            // always update when pulling from cache just in case
            rowData.sectionIndex = sectionIndex;
          }
          // excluding b/c they don't change height: props.themeStr, props.linksLoaded[sectionIndex]
          //rowData.changeString += rowData.highlight ? "|highlight" : "";
          rows.push({ref: rowID, data: rowData, changeString, type: ROW_TYPES.SEGMENT});
        }
        dataSource.push({ref: props.sectionArray[sectionIndex], heRef: props.sectionHeArray[sectionIndex], data: rows, sectionIndex: sectionIndex, changeString: `${props.sectionArray[sectionIndex]}|${this.props.fontSize}|${this.props.textLanguage}`});
      }
      segmentGenerator = this.renderSegmentedRow;
    }
    const jumpInfoMap = this.updateJumpInfoMap(dataSource);
    //console.log(sections);
    const componentsToMeasure = [];
    if (gonnaJump) {
      for (let section of dataSource) {
        componentsToMeasure.push({ref: section.ref, id: section.ref, generator: this.renderSectionHeader, param: {section: section}})
        for (let segment of section.data) {
          const generator = segment.type === ROW_TYPES.SEGMENT ? segmentGenerator : this.renderAliyaMarker;
          componentsToMeasure.push({ref: segment.ref, id: segment.ref, generator, param: {item: segment}});
        }
      }

    }
    return {dataSource, componentsToMeasure, jumpInfoMap};

  };

  _getParashaDict = nodes => {
    const aliyaNames = [
      {en: "First", he: "ראשון"},
      {en: "Second", he: "שני"},
      {en: "Third", he: "שלישי"},
      {en: "Fourth", he: "רביעי"},
      {en: "Fifth", he: "חמישי"},
      {en: "Sixth", he: "שישי"},
      {en: "Seventh", he: "שביעי"},
    ];
    const parashaDict = {};
    for (let n of nodes) {
      for (let i = 0; i < n.refs.length; i++) {
        const r = n.refs[i];
        const dashIndex = r.lastIndexOf("-");
        parashaDict[r.slice(0,dashIndex)] = i === 0 ?
          {data: {en: n.title, he: n.heTitle}, ref: `${n.title}|parasha`, type: ROW_TYPES.PARASHA, changeString: `${n.title}|parasha|${this.props.fontSize}|${this.props.textLanguage}`} :
          {data: aliyaNames[i], ref: `${n.title}|${aliyaNames[i].en}|aliya`,type: ROW_TYPES.ALIYA, changeString: `${n.title}|${aliyaNames[i].en}|aliya|${this.props.fontSize}|${this.props.textLanguage}`};
      }
    }
    return parashaDict;
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

  textSegmentPressed = (section, segment, segmentRef, onlyOpen) => {
    if (!this.props.textListVisible) {
      if (this.props.textFlow === 'continuous') {
        const targetY = this.rowYHash[segmentRef] + this.state.itemLayoutList[this.state.jumpInfoMap.get(this.props.sectionArray[section])].offset;
        if (targetY) {
          this.sectionListRef.scrollToOffset({
            animated: false,
            offset: targetY,
          });
        } else {
          console.log("target Y is no good :(", segmentRef);
        }
      } else {
        const itemIndex = this.state.jumpInfoMap.get(segmentRef);
        const { startY, endY } = this.getSegScrollPos(segmentRef);
        if (startY > 0) {  // only scroll when segment top is visible on screen
          if (!itemIndex) { debugger; }
          this.sectionListRef.scrollToLocation({
              animated: false,
              sectionIndex: 0,
              itemIndex,
              viewPosition: 0,
          });
        }

      }

    } else {
      this.props.setHighlightedWord(null);
    }
    this.props.textSegmentPressed(section, segment, segmentRef, true, onlyOpen);
  };

  inlineSectionHeader = (ref) => {
    // Returns a string to be used as an inline section header for `ref`.
    var heTitle = Sefaria.index(this.props.textTitle).heTitle;
    var trimmer = new RegExp("^(" + this.props.textTitle + "|" + heTitle + "),? ");
    return ref.replace(trimmer, '');
  };

  componentDidUpdate(prevProps, prevState) {
    if (this.props.data.length !== prevProps.data.length ||
        this.props.textFlow !== prevProps.textFlow ||
        this.props.textLanguage !== prevProps.textLanguage ||
        this.props.textListVisible !== prevProps.textListVisible ||
        this.props.segmentIndexRef !== prevProps.segmentIndexRef ||
        this.props.segmentRef !== prevProps.segmentRef ||
        //this.props.themeStr !== prevProps.themeStr ||
        this.props.linksLoaded !== prevProps.linksLoaded ||
        this.props.textToc !== prevProps.textToc ||
        (this.props.sheet && this.props.sheet.id) !== (prevProps.sheet && prevProps.sheet.id) ||
        this.props.showAliyot !== prevProps.showAliyot ||
        this.props.highlightedWordID !== prevProps.highlightedWordID ||
        this.props.highlightedWordSegmentRef !== prevProps.highlightedWordSegmentRef) {
      // Only update dataSource when a change has occurred that will result in different data
      //TODO how to optimize this function when fontSize is changing?
      this.performUpdate(prevProps);
    }
  }
  performUpdate(prevProps) {
    let {dataSource, componentsToMeasure, jumpInfoMap} = this.generateDataSource(this.props, this.state.jumpState.jumping);
    if (this.props.data.length !== prevProps.data.length && this.state.jumpState.jumping) {
      this.measuringHeights = true;
      this.setState({nextDataSource: dataSource, componentsToMeasure, jumpInfoMap});
    } else {
      this.setState({dataSource, jumpInfoMap}, ()=> { if (this.measuringHeights) { this.raceCondition = true; }});
    }
  }
  updateHighlightedSegmentContinuous = (secData) => {
    for (let i = 0; i < secData.sections.length; i++) {
      let sectionIndex = secData.indexes[i];
      //let firstSegRefOffset = this.state.dataSource[sectionIndex].data[0].data.segmentData.length > 0 ? this.rowYHash[this.state.dataSource[sectionIndex].data[0].data.segmentData[0].ref] : null;
      for (let j = 0; j < this.state.dataSource[sectionIndex].data[0].data.segmentData.length; j++) {
        let segment = this.state.dataSource[sectionIndex].data[0].data.segmentData[j];
        const sectionOffset = this.state.itemLayoutList[this.state.jumpInfoMap.get(this.props.sectionArray[sectionIndex])].offset;
        //console.log(segment.ref, this.rowYHash[segment.ref], this.currentY, sectionOffset, firstSegRefOffset);
        if (this.rowYHash[segment.ref] + sectionOffset - this.currentY > -20) {
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
      sectionRefs: [],
    }
    let currSec;
    for (let seg of viewableItems) {
      if (seg.item.type === ROW_TYPES.ALIYA || seg.item.type === ROW_TYPES.PARASHA) { continue }
      if (seg.item.type === undefined) {
        // apparently segments with item.type === undefined are sections. who knew?
        secData.sectionRefs.push(seg.item.ref);

      }
      else if (currSec !== seg.section.sectionIndex) {
        currSec = seg.section.sectionIndex;
        secData.indexes.push(currSec);
        secData.sections.push([seg.item]);
      } else {
        secData.sections[secData.sections.length-1].push(seg.item);
      }
    }
    return secData;
  };

  setHighlight = (sectionIndex, segmentIndex, ref) => {
    //console.log("VISIBLE", allVisibleRows, "TO LOAD", segmentToLoad,"Seg Ind Ref",this.props.segmentIndexRef);
    if (segmentIndex !== this.props.segmentIndexRef || ref !== this.props.segmentRef) {
      this.props.textSegmentPressed(sectionIndex, segmentIndex, ref);
    }
  };

  getSegScrollPos = ref => {
    const { y, height } = this.rowYHash[ref];
    const startY = y - this.currentY;
    const endY = (y + height) - this.currentY;
    return { startY, endY };
  }

  updateHighlightedSegment = secData => {
    if (secData.sections.length > 0 && secData.sections[0].length > 0) {
        const topSeg = secData.sections[0][0];
        const nextSeg = secData.sections[0].length > 1 ? secData.sections[0][1] : (secData.sections.length > 1 ? secData.sections[1][0] : null);
        const { startY, endY } = this.getSegScrollPos(topSeg.ref);
        const seg = (startY > 0 || endY > COMMENTARY_LINE_THRESHOLD || !nextSeg) ? topSeg : nextSeg;

        this.setHighlight(seg.data.sectionIndex, seg.data.rowIndex, seg.ref);
    } else {
      console.log("secData is zero", secData);
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
      this.props.updateTitle(enTitle, heTitle, biggerSection);
    }
  };

  handleScroll = (e) => {
    const previousY = this.currentY;
    this.currentY = e.nativeEvent.contentOffset.y;
    if (this.viewableSectionData) {
      if (Math.abs(previousY - this.currentY) > 80) {
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
    if (this.props.loadingTextHead === true || !this.props.prev || this.state.jumpState.jumping || !!this.props.sheet) {
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
    if (this.props.loadingTextTail == true) {
      //already loading tail
      return;
    }
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
    if (
      item.type === ROW_TYPES.SEGMENT ||
      item.type === ROW_TYPES.SHEET_COMMENT ||
      item.type === ROW_TYPES.SHEET_OUTSIDE_TEXT ||
      item.type === ROW_TYPES.SHEET_OUTSIDE_BI_TEXT
    ) {
      return (this.props.textFlow == 'continuous' && Sefaria.canBeContinuous(this.props.textTitle)) ?
        this.renderContinuousRow({ item }) :
        this.renderSegmentedRow({ item });
    } else if (item.type === ROW_TYPES.SHEET_MEDIA) {
      return this.renderSheetMedia({ item });
    } else {
      return this.renderAliyaMarker({ item });
    }
  };

  renderContinuousRow = ({ item }) => {
    // In continuous case, rowData represent an entire section of text
    const sectionRef = item.ref.replace("|content","");
    return (
      <TextRangeContinuous
        theme={this.props.theme}
        themeStr={this.props.themeStr}
        fontSize={this.props.fontSize}
        rowData={item.data}
        sectionRef={sectionRef}
        textLanguage={this.props.textLanguage}
        showSegmentNumbers={Sefaria.showSegmentNumbers(this.props.textTitle)}
        textSegmentPressed={this.textSegmentPressed}
        setRowRef={this.setSegmentRowRef}
        setRowRefInitY={this.setRowRefInitY}
      />
    );
  };

  setSegmentRowRef = (key, ref) => { this.rowRefs[key] = ref; };

  setRowRefInitY = (key, y) => { this.rowYHash[key] = y; };

  renderSegmentedRow = ({ item }) => {
    // In segmented case, rowData represents a segments of text
    return (
      <View style={{ width: '100%' }}>
        <TextRange
          displayRef={item.type === ROW_TYPES.SEGMENT && this.props.isSheet}
          showToast={this.props.showToast}
          rowData={item.data}
          segmentRef={item.ref}
          showSegmentNumbers={Sefaria.showSegmentNumbers(this.props.textTitle)}
          textSegmentPressed={this.textSegmentPressed}
          setRowRef={this.setSegmentRowRef}
          setRowRefInitY={this.setRowRefInitY}
          handleOpenURL={this.props.handleOpenURL}
          setDictionaryLookup={this.props.setDictionaryLookup}
          shareCurrentSegment={this.props.shareCurrentSegment}
          getDisplayedText={this.props.getDisplayedText}
          vowelToggleAvailable={this.props.vowelToggleAvailable}
          isSheet={this.props.isSheet}
          setHighlightedWord={this.props.setHighlightedWord}
        />
      </View>
    );
  };

  renderSheetMedia = ({ item }) => {
    return (
      <SheetMedia
        theme={this.props.theme}
        url={item.data.content.url}
      />
    );
  };

  renderSectionHeader = ({ section, props }) => {
    if (!props) {
      props = this.props;
    }
    if (props.isSheet) { return null; }

    const isHeb = Sefaria.util.get_menu_language(props.interfaceLanguage, props.textLanguage) == "hebrew";
    return (
      <TextHeader
        title={isHeb ?
                this.inlineSectionHeader(section.heRef) :
                this.inlineSectionHeader(section.ref)}
        isHebrew={isHeb}
        theme={props.theme}
        outerStyle={styles.sectionHeaderBorder}
      />
    );
  };

  renderAliyaMarker = ({ item }) => {
    if (this.props.isSheet) { return null; }
    const isHeb = Sefaria.util.get_menu_language(this.props.interfaceLanguage, this.props.textLanguage) == "hebrew";
    return (
      <TextHeader
        title={isHeb ? item.data.he : item.data.en}
        isHebrew={isHeb}
        itemType={item.type}
        theme={this.props.theme}
        outerStyle={styles.aliyaHeader}
        withExtraTextStyle
      />
    );
  };

  renderListHeader = () => {
    if (this.props.isSheet) {
      return (
        <View>
          <Text style={[styles.sheetTitle, this.props.theme.text]}><HebrewInEnglishText text={this.props.sheetMeta.title} stylesHe={[styles.heInEn]} stylesEn={[]}/></Text>
          <Text style={[styles.sheetAuthor, this.props.theme.tertiaryText]}>{this.props.sheetMeta.ownerName}</Text>
        </View>
      )
    }
    return null;
  }

  renderListFooter = () => {
    if (this.props.isSheet) { return null; }
    return this.props.next ? <LoadingView category={Sefaria.primaryCategoryForTitle(this.props.textTitle)}/> : null;
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

  waitForScrollToLocation = (i, offset, animated, shouldJump=true) => {
    if (!this._isMounted) { return; }

    if (shouldJump) {
      this.sectionListRef._wrapperListRef._listRef.scrollToOffset({
        offset,
        animated,
      });
    }
    let viewableIndices;
    try {
      viewableIndices = this.sectionListRef._wrapperListRef._listRef._viewabilityTuples[0].viewabilityHelper._viewableIndices;
    } catch (e) {
      this.waitForScrollToLocationFail(i, offset, animated);
      return;
    }

    if (viewableIndices[0] === this.targetScrollIndex) {
      this.onScrollToLocation();
    } else {
      this.waitForScrollToLocationFail(i, offset, animated);
    }
  }

  waitForScrollToLocationFail = (i, offset, animated) => {
    if (i < 50) {
      const partialTimeout = i >= 10 && i % 10 === 0;
      setTimeout(()=>{this.waitForScrollToLocation(i+1, offset, animated, partialTimeout)}, 5);
    } else {
      // full timeout
      this.onScrollToLocation();
    }
  };

  onScrollToLocation = () => {
    this.onTopReaching = false;
    this.setState({itemLayoutList: null});
  }

  callOnEndReachedWhenContentIsShort = (itemLayoutList) => {
    const lastLayout = itemLayoutList[itemLayoutList.length-1];
    if (lastLayout.offset + lastLayout.length < ViewPort.height) {
      this.onEndReached();
    }
  };

  allHeightsMeasured = (componentsToMeasure, textToHeightMap) => {
    if (!this.measuringHeights) { return; } //sometimes allHeightsMeasured() gets called but we don't care
    let currOffset = 0;
    let itemLayoutList = [];
    let jumpInfoMap = new Map();
    let currIndex = 0;
    for (let section of this.state.nextDataSource) {
      let currHeight = textToHeightMap.get(section.ref);
      itemLayoutList[currIndex] = {index: currIndex, length: currHeight, offset: currOffset};
      jumpInfoMap.set(section.ref, currIndex);
      currOffset += currHeight;
      currIndex++; //sections are counted in the index count
      for (let segment of section.data) {
        let currHeight = textToHeightMap.get(segment.ref);
        itemLayoutList[currIndex] = {index: currIndex, length: currHeight, offset: currOffset};
        jumpInfoMap.set(segment.ref, currIndex);
        currOffset += currHeight;
        currIndex++;
      }
      itemLayoutList[currIndex] = {index: currIndex, length: 0, offset: currOffset};
      currIndex++;
    }
    this.callOnEndReachedWhenContentIsShort(itemLayoutList);
    this.backupItemLayoutList = itemLayoutList;
    this.measuringHeights = false;

    // dont update dataSource if its already been updated while measuring heights
    const nextState = {itemLayoutList, jumpInfoMap};
    if (!this.raceCondition) { nextState.dataSource = this.state.nextDataSource}
    this.raceCondition = false;
    this.setState(nextState,
      ()=>{
        const { jumping, animated, viewPosition, targetRef } = this.state.jumpState;
        if (jumping) {
          const targetIndex = jumpInfoMap.get(targetRef);
          if (targetIndex === undefined || targetIndex === null || targetIndex >= itemLayoutList.length) {
            console.log("FAILED to find targetIndex", targetRef, targetIndex, jumpInfoMap, this.state.itemLayoutList);
            this.onScrollToLocation();
          } else {
            this.targetScrollIndex = targetIndex-1;
            this.waitForScrollToLocation(0, this.getItemLayout(null, targetIndex).offset - 100, animated);
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
    return item.ref;
  }

  _onSegmentLayout = (ref, y) => {
    this.rowYHash[ref] = y;
  }
  _renderCell = props => {
    const onLayoutOuter = useCallback(event => {
      const { height, width, y, x } = event.nativeEvent.layout;
      this._onSegmentLayout(props.item.ref, {y, height});
      props.onLayout(event);
    }, [props.onLayout, props.item.ref]);
    return (
      <View style={props.style} onLayout={onLayoutOuter}>
        { props.children }
      </View>
    );
  };

  _textErrorBoundaryAlert = () => {
    this.props.textUnavailableAlert(this.props.textTitle);
  };

  render() {
    return (
        <View style={styles.textColumn}>
          <ErrorBoundary FallbackComponent={ErrorBoundaryFallbackComponent} onError={this._textErrorBoundaryAlert}>
            <SectionList
              style={styles.scrollViewPaddingInOrderToScroll}
              ref={this._getSectionListRef}
              sections={this.state.dataSource}
              renderItem={this.renderRow}
              renderSectionHeader={this.renderSectionHeader}
              ListHeaderComponent={this.renderListHeader}
              ListFooterComponent={this.renderListFooter}
              onEndReached={this.onEndReached}
              onEndReachedThreshold={2.0}
              onScroll={this.handleScroll}
              extraData={this.props.fontSize}
              scrollEventThrottle={100}
              onViewableItemsChanged={this.onViewableItemsChanged}
              onScrollToIndexFailed={this.onScrollToIndexFailed}
              keyExtractor={this._keyExtractor}
              stickySectionHeadersEnabled={false}
              CellRendererComponent={this._renderCell}
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
          </ErrorBoundary>
        </View>
    );
  }

}

class TextHeader extends React.PureComponent {
  static whyDidYouRender = true;
  static propTypes = {
    title:      PropTypes.string.isRequired,
    isHebrew:   PropTypes.bool.isRequired,
    theme:      PropTypes.object.isRequired,
    outerStyle: PropTypes.oneOfType([ViewPropTypes.style, PropTypes.array]),
    itemType:   PropTypes.oneOf(Object.values(ROW_TYPES)),
    withExtraTextStyle: PropTypes.bool,
  };
  constructor(props) {
    super(props);
    this.enAliyaStyle = [this.props.theme.quaternaryText, styles.enInt, styles.aliyaHeaderText];
    this.heAliyaStyle = [this.props.theme.quaternaryText, styles.heInt, styles.aliyaHeaderText];
  }

  render() {
    const { itemType, withExtraTextStyle, isHebrew } = this.props;
    const extraTextStyle = withExtraTextStyle ? (itemType === ROW_TYPES.ALIYA ? (isHebrew ? this.heAliyaStyle : this.enAliyaStyle) : (isHebrew ? styles.heInt : styles.enInt)) : null;
    return <View style={styles.sectionHeaderBox}>
            <View style={[styles.sectionHeader, this.props.theme.sectionHeader].concat(this.props.outerStyle)}>
              <Text style={[styles.sectionHeaderText, this.props.isHebrew ? styles.hebrewSectionHeaderText : null, this.props.theme.sectionHeaderText].concat(extraTextStyle)}>{this.props.title}</Text>
            </View>
          </View>;
  }
}

class SheetMedia extends React.PureComponent {
  state = {
    appState: AppState.currentState
  }

  componentDidMount() {
    this.appStateSubscription = AppState.addEventListener('change', this._handleAppStateChange);
  }

  componentWillUnmount() {
    this.appStateSubscription.remove();
  }

  _handleAppStateChange = (nextAppState) => {
    this.setState({appState: nextAppState});
  }

  onShouldStartLoadWithRequest = (navigator) => {
    if (navigator.url.indexOf('embed') !== -1) { return true; }
    this.webview.stopLoading(); //Some reference to your WebView to make it stop loading that URL
    return false;
  }

  _getWebViewRef = ref => { this.webview = ref; }

  makeMediaEmbedLink(mediaURL) {
    let mediaLink;
    if (mediaURL.match(/\.(jpeg|jpg|gif|png)$/i) != null) {
      mediaLink = (
        <Image
          style={{
            flex: 1,
            width: null,
            height: null,
            resizeMode: 'contain'
          }}
          source={{uri: mediaURL}}
        />
      );
    } else if (mediaURL.toLowerCase().indexOf('youtube') > 0) {
      mediaLink = (
        <WebView
          ref={this._getWebViewRef}
          scrollEnabled={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={{  }}
          source={{uri: mediaURL}}
          onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest} //for iOS
          onNavigationStateChange ={this.onShouldStartLoadWithRequest} //for Android
        />
      );
    } else if (mediaURL.toLowerCase().indexOf('vimeo') > 0) {
      mediaLink =  (
        <WebView
          originWhitelist={['*']}
          source={{ html: `<iframe width="320" height="230" scrolling="no" frameborder="no" src="${mediaURL}"></iframe>` }}
        />
      );
    } else if (mediaURL.toLowerCase().indexOf('soundcloud') > 0) {
      mediaLink =  (
        <WebView
          originWhitelist={['*']}
          source={{ html: `<iframe width="100%" height="166" scrolling="no" frameborder="no" src="${mediaURL}"></iframe>` }}
         />
      );
    } else if (mediaURL.match(/\.(mp3)$/i) != null) {
      mediaLink =  (
        <WebView
          originWhitelist={['*']}
          style={styles.sheetMediaWebView}
          source={{ html: `<div style="text-align:center;"><audio preload="auto" name="media" style="width:700px" controls><source src="${mediaURL}" type="audio/mpeg" />Your browser does not support the audio element.</audio></div>` }}
         />
      );
    } else {
      mediaLink = (<Text>{'Error loading media'}</Text>);
    }

    return mediaLink
  }

  getStyle(mediaUrl) {
    if (mediaUrl.match(/\.(mp3)$/i) != null) {
      return styles.sheetMediaMp3;
    } else {
      return styles.sheetMediaVideo;
     } 
  }

  render() {
    return (
      <View style={this.getStyle(this.props.url)}>
        {this.makeMediaEmbedLink(this.props.url)}
      </View>
    );
  }
}

module.exports = TextColumn;
