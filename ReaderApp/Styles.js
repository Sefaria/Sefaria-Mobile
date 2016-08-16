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
    backgroundColor: '#F5FCFF'
  },
  header: {
    height: 50,
    paddingTop: 18,
    backgroundColor: '#F9F9F7',
    alignItems: 'center',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: "#DDD"
  },
  headerButton: {
    width: 30,
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
  displaySettingsButton: {
    textAlign: "center",
    alignSelf: "stretch",
    fontSize: 16,
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
    textAlign: "center"
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
    flexWrap: "wrap",
    alignSelf: "stretch",
  },
  searchInput: {
    alignSelf: 'stretch',
    flex: 1,
    fontSize: 14,
    backgroundColor: "transparent"
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
    color: '#ff0000',
    textAlign: 'left',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    fontFamily: "Montserrat",
    fontWeight: "100",
    marginRight: 20
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
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 20,
    alignItems: "flex-start"

  },
  rightContainer: {
    flex: 1
  },
  englishText: {
    fontFamily: "EB Garamond",
    textAlign: 'left',
    alignSelf: 'stretch',
    fontSize: 16,
    flex: 1
  },
  hebrewText: {
    fontFamily: "Taamey Frank CLM",
    textAlign: 'right',
    alignSelf: 'stretch',
    fontSize: 20,
    flex: 1
  },
  hebrewSystemFont: {
    fontFamily: "Open Sans Hebrew"
  },
  blank: {
    height: 0,
    width: 0
  },
  searchPage: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  searchTextResult: {
    margin: 20
  },
  readerOptions: {
    width: 30,
    height: 40,
  },
  twoBox: {
    flex: 1,
  },
  twoBoxRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch"
  },
  twoBoxItem: {
    flex: 1,
    alignItems: "stretch"
  },
  centerText: {
    textAlign: "center"
  }
});
