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

        };
    },
    componentDidMount: function () {
 //     Sefaria.deleteAllFiles(); //need to convert to promise/enact a callback. sometimes deletes the file that's being unzipped below.
        this.loadNewText();
    },

    TextSegmentPressed: function(q) {
        this.setState({segmentRef: q})
    },

    loadNewText: function() {
        Sefaria.unZipAndLoadJSON(Sefaria.zipSourcePath(this.state.bookReference), Sefaria.JSONSourcePath(this.state.textReference), function (textRef) {
            this.setState({
                textRef: textRef,
                loaded: true
            });
        }.bind(this));
    },

    RefPressed: function(q) {
        this.setState({
			textReference: q=q.split(":")[0], 
      		bookReference: q = q.substring(0, q.lastIndexOf(" ")),
            loaded: false
        });
        this.loadNewText();
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
                    />
                    <ReaderPanel
                        textReference={this.state.textReference}
                        textRef={this.state.textRef.content}
                        segmentRef={this.state.segmentRef}
                        textList={1} style={styles.commentaryTextPanel}
                        RefPressed={ this.RefPressed }
                    />
                </View>
            );
        }
    },
});

AppRegistry.registerComponent('ReaderApp', () => ReaderApp);