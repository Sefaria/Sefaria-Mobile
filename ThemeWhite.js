'use strict'
import { StyleSheet } from 'react-native';

var Colors = {
  border: "#d5d5d4",
  secondaryBorder: "#eee",
  mainBackground: "#F9F9F7",
  mainText: "#000",
  secondaryText: "#999",
  tertiaryText: "#666",
  quaternaryText: "#bebebe",
  mainForeground: "white",
  mainForegroundContrast: "black",
  textBackground: "white",
  textSectionTitleBorder: "#e6e5e6",
  lightGrey: "#ccc",
  lighterGrey: "#ededec",
  lightestGrey: "#fbfbfa",
  textSegmentHighlight: "#f0f7ff",
  wordHighlight: "#d2dcff",
  textListHeader: "#f3f3f2",
  button: "#bfbfbf",
  buttonBackground: "#fff",
  sefariaBlue: "#18345D",
}

export default StyleSheet.create({
  container: {
    backgroundColor: Colors.mainBackground
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
  searchInputPlaceholder: {
    color: "red",
  },
  textListSummary: {
    backgroundColor: Colors.mainBackground,
  },
  textListHeaderSummaryText: {
    color: Colors.secondaryText
  },
  textListHeader: {
    backgroundColor: Colors.textListHeader,
    borderColor: Colors.border,
  },
  connectionsPanelHeaderItemText: {
    color: Colors.secondaryText
  },
  connectionsPanelHeaderItemTextSelected: {
    color: Colors.mainText,
  },
  textListContentOuter: {
    backgroundColor: Colors.textBackground,
  },
  textListCitation: {
    color: Colors.secondaryText,
  },
  searchResultSummary: {
    borderColor: Colors.border
  },
  searchResultSummaryText: {
    color: Colors.tertiaryText,
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
    backgroundColor: Colors.buttonBackground
  },
  readerNavSectionTitle: {
    color: Colors.secondaryText
  },
  categorySectionTitle: {
    color: Colors.secondaryText
  },
  textBlockLink: {
    backgroundColor: Colors.buttonBackground
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
    backgroundColor: Colors.mainBackground,
    borderColor: Colors.border
  },
  verseNumber: {
    color: Colors.secondaryText
  },
  verseBullet: {
    color: "black"
  },
  sectionHeader: {
    borderColor: "#e6e5e6",
  },
  sectionHeaderText: {
    borderBottomColor: Colors.textSectionTitleBorder,
    color: Colors.secondaryText
  },
  sectionLink: {
    backgroundColor: Colors.mainForeground
  },
  loadingView: {
    backgroundColor: "transparent",
  },
  segmentHighlight: {
    backgroundColor: Colors.textSegmentHighlight
  },
  wordHighlight: {
    backgroundColor: Colors.wordHighlight,
  },
  textTocSectionString: {
    color: Colors.tertiaryText,
  },
  text: {
    color: Colors.mainForegroundContrast
  },
  contrastText: {
    color: Colors.mainForeground,
  },
  primaryText: {
    color: Colors.mainText,
  },
  secondaryText: {
    color: Colors.secondaryText,
  },
  tertiaryText: {
    color: Colors.tertiaryText,
  },
  quaternaryText: {
    color: Colors.quaternaryText,
  },
  bordered: {
    borderColor: Colors.border,
  },
  borderedBottom: {
    borderBottomColor: Colors.secondaryBorder,
  },
  borderDarker: {
    borderColor: Colors.secondaryText,
  },
  borderBottomDarker: {
    borderBottomColor: Colors.secondaryText,
  },
  bilingualEnglishText: {
    color: Colors.tertiaryText
  },
  languageToggleText: {
    color: Colors.secondaryText
  },
  secondaryBackground: {
    backgroundColor: Colors.secondaryText,
  },
  enConnectionMarker: {
    borderColor: "#ccc",
  },
  lightGreyBackground: {
    backgroundColor: Colors.lightGrey,
  },
  lightGreyBorder: {
    borderColor: Colors.lightGrey,
  },
  lighterGreyBorder: {
    borderColor: Colors.lighterGrey,
  },
  lighterGreyBackground: {
    backgroundColor: Colors.lighterGrey,
  },
  lightestGreyBackground: {
    backgroundColor: Colors.lightestGrey,
  },
  interfaceLangToggleInActive: {
    color: Colors.secondaryText,
  },
  interfaceLangToggleActive: {
    color: Colors.tertiaryText,
  },
  sefariaColorText:{
    color: Colors.sefariaBlue,
  },
  sefariaColorButton: {
    backgroundColor: Colors.sefariaBlue,
  },
  sefariaColorButtonText: {
    color: 'white'
  },
});
