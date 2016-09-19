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
    alignSelf: 'stretch',
    backgroundColor: '#F5FCFF'
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
    paddingTop: 10,
    paddingBottom: 10,
    marginLeft: 15,
    marginRight: 15,
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
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderRightWidth: 0,
  },
  readerDisplayOptionsMenuItemCenter: {
    borderRightWidth: 0
  },
  readerDisplayOptionsMenuItemRight: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10
  },
  readerDisplayOptionsMenuColor: {
    flex: 1,
    flexDirection: "row",
    height: 50,
    borderWidth: 1,
    borderRadius: 10
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
    width:1000,
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
    textAlign: "center",
    alignSelf: "stretch",
    fontSize: 22
  },
  closeButton: {
    textAlign: "center",
    alignSelf: "stretch",
    fontSize: 40,
    top: -4
  },
  searchButton: {
    textAlign: "center",
    alignSelf: "stretch",
    fontSize: 25
  },
  tripleDotsContainer: {
    flexDirection: "column",
    flex: 1,
    alignSelf: "stretch",
    width: 30,
    height: 30,
    marginLeft: 5,
    marginRight: 5,
    justifyContent: "center"
  },
  tripleDots: {
    width:15,
    height:15,
    opacity: 0.5
  },
  headerTextTitle: {
    flex: 1,
    alignItems: 'center'
  },
  searchResultSummary: {
    margin: 10
  },
  searchInput: {
    alignSelf: 'stretch',
    flex: 1,
    fontSize: 14,
    backgroundColor: "transparent"
  },
  searchPage: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  searchTextResult: {
    margin: 20,
    flexDirection: 'column'
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
    height: 40,
    borderTopWidth: 4,
    paddingRight: 10,
    paddingLeft: 10,
    flexDirection: "row"
  },
  textListHeaderItem: {
    margin: 5,
    justifyContent: "center"
  },
  noLinks: {
    flex:1,
    alignItems: "center",
    margin: 10
  },
  displaySettingsButton: {
    width: 25,
    height: 25,
    opacity: 0.3
  },
  menu: {
    alignSelf: 'stretch',
    flex: 1
  },
  menuContent: {
    paddingHorizontal: 20,
    paddingVertical: 20
  },
  languageToggle: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  navigationMenuTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20
  },
  navigationMenuTitle: {
    fontSize: 18,
    flex: 1,
    textAlign: "center",
    paddingLeft: 30
  },
  readerNavSection: {
    marginBottom: 30
  },
  readerNavCategory: {
    borderTopWidth: 4,
    margin: 5,
    minHeight: 40,
    paddingVertical: 5,
    paddingHorizontal: 5,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  readerNavSectionTitle: {
    alignSelf: "center",
    marginBottom: 10,
    fontSize: 12,
  },
  category: {
    marginBottom: 10
  },
  categoryTitle: {
    flex: 1,
    textAlign: "center"
  },
  categorySectionTitle: {
    flex: 1,
    textAlign: "center",
    marginVertical: 15
  },
  textBlockLink: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    margin: 5,
    flex: 1,
  },
  navToggles: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15
  },
  navTogglesDivider: {
    marginHorizontal: 7
  },
  textTocHeaderTitle: {
    flex: 1,
    paddingRight: 30,
    textAlign: 'center'
  },
  mainTextPanel: {
    flex: .5,
    flexWrap: "nowrap",
    justifyContent: 'center',
    alignSelf: 'stretch',
    alignItems: "flex-start",
    flexDirection:"row"
  },
  commentaryTextPanel: {
    flex: .5,
    alignSelf: 'stretch',
    borderTopWidth: 1
  },
  verseNumber: {
    textAlign: 'left',
    fontFamily: "Montserrat",
    fontWeight: "100",
    marginRight: 5,
    flex:.05
  },

  englishSystemFont: {
    fontFamily: "Montserrat",
    fontWeight: "100"
  },
  title: {
    fontFamily: "EB Garamond",
    fontSize: 20
  },

  verseContainer: {
    flexDirection: "column",
    marginLeft:20,
    marginRight:20,
    marginTop:10,
    marginBottom:10,
  },
  textColumn: {
    flexDirection: "row",
    alignItems: 'stretch'

  },
  sectionHeader: {
    flex: 1,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  sectionHeaderText: {
    borderBottomWidth: 4,
    borderStyle: "solid",
    paddingBottom: 3
  },
  TextSegment: {
    flexDirection: "column",
    flexWrap:"wrap",
    flex:.95
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
    textAlign: 'right',
    flex: -1,
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
    textAlign: 'right'
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
    height: 0,
    width: 0
  },
  readerOptions: {
    width: 30,
    height: 40,
  },
  loadingView: {
    height: 80
  },
  twoBox: {

  },
  twoBoxRow: {
    flex: 1,
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
