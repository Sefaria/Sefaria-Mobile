'use strict'
const React = require('react-native');
const {StyleSheet} = React;

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
    color: '#333333',
    marginBottom: 5
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#F5FCFF'
  },
  header: {
    height: 50,
    paddingTop: 18,
    backgroundColor: '#F9F9F7',
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: "#DDD"
  },
  headerButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent"
  },
  menuButton: {
    textAlign: "center",
    alignSelf: "stretch",
    fontSize: 18,
  },
  closeButton: {
    textAlign: "center",
    alignSelf: "stretch",
    fontSize: 22,
  },
  searchButton: {
    textAlign: "center",
    alignSelf: "stretch",
    fontSize: 22,
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
  textListHeader: {
    height: 40,
    backgroundColor: "white",
    borderTopWidth: 4,
    paddingRight: 10,
    paddingLeft: 10,
    flexDirection: "row"
  },
  textListHeaderItem: {
    margin: 5,
    justifyContent: "center",
    color: "#999"
  },
  textListHeaderItemSelected: {
    color: "#000"
  },
  noLinks: {
    flex:1,
    alignItems: "center",
    margin: 10
  },
  displaySettingsButton: {
    width: 22,
    height: 22,
  },
  menu: {
    backgroundColor: '#f9f9f7',
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
    borderColor: "#ddd",
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
    height: 40,
    backgroundColor: "white",
    borderTopWidth: 4,
    margin: 5,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  readerNavSectionTitle: {
    alignSelf: "center",
    marginBottom: 10,
    fontSize: 12,
    color: "#999"
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
    marginVertical: 15,
    color: "#999"
  },
  textBlockLink: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "white",
    margin: 5,
    flex: 1,
  },
  navToggles: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15
  },
  navToggle: {
    color: "#999"
  },
  navToggleActive: {
    color: "#000"
  },
  navTogglesDivider: {
    color: "#999",
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
    backgroundColor: '#fff',
    alignSelf: 'stretch',
    alignItems: "flex-start"
  },
  commentaryTextPanel: {
    flex: .5,
    backgroundColor: '#F5FCFF',
    alignSelf: 'stretch',
    borderTopWidth: 1,
    borderColor: "#111"
  },
  listView: {
    flex: 1,
    padding: 20,
    alignSelf: 'stretch'
  },
  b: {
    fontWeight: "bold"
  },
  verseNumber: {
    color: '#999',
    textAlign: 'left',
    fontFamily: "Montserrat",
    fontWeight: "100",
    marginRight: 5,
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
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 10,
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
    backgroundColor: "white",
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
    height: 80,
    backgroundColor: '#F5FCFF',
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
  segmentHighlight: {
    backgroundColor: "#e9e9e7"
  },


//HTML Styles:
  strong: {
    fontWeight: "bold"

  },

});
