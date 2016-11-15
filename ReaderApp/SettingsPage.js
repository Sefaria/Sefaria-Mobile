'use strict';

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';

var {
  CategoryColorLine,
  CloseButton
} = require('./Misc.js');

var styles = require('./Styles.js');


var SettingsPage = React.createClass({
  // Navigation Menu for a single category of texts (e.g., "Tanakh", "Bavli")
  propTypes: {
    close:       React.PropTypes.func.isRequired,
    theme:       React.PropTypes.object.isRequired,
    Sefaria:     React.PropTypes.object.isRequired
  },
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
  render: function() {
    return (<View style={[styles.menu, this.props.theme.menu]}>
              <CategoryColorLine category={"Other"} />
              <View style={[styles.header, this.props.theme.header]}>
                <CloseButton onPress={this.props.close} theme={this.props.theme}/>
                <Text style={[styles.settingsHeader, this.props.theme.text]}>SETTINGS</Text>
              </View>

              <ScrollView style={styles.menuContent}>
                <Text style={[styles.settingsSectionHeader, this.props.theme.tertiaryText]}>OFFLINE ACCESS</Text>
                <Text style={[styles.settingsMessage, this.props.theme.tertiaryText]}>Requires ~280MB of storage on your device.</Text>
                {Sefaria.downloader._data.shouldDownload ? 
                  <View>
                    <Text style={[styles.settingsMessage, this.props.theme.tertiaryText]}>{Sefaria.downloader.titlesDownloaded().length} / {Sefaria.downloader.titlesAvailable().length} texts downloaded.</Text>
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