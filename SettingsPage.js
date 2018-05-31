'use strict';

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ScrollView,
  Alert,
  AlertIOS,
} from 'react-native';
import VersionNumber from 'react-native-version-number';

import ProgressBar from './ProgressBar';
import {
  CategoryColorLine,
  CloseButton,
  ButtonToggleSet,
  LibraryNavButton,
  SefariaProgressBar,
} from './Misc.js';

import styles from './Styles';
import strings from './LocalizedStrings';


class SettingsPage extends React.Component {
  // Navigation Menu for a single category of texts (e.g., "Tanakh", "Bavli")
  static propTypes = {
    close:               PropTypes.func.isRequired,
    theme:               PropTypes.object.isRequired,
    themeStr:            PropTypes.string.isRequired,
    fontSize:            PropTypes.number.isRequired,
    interfaceLang:       PropTypes.oneOf(["english", "hebrew"]).isRequired,
    menuLanguage:        PropTypes.string.isRequired,
    defaultTextLanguage: PropTypes.string.isRequired,
    setTheme:            PropTypes.func.isRequired,
    setFontSize:         PropTypes.func.isRequired,
    setMenuLanguage:     PropTypes.func.isRequired,
    setDefaultTextLanguage: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.menuLanguageOptions = [
      {name: "english", text: strings.english, heText: strings.english, onPress: () => { this.setMenuLanguage("english"); }},
      {name: "hebrew", text: strings.hebrew, heText: strings.hebrew, onPress: () => { this.setMenuLanguage("hebrew"); }}
    ];

    this.textLanguageOptions = [
      {name: "english", text: strings.english, onPress: () => { this.props.setDefaultTextLanguage("english"); this.forceUpdate(); }},
      {name: "bilingual", text: strings.bilingual, onPress: () => { this.props.setDefaultTextLanguage("bilingual"); this.forceUpdate(); }},
      {name: "hebrew", text: strings.hebrew, onPress: () => { this.props.setDefaultTextLanguage("hebrew"); this.forceUpdate(); }}
    ];
    this.state = {};
  }
  _numPressesDebug = 0;

  onDebugNoLibraryTouch = () => {
    this._numPressesDebug++;
    if (this._numPressesDebug >= 7) {
      this._numPressesDebug = 0;
      Sefaria.downloader._setData("debugNoLibrary",!Sefaria.downloader._data.debugNoLibrary);
      Alert.alert(
      'Testing Library Mode',
      `You\'ve just ${Sefaria.downloader._data.debugNoLibrary ? "disabled" : "enabled"} library access. You can change this setting by tapping "OFFLINE ACCESS" seven times.`,
      [
        {text: 'OK', onPress: ()=>{this.forceUpdate();}},
      ]);
    }
  };

  setMenuLanguage = (lang) => {
    if (this.props.menuLanguage !== lang) {
      this.props.setMenuLanguage(lang);
      this.forceUpdate();
    }
  };

  render() {
    const langStyle = this.props.interfaceLang === "hebrew" ? styles.heInt : styles.enInt;
    var nDownloaded = Sefaria.downloader.titlesDownloaded().length;
    var nAvailable  = Sefaria.downloader.titlesAvailable().length;
    var nUpdates    = Sefaria.downloader.updatesAvailable().length;
    var updatesOnly = !!nUpdates && nDownloaded == nAvailable
    return (<View style={[styles.menu, this.props.theme.menu]}>
              <CategoryColorLine category={"Other"} />
              <View style={[styles.header, this.props.theme.header]}>
                <CloseButton onPress={this.props.close} theme={this.props.theme} themeStr={this.props.themeStr}/>
                <Text style={[langStyle, styles.settingsHeader, this.props.theme.text]}>{strings.settings.toUpperCase()}</Text>
              </View>

              <ScrollView contentContainerStyle={styles.menuContent}>
                <View style={styles.settingsSection}>
                  <View>
                    <Text style={[langStyle, styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.menuLanguage}</Text>
                  </View>
                  <ButtonToggleSet
                    theme={this.props.theme}
                    options={this.menuLanguageOptions}
                    lang={this.props.interfaceLang}
                    active={this.props.menuLanguage} />
                </View>

                <View style={styles.settingsSection}>
                  <View>
                    <Text style={[langStyle, styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.defaultTextLanguage}</Text>
                  </View>
                  <ButtonToggleSet
                    theme={this.props.theme}
                    options={this.textLanguageOptions}
                    lang={this.props.interfaceLang}
                    active={this.props.defaultTextLanguage} />
                </View>


                <View style={[styles.readerDisplayOptionsMenuDivider, styles.settingsDivider, this.props.theme.readerDisplayOptionsMenuDivider]}/>

                <TouchableWithoutFeedback onPress={this.onDebugNoLibraryTouch}>
                  <View>
                    <Text style={[langStyle, styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.offlineAccess}</Text>
                  </View>
                </TouchableWithoutFeedback>
                {Sefaria.downloader._data.debugNoLibrary ?
                  <Text style={[langStyle, styles.settingsMessage, this.props.theme.tertiaryText]}>Debug No Library</Text> : null }
                {Sefaria.downloader._data.shouldDownload ?
                  <View>
                    { !!nUpdates && updatesOnly && !Sefaria.downloader.downloading ?
                      <View>
                        <Text style={[langStyle, styles.settingsMessage, this.props.theme.tertiaryText]}>
                          {nUpdates} {strings.updatesAvailable}
                        </Text>
                        <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.downloadUpdates}>
                          <Text style={[langStyle, styles.buttonText]}>{strings.downloadUpdates}</Text>
                        </TouchableOpacity>
                      </View>
                      : null }

                    { !!nUpdates && !updatesOnly && !Sefaria.downloader.downloading ?
                      <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.resumeDownload}>
                        <Text style={[langStyle, styles.buttonText]}>{strings.resumeDownload}</Text>
                      </TouchableOpacity>
                      : null }

                    <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.checkForUpdates}>
                      <Text style={[langStyle, styles.buttonText]}>{strings.checkForUpdates}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.deleteLibrary}>
                      <Text style={[langStyle, styles.buttonText]}>{strings.deleteLibrary}</Text>
                    </TouchableOpacity>
                  </View>

                  : <View>
                    <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.downloadLibrary}>
                      <Text style={[langStyle, styles.buttonText]}>{strings.downloadLibrary}</Text>
                    </TouchableOpacity>
                  </View>

                }

