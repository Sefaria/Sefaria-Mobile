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

var styles = require('./Styles.js');


var SettingsPage = React.createClass({
  // Navigation Menu for a single category of texts (e.g., "Tanakh", "Bavli")
  propTypes: {
    close:       React.PropTypes.func.isRequired,
    theme:       React.PropTypes.object.isRequired,
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
      {name: "english", text: "ENGLISH", heText: "ENGLISH", onPress: () => { setMenuLanguage("english"); }},
      {name: "hebrew", text: "HEBREW", heText: "HEBREW", onPress: () => { setMenuLanguage("hebrew"); }}
    ];

    var textLanguageOptions = [
      {name: "english", text: "ENGLISH", heText: "ENGLISH", onPress: () => { Sefaria.settings.set("defaultTextLanguage", "english"); this.forceUpdate(); }},
      {name: "bilingual", text: "BILINGUAL", heText: "BILINGUAL", onPress: () => { Sefaria.settings.set("defaultTextLanguage", "bilingual"); this.forceUpdate(); }},
      {name: "hebrew", text: "HEBREW", heText: "HEBREW", onPress: () => { Sefaria.settings.set("defaultTextLanguage", "hebrew"); this.forceUpdate(); }}
    ];

    var nDownloaded = Sefaria.downloader.titlesDownloaded().length;
    var nAvailable  = Sefaria.downloader.titlesAvailable().length;
    var downloadComplete = nDownloaded == nAvailable;
    return (<View style={[styles.menu, this.props.theme.menu]}>
              <CategoryColorLine category={"Other"} />
              <View style={[styles.header, this.props.theme.header]}>
                <CloseButton onPress={this.props.close} theme={this.props.theme}/>
                <Text style={[styles.settingsHeader, this.props.theme.text]}>SETTINGS</Text>
              </View>

              <ScrollView style={styles.menuContent}>
                <View style={styles.settingsSection}>
                  <View>
                    <Text style={[styles.settingsSectionHeader, this.props.theme.tertiaryText]}>MENU LANGUAGE</Text>
                  </View>
                  <ButtonToggleSet
                    theme={this.props.theme}
                    options={menuLanguageOptions}
                    contentLang={"english"}
                    active={Sefaria.settings.menuLanguage} />
                </View>

                <View style={styles.settingsSection}>                
                  <View>
                    <Text style={[styles.settingsSectionHeader, this.props.theme.tertiaryText]}>DEFAULT TEXT LANGUAGE</Text>
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
                    <Text style={[styles.settingsSectionHeader, this.props.theme.tertiaryText]}>OFFLINE ACCESS</Text>
                  </View>
                </TouchableWithoutFeedback>
                {Sefaria.downloader._data.debugNoLibrary ?
                  <Text style={[styles.settingsMessage, this.props.theme.tertiaryText]}>Debug No Library</Text> : null }
                <Text style={[styles.settingsMessage, this.props.theme.tertiaryText]}>Requires ~280MB of storage on your device.</Text>
                {Sefaria.downloader._data.shouldDownload ?
                  <View>
                    <Text style={[styles.settingsMessage, this.props.theme.tertiaryText]}>
                       {Sefaria.downloader.downloading ? "Download in progress (" : ""}
                       {nDownloaded} / {nAvailable} texts downloaded
                       {Sefaria.downloader.downloading ? ") " : "."}
                    </Text>
                    {Sefaria.downloader.downloading ?
                      <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center'}}>
                        <ProgressBar
                          fillStyle={{}}
                          backgroundStyle={{backgroundColor: '#cccccc', borderRadius: 2}}
                          style={{marginTop: 0, marginBottom: 10, width: 300}}
                          progress={nDownloaded / nAvailable} />
                      </View>
                      : null
                    }

                    {!downloadComplete && !Sefaria.downloader.downloading ?
                      <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.resumeDownload}>
                        <Text style={styles.buttonText}>Resume Download</Text>
                      </TouchableOpacity>
                      : null }
                    <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.deleteLibrary}>
                      <Text style={styles.buttonText}>Delete Library</Text>
                    </TouchableOpacity>
                  </View> :
                  <View>
                    <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.downloadLibrary}>
                      <Text style={styles.buttonText}>Download Library</Text>
                    </TouchableOpacity>
                  </View>

                }
              </ScrollView>
            </View>);
  }
});


module.exports = SettingsPage;
