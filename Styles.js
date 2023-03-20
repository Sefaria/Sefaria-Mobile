'use strict'
import {
  StyleSheet,
  Platform,
} from 'react-native';

import iPad from './isIPad';
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';
const readerSideMargin = 42;
const readerSideMarginIpad = 60;

export default StyleSheet.create({
  // Sefaria Design System - Content H2 English
  ContentH2En: {
    fontFamily: 'Amiri',
    fontSize: 30,
    lineHeight: 36,
    color: '#000000',
  },
  // Sefaria Design System - System H2 Hebrew
  SystemH2He: {
    fontFamily: 'Heebo',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 30,
    lineHeight: 44,
    textAlign: 'right',
    color: '#000000'
  },
  // Sefaria Design System - Content Body English
  ContentBodyEn: {
    fontFamily: 'Amiri',
    fontSize: 18,
    lineHeight: 22,
    textAlign: "left",
  },
  // Sefaria Design System - Content Body Hebrew
  ContentBodyHe: {
    fontFamily: 'Taamey Frank Taamim Fix',
    fontSize: 22,
    lineHeight: 29,
    textAlign: 'right',
  },
  // Sefaria Design System - System Body English
  SystemBodyEn: {
    fontFamily: 'OpenSans',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: 16,
    lineHeight: 19,
  },
  // Sefaria Design System - System Body Hebrew
  SystemBodyHe: {
    fontFamily: 'Heebo',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'right',
  },
  fontSize14: {
    fontSize: 14,
  },
  fontBold: {
    fontWeight: 'bold',
  },
  fontSize16: {
    fontSize: 16,
  },
  fontSize18: {
    fontSize: 18,
  },
  rootContainer: {
    flex: 1,
    direction: "ltr",  // while we don't fully support React Native's RTL system, we need to explicitly set direction to LTR and flip things using interfaceLanguage
  },
  navRePage:{
    marginHorizontal: 15,
  },
  navReUpToEdge: {
     marginHorizontal: 0,
     paddingHorizontal: 15
 },
  navReEnglish:{
    flexDirection: "row",
  },
  navReHebrew:{
    flexDirection: "row-reverse",
  },
  navReHeaderText: {
    fontSize: 22, 
    fontWeight: "bold",
    lineHeight: 25,
  },
  navRePageHeader:{
    marginVertical: 24,
    direction: "inherit",
    display: "flex",
    alignContent: "flex-start",
  },
  navReAccountMenuButton:{
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingVertical: 20,
  },
  navReAccountMenuButtonText:{
    fontSize:18,
    fontWeight:"bold",
  },
  navReAccountMenuButtonIcon:{
    marginEnd: 15,
    marginStart: 10,
  },
  navReStatefulHeader:{
    marginEnd: 15,
  },
  navReStatefulHeaderIcon:{
    marginRight: 6,
  }, 
  navReStatefulHeaderIconHe:{
    marginLeft: 6,
  },
  navReAccountMenuButtonSep:{
    fontSize: 16, 
    paddingHorizontal: 10,
    textAlignVertical: "center",
  },
  navReSefaria501:{
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
    marginVertical:20,
  },
  navReHistoryItem:{
    paddingBottom:20,
    borderBottomWidth: 1, 
    marginHorizontal: 15,
    marginBottom: 22,
  },
  learningSchedulesBorder: {borderBottomWidth: 1, paddingBottom: 5, marginBottom: 10},
  boxShadow: {
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  textInput: {
    fontSize: 20,
  },
  systemButton: {
    borderRadius: 5,
    padding: 14,
    marginVertical: 5,
  },
  systemButtonTwoBox: {
    marginHorizontal: 5,
  },
  systemButtonInner: {
    justifyContent: 'center',
  },
  systemButtonBlue: {
    backgroundColor: '#18345D',
  },
  systemButtonText: {
    textAlign: "center",
    fontFamily: 'OpenSans',
  },
  systemButtonTextBlue: {
    color: 'white'
  },
  authTextInput: {
    marginVertical: 7,
  },
  pageTitle: {
    color: 'black', // should be removed but not removing right now b/c haven't checked the consequences
    fontSize: 30,
    fontFamily: 'Amiri',
  },
  readerSideMargin: {
    marginHorizontal: iPad ? readerSideMarginIpad : readerSideMargin,
  },
  readerSidePadding: {
    paddingHorizontal: iPad ? readerSideMarginIpad : readerSideMargin,
  },
  sheetTopicButton: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: "#eee",
    borderRadius: 5,
    marginVertical: 3,
    marginHorizontal: 4,
  },
  safeArea: {
    flex: 1,
  },
  modal: {
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center',
    alignSelf: 'stretch',
    alignItems: "flex-end"
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10
  },
  instructions: {
    textAlign: 'center',
    color:  '#333333',
    marginBottom: 5
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch'
  },
  header: {
    height: 50,
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    borderBottomWidth: 1
  },
  greyBoxFrame: {padding: 14},
  readerDisplayOptionsMenuMask: {
    flex: 1,
    left: 0,
    right: 0,
    top:58,
    position: 'absolute',
    backgroundColor: 'transparent',  // required to give the view height and width of children
    overflow: 'hidden',  // required on iOS to clip subviews outside of parent for masking
  },
  readerDisplayOptionsMenu: {
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flex: 1,
  },
  readerDisplayOptionsMenuDivider: {
    marginTop: 10,
    marginBottom: 10,
    alignSelf: "stretch",
    height: 1
  },
  readerDisplayOptionsMenuToggleSet: {
    justifyContent: "center",
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 10,
    flex: 1,
    marginHorizontal: iPad ? 20 : 15,
  },
  readerDisplayOptionsMenuToggleSetOuter: {
    flexDirection: 'column',
    width: iPad ? 350 : 190,
  },
  readerDisplayOptionMenuToggleSetNotColor: {
    borderRadius: 5
  },
  readerDisplayOptionsMenuRow: {
    flex:1,
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 16,
  },
  readerDisplayOptionsMenuItem: {
    flex: 1,
    flexDirection: "row",
    height: 50,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  readerDisplayOptionsMenuItemLeft: {
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  readerDisplayOptionsMenuItemCenter: {
    borderLeftWidth: 0,
  },
  readerDisplayOptionsMenuItemRight: {
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    borderLeftWidth: 0,
  },
  readerDisplayOptionsMenuColor: {
    flex: 1,
    flexDirection: "row",
    height: 50,
    borderWidth: 1,
    borderRadius: 5
  },
  readerDisplayOptionsMenuColorLeft: {
    marginRight: 5
  },
  readerDisplayOptionsMenuColorCenter: {
    marginLeft: 5,
    marginRight: 5
  },
  readerDisplayOptionsMenuColorRight: {
    marginLeft: 5
  },
  readerDisplayOptionsMenuIcon: {
    height: 18,
  },
  buttonToggle: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonToggleActive: {
    backgroundColor: '#18345D',
    borderRadius: 5,
  },
  buttonToggleActiveText: {
    color: 'white',
  },
  headerButton: {
    width: 40,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent"
  },
  leftHeaderButton: {
    marginLeft: iPad ? 10 : 0
  },
  directedButton: {
    marginLeft: 12,
    marginRight: 12
  },
  directedButtonWithTextEn: {
    marginLeft: 0,
    marginRight: 12,
  },
  directedButtonWithTextHe: {
    marginLeft: 12,
    marginRight: 0,
  },
  headerIconWithTextEn: {
    marginLeft: 0,
    marginRight: 8,
  },
  headerIconWithTextHe: {
    marginLeft: 8,
    marginRight: 0,
  },
  menuButton: {
    width: 16,
    height: 16,
  },
  menuButtonMargined: {
    width: 20,
    height: 20,
    marginHorizontal: 20,
  },
  menuButtonMarginedHe: {
    width: 17,
    height: 17,
    marginTop: 2,
    marginHorizontal: 7,
  },
  rightHeaderButton: {
    marginRight: iPad ? 10 : 0
  },
  displaySettingsButton: {
    width: 25,
    height: 25,
    marginRight: 4
  },
  closeButton: {
    width: 16,
    height: 16,
  },
  circleCloseButton: {
    width: 20,
    height: 20,
  },
  headerButtonSearch: {
    width: 24,
    marginHorizontal: 10,
  },
  searchButton: {
    width: 17,
    height: 17,
  },
  searchOptionButton: {
    height: 16,
  },
  searchOptionButtonTextHe: {
    marginLeft: 12,
    marginRight: 0,
    marginTop: 6,
    flexDirection: 'row-reverse',

  },
  searchOptionButtonTextEn: {
    marginLeft: 0,
    marginRight: 8,
    marginTop: 6,
    flexDirection: 'row',
  },

  tripleDotsContainer: {
    width: 22,
    marginLeft: 5,
    marginRight: 5,
    justifyContent: "center"
  },
  tripleDots: {
    width: 22,
    height: 22,
    opacity: 0.5
  },
  headerTextTitle: {
    flex: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: "center",
    flexDirection: "column"
  },
  headerTextTitleInner: {
    flexDirection: "row",
    alignItems: 'center',
    justifyContent: "center",
  },
  headerTextTitleText: {
    fontSize: iPad ? 18 : 16,
    textAlign: "center",
    marginHorizontal: 5,
  },
  headerCategoryAttributionTextEn: {
    fontFamily: "Amiri",
    fontStyle: "italic",
    fontSize: 15,
    lineHeight: 18,
    color: "#999",
    paddingTop: 5,
  },
  headerCategoryAttributionTextHe: {
    fontFamily: "Taamey Frank Taamim Fix",
    color: "#999",
    fontSize: 15,
  },
  downCaret: {
    width: 10,
    height: 10,
  },
  moreArrowEn: {
    width: 12,
    height: 12,
    paddingLeft: 20,
    marginBottom: 4
  },
  moreArrowHe: {
    width: 12,
    height: 12,
    paddingRight: 20
  },
  categoryBlockLinkIconSansEn: {
    width: 15,
    height: 15,
    paddingLeft: 25,
    marginBottom: 0,
  },
  categoryBlockLinkIconSansHe: {
    width: 15,
    height: 15,
    paddingRight: 25,
  },
  collapseArrowEn: {
    width: 12,
    height: 12,
    paddingLeft: 20,
  },
  collapseArrowHe: {
    width: 12,
    height: 12,
    paddingRight: 20,
    marginTop: 3
  },
  forwardButtonEn: {
    width: 12,
    height: 12,
    paddingRight: 20,
    marginTop: 4
  },
  forwardButtonHe: {
    width: 12,
    height: 12,
    paddingRight: 20,
    marginTop: 4
  },
  searchResultSummary: {
    paddingVertical: 10,
    paddingHorizontal: iPad ? 60 : 30,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  searchResultSummaryHe: {
    flexDirection: "row-reverse",
  },
  searchInput: {
    alignSelf: 'stretch',
    flex: 1,
    fontSize: 16,
    fontStyle: "normal",
    fontFamily: "Amiri",
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: "transparent"
  },
  searchInputPlaceholder: {
    fontStyle: "italic",
  },
  searchVersionTitle: {
    fontSize: 14,
    marginTop: 4
  },
  searchPage: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  searchTextResult: {
    flex: 1,
    marginHorizontal: iPad ? 60 : 30,
    marginTop: 20,
    paddingBottom: 20,
    flexDirection: 'column',
    borderBottomWidth: 1,
  },
  searchSheetResult: {
    margin:0,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    flexDirection: "column",
    flex:1
  },
  sefariaProgressBar: {
    height: 50,
    alignItems: "center",
    flexDirection: "row"
  },
  sefariaProgressBarOverlay: {
    flex: 1,
    alignItems: "center",
    position: "absolute",
    right: 0,
    left: 0,
    paddingHorizontal: iPad ? 20 : 10,
    justifyContent: "space-between",
  },
  searchFilterCat: {
    height: 50,
    flexGrow: 1,
    flexDirection: "row",
    borderTopWidth: 4,
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchFilterCheckBox: {
    width: 18,
    height: 18,
  },
  searchFilterClearAll: {
    width: 18,
    height: 18,
    marginHorizontal: 10
  },
  textListSummary: {
    flex: 1,
    flexDirection: "column",
    alignSelf: 'stretch',
    alignItems: 'stretch',

  },
  textListHeaderSummary: {
    alignItems: "center",
    justifyContent: "flex-start",
    borderTopWidth: 1,
  },
  textListSummaryScrollView: {
    paddingBottom: 15,
  },
  versionsBoxScrollView: {
    paddingTop: 10,
    paddingBottom: 35,
  },
  aboutBoxScrollView: {
    paddingTop: 30,
    paddingBottom: 45,
  },
  textListSummarySection: {
    marginBottom: 22
  },
  textListRecentFilterNav: {
    flex: 1,
    flexWrap: 'wrap',
    padding: 10,
  },
  textListContentOuter: {
    flex: 1,
    flexDirection: "column",
  },
  textListContentListView: {
    flex: 1,
    maxWidth: 800,
    flexDirection: "column",
    alignItems: "stretch",
  },
  textListHeader: {
    height: 50,
    alignSelf: "stretch",
    borderBottomWidth: 1,
    paddingHorizontal: iPad ? readerSideMarginIpad : readerSideMargin,
    flexDirection: "row",
  },
  textListHeaderScrollView: {
    alignSelf: "center",
    alignItems: "center",
  },
  connectionsPanelHeaderItem: {
    paddingHorizontal: 10,
    height: 45,  // unfortunately hard-coding height of connectionPanelHeader so that this is full height
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionsPanelHeaderItemText: {
    fontSize: iPad ? 18 : 16,
  },
  textListCitation: {
    marginBottom: 4,
    fontSize: iPad ? 18 : 16,
  },
  textListItem: {
      flex: 1,
      marginHorizontal: iPad ? readerSideMarginIpad : readerSideMargin,
      marginTop: 20,
      paddingBottom: 20,
      flexDirection: 'column',
      borderBottomWidth: 1,
  },
  linkContentText: {
    flex: 1,
    alignItems: "stretch",
  },
  noLinks: {
    flex:1,
    alignItems: "center",
    margin: 10
  },
  emptyLinksMessage: {
    fontStyle: "italic",
    fontFamily: "Amiri",
    textAlign: "center",
    marginTop: 16,
  },
  menu: {
    alignSelf: 'stretch',
    flex: 1
  },
  pageMargins: {
    marginHorizontal: 15,
  },
  menuContent: {
    paddingHorizontal: iPad ? 20 : 10,
    paddingBottom: 40,
  },
  menuAllSheetTagContent: {
    paddingHorizontal: iPad ? 20 : 10,
    paddingTop: 0,
    paddingBottom: 40,
  },
  menuSheetContentHeader: {
    paddingTop: 20,
    paddingBottom: 0,
  },
  menuScrollViewContent: {
    paddingBottom: 100,
  },
  cancelSearchButton: {
    width: 16,
    height: 16,
    marginHorizontal: 12,
  },
  languageToggle: {
    width: 20,
    height: 20,
    padding: 11,
    borderWidth: 1,
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  languageToggleTextEn: {
    color: "black",
    backgroundColor: "transparent",
    fontSize: 15,
    marginTop: isAndroid ? -4 : 2,
    marginLeft: 1,
  },
  languageToggleTextHe: {
    color: "black",
    backgroundColor: "transparent",
    fontSize: 19,
    marginTop: isAndroid ? 2 :4,
    marginRight: 2,
  },
  readerNavSection: {
    marginVertical: 15
  },
  readerNavCategory: {
    flexGrow: 1,
    flexDirection: "column",
    borderTopWidth: 4,
    margin: 2,
    paddingVertical: 10,
    paddingHorizontal: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  readerNavCategoryInner: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
  },
  readerNavCategorySubtext: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
  },
  readerNavSectionTitle: {
    fontSize: 13,
    letterSpacing: 1
  },
  readerNavSectionTitleOuter: {
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  readerNavSectionMoreEn: {
    textAlign: "right",
    paddingRight: 10,
    fontSize: 10,
    width: 100
  },
  readerNavSectionMoreHe: {
    textAlign: "left",
    paddingLeft: 10,
    fontSize: 10,
    width: 100
  },
  readerNavSectionMoreInvisible: {
    opacity: 0
  },
  navBottomLinks: {
    marginTop: 20,
    paddingBottom: 30,
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  dot: {
    marginHorizontal: 7,
  },
  logInMotivator: {
    marginVertical: 15,
  },
  category: {
    marginBottom: 10
  },
  categoryTitle: {
    flex: 1,
    textAlign: "center",
    letterSpacing: 1,
  },
  categorySectionTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    marginVertical: 15
  },
  textBlockLink: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    margin: 2,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  textListCat: {
    flex: 1,
    flexDirection: "row",
    borderTopWidth: 4,
    margin: 2,
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  navToggle: {
    fontSize: iPad ? 14 : 10,
    paddingTop: 2
  },
  navToggles: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 22
  },
  navTogglesDivider: {
    fontSize: iPad ? 18 : 10,
    marginHorizontal: 7
  },
  navigationCategoryCategoryAttribution: {
    marginBottom: 25,
    marginTop: 10,
  },
  navigationCategoryCategoryAttributionTextEn: {
    fontSize: 22,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    fontFamily: "Amiri",
  },
  navigationCategoryCategoryAttributionTextHe: {
    fontSize: 20,
    color: "#999",
    textAlign: "center",
    fontFamily: "Taamey Frank Taamim Fix",
  },
  textTocHeaderTitle: {
    flex: 1,
    paddingLeft: 10,
    textAlign: 'center',
    letterSpacing: 1
  },
  noPadding: {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  mainTextPanel: {
    flexWrap: "nowrap",
    justifyContent: 'center',
    alignSelf: 'stretch',
    alignItems: "flex-start",
    flexDirection:"row"
  },
  commentaryTextPanel: {
    alignSelf: 'stretch'
  },
  verseNumber: {
    paddingTop: 5,
    textAlign: 'center',
    fontFamily: "Open Sans",
    fontWeight: '400',
    //fontSize: iPad ? 11 : 9,
    width: iPad ? readerSideMarginIpad : readerSideMargin,
  },
  // hebrewVerseNumber: {
  //   fontSize: 11,
  // },
  continuousHebrewVerseNumber: {
    fontSize: 11,
    paddingTop: 0
  },
  continuousVerseNumber: {
    textAlign: 'center',
    fontFamily: "Open Sans",
    fontWeight: '400',
    fontSize: 9,
    paddingTop: 5
  },
  continuousVerseNumberHolder: {
    height: 19,
    width: 19,
    left: -25,
  },
 continuousVerseNumberHolderTalmud: {
    height: 1,
    width: 1,
   opacity: 0
  },
  continuousSectionRow: {
    paddingTop: 10,
    textAlign: "justify"
  },
   continuousRowHolder: {
    marginLeft: 30,
    marginRight: 30,
  },
  verseBullet: {
    paddingTop: 7,
    textAlign: 'center',
    fontSize: iPad ? 9 : 7,
    width: iPad ? readerSideMarginIpad : readerSideMargin,
  },
  englishSystemFont: {
    fontFamily: "Open Sans",
    fontWeight: "100"
  },
  title: {
    fontFamily: "Amiri",
    fontSize: 20
  },
  verseContainer: {
    flexDirection: "column",
    marginTop:10,
    marginBottom:10,
  },
  sectionContainer: {
    flexDirection: "column",
    marginVertical: 10,
    marginHorizontal: 30,
  },
  textColumn: {
    flex: 1,
    maxWidth: 800,
    flexDirection: "column",
    alignItems: 'stretch',
  },
  sheet: {
    flex: 1,
    maxWidth: 800,
    flexDirection: "column",
    alignItems: 'stretch',
  },
  sheetTitle: {
    fontSize: 20,
    textAlign: "center",
    fontFamily: "Amiri",
    margin:20,
    marginBottom:5,
  },
  sheetRef: {
    color: "#999",
    margin: 10,
    marginBottom: 0,
  },
  sheetMediaWebView: {
    flex: 1,
    justifyContent: "center"
  },
  sheetMediaVideo: {
    height: 200,
    flex: 1,
    marginHorizontal: 40
  },
  sheetMediaMp3: {
    height: 50,
    flex: 1,
    marginHorizontal: 40
  },
  sheetHorizontalRule: {
    textDecorationLine: 'line-through',
    borderTopColor: 'black'
  },
  sheetAuthor: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontFamily: "Amiri",
    margin:20,
    marginTop:0,
  },
  sectionHeaderBox: {
    alignItems: "center",
    marginHorizontal: 30,
  },
  sectionHeader: {
    marginVertical: iPad ? 25 : 18,
    padding: 5,
  },
  aliyaHeader: {
    marginTop: iPad ? 18 : 12,
    marginBottom: iPad ? 25 : 18,
  },
  aliyaHeaderText: {
    fontSize: iPad ? 20 : 14,
  },
  sectionHeaderBorder: {
    borderBottomWidth: 4,
  },
  sectionHeaderText: {
    textAlign: "center",
    fontSize: iPad ? 22 : 16,
  },
  hebrewSectionHeaderText: {
    fontSize: iPad ? 26 : 19,
  },
  hebrewAliyaHeaderText: {
    fontSize: iPad ? 22 : 16,
  },
  textSegment: {
    flexDirection: "column",
    flexWrap:"nowrap",
    flex:1
  },
  numberSegmentHolderEn: {
    flexDirection: "row",
    justifyContent: "center",
  },
  numberSegmentHolderBiHe: {
    flexDirection: "row-reverse",
  },
  rightContainer: {
    flex: 1
  },
  textTocCategoryAttribution: {
    marginBottom: 20,
  },
  textTocCategoryAttributionTextEn: {
    fontSize: 16,
    fontStyle: "italic",
    textAlign: "center",
    fontFamily: "Amiri",
  },
  textTocCategoryAttributionTextHe: {
    fontSize: 16,
    textAlign: "center",
    fontFamily: "Taamey Frank Taamim Fix",
  },
  textTocVersionInfo: {
    flexDirection: "row",
    paddingBottom: 10,
    justifyContent: "flex-start",
  },
  textTocVersionInfoText: {
    fontSize: 12
  },
  textTocVersionTitle: {
    paddingTop: 25,
    fontSize: iPad ? 20 : 17,
    textAlign: "center"
  },
  textTocVersionNotes: {
    textAlign: "center",
    fontFamily: "Amiri",
    fontSize: 13,
  },
  textTocTopBox: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: iPad ? 34 : 24,
    paddingBottom: iPad ? 34 : 24,
    paddingTop: iPad ? 20 : 0,
    borderBottomWidth: 1
  },
  textTocTitle: {
    fontSize: iPad ? 32 : 19,
    textAlign: "center"
  },
  textTocCategoryBox: {
    marginTop: 3,
    marginBottom: 12,
  },
  textTocCategory: {
    fontSize: iPad ? 20 : 12,
  },
  textTocSectionString: {
    fontSize: iPad ? 20 : 12,
  },
  textTocNumberedSectionBox: {
    marginBottom: 20
  },
  textTocNumberedSection: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap"
  },
  textTocNamedSection: {
    flex: 1,
    marginBottom: 15,
    marginHorizontal: 15
  },
  textTocSectionTitle: {
    fontSize: 16,
    marginBottom: 10
  },
  sectionLink: {
    height: 40,
    minWidth: 40,
    margin: 2,
    justifyContent: "center"
  },
  settingsHeader: {
    flex: 1,
    letterSpacing: 1,
    paddingRight: 40,
    textAlign: "center"
  },
  settingsSectionHeader: {
    textAlign: "center",
    fontSize: 14,
    marginBottom: 10
  },
  settingsSection: {
    marginTop: 15,
    marginBottom: 5,
  },
  buttonToggleSet: {
    borderRadius: 5,
    height: 40,
  },
  settingsMessage: {
    textAlign: "center",
    marginBottom: 6,
  },
  settingsDivider: {
    marginTop: 20,
    marginBottom: 30,
  },
  underOfflinePackages: {
    marginTop: 0,
    marginHorizontal: iPad ? -20 : -10,
  },
  settingsOfflinePackages: {
    marginHorizontal: iPad ? -20 : -10,
    marginTop: 30,
  },
  button: {
    borderRadius: 5,
    borderWidth: 1,
    paddingVertical: 14,
    marginVertical: 5
  },
  buttonText: {
    textAlign: "center",
    color: "#666",
  },
  dedication: {
    fontStyle: "italic",
    fontFamily: "Amiri",
    fontSize: 18,
    textAlign: "center",
  },
  navReDedicationBox:{
    width: 344,
    flexDirection: "row",
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  lineEnd: {
    flex: 1,
    height: 1
  },
  englishText: {
    fontFamily: "Amiri",
    textAlign: 'left',
    fontSize: iPad ? 19 : 15,
    lineHeight: iPad ? 26 : 20,
    marginTop: 5,
  },
  hebrewText: {
    fontFamily: "Taamey Frank Taamim Fix",
    writingDirection: "rtl",
    textAlign: 'right',
    fontSize: iPad ? 22 : 18,
    paddingTop: 10,
    marginTop: -8,
  },
  bilingualEnglishText: {
    paddingTop: 10
  },
  hebrewSystemFont: {
    fontFamily: "Heebo",
  },
  en: {
    fontFamily: "Amiri",
    textAlign: 'left'
  },
  he: {
    fontFamily: "Taamey Frank Taamim Fix",
    textAlign: 'right',
  },
  enInt: {
    fontFamily: "Open Sans",
    textAlign: 'left'
  },
  heInt: {
    fontFamily: "Heebo",
    textAlign: 'right',
  },
  blank: {
    height: 0,
    width: 0
  },
  readerOptions: {
    width: 30,
    height: 40,
  },
  loadingViewBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch'
  },
  loadingView: {
    backgroundColor: "transparent",
    height: 80,
  },
  twoBox: {

  },
  twoBoxRow: {
    flexDirection: "row",
    alignItems: "stretch"
  },
  twoBoxItem: {
    flex: 1,
    alignItems: "stretch",
  },
  centerText: {
    textAlign: "center"
  },
  justifyText: {
    textAlign: "justify"
  },
  spacedText: {
    letterSpacing: 1
  },
  rtlRow: {
    flexDirection: "row-reverse"
  },
  toolsButton: {
    borderTopWidth: 1,
    justifyContent: 'flex-start',
  },
  toolsButtonIcon: {
    width: iPad ? readerSideMarginIpad : readerSideMargin,
    alignItems: 'center',
  },
  toolsButtonText: {
  },
  versionsBoxLang: {
    flex: 1,
    paddingVertical: 5,
    marginTop: 15,
  },
  versionsBoxLangText: {
    fontSize: 17,
    lineHeight: 25,
  },
  versionsBoxVersionBlockWrapper: {
    borderTopWidth: 1,
    marginBottom: 15,
  },
  versionBlockBottomBar: {
    flexDirection: 'row',
    flex: 1,
    paddingTop: 20,
    paddingBottom: 5,
    borderTopWidth: 1,
    marginTop: 10,
  },
  versionBoxBottomBarButton: {
    paddingHorizontal: 10,
    flex: 1,
    alignItems: 'center',
  },
  aboutHeaderWrapper: {
    borderBottomWidth: 1,
  },
  aboutHeader: {
    paddingBottom: 13,
    textAlign: 'left',
    fontSize: 17,
    letterSpacing: 1,
    fontFamily: "Open Sans",
  },
  aboutTitle: {
    fontFamily: "Amiri",
    fontSize: 20,
    paddingVertical: 10,
  },
  aboutSubtitle: {
    fontFamily: 'Amiri',
    fontStyle: 'italic',
  },
  aboutDescription: {
    fontFamily: 'Amiri',
    paddingTop: 10,
  },
  currVersionSection: {
    paddingTop: 25,
  },
  autocompleteList: {
    flex: 1,
    flexDirection: 'column',
  },
  autocompleteItem: {
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  autocompleteItemText: {
    fontSize: 17,
    paddingHorizontal: 10,
    flex: 1,
  },
  starIcon: {
    width: 20,
    height: 20,
    marginHorizontal: 5,
  },
  scrollViewPaddingInOrderToScroll: {
    marginHorizontal: 1, // HACK: really unclear why this is necessary. leaving here until I figure it out
  },
  categorySideColorLink: {
    flex:1,
    borderBottomWidth: 1,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: iPad ? 48 : 24,
  },
  centeringBox: {
    flex: 1,
    justifyContent: "center",
    flexDirection: "row"
  },
  blueButton: {
    alignSelf: 'flex-start',
    height: 50,
    paddingHorizontal: 30,
    borderRadius: 5,
    backgroundColor: "#18345D",
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  blueButtonText: {
    color: "white",
    textAlign: "center",
    fontSize: 20,
    lineHeight: 50,
    letterSpacing: 1,
  },
  rainbowBar: {
    height: 8,
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    backgroundColor: 'black',
  },
  alignSelf: {
    alignSelf: "stretch",
  },
  //HTML Styles:
  strong: {
    fontWeight: "bold"
  },
  small: {
    fontSize: 14
  },
  b: {
    fontWeight: "bold"
  },
  i: {
    fontStyle: "italic"
  },
  gemarraregular: {
    fontWeight: "500",

  },
  gemarraitalic: {
    fontStyle: "italic",
    fontWeight: "500",
  },
  a: {
    textDecorationLine: "underline",
    color: "#4b71b7",
  },
  hediv: {
    fontFamily: "Taamey Frank Taamim Fix",
    writingDirection: "rtl",
    flex: -1,
    paddingTop: 15,
    marginTop: -10,
    textAlign: Platform.OS == "android" ? "right" : "justify",
  },
  endiv: {
    fontFamily: "Amiri",
    fontWeight: "normal",
    textAlign: 'justify',
    paddingTop: 15,
    marginTop: -10,
  },
  userAvatar: {
    marginTop: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarMini: {
    marginHorizontal: 6,
    marginBottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
  },

  sheetListTitle: {
    fontFamily: "Amiri",
    fontSize: 20,
    lineHeight: 22,
    paddingTop: 11,
  },
  mySheetListTitle: {
    fontSize: 20,
    flexShrink: 1,
  },
  heInEn: {
    fontFamily: "Taamey Frank Taamim Fix",
    writingDirection: "rtl",
    flex: -1,
  },
  enConnectionMarker: {
    borderWidth: 1,
    borderRadius: 3,
    paddingRight: 3,
    paddingLeft: 3,
    fontSize: 12,
    lineHeight: 18,
  },
  saveLine: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topicSourceTitle: {
    fontSize: 24, 
    lineHeight:33,
  },
  colorBarBoxEnglish: {
    borderLeftWidth: 4,
    paddingLeft: 17,
  },
  colorBarBoxHebrew: {
    borderRightWidth: 4,
    paddingRight: 17,
  },
  dataSourceButton: {
    borderRadius: 500,
    backgroundColor: 'grey',
    padding: 6,
  },
  dataSourceButtonImage: {
    width: 9,
    height: 9,
  },
  dataSourceText: {
    borderRadius: 6,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginVertical: 10,
  },
  topicLinkSection: {
    paddingTop: 20,
  },
  topicLinkTypeHeader: {
    paddingBottom: 10,
    fontWeight: "bold",
  },
  topicLinkSideList: {
    flexWrap: "wrap",
    marginTop: 10,
  },
  topicLinkSideMore: {
    marginTop: 10,
    alignContent: 'center',
  },
  topicItemMargins: {
    marginHorizontal: 15,
    marginBottom: 30,
  },
  profilePic: {
    borderRadius: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readingsHeader: {
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  readingsSection: {
    marginBottom: 15,
  },
  readThePortionButton: {
    paddingVertical: 10,
    paddingRight: 15,
    paddingLeft: 5,
    marginTop: 22,
  },
  readThePortionButtonHe: {
    paddingVertical: 10,
    paddingLeft: 15,
    paddingRight: 5,
    marginTop: 22,
  },
  topicCategoryButtonWrapper: {
    borderTopWidth: 1,
    marginHorizontal: 15
  },
  topicCategoryButtonWrapperRoot: {
    borderTopWidth: 0,  // no border top b/c of trending topics
  },
  footerBar: {
    alignSelf: "stretch",
    paddingHorizontal: 5,
    borderTopWidth: 1
  },
  footerButton: {
    flex: 1,
    marginVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column"
  },
  footerButtonText: {
    marginTop: 8,
    fontSize: 10,
  },
  systemH3: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  flex1: {
    flex: 1,
  },
});
