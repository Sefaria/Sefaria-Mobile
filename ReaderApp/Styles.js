'use strict'
const React = require('react-native');
const {StyleSheet,Dimensions} = React;
import {
PixelRatio
} from 'react-native';

var Sefaria = require('./sefaria'); // Included for Sefaria.palette


module.exports = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    flex: PixelRatio.roundToNearestPixel(1),
    textAlign: 'center',
    alignSelf: 'stretch',
    alignItems: "flex-end"
  },
  welcome: {
    fontSize: PixelRatio.roundToNearestPixel(20),
    textAlign: 'center',
    margin: PixelRatio.roundToNearestPixel(10)
  },
  instructions: {
    textAlign: 'center',
    color:  '#333333',
    marginBottom: PixelRatio.roundToNearestPixel(5)
  },
  container: {
    flex: PixelRatio.roundToNearestPixel(1),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch'
  },
  categoryColorLine: {
    height: PixelRatio.roundToNearestPixel(26),
    borderTopWidth: PixelRatio.roundToNearestPixel(20),
    borderTopColor: "black",
    alignSelf: "stretch"
  },
  header: {
    height: PixelRatio.roundToNearestPixel(50),
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    borderBottomWidth: PixelRatio.roundToNearestPixel(1)
  },
  readerDisplayOptionsMenu: {
    position: "absolute",
    width: Dimensions.get('window').width,
    top: PixelRatio.roundToNearestPixel(76),
    paddingTop: PixelRatio.roundToNearestPixel(10),
    paddingBottom: PixelRatio.roundToNearestPixel(10),
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'column',
    borderBottomWidth: PixelRatio.roundToNearestPixel(1),
  },
  readerDisplayOptionsMenuRow: {
    justifyContent: "center",
    flexDirection: 'row',
    flex:PixelRatio.roundToNearestPixel(1),
    paddingTop: PixelRatio.roundToNearestPixel(10),
    paddingBottom: PixelRatio.roundToNearestPixel(10),
    marginLeft: PixelRatio.roundToNearestPixel(15),
    marginRight: PixelRatio.roundToNearestPixel(15),
  },
  readerDisplayOptionsMenuItem: {
    flex: PixelRatio.roundToNearestPixel(1),
    flexDirection: "row",
    height:PixelRatio.roundToNearestPixel(50),
    borderWidth: PixelRatio.roundToNearestPixel(1),
    justifyContent: "center",
    alignItems: "center"
  },
  readerDisplayOptionsMenuItemLeft: {
    borderTopLeftRadius: PixelRatio.roundToNearestPixel(10),
    borderBottomLeftRadius: PixelRatio.roundToNearestPixel(10),
    borderRightWidth: 0,

  },
  readerDisplayOptionsMenuItemCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  readerDisplayOptionsMenuItemRight: {
    borderTopRightRadius: PixelRatio.roundToNearestPixel(10),
    borderBottomRightRadius: PixelRatio.roundToNearestPixel(10),
    borderLeftWidth: 0,
  },
  readerDisplayOptionsMenuColor: {
    flex: PixelRatio.roundToNearestPixel(1),
    flexDirection: "row",
    height: PixelRatio.roundToNearestPixel(50),
    borderWidth: PixelRatio.roundToNearestPixel(1),
    borderRadius: PixelRatio.roundToNearestPixel(10)
  },
  readerDisplayOptionsMenuColorLeft: {
    marginRight: PixelRatio.roundToNearestPixel(5)
  },
  readerDisplayOptionsMenuColorCenter: {
    marginLeft: PixelRatio.roundToNearestPixel(5),
    marginRight: PixelRatio.roundToNearestPixel(5)
  },
  readerDisplayOptionsMenuColorRight: {
    marginLeft: PixelRatio.roundToNearestPixel(5)
  },
  readerDisplayOptionsMenuIcon: {
    resizeMode: "contain",
    height: PixelRatio.roundToNearestPixel(14),
  },
  readerDisplayOptionsMenuDivider: {
    marginTop: PixelRatio.roundToNearestPixel(10),
    marginBottom: PixelRatio.roundToNearestPixel(10),
    width:PixelRatio.roundToNearestPixel(1000),
    height:PixelRatio.roundToNearestPixel(1)
  },
  headerButton: {
    width: PixelRatio.roundToNearestPixel(40),
    height: PixelRatio.roundToNearestPixel(50),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent"
  },
  menuButton: {
    width: PixelRatio.roundToNearestPixel(17),
    height: PixelRatio.roundToNearestPixel(17),
  },
  displaySettingsButton: {
    width: PixelRatio.roundToNearestPixel(25),
    height: PixelRatio.roundToNearestPixel(25),
  },
  closeButton: {
    width: PixelRatio.roundToNearestPixel(16),
    height: PixelRatio.roundToNearestPixel(16),
  },
  headerButtonSearch: {
    width: PixelRatio.roundToNearestPixel(24),
    marginRight: PixelRatio.roundToNearestPixel(18)
  },
  searchButton: {
    width: PixelRatio.roundToNearestPixel(17),
    height: PixelRatio.roundToNearestPixel(17),
  },
  tripleDotsContainer: {
    flexDirection: "column",
    flex: PixelRatio.roundToNearestPixel(1),
    alignSelf: "stretch",
    width: PixelRatio.roundToNearestPixel(22),
    marginLeft: PixelRatio.roundToNearestPixel(5),
    marginRight: PixelRatio.roundToNearestPixel(5),
    justifyContent: "center"
  },
  tripleDots: {
    width: PixelRatio.roundToNearestPixel(22),
    height: PixelRatio.roundToNearestPixel(22),
    opacity: 0.5
  },
  headerTextTitle: {
    flex: PixelRatio.roundToNearestPixel(1),
    alignItems: 'center',
    justifyContent: "center",
    flexDirection: "row"
  },
  headerTextTitleText: {
    fontSize: PixelRatio.roundToNearestPixel(16),
    maxWidth: PixelRatio.roundToNearestPixel(210),
    textAlign: "center",
    marginHorizontal: PixelRatio.roundToNearestPixel(5)
  },
  downCaret: {
    width: PixelRatio.roundToNearestPixel(10),
    height: PixelRatio.roundToNearestPixel(10),
    marginTop: PixelRatio.roundToNearestPixel(3),
  },
  searchResultSummary: {
    paddingVertical: PixelRatio.roundToNearestPixel(10),
    paddingHorizontal: PixelRatio.roundToNearestPixel(30),
    borderBottomWidth: PixelRatio.roundToNearestPixel(1),
  },
  searchInput: {
    alignSelf: 'stretch',
    flex: PixelRatio.roundToNearestPixel(1),
    fontSize: PixelRatio.roundToNearestPixel(14),
    fontStyle: "normal",
    paddingTop: PixelRatio.roundToNearestPixel(0),
    backgroundColor: "transparent"
  },
  searchInputPlaceholder: {
    fontStyle: "italic",
    fontSize: PixelRatio.roundToNearestPixel(16),
    fontFamily: "EB Garamond",
    paddingTop: PixelRatio.roundToNearestPixel(5)
  },
  searchPage: {
    flex: PixelRatio.roundToNearestPixel(1),
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  searchTextResult: {
    marginHorizontal: PixelRatio.roundToNearestPixel(30),
    marginTop: PixelRatio.roundToNearestPixel(20),
    paddingBottom: PixelRatio.roundToNearestPixel(20),
    flexDirection: 'column',
    borderBottomWidth: PixelRatio.roundToNearestPixel(1),
  },
  textListSummary: {
    flex: PixelRatio.roundToNearestPixel(1)
  },
  textListHeaderSummary: {
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: PixelRatio.roundToNearestPixel(1),
  },
  textListHeaderSummaryText: {
    textAlign: "center",
  },
  textListSummaryScrollView: {
    paddingHorizontal: PixelRatio.roundToNearestPixel(10),
    paddingVertical: PixelRatio.roundToNearestPixel(20),
  },
  textListSummarySection: {
    marginBottom: PixelRatio.roundToNearestPixel(14)
  },
  textListContentOuter: {
    flex: PixelRatio.roundToNearestPixel(1),
    flexDirection: "column"
  },
  textListContentListView: {
    flex: PixelRatio.roundToNearestPixel(1),
    flexDirection: "column"
  },
  textListHeader: {
    height: PixelRatio.roundToNearestPixel(50),
    borderTopWidth: PixelRatio.roundToNearestPixel(6),
    borderBottomWidth: PixelRatio.roundToNearestPixel(1),
    paddingHorizontal: PixelRatio.roundToNearestPixel(25),
    flexDirection: "row"
  },
  textListHeaderScrollView: {
    flex: PixelRatio.roundToNearestPixel(200) //made scrollview flex:PixelRatio.roundToNearestPixel(200) to push the tripledots all the way to the right. seems to work well
  },
  textListHeaderItem: {
    margin: PixelRatio.roundToNearestPixel(5),
    justifyContent: "center",
    alignItems: "center",
  },
  textListCitation: {
    marginBottom: PixelRatio.roundToNearestPixel(2),
  },
  noLinks: {
    flex:PixelRatio.roundToNearestPixel(1),
    alignItems: "center",
    margin: PixelRatio.roundToNearestPixel(10)
  },
  emptyLinksMessage: {
    fontStyle: "italic",
    fontFamily: "EB Garamond",
    marginTop: PixelRatio.roundToNearestPixel(8)
  },
  menu: {
    alignSelf: 'stretch',
    flex: PixelRatio.roundToNearestPixel(1)
  },
  menuContent: {
    paddingHorizontal: PixelRatio.roundToNearestPixel(10),
    paddingVertical: PixelRatio.roundToNearestPixel(20)
  },
  languageToggle: {
    width: PixelRatio.roundToNearestPixel(30),
    height: PixelRatio.roundToNearestPixel(30),
    borderWidth: PixelRatio.roundToNearestPixel(1),
    borderRadius: PixelRatio.roundToNearestPixel(4),
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  languageToggleTextEn: {
    color: "black",
    backgroundColor: "transparent",
    fontSize: PixelRatio.roundToNearestPixel(15),
    marginTop: -PixelRatio.roundToNearestPixel(1)
  },
  languageToggleTextHe: {
    color: "black",
    backgroundColor: "transparent",
    fontSize: PixelRatio.roundToNearestPixel(19),
    marginTop: PixelRatio.roundToNearestPixel(5),
  },
  navigationMenuTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: PixelRatio.roundToNearestPixel(20)
  },
  navigationMenuTitle: {
    fontSize: PixelRatio.roundToNearestPixel(18),
    flex: PixelRatio.roundToNearestPixel(1),
    textAlign: "center"
  },
  readerNavSection: {
    marginVertical: PixelRatio.roundToNearestPixel(15)
  },
  readerNavCategory: {
    borderTopWidth: PixelRatio.roundToNearestPixel(4),
    margin: PixelRatio.roundToNearestPixel(2),
    paddingVertical: PixelRatio.roundToNearestPixel(10),
    paddingHorizontal: PixelRatio.roundToNearestPixel(10),
    flex: PixelRatio.roundToNearestPixel(1),
    justifyContent: "center",
    alignItems: "center",
  },
  readerNavSectionTitle: {
    alignSelf: "center",
    marginBottom: PixelRatio.roundToNearestPixel(10),
    fontSize: PixelRatio.roundToNearestPixel(13),
    letterSpacing: PixelRatio.roundToNearestPixel(1),
  },
  category: {
    marginBottom: PixelRatio.roundToNearestPixel(10)
  },
  categoryTitle: {
    flex: PixelRatio.roundToNearestPixel(1),
    textAlign: "center",
    letterSpacing: PixelRatio.roundToNearestPixel(1),
  },
  categorySectionTitle: {
    flex: PixelRatio.roundToNearestPixel(1),
    textAlign: "center",
    fontSize: PixelRatio.roundToNearestPixel(13),
    marginVertical: PixelRatio.roundToNearestPixel(15)
  },
  textBlockLink: {
    paddingVertical: PixelRatio.roundToNearestPixel(10),
    paddingHorizontal: PixelRatio.roundToNearestPixel(10),
    margin: PixelRatio.roundToNearestPixel(2),
    alignItems: "center",
    justifyContent: "center",
    flex: PixelRatio.roundToNearestPixel(1),
  },
  navToggle: {
    fontSize: PixelRatio.roundToNearestPixel(10),
    paddingTop: PixelRatio.roundToNearestPixel(2)
  },
  navToggles: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: PixelRatio.roundToNearestPixel(15)
  },
  navTogglesDivider: {
    marginHorizontal: PixelRatio.roundToNearestPixel(7)
  },
  textTocHeaderTitle: {
    flex: PixelRatio.roundToNearestPixel(1),
    paddingLeft: PixelRatio.roundToNearestPixel(10),
    textAlign: 'center',
    letterSpacing: PixelRatio.roundToNearestPixel(1)
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
    paddingTop: PixelRatio.roundToNearestPixel(5),
    textAlign: 'center',
    fontFamily: "Montserrat",
    fontWeight: '400',
    fontSize: PixelRatio.roundToNearestPixel(9),
    width: PixelRatio.roundToNearestPixel(30),
  },
  continuousVerseNumber: {
    textAlign: 'center',
    fontFamily: "Montserrat",
    fontWeight: '100',
    fontSize: PixelRatio.roundToNearestPixel(10),
  },
  continuousVerseNumberHolder: {
    height: PixelRatio.roundToNearestPixel(19),
    width: PixelRatio.roundToNearestPixel(19),
    left:-PixelRatio.roundToNearestPixel(25),
  },
  continuousRowHolder: {
    marginLeft: PixelRatio.roundToNearestPixel(30),
    marginRight: PixelRatio.roundToNearestPixel(30),
  },
  verseBullet: {
    paddingTop: PixelRatio.roundToNearestPixel(7),
    textAlign: 'center',
    fontSize: PixelRatio.roundToNearestPixel(7),
    width: PixelRatio.roundToNearestPixel(30)
  },
  englishSystemFont: {
    fontFamily: "Montserrat",
    fontWeight: "100"
  },
  title: {
    fontFamily: "EB Garamond",
    fontSize: PixelRatio.roundToNearestPixel(20)
  },
  verseContainer: {
    flexDirection: "column",
    marginTop:PixelRatio.roundToNearestPixel(10),
    marginBottom:PixelRatio.roundToNearestPixel(10),
  },
  sectionContainer: {
    flexDirection: "column",
    marginVertical: PixelRatio.roundToNearestPixel(10),
    marginHorizontal: PixelRatio.roundToNearestPixel(30),
  },
  textColumn: {
    flexDirection: "row",
    alignItems: 'stretch'
  },
  sectionHeaderBox: {
    flex: PixelRatio.roundToNearestPixel(1),
    alignItems: "center",
    marginHorizontal: PixelRatio.roundToNearestPixel(30),
  },
  sectionHeader: {
    marginVertical: PixelRatio.roundToNearestPixel(25),
    padding: PixelRatio.roundToNearestPixel(5),
    borderBottomWidth: PixelRatio.roundToNearestPixel(4),
  },
  sectionHeaderText: {
    textAlign: "center"
  },
  textSegment: {
    flexDirection: "column",
    flexWrap:"wrap",
    flex: PixelRatio.roundToNearestPixel(.93)
  },
  numberSegmentHolderEn: {
    flexDirection: "row",
  },
  numberSegmentHolderBiHe: {
    flexDirection: "row-reverse",
  },
  rightContainer: {
    flex: PixelRatio.roundToNearestPixel(1)
  },
  textTocNumberedSectionBox: {
    marginBottom: PixelRatio.roundToNearestPixel(20)
  },
  textTocNumberedSection: {
    flex: PixelRatio.roundToNearestPixel(1),
    flexDirection: "row",
    flexWrap: "wrap"
  },
  textTocNamedSection: {
    marginBottom: PixelRatio.roundToNearestPixel(15),
    marginHorizontal: PixelRatio.roundToNearestPixel(15)
  },
  textTocSectionTitle: {
    fontSize: PixelRatio.roundToNearestPixel(16),
    marginBottom: PixelRatio.roundToNearestPixel(10)
  },
  sectionLink: {
    height: PixelRatio.roundToNearestPixel(40),
    minWidth: PixelRatio.roundToNearestPixel(40),
    margin: PixelRatio.roundToNearestPixel(2),
    justifyContent: "center"
  },
  lineEnd: {
    flex: PixelRatio.roundToNearestPixel(1),
    height: PixelRatio.roundToNearestPixel(1)
  },
  englishText: {
    fontFamily: "EB Garamond",
    textAlign: 'left',
    flex: -PixelRatio.roundToNearestPixel(1),
    fontSize: PixelRatio.roundToNearestPixel(16),
  },
  hebrewText: {
    fontFamily: "Taamey Frank CLM",
    textAlign: 'right',
    flex: -PixelRatio.roundToNearestPixel(1),
    fontSize: PixelRatio.roundToNearestPixel(20),
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
    fontFamily: "Montserrat",
    textAlign: 'left'
  },
  heInt: {
    fontFamily: "Open Sans Hebrew",
    textAlign: 'right'
  },
  blank: {
    height: PixelRatio.roundToNearestPixel(0),
    width: PixelRatio.roundToNearestPixel(0)
  },
  readerOptions: {
    width: PixelRatio.roundToNearestPixel(30),
    height: PixelRatio.roundToNearestPixel(40),
  },
  loadingViewBox: {
    flex: PixelRatio.roundToNearestPixel(1),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch'
  },
  loadingView: {
    backgroundColor: "transparent",
    height: PixelRatio.roundToNearestPixel(80),
  },
  twoBox: {

  },
  twoBoxRow: {
    flexDirection: "row",
    alignItems: "stretch"
  },
  twoBoxItem: {
    flex: PixelRatio.roundToNearestPixel(1),
    alignItems: "stretch",
  },
  centerText: {
    textAlign: "center"
  },
  justifyText: {
    textAlign: "justify"
  },
  spacedText: {
    letterSpacing: PixelRatio.roundToNearestPixel(1)
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

});
