'use strict'
const React = require('react-native');
const {StyleSheet,Dimensions} = React;

var Sefaria = require('./sefaria'); // Included for Sefaria.palette


module.exports = StyleSheet.create({
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
  categoryColorLine: {
    height: 26,
    borderTopWidth: 20,
    borderTopColor: "black",
    alignSelf: "stretch"
  },
  header: {
    height: 50,
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    borderBottomWidth: 1
  },
  readerDisplayOptionsMenu: {
    position: "absolute",
    width: Dimensions.get('window').width,
    top: 76,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'column',
    borderBottomWidth: 1,
  },
  readerDisplayOptionsMenuRow: {
    justifyContent: "center",
    flexDirection: 'row',
    flex:1,
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 15,
    marginRight: 15,
  },
  readerDisplayOptionMenuRowNotColor: {
    borderRadius: 5
  },
  readerDisplayOptionsMenuItem: {
    flex: 1,
    flexDirection: "row",
    height:50,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  readerDisplayOptionsMenuItemLeft: {
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderRightWidth: 0,
  },
  readerDisplayOptionsMenuItemCenter: {
    borderRightWidth: 0,
    borderLeftWidth: 0,
    marginLeft: 1
  },
  readerDisplayOptionsMenuItemRight: {
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    borderLeftWidth: 0,
    marginLeft: 1
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
    resizeMode: "contain",
    height: 14,
  },
  readerDisplayOptionsMenuDivider: {
    marginTop: 10,
    marginBottom: 10,
    alignSelf: "stretch",
    height:1
  },
  headerButton: {
    width: 40,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent"
  },
  menuButton: {
    width: 17,
    height: 17,
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
  headerButtonSearch: {
    width: 24,
    marginRight: 10,
  },
  searchButton: {
    width: 17,
    height: 17,
  },
  tripleDotsContainer: {
    flexDirection: "column",
    flex: 1,
    alignSelf: "stretch",
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
    alignItems: 'center',
    justifyContent: "center",
    flexDirection: "row"
  },
  headerTextTitleText: {
    fontSize: 16,
    maxWidth: 210,
    textAlign: "center",
    marginHorizontal: 5
  },
  downCaret: {
    width: 10,
    height: 10,
    marginTop: 3,
  },
  searchResultSummary: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderBottomWidth: 1,
  },
  searchInput: {
    alignSelf: 'stretch',
    flex: 1,
    fontSize: 14,
    fontStyle: "normal",
    fontFamily: "EB Garamond",
    paddingTop: 0,
    backgroundColor: "transparent"
  },
  searchInputPlaceholder: {
    fontStyle: "italic",
    fontSize: 16,
    paddingTop: 5
  },
  searchPage: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  searchTextResult: {
    marginHorizontal: 30,
    marginTop: 20,
    paddingBottom: 20,
    flexDirection: 'column',
    borderBottomWidth: 1,
  },
  textListSummary: {
    flex: 1
  },
  textListHeaderSummary: {
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
  },
  textListHeaderSummaryText: {
    textAlign: "center",
  },
  textListSummaryScrollView: {
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  textListSummarySection: {
    marginBottom: 22
  },
  textListContentOuter: {
    flex: 1,
    flexDirection: "column"
  },
  textListContentListView: {
    flex: 1,
    flexDirection: "column"
  },
  textListHeader: {
    height: 50,
    borderTopWidth: 6,
    borderBottomWidth: 1,
    paddingHorizontal: 25,
    flexDirection: "row"
  },
  textListHeaderScrollView: {
    flex: 200 //made scrollview flex:200 to push the tripledots all the way to the right. seems to work well
  },
  textListHeaderItem: {
    margin: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  textListCitation: {
    marginBottom: 4,
  },
  noLinks: {
    flex:1,
    alignItems: "center",
    margin: 10
  },
  emptyLinksMessage: {
    fontStyle: "italic",
    fontFamily: "EB Garamond",
    textAlign: "center",
    marginTop: 8
  },
  menu: {
    alignSelf: 'stretch',
    flex: 1
  },
  menuContent: {
    paddingHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 40,
  },
  languageToggle: {
    width: 30,
    height: 30,
    marginRight: 10,
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
    marginTop: -1
  },
  languageToggleTextHe: {
    color: "black",
    backgroundColor: "transparent",
    fontSize: 19,
    marginTop: 5,
  },
  readerNavSection: {
    marginVertical: 15
  },
  readerNavCategory: {
    borderTopWidth: 4,
    margin: 2,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  readerNavSectionTitle: {
    alignSelf: "center",
    marginBottom: 15,
    fontSize: 13,
    letterSpacing: 1,
  },
  navBottomLinks: {
    marginTop: 20,
    paddingBottom: 30,
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  navBottomLink: {
    marginHorizontal: 3,
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
  navToggle: {
    fontSize: 10,
    paddingTop: 2
  },
  navToggles: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 22
  },
  navTogglesDivider: {
    marginHorizontal: 7
  },
  textTocHeaderTitle: {
    flex: 1,
    paddingLeft: 10,
    textAlign: 'center',
    letterSpacing: 1
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
    fontSize: 9,
    width: 30,
  },
  hebrewVerseNumber: {
    fontSize: 11,
  },
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
    fontSize: 7,
    width: 30
  },
  englishSystemFont: {
    fontFamily: "Open Sans",
    fontWeight: "100"
  },
  title: {
    fontFamily: "EB Garamond",
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
    flexDirection: "row",
    alignItems: 'stretch'
  },
  sectionHeaderBox: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 30,
  },
  sectionHeader: {
    marginVertical: 25,
    padding: 5,
    borderBottomWidth: 4,
  },
  sectionHeaderText: {
    textAlign: "center",
    fontSize: 14,
  },
  hebrewSectionHeaderText: {
    fontSize: 17,
  },
  textSegment: {
    flexDirection: "column",
    flexWrap:"wrap",
    flex:.93
  },
  numberSegmentHolderEn: {
    flexDirection: "row",
  },
  numberSegmentHolderBiHe: {
    flexDirection: "row-reverse",
  },
  rightContainer: {
    flex: 1
  },
  textTocTopBox: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    paddingBottom: 14,
    borderBottomWidth: 1
  },
  textTocTitle: {
    fontSize: 19,
    textAlign: "center"
  },
  textTocCategoryBox: {
    marginTop: 3,
    marginBottom: 12,
  },
  textTocCategory: {
    fontSize: 12,
  },
  textTocSectionString: {
    fontSize: 12
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
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    marginBottom: 10
  },
  settingsSection: {
    marginTop: 15,
    marginBottom: 5,
  },
  buttonToggleSet: {
    marginRight: 0,
    marginLeft: 0,
  },
  settingsMessage: {
    flex: 1,
    textAlign: "center",
    marginBottom: 6,
  },
  settingsDivider: {
    marginTop: 20,
    marginBottom: 30,
  },
  button: {
    flex: 1,
    borderRadius: 5,
    borderWidth: 1,
    backgroundColor: "white",
    paddingVertical: 14,
    marginVertical: 5
  },
  buttonText: {
    textAlign: "center",
    color: "#666",
  },
  dedication: {
    fontStyle: "italic",
    fontFamily: "EB Garamond",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20
  },
  lineEnd: {
    flex: 1,
    height: 1
  },
  englishText: {
    fontFamily: "EB Garamond",
    textAlign: 'left',
    flex: -1,
    fontSize: 16,
  },
  hebrewText: {
    fontFamily: "Taamey Frank CLM",
    writingDirection: "rtl",
    textAlign: 'right',
    flex: -1,
    paddingTop: 5,
    fontSize: 20,
  },
  hebrewSystemFont: {
    fontFamily: "Open Sans Hebrew"
  },
  en: {
    fontFamily: "EB Garamond",
    textAlign: 'left'
  },
  he: {
    fontFamily: "Taamey Frank CLM",
    textAlign: 'right',
  },
  enInt: {
    fontFamily: "Open Sans",
    textAlign: 'left'
  },
  heInt: {
    fontFamily: "Open Sans Hebrew",
    textAlign: 'right'
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


//HTML Styles:
  strong: {
    fontWeight: "bold"
  },
  b: {
    fontWeight: "bold"
  },
  i: {
    fontStyle: "italic"
  }

});
