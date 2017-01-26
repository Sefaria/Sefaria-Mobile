'use strict';

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
var ProgressBar = require('./ProgressBar');
var {
  CategoryColorLine,
  CloseButton,
  ButtonToggleSet,
} = require('./Misc.js');

const styles  = require('./Styles');
const strings = require('./LocalizedStrings');


var SettingsPage = React.createClass({
  // Navigation Menu for a single category of texts (e.g., "Tanakh", "Bavli")
  propTypes: {
    close:       React.PropTypes.func.isRequired,
    theme:       React.PropTypes.object.isRequired,
    toggleMenuLanguage: React.PropTypes.func.isRequired,
    Sefaria:     React.PropTypes.object.isRequired
  },
  _numPressesDebug: 0,
  getInitialState: function() {
    Sefaria = this.props.Sefaria;
    return {};
  },
  componentDidMount: function() {
    Sefaria.downloader.onChange = this.onDownloaderChange;
  },
  componentWillUnmount: function() {
    Sefaria.downloader.onChange = null;
  },
  onDownloaderChange: function() {
    this.forceUpdate();
  },
  onDebugNoLibraryTouch: function() {
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
  },
  render: function() {
    var setMenuLanguage = function(lang) {
      if (Sefaria.settings.menuLangue !== lang) {
        this.props.toggleMenuLanguage();
        Sefaria.settings.set("menuLanguage", lang);
        this.forceUpdate();
      }
    }.bind(this);
    var menuLanguageOptions = [
      {name: "english", text: strings.english, heText: strings.english, onPress: () => { setMenuLanguage("english"); }},
      {name: "hebrew", text: strings.hebrew, heText: strings.hebrew, onPress: () => { setMenuLanguage("hebrew"); }}
    ];

    var textLanguageOptions = [
      {name: "english", text: strings.english, heText: strings.english, onPress: () => { Sefaria.settings.set("defaultTextLanguage", "english"); this.forceUpdate(); }},
      {name: "bilingual", text: strings.bilingual, heText: strings.bilingual, onPress: () => { Sefaria.settings.set("defaultTextLanguage", "bilingual"); this.forceUpdate(); }},
      {name: "hebrew", text: strings.hebrew, heText: strings.hebrew, onPress: () => { Sefaria.settings.set("defaultTextLanguage", "hebrew"); this.forceUpdate(); }}
    ];

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

              <ScrollView style={styles.menuContent}>
                <View style={styles.settingsSection}>
                  <View>
                    <Text style={[styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.menuLanguage}</Text>
                  </View>
                  <ButtonToggleSet
                    theme={this.props.theme}
                    options={menuLanguageOptions}
                    contentLang={"english"}
                    active={Sefaria.settings.menuLanguage} />
                </View>

                <View style={styles.settingsSection}>
                  <View>
                    <Text style={[styles.settingsSectionHeader, this.props.theme.tertiaryText]}>{strings.defaultTextLanguage}</Text>
                  </View>
                  <ButtonToggleSet
                    theme={this.props.theme}
                    options={textLanguageOptions}
                    contentLang={"english"}
                    active={Sefaria.settings.defaultTextLanguage} />
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


                    { !Sefaria.downloader.downloading ?
                      <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.checkForUpdates}>
                        <Text style={styles.buttonText}>{strings.checkForUpdates}</Text>
                      </TouchableOpacity> 
                      : null }

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
              </ScrollView>
            </View>);
  }
});


module.exports = SettingsPage;
