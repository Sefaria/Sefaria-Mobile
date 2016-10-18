'use strict'
const React = require('react-native');
const {StyleSheet,Dimensions} = React;

var Colors = {
  border: "#d5d5d4",
  secondaryBorder: "#eee",
  mainBackground: "#F9F9F7",
  secondaryBackground: "#F5FCFF",
  mainText: "#000",
  secondaryText: "#999",
  mainForeground: "white",
  mainForegroundContrast: "black",
  textBackground: "white",
  textSectionTitleBorder: "#e6e5e6",
  textSegmentHighlight: "#e9e9e7",
  button: "#bfbfbf"
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
    backgroundColor: Colors.mainForeground,
  },
  readerDisplayOptionsMenuItemSelected: {
    backgroundColor: "#EEE"
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
    backgroundColor: Colors.mainBackground,
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
  searchTextResult: {
    borderColor: Colors.secondaryBorder,
  },
  menu: {
    backgroundColor: Colors.mainBackground
  },
  languageToggle: {
    borderColor: Colors.border
  },
  readerNavCategory: {
    backgroundColor: Colors.mainForeground
  },
  readerNavSectionTitle: {
    color: Colors.secondaryText
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
