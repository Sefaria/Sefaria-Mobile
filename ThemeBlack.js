'use strict'
import { StyleSheet } from 'react-native';

let Colors = {
  border: "#444",
  secondaryBorder: "#666",
  mainBackground: "#2d2d2b",
  mainText: "#fff",
  secondaryText: "#ddd",
  tertiaryText: "#bbb",
  quaternaryText: "#999",
  mainForeground: "black",
  mainForegroundContrast: "white",
  textBackground: "#333331",
  textSectionTitleBorder: "#666",
  lightGrey: "#3d3d3d",
  lighterGrey: "#1d1d1d",
  lightestGrey: "#2d2d2d",
  textSegmentHighlight: "#343444",
  wordHighlight: "#4d627d",
  textListHeader: "#333",
  button: "#ddd",
  buttonBackground: "#333331",
  sefariaBlue: "#18345D",
  buttonBlue: '#0B71E7',
  // Surface the SSO (Google/Apple) buttons sit on. Intentionally white even in
  // the dark theme -- see the ssoButtonBackground comment below -- which is why
  // it is its own constant instead of mainForeground/buttonBackground.
  ssoButtonSurface: "#FFFFFF",
  errorBannerBackground: "#4A1F1F",
  errorBannerBorder: "#D9534F",
  errorBannerText: "#F5A9A9",
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
    backgroundColor: Colors.textBackground,
  },
  readerDisplayOptionsMenuItemSelected: {
    backgroundColor: "#444"
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
  openButton : {
    color: Colors.buttonBlue
  },
  searchInputPlaceholder: {
    color: "#CCC",
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
    color: Colors.mainText,
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
  categoryTitle: {
    color: Colors.mainText
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
    color: "white"
  },
  sectionHeader: {
    borderColor: Colors.border,
  },
  sectionHeaderText: {
    borderBottomColor: Colors.textSectionTitleBorder,
    color: Colors.secondaryText
  },
  sectionLink: {
    backgroundColor: Colors.buttonBackground
  },
  loadingView: {
    backgroundColor: "transparent"
  },
  segmentHighlight: {
    backgroundColor: Colors.textSegmentHighlight
  },
  wordHighlight: {
    backgroundColor: Colors.wordHighlight,
  },
  textTocSectionString: {
    color: Colors.tertiaryText
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
    color: Colors.secondaryText,
  },
  languageToggleText: {
    color: Colors.secondaryText
  },
  secondaryBackground: {
    backgroundColor: Colors.secondaryText,
  },
  enConnectionMarker: {
    borderColor: "#999",
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
    color: Colors.mainForegroundContrast,
  },
  sefariaColorButton: {
    backgroundColor: Colors.sefariaBlue,
  },
  sefariaColorButtonText: {
    color: 'white'
  },
  languageName: {
    color: Colors.tertiaryText,
    borderColor: Colors.border,
  },
  // SSO (Google/Apple) button colors. Background stays white even in dark
  // mode: img/sso-google.png is Google's full-color "G" mark, which its brand
  // guidelines require on a white/near-white background, and img/sso-apple.png
  // is solid black with no light-on-dark variant shipped, so it would vanish
  // on a dark button. Border/text stay sefariaBlue for the same reason -- they
  // sit on that same white surface regardless of app theme.
  ssoButtonBackground: {
    backgroundColor: Colors.ssoButtonSurface,
  },
  ssoButtonBorder: {
    borderColor: Colors.sefariaBlue,
  },
  ssoButtonText: {
    color: Colors.sefariaBlue,
  },
  ssoDividerLine: {
    backgroundColor: Colors.secondaryBorder,
  },
  ssoDividerText: {
    color: Colors.tertiaryText,
  },
  ssoErrorBannerBackground: {
    backgroundColor: Colors.errorBannerBackground,
  },
  ssoErrorBannerBorder: {
    borderColor: Colors.errorBannerBorder,
  },
  ssoErrorBannerText: {
    color: Colors.errorBannerText,
  },
});
