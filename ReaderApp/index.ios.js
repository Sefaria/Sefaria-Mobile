/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';
var React   = require('react-native');
var styles  = require('./Styles.js');
var Sefaria = require('./sefaria');

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

var {
  LoadingView
} = require('./Misc.js');

var ReaderApp = React.createClass({
    getInitialState: function () {
        Sefaria.init().then(function() {
            this.forceUpdate();
        }.bind(this));

        return {
            segmentRef: 0,
            ref: "Exodus 1:1",
            textReference: "Exodus 1", 
            bookReference: "Exodus",
            loaded: false,
            menuOpen: "navigation",
            navigationCategories: [],
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

      Sefaria.data(ref).then(function(data) {

            this.setState({
                data: data,
                loaded: true
            });
         }.bind(this)).catch(function(error) {
          console.log('oh no', error);
        });

    },
    openRef: function(ref) {
        this.setState({
            loaded: false,
            textReference: ref
        });
        this.closeMenu();
        this.loadNewText(ref);
    },
    openMenu: function(menu) {
        this.setState({menuOpen: menu});
    },
    closeMenu: function() {
        this.clearMenuState();
        this.openMenu(null);
    },
    openNav: function() {
        this.openMenu("navigation");
    },
    setNavigationCategories: function(categories) {
        this.setState({navigationCategories: categories});
    },
    openSearch: function(query) {
        this.openMenu("search");
    },
    clearMenuState: function() {
        this.setState({
            navigationCategories: []
        });
    },
    render: function () {
        if (!this.state.loaded) { return <LoadingView />; }
        else {
            return (
                <View style={styles.container}>
                    <ReaderPanel
                        textReference={this.state.textReference}
                        data={this.state.data.content}
                        segmentRef={this.state.segmentRef}
                        textList={0}
                        menuOpen={this.state.menuOpen}
                        navigationCategories={this.state.navigationCategories}
                        style={styles.mainTextPanel}
                        TextSegmentPressed={ this.TextSegmentPressed }
                        openRef={ this.openRef }
                        interfaceLang={this.state.interfaceLang}
                        openMenu={this.openMenu}
                        closeMenu={this.closeMenu}
                        openNav={this.openNav}
                        setNavigationCategories={this.setNavigationCategories}
                        openSearch={this.openSearch}
                        Sefaria={Sefaria} />
                </View>
            );
        }
    },
});

AppRegistry.registerComponent('ReaderApp', () => ReaderApp);