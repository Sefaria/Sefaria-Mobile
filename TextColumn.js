'use strict';
import PropTypes from 'prop-types';
import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  Dimensions,
  AppState,
  Image,
  InteractionManager,
} from 'react-native';
import {ViewPropTypes} from 'deprecated-react-native-prop-types';
import {ErrorBoundaryFallbackComponent} from "./ErrorBoundaryFallbackComponent";
import { WebView } from 'react-native-webview';
import styles, { SCROLL_PADDING_BOTTOM_FRACTION, makeScrollViewLayoutHandler } from './Styles.js';
import TextRange from './TextRange';
import { VOCALIZATION } from './VocalizationEnum';
import TextHeightMeasurer from './TextHeightMeasurer';
import { GlobalStateContext } from './StateManager';
const ViewPort  = Dimensions.get('window');
const COMMENTARY_LINE_THRESHOLD = 100;
// Keeps the row at the top of the screen in place when rows above it change height
// (e.g. adding a translation, changing font size, or loading the previous section).
const MAINTAIN_VISIBLE_CONTENT_POSITION = { minIndexForVisible: 0 };
const ESTIMATED_SECTION_HEADER_HEIGHT = 60;
const ESTIMATED_ROW_HEIGHT = 120;
const MEASURE_BATCH_SIZE = 10;
const noop = () => {};
const LAYOUT_SETTINGS = ['textLanguage', 'fontSize', 'biLayout', 'interfaceLanguage', 'vocalization'];

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

// SectionList cell wrapper that reports each cell's layout and mount state back to the TextColumn.
const makeCellRenderer = (textColumn) => function TextColumnCell({ cellKey, item, onLayout, style, children }) {
  const onCellLayout = useCallback(event => {
    const { height, y } = event.nativeEvent.layout;
    textColumn._onSegmentLayout(item.ref, {y, height});
    textColumn._onCellHeight(cellKey, height);
    onLayout?.(event);  // undefined: the list doesn't measure cells when it has getItemLayout
  }, [onLayout, item.ref, cellKey]);
  useEffect(() => {
    textColumn._onCellMount(cellKey);
    return () => textColumn._onCellUnmount(cellKey);
  }, [cellKey]);
  return (
    // Not flattened, so maintainVisibleContentPosition anchors on whole cells rather than views inside them.
    <View style={style} onLayout={onCellLayout} collapsable={false}>
      { children }
    </View>
  );
};

