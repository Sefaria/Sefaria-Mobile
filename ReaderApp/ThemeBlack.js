'use strict'
const React = require('react-native');
const {StyleSheet,Dimensions} = React;

var Colors = {
  border: "#444",
  secondaryBorder: "#666",
  mainBackground: "#2d2d2b",
  secondaryBackground: "#333331",
  mainText: "#fff",
  secondaryText: "#ddd",
  mainForeground: "black",
  mainForegroundContrast: "white",
  textBackground: "#333331",
  textSectionTitleBorder: "#666",
  textSegmentHighlight: "#444",
  button: "#ddd"
}

module.exports = StyleSheet.create({
  container: {
    backgroundColor: Colors.secondaryBackground
  },
  header: {
    backgroundColor: Colors.mainBackground,
    borderBottomColor: Colors.border
  },
  readerDisplayOptionsMenu: {
    backgroundColor: Colors.mainBackground,
    borderColor: Colors.border
  },
  readerDisplayOptionsMenuItem: {
    borderColor: Colors.border,
    backgroundColor: Colors.mainForegroundContrast,
  },
  readerDisplayOptionsMenuItemSelected: {
    backgroundColor: "#CCC"
  },
  readerDisplayOptionsMenuColor: {
    borderColor: "#AAA"
  },
  readerDisplayOptionsMenuColorSelected: {
    borderColor: Colors.mainForegroundContrast
  },
  readerDisplayOptionsMenuDivider: {
    backgroundColor:Colors.border
  },
  menuButton: {
    color: Colors.button
  },
  closeButton: {
    color: Colors.button
  },
  searchButton: {
    color: Colors.button
  },
  textListSummary: {
    backgroundColor: Colors.mainBackground,
  },
  textListHeader: {
    backgroundColor: Colors.mainForeground,
    borderBottomColor: Colors.border,
  },
  textListHeaderItemText: {
    color: Colors.secondaryText
  },
  textListHeaderItemSelected: {
    color: Colors.mainText
  },
  textListContentOuter: {
    backgroundColor: Colors.textBackground,
  },
  textListCitation: {
    color: Colors.secondaryText,
  },
  searchTextResult: {
    borderColor: Colors.secondaryBorder,
  },
  menu: {
    backgroundColor: Colors.mainBackground
  },
  languageToggle: {
    borderColor: Colors.border
  },
  languageToggleText: {
    color: Colors.mainText
  },
  readerNavCategory: {
    backgroundColor: Colors.mainForeground
  },
  readerNavSectionTitle: {
    color: Colors.secondaryText
  },
  categoryTitle: {
    color: Colors.mainText
  },  
  categorySectionTitle: {
    color: Colors.secondaryText
  },
  textBlockLink: {
    backgroundColor: Colors.mainForeground
  },
  navToggle: {
    color: Colors.secondaryText
  },
  navToggleActive: {
    color: Colors.mainText
  },
  navTogglesDivider: {
    color: Colors.secondaryText
  },
  mainTextPanel: {
    backgroundColor: Colors.textBackground
  },
  commentaryTextPanel: {
    backgroundColor: Colors.secondaryBackground,
    borderColor: Colors.border
  },
  verseNumber: {
    color: Colors.secondaryText
  },
  sectionHeader: {
    borderColor: Colors.border,
  },
  sectionHeaderText: {
    borderBottomColor: Colors.textSectionTitleBorder,
    color: Colors.secondaryText
  },
  sectionLink: {
    backgroundColor: Colors.mainForeground
  },
  loadingView: {
    backgroundColor: Colors.secondaryBackground
  },
  segmentHighlight: {
    backgroundColor: Colors.textSegmentHighlight
  },
  text: {
    color: Colors.mainForegroundContrast
  }
});