                <OfflinePackageList
                  theme={this.props.theme}
                  themeStr={this.props.themeStr}
                  menuLanguage={this.props.menuLanguage}
                />

                <View style={[styles.readerDisplayOptionsMenuDivider, styles.settingsDivider, this.props.theme.readerDisplayOptionsMenuDivider]}/>


                <View>
                  <Text style={[langStyle, styles.settingsSectionHeader, this.props.theme.tertiaryText]}>
                    {strings.appVersion}: {VersionNumber.appVersion}
                  </Text>
                </View>
              </ScrollView>
            </View>);
  }
}

class OfflinePackageList extends React.Component {
  static propTypes = {
    theme:           PropTypes.object,
    themeStr:        PropTypes.string,
    menuLanguage:    PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = this.getStateBasedOnPkgData();
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  getStateBasedOnPkgData = () => {
    const onPressFuncs = {};
    const isDisabledObj = {};
    for (let pkgObj of Sefaria.packages.available) {
      const parent = Sefaria.packages.getSelectedParent(pkgObj.en);
      const onPress = !!parent ? this.onPressDisabled.bind(this, pkgObj.en, parent) : this.onPress.bind(this, pkgObj.en);
      onPressFuncs[pkgObj.en] = onPress;
      isDisabledObj[pkgObj.en] = !!parent;
    }
    return ({
      onPressFuncs,
      isDisabledObj,
    });
  }

  onPress = pkgName => {
    Sefaria.packages.updateSelected(pkgName).then(()=>{
      if (this._isMounted) {
        this.setState(this.getStateBasedOnPkgData())
      };
    })
  };

  onPressDisabled = (child, parent) => {
    AlertIOS.alert(
      "Package already selected",
      `"${child}" is included in "${parent}"`,
      [
        {text: strings.ok, onPress: () => {}}
      ]
    );
  };

  render() {
    // num available = all available filtered to p.indexes or unfiltered
    // nupdates = all updates filtered to p.indexes or unfiltered
    return (
      Sefaria.packages.available.map(p => {
        const isSelected = Sefaria.packages.isSelected(p.en);
        const isd = Sefaria.downloader.downloading && isSelected;
        const nAvailable = isd ? Sefaria.downloader.titlesAvailable().filter(t => Sefaria.packages.titleInPackage(t, p.en)).length : 0;
        const nUpdates   = isd ? Sefaria.downloader.updatesAvailable().filter(t => Sefaria.packages.titleInPackage(t, p.en)).length : 0;
        console.log(nUpdates, nAvailable);
        return (
          <View key={`${p.en}|${this.state.isDisabledObj[p.en]}|parent`}>
            <LibraryNavButton
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              menuLanguage={this.props.menuLanguage}
              catColor={Sefaria.palette.categoryColor(p.color)}
              enText={p.en}
              heText={p.he}
              count={`${Math.round(p.size / 1e6)}mb` /* NOTE: iOS uses 1e6 def of mb*/}
              onPress={this.state.onPressFuncs[p.en]}
              onPressCheckBox={this.state.onPressFuncs[p.en]}
              checkBoxSelected={0+isSelected}
              buttonStyle={{margin: 0, padding: 0, opacity: this.state.isDisabledObj[p.en] ? 0.6 : 1.0}}
              withArrow={false}
            />
            { isd ?
              <SefariaProgressBar
                theme={this.props.theme}
                themeStr={this.props.themeStr}
                progress={(nAvailable - nUpdates) / (nAvailable)}
                onPress={()=>{}}
                onClose={()=>{}}
              /> : null
            }
          </View>
        );
      })
    );
  }
}


export default SettingsPage;
