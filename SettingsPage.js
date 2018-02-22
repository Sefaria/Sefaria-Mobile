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
  Alert
} from 'react-native';
import VersionNumber from 'react-native-version-number';

import ProgressBar from './ProgressBar';
import {
  CategoryColorLine,
  CloseButton,
  ButtonToggleSet,
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

  componentDidMount() {
    Sefaria.downloader.onChange = this.onDownloaderChange;
  }

  componentWillUnmount() {
    Sefaria.downloader.onChange = null;
  }

  onDownloaderChange = () => {
    this.forceUpdate();
  };

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

    var nDownloaded = Sefaria.downloader.titlesDownloaded().length;
    var nAvailable  = Sefaria.downloader.titlesAvailable().length;
    var nUpdates    = Sefaria.downloader.updatesAvailable().length;
    var updatesOnly = !!nUpdates && nDownloaded == nAvailable
    return (<View style={[styles.menu, this.props.theme.menu]}>
              <CategoryColorLine category={"Other"} />
              <View style={[styles.header, this.props.theme.header]}>
                <CloseButton onPress={this.props.close} theme={this.props.theme} themeStr={this.props.themeStr}/>
                <Text style={[styles.settingsHeader, this.props.theme.text]}>{strings.settings.toUpperCase()}</Text>
              </View>

              <ScrollView contentContainerStyle={styles.menuContent}>
                <View style={styles.settingsSection}>
                  <View>
                    <Text style={[styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.menuLanguage}</Text>
                  </View>
                  <ButtonToggleSet
                    theme={this.props.theme}
                    options={this.menuLanguageOptions}
                    contentLang={"english"}
                    active={this.props.menuLanguage} />
                </View>

                <View style={styles.settingsSection}>
                  <View>
                    <Text style={[styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.defaultTextLanguage}</Text>
                  </View>
                  <ButtonToggleSet
                    theme={this.props.theme}
                    options={this.textLanguageOptions}
                    contentLang={"english"}
                    active={this.props.defaultTextLanguage} />
                </View>


                <View style={[styles.readerDisplayOptionsMenuDivider, styles.settingsDivider, this.props.theme.readerDisplayOptionsMenuDivider]}/>

                <TouchableWithoutFeedback onPress={this.onDebugNoLibraryTouch}>
                  <View>
                    <Text style={[styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.offlineAccess}</Text>
                  </View>
                </TouchableWithoutFeedback>

                {Sefaria.downloader._data.debugNoLibrary ?
                  <Text style={[styles.settingsMessage, this.props.theme.tertiaryText]}>Debug No Library</Text> : null }
                <Text style={[styles.settingsMessage, this.props.theme.tertiaryText]}>{strings.offlineAccessMessage}</Text>
                {Sefaria.downloader._data.shouldDownload ?
                  <View>
                    <Text style={[styles.settingsMessage, this.props.theme.tertiaryText]}>
                       {Sefaria.downloader.downloading ? strings.downloadInProgress + " (" : ""}
                       {nAvailable - nUpdates} / {nAvailable}  {strings.textsDownloaded}
                       {Sefaria.downloader.downloading ? ") " : "."}
                    </Text>
                    {Sefaria.downloader.downloading ?
                      <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center'}}>
                        <ProgressBar
                          fillStyle={{}}
                          backgroundStyle={{backgroundColor: '#cccccc', borderRadius: 2}}
                          style={{marginTop: 0, marginBottom: 10, width: 300}}
                          progress={(nAvailable - nUpdates) / nAvailable} />
                      </View>
                      : null
                    }

                    { !!nUpdates && updatesOnly && !Sefaria.downloader.downloading ?
                      <View>
                        <Text style={[styles.settingsMessage, this.props.theme.tertiaryText]}>
                          {nUpdates} {strings.updatesAvailable}
                        </Text>
                        <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.downloadUpdates}>
                          <Text style={styles.buttonText}>{strings.downloadUpdates}</Text>
                        </TouchableOpacity>
                      </View>
                      : null }

                    { !!nUpdates && !updatesOnly && !Sefaria.downloader.downloading ?
                      <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.resumeDownload}>
                        <Text style={styles.buttonText}>{strings.resumeDownload}</Text>
                      </TouchableOpacity>
                      : null }

                    <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.checkForUpdates}>
                      <Text style={styles.buttonText}>{strings.checkForUpdates}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.deleteLibrary}>
                      <Text style={styles.buttonText}>{strings.deleteLibrary}</Text>
                    </TouchableOpacity>
                  </View>

                  : <View>
                    <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.downloadLibrary}>
                      <Text style={styles.buttonText}>{strings.downloadLibrary}</Text>
                    </TouchableOpacity>
                  </View>

                }

                <View style={[styles.readerDisplayOptionsMenuDivider, styles.settingsDivider, this.props.theme.readerDisplayOptionsMenuDivider]}/>

                <View>
                  <Text style={[styles.settingsSectionHeader, this.props.theme.tertiaryText]}>
                    {strings.appVersion}: {VersionNumber.appVersion}
                  </Text>
                </View>
              </ScrollView>
            </View>);
  }
}


export default SettingsPage;
