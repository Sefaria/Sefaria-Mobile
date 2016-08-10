/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';
var React   = require('react-native');
var styles  = require('./Styles.js');
require('./sefaria.js');
// var HTMLView = require('react-native-htmlview'); //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)

var {
	AppRegistry, 
	StyleSheet, 
	ScrollView, 
	Text, 
	View, 
	ListView, 
	Modal, 
	TextInput, 
	TouchableOpacity, 
	ActivityIndicatorIOS
	} = React;

var ReaderPanel = require('./ReaderPanel');

var ReaderApp = React.createClass({
    getInitialState: function () {
        return {
        	segmentRef: 0,
        	ref: "Exodus 1:1",
      		textReference: "Exodus 1", 
      		bookReference: "Exodus", 
      		loaded: false,
            interfaceLang: "english" // TODO check device settings for Hebrew
        };
    },
    componentDidMount: function () {
      Sefaria._deleteAllFiles().then(function() {
          this.loadNewText(this.state.ref);
         }.bind(this)).catch(function(error) {
          console.log('oh no', error);
        });


    },

    TextSegmentPressed: function(q) {
        this.setState({segmentRef: q})
    },

    loadNewText: function(ref) {

      Sefaria.text(ref).then(function(data) {
            this.setState({
                textRef: data,
                loaded: true
            });
         }.bind(this)).catch(function(error) {
          console.log('oh no', error);
        });

    },

    RefPressed: function(ref) {
        this.setState({
            loaded: false
        });
        this.loadNewText(ref);
    },
    renderLoadingView: function () {
        return (
            <View style={styles.container}>
				<ActivityIndicatorIOS
				  animating={this.state.animating}
				  style={[styles.centering, {height: 80}]}
				  size="large"
				/>
            </View>
        );
    },
    render: function () {
        if (!this.state.loaded) {return this.renderLoadingView();}
        else {
            return (
                <View style={styles.container}>
                    <ReaderPanel
                        textReference={this.state.textReference}
                        textRef={this.state.textRef.content}
                        segmentRef={this.state.segmentRef}
                        textList={0}
                        style={styles.mainTextPanel}
                        TextSegmentPressed={ this.TextSegmentPressed }
                        RefPressed={ this.RefPressed }
                        interfaceLang={this.state.interfaceLang} />
                </View>
            );
        }
    },
});

AppRegistry.registerComponent('ReaderApp', () => ReaderApp);