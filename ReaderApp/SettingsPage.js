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
              <CategoryColorLine category={this.props.category} />
              <View style={[styles.header, this.props.theme.header]}>
                <CategoryColorLine category={"Other"} />
                <CloseButton onPress={this.props.close} theme={this.props.theme}/>
                <Text style={[]}>SETTINGS</Text>
              </View>

              <ScrollView style={styles.menuContent}>
                <Text>OFFLINE ACCESS</Text>
                <Text>Requires ~280MB of storage on your device.</Text>
                {Sefaria.downloader._data.shouldDownload ? 
                  <View>
                    <Text>{Sefaria.downloader.titlesDownloaded().length} / {Sefaria.downloader.titlesAvailable().length} texts downloaded.</Text>
                    <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.deleteLibrary}>
                      <Text>Delete Library</Text>
                    </TouchableOpacity>
                  </View> :
                  <View>
                    <TouchableOpacity style={styles.button} onPress={Sefaria.downloader.downloadLibrary}>
                      <Text>Download Library</Text>
                    </TouchableOpacity>
                  </View>

                }
              </ScrollView>
            </View>);
  }
});


module.exports = SettingsPage;