class TextColumn extends React.PureComponent {
  static whyDidYouRender = true;
  static contextType = GlobalStateContext;
  static propTypes = {
    showToast:          PropTypes.func,
    textToc:            PropTypes.object,
    theme:              PropTypes.object.isRequired,
    themeStr:           PropTypes.string,
    fontSize:           PropTypes.number.isRequired,
    data:               PropTypes.oneOfType([PropTypes.array, PropTypes.object]),  // can be object in the case of sheets
    relatedBySectionRef:PropTypes.object,
    sectionArray:       PropTypes.array,
    sectionHeArray:     PropTypes.array,
    offsetRef:          PropTypes.string,
    segmentRef:         PropTypes.string,
    segmentIndexRef:    PropTypes.number,
    textTitle:          PropTypes.string,
    heTitle:            PropTypes.string,
    heRef:              PropTypes.string,
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

  constructor(props, context) {
    super(props, context);
    this.currentY = 0; // for measuring scroll speed
    this.rowRefs = {}; //hash table of currently loaded row refs.
    this.rowYHash = {};
    this.dataSourceHash = {};
    this.onTopReaching = false; // true while loading the previous section via pull-to-refresh
    // The list gets its layout from getItemLayout, built from the last measured height of each cell and
    // estimates for cells it hasn't rendered under the current settings.
    // When a setting changes row heights, cells on or above the screen keep rendering with the old settings
    // ("pinned") until their new height has been measured offscreen, so the layout never changes underneath
    // the reader without the list knowing.
    // A cell's height only changes when the cell has been measured: never while it's unmounted, since a jump in
    // the size of the list above the visible rows is what throws the reader's position off.
    this.cellHeights = new Map();  // cellKey -> last measured height
    this.cellEstimates = new Map();  // cellKey -> height assumed until it's measured, fixed when first seen
    this.pinnedCells = new Map();  // cellKey -> settingsKey it renders with
    this.mountedCells = new Set();
    this.measureQueue = [];
    this.settingsByKey = new Map();
    this.contextByKey = new Map();
    this.settingsKey = null;
    this.updateSettingsKey(context);
    this.listHeaderHeight = 0;
    this.itemLayoutList = [];
    this.jumpInfoMap = new Map();
    const dataSource = this.generateDataSource(props);
    this.rebuildLayout(dataSource);
    const jumpTargetIndex = this.getJumpTargetIndex(this._standardizeOffsetRef(props.offsetRef));
    this.jumpTargetKey = jumpTargetIndex === null ? null : this.itemKeys[jumpTargetIndex];
    this.state = {
      dataSource,
      componentsToMeasure: [],
      initialScrollIndex: jumpTargetIndex ?? undefined,
      // Height of the list's own viewport, measured via onLayout. Used to size the
      // bottom padding relative to this panel rather than the full window.
      scrollViewHeight: ViewPort.height,
    };
    this._onScrollViewLayout = makeScrollViewLayoutHandler(this);
    this._renderCell = makeCellRenderer(this);
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
    this.measureTask?.cancel();
  }
  generateDataSource = (props) => {
    // Returns data representing sections and rows to be passed into ListView.DataSource.cloneWithSectionsAndRows
    // Takes `props` as an argument so it can generate data with `nextProps`.
    const canHaveAliyot = Sefaria.canHaveAliyot(props.textTitle);
    const showAliyot = canHaveAliyot && props.showAliyot;
    const parashaDict = !!props.textToc && canHaveAliyot ? this._getParashaDict(props.textToc.alts.Parasha.nodes) : {};
    let data = props.data;
    let relatedBySectionRef = props.relatedBySectionRef;
    let dataSource = [];

    let offsetRef = this._standardizeOffsetRef(props.offsetRef);
    if (props.isSheet) {
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
    else {
      for (let sectionIndex = 0; sectionIndex < data.length; sectionIndex++) {
        let rows = [];
        const sectionRef = props.sectionArray[sectionIndex];
        for (let segmentIndex = 0; segmentIndex < data[sectionIndex].length; segmentIndex++) {
          if (segmentIndex !== 0 && !data[sectionIndex][segmentIndex].text && !data[sectionIndex][segmentIndex].he) { continue; } // Skip empty segments
          let rowID = props.sectionArray[sectionIndex] + ":" + data[sectionIndex][segmentIndex].segmentNumber;
          const relatedObj = relatedBySectionRef?.[sectionRef]?.[segmentIndex];
          const aliya = parashaDict[rowID];
          if (!!aliya && (aliya.type !== ROW_TYPES.ALIYA || showAliyot)) {
            //insert aliya
            rows.push(aliya);
          }
          const rowContent = data[sectionIndex][segmentIndex];
          const highlight = offsetRef === rowID || (props.textListVisible && props.segmentRef === rowID);
          const highlightedWordID = props.highlightedWordSegmentRef === rowID && props.highlightedWordID;
          const changeString = `${rowID}|${relatedObj?.links?.length}|${highlight}|${this.props.fontSize}|${highlightedWordID}`;
          let rowData = this.dataSourceHash[changeString];
          if (!rowData) {
            rowData = {
              content: rowContent, // Store data in `content` so that we can manipulate other fields without manipulating the original data
              related: relatedObj,
              sectionIndex,
              rowIndex: segmentIndex,
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
        dataSource.push({ref: sectionRef, heRef: props.sectionHeArray[sectionIndex], data: rows, sectionIndex: sectionIndex, changeString: `${props.sectionArray[sectionIndex]}|${this.props.fontSize}|${this.props.textLanguage}`});
      }
    }
    for (let section of dataSource) {
      section.key = section.ref;  // stable cell keys across loading previous sections, for cellHeights
    }
    return dataSource;

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
    this.jumpTargetKey = null;
    if (!this.props.textListVisible) {
      const itemIndex = this.jumpInfoMap.get(segmentRef);
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
    this.updateSettingsKey();
    if (this.props.data.length !== prevProps.data.length ||
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
  updateSettingsKey(context = this.context) {
    const settings = {
      textLanguage: this.props.textLanguage,
      fontSize: this.props.fontSize,
      biLayout: this.props.biLayout,
      interfaceLanguage: this.props.interfaceLanguage,
      vocalization: context?.vocalization,
    };
    const settingsKey = LAYOUT_SETTINGS.map(name => settings[name]).join('|');
    if (settingsKey === this.settingsKey) { return; }
    const previousKey = this.settingsKey;
    this.settingsKey = settingsKey;
    this.settingsByKey.set(settingsKey, settings);
    if (previousKey !== null) { this.onSettingsChange(previousKey); }
  }

  onSettingsChange(previousKey) {
    // Pin mounted cells on or above the screen to the settings they were laid out with, then measure them under
    // the new settings: visible cells first, then upwards. Cells further down can change height freely.
    const viewportTop = this.currentY;
    const viewportBottom = this.currentY + this.state.scrollViewHeight;
    const cellIndexes = new Map(this.itemKeys.map((cellKey, index) => [cellKey, index]));
    const visible = [];
    const above = [];
    for (let cellKey of this.mountedCells) {
      const index = cellIndexes.get(cellKey);
      if (index === undefined) { continue; }
      const { offset, length } = this.itemLayoutList[index];
      if (offset >= viewportBottom) { continue; }
      if (!this.pinnedCells.has(cellKey)) { this.pinnedCells.set(cellKey, previousKey); }
      (offset + length > viewportTop ? visible : above).push(index);
    }
    visible.sort((a, b) => a - b);
    above.sort((a, b) => b - a);
    this.measureQueue = [...visible, ...above].map(index => this.itemKeys[index]);
    this.measureBatchSize = Math.max(visible.length, MEASURE_BATCH_SIZE);
    this.rebuildLayout(this.state.dataSource);
    this.scheduleMeasureBatch();
  }

  scheduleMeasureBatch() {
    // Let running animations (e.g. the display options menu closing) finish first.
    this.measureTask?.cancel();
    this.measureTask = InteractionManager.runAfterInteractions(() => this.measureNextBatch());
  }

  measureNextBatch() {
    const batch = this.measureQueue.splice(0, this.measureBatchSize).filter(cellKey => this.pinnedCells.has(cellKey));
    this.measureBatchSize = MEASURE_BATCH_SIZE;
    const cells = this.getCellsByKey();
    const componentsToMeasure = [];
    for (let cellKey of batch) {
      const cell = cells.get(cellKey);
      if (!cell) { this.pinnedCells.delete(cellKey); continue; }
      componentsToMeasure.push({id: `${this.settingsKey}|${cellKey}`, cellKey, generator: this.renderCellContent, param: {...cell, measuring: true}});
    }
    if (componentsToMeasure.length === 0) {
      if (this.measureQueue.length > 0) { this.measureNextBatch(); }
      return;
    }
    this.measuringSettingsKey = this.settingsKey;
    this.setState(({layoutVersion = 0}) => ({componentsToMeasure, layoutVersion: layoutVersion + 1}));
  }

  getCellsByKey() {
    const cells = new Map();
    for (let section of this.state.dataSource) {
      cells.set(`${section.key}:header`, {section});
      for (let item of section.data) {
        cells.set(`${section.key}:${item.ref}`, {item});
      }
    }
    return cells;
  }

  allHeightsMeasured = (componentsToMeasure, textToHeightMap) => {
    if (!this._isMounted || componentsToMeasure !== this.state.componentsToMeasure || componentsToMeasure.length === 0) { return; }
    if (this.measuringSettingsKey !== this.settingsKey) { return; }  // superseded by another settings change
    for (let { id, cellKey } of componentsToMeasure) {
      if (!this.pinnedCells.has(cellKey)) { continue; }  // unmounted while being measured
      this.cellHeights.set(cellKey, textToHeightMap.get(id));
      this.pinnedCells.delete(cellKey);
    }
    this.rebuildLayout(this.state.dataSource);
    this.setState(({layoutVersion = 0}) => ({componentsToMeasure: [], layoutVersion: layoutVersion + 1}), () => {
      if (this.measureQueue.length > 0) { this.scheduleMeasureBatch(); }
    });
  };

  getCellSettingsKey(cellKey) {
    return this.pinnedCells.get(cellKey) ?? this.settingsKey;
  }

  getContextForSettings(settingsKey) {
    // Cells read layout settings from context; give each cell the settings it's laid out with. Reuse the previous
    // value when nothing in it changed, so pinned cells don't re-render when only the overridden settings did.
    const value = {...this.context, ...this.settingsByKey.get(settingsKey)};
    const previous = this.contextByKey.get(settingsKey);
    if (previous && Object.keys(value).every(key => previous[key] === value[key]) &&
        Object.keys(previous).length === Object.keys(value).length) {
      return previous;
    }
    this.contextByKey.set(settingsKey, value);
    return value;
  }

  performUpdate(prevProps) {
    const dataSource = this.generateDataSource(this.props);
    if (this.props.data.length > prevProps.data.length) {
      this.onTopReaching = false;
    }
    this.rebuildLayout(dataSource);
    this.setState({dataSource});
  }

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

    // Compare against the last requested title too: several updates can fire before the parent
    // re-renders, so props.textReference may still hold a value we've already asked to change.
    if (enTitle !== this.props.textReference || enTitle !== this.requestedTitle) {
      this.requestedTitle = enTitle;
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
      this.updateHighlightedSegment(this.viewableSectionData);
    }
  };

  onTopReached = () => {
    if (this.props.loadingTextHead === true || !this.props.prev || !!this.props.sheet) {
      //already loading tail, or nothing above
      return;
    }
    this.onTopReaching = true;
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
    this.updateTitle(secData);
    this.viewableSectionData = secData;
  };

  /******************
  RENDER
  *******************/

  renderRow = ({ item, section }) => this.renderPinnedCell(`${section.key}:${item.ref}`, {item});

  renderSectionHeader = ({ section }) => this.renderPinnedCell(`${section.key}:header`, {section});

  renderPinnedCell(cellKey, cell) {
    const settingsKey = this.getCellSettingsKey(cellKey);
    return (
      <GlobalStateContext.Provider value={this.getContextForSettings(settingsKey)}>
        {this.renderCellContent({...cell, settings: this.settingsByKey.get(settingsKey)})}
      </GlobalStateContext.Provider>
    );
  }

  renderCellContent = ({ item, section, settings = this.settingsByKey.get(this.settingsKey), measuring }) => {
    if (section) { return this.renderSectionHeaderContent(section, settings); }
    if (
      item.type === ROW_TYPES.SEGMENT ||
      item.type === ROW_TYPES.SHEET_COMMENT ||
      item.type === ROW_TYPES.SHEET_OUTSIDE_TEXT ||
      item.type === ROW_TYPES.SHEET_OUTSIDE_BI_TEXT
    ) {
      return this.renderSegmentedRow({ item, measuring });
    } else if (item.type === ROW_TYPES.SHEET_MEDIA) {
      return this.renderSheetMedia({ item });
    } else {
      return this.renderAliyaMarker({ item, settings });
    }
  };

  setSegmentRowRef = (key, ref) => { this.rowRefs[key] = ref; };

  renderSegmentedRow = ({ item, measuring }) => {
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
          setRowRef={measuring ? noop : this.setSegmentRowRef}
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

  renderSectionHeaderContent(section, settings) {
    const props = this.props;
    if (props.isSheet) { return null; }

    const isHeb = Sefaria.util.get_menu_language(settings.interfaceLanguage, settings.textLanguage) == "hebrew";
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
  }

  renderAliyaMarker = ({ item, settings }) => {
    if (this.props.isSheet) { return null; }
    const isHeb = Sefaria.util.get_menu_language(settings.interfaceLanguage, settings.textLanguage) == "hebrew";
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
        <View onLayout={this._onListHeaderLayout}>
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
    const layout = this.itemLayoutList[index];
    if (layout) { return layout; }
    const last = this.itemLayoutList[this.itemLayoutList.length - 1];
    return {index, length: 0, offset: last ? last.offset + last.length : this.listHeaderHeight};
  };

  rebuildLayout(dataSource) {
    // Mirrors how SectionList flattens sections into cells: header, items, footer.
    let measuredRowsHeight = 0;
    let measuredRows = 0;
    for (let section of dataSource) {
      for (let item of section.data) {
        const height = this.cellHeights.get(`${section.key}:${item.ref}`);
        if (height !== undefined) { measuredRowsHeight += height; measuredRows++; }
      }
    }
    const estimatedRowHeight = measuredRows > 0 ? measuredRowsHeight / measuredRows : ESTIMATED_ROW_HEIGHT;
    const itemLayoutList = [];
    const itemKeys = [];
    const jumpInfoMap = new Map();
    let offset = this.listHeaderHeight;
    const addCell = (cellKey, estimatedHeight) => {
      const index = itemLayoutList.length;
      let length = this.cellHeights.get(cellKey) ?? this.cellEstimates.get(cellKey);
      if (length === undefined) {
        length = estimatedHeight;
        this.cellEstimates.set(cellKey, length);
      }
      itemLayoutList.push({index, length, offset});
      itemKeys.push(cellKey);
      offset += length;
      return index;
    };
    for (let section of dataSource) {
      jumpInfoMap.set(section.ref, addCell(`${section.key}:header`, this.props.isSheet ? 0 : ESTIMATED_SECTION_HEADER_HEIGHT));
      for (let item of section.data) {
        jumpInfoMap.set(item.ref, addCell(`${section.key}:${item.ref}`, estimatedRowHeight));
      }
      addCell(`${section.key}:footer`, 0);
    }
    this.itemLayoutList = itemLayoutList;
    this.itemKeys = itemKeys;
    this.jumpInfoMap = jumpInfoMap;
  }

  getJumpTargetIndex = (ref) => {
    const targetIndex = ref ? this.jumpInfoMap.get(ref) : undefined;
    if (targetIndex === undefined) { return null; }
    let index = targetIndex;
    // keep the section title and parasha/aliya markers directly above the target in view
    while (index > 0 && this.isHeaderCell(index - 1)) { index--; }
    return index;
  };

  isHeaderCell = (index) => {
    const key = this.itemKeys[index];
    return key.endsWith(':header') || key.endsWith('|parasha') || key.endsWith('|aliya');
  };

  _onCellHeight = (cellKey, height) => {
    if (this.cellHeights.get(cellKey) === height) { return; }
    this.cellHeights.set(cellKey, height);
    this._scheduleLayoutUpdate();
  };

  _onCellMount = (cellKey) => {
    this.mountedCells.add(cellKey);
  };

  _onCellUnmount = (cellKey) => {
    this.mountedCells.delete(cellKey);
    this.pinnedCells.delete(cellKey);  // it'll mount with the current settings
  };

  _onListHeaderLayout = (event) => {
    const { height } = event.nativeEvent.layout;
    if (height !== this.listHeaderHeight) {
      this.listHeaderHeight = height;
      this._scheduleLayoutUpdate();
    }
  };

  _scheduleLayoutUpdate() {
    // Cells report their heights one at a time; rebuild once per frame.
    if (this.layoutUpdateScheduled) { return; }
    this.layoutUpdateScheduled = true;
    requestAnimationFrame(() => {
      this.layoutUpdateScheduled = false;
      if (!this._isMounted) { return; }
      this.rebuildLayout(this.state.dataSource);
      this.setState(({layoutVersion = 0}) => ({layoutVersion: layoutVersion + 1}), this._scrollToJumpTarget);
    });
  }

  _scrollToJumpTarget = () => {
    // The initial jump lands on an estimated offset; correct it as the cells around the target get measured.
    if (!this.jumpTargetKey) { return; }
    const index = this.itemKeys.indexOf(this.jumpTargetKey);
    if (index === -1) { return; }
    const { offset } = this.itemLayoutList[index];
    if (Math.abs(offset - this.currentY) >= 1) {
      this.sectionListRef?.getScrollResponder()?.scrollTo({x: 0, y: offset, animated: false});
    }
  };

  _onScrollBeginDrag = () => {
    this.jumpTargetKey = null;
  };

  onScrollToIndexFailed = ({ index, highestMeasuredFrameIndex, averageItemLength }) => {
    console.log("scroll to", index, "FAILED! highest is", highestMeasuredFrameIndex);
  }

  _getSectionListRef = (ref) => {
    this.sectionListRef = ref;
  }

  _keyExtractor = (item, index) => {
    return item.ref;
  }

  _onSegmentLayout = (ref, y) => {
    this.rowYHash[ref] = y;
  }
  _textErrorBoundaryAlert = () => {
    this.props.textUnavailableAlert(this.props.textTitle);
  };

  render() {
    return (
        <View style={styles.textColumn}>
          <ErrorBoundary FallbackComponent={ErrorBoundaryFallbackComponent} onError={this._textErrorBoundaryAlert}>
            <SectionList
              contentContainerStyle={{ paddingBottom: this.state.scrollViewHeight * SCROLL_PADDING_BOTTOM_FRACTION }}
              onLayout={this._onScrollViewLayout}
              style={styles.scrollViewPaddingInOrderToScroll}
              ref={this._getSectionListRef}
              sections={this.state.dataSource}
              getItemLayout={this.getItemLayout}
              initialScrollIndex={this.state.initialScrollIndex}
              maintainVisibleContentPosition={MAINTAIN_VISIBLE_CONTENT_POSITION}
              onScrollBeginDrag={this._onScrollBeginDrag}
              renderItem={this.renderRow}
              renderSectionHeader={this.renderSectionHeader}
              ListHeaderComponent={this.renderListHeader}
              ListFooterComponent={this.renderListFooter}
              onEndReached={this.onEndReached}
              onEndReachedThreshold={2.0}
              onScroll={this.handleScroll}
              extraData={this.state.layoutVersion}
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
            <TextHeightMeasurer
              style={styles.scrollViewPaddingInOrderToScroll}
              componentsToMeasure={this.state.componentsToMeasure}
              allHeightsMeasuredCallback={this.allHeightsMeasured}/>
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
