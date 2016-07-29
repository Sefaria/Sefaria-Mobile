/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';
var React = require('react-native');

const ZipArchive = require('react-native-zip-archive'); //for unzipping -- (https://github.com/plrthink/react-native-zip-archive)
var RNFS = require('react-native-fs'); //for access to file system -- (https://github.com/johanneslumpe/react-native-fs)
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
        //delete all files in the temporary directory
        RNFS.readDir(RNFS.DocumentDirectoryPath).then((result) => {
            for(var i = 0; i < result.length; i++) {
                RNFS.unlink(result[i].path)
                // spread is a method offered by bluebird to allow for more than a
                // single return value of a promise. If you use `then`, you will receive
                // the values inside of an array
                    .spread((success, path) => {
           //         console.log('FILE DELETED', success, path);
                })
                // `unlink` will throw an error, if the item to unlink does not exist
                    .catch((err) => {
          //          console.log(err.message);
                });
            }
        }).then(() => {
            this.unZipAndLoadJSON(this.zipSourcePath(this.state.bookReference), this.JSONSourcePath(this.state.textReference))
        })
        
        
    },
    
    JSONSourcePath: function (fileName) {
        return (RNFS.DocumentDirectoryPath + "/" + fileName + ".json");
    },
    zipSourcePath: function (fileName) {
    
        return (RNFS.MainBundlePath + "/sources/" + fileName + ".zip");
    },
    
    
    unZipAndLoadJSON: function (zipSourcePath, JSONSourcePath) {
    
    
        ZipArchive.unzip(zipSourcePath, RNFS.DocumentDirectoryPath).then(() => {
            var REQUEST_URL = JSONSourcePath;


            fetch(REQUEST_URL).then((response) => response.json()).then((responseData) => {

                this.setState({
                	textRef: responseData,
                	loaded: true,
                });

            }).done();
        })
    },



_TextSegmentPressed: function(q) {
	this.setState({segmentRef: q})
	
	//console.log(q)
},


_RefPressed: function(q) {

	

	this.setState({
			textReference: q=q.split(":")[0], 
      		bookReference: q = q.substring(0, q.lastIndexOf(" ")),
			loaded: false
				})

    this.unZipAndLoadJSON(this.zipSourcePath(this.state.bookReference), this.JSONSourcePath(this.state.textReference))


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
					_TextSegmentPressed={ this._TextSegmentPressed }
				 />
				<ReaderPanel 
					textReference={this.state.textReference} 
					textRef={this.state.textRef.content} 
					segmentRef={this.state.segmentRef} 
					textList={1} style={styles.commentaryTextPanel} 
					_RefPressed={ this._RefPressed } 
				/>
			</View>
            );
            
            }
    },
    
    






});




var styles = StyleSheet.create({
    modal: {
        justifyContent: 'center',
        flex: 1,
        textAlign: 'center',
        alignSelf: 'stretch',
        alignItems: "flex-end"
    },
    welcome: {
        fontSize: 20,
        textAlign: 'center',
        margin: 10
    },
    instructions: {
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5
    }, 
    
       container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5FCFF'
    },

    mainTextPanel: {
        flex: .5,
        flexWrap: "nowrap",
        justifyContent: 'center',
        backgroundColor: '#fff',
        alignSelf: 'stretch',
        alignItems: "flex-start"
    },
    commentaryTextPanel: {
        flex: .5,
        backgroundColor: '#F5FCFF',
        alignSelf: 'stretch',
        borderTopWidth: 1,
        borderColor: "#111"
    },
    listView: {
        flex: 1,
        padding: 20,
        alignSelf: 'stretch'
    },
    b: {
        fontWeight: "bold"
    },
    verseNumber: {
        textAlign: 'left',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
        fontFamily: "Montserrat",
        fontWeight: "100",
        marginRight: 20
    },
    englishSystemFont: {
        fontFamily: "Montserrat",
        fontWeight: "100"
    },
    title: {
        fontFamily: "EB Garamond",
        fontSize: 20
    },
    verseContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 20,
        alignItems: "flex-start"

    },
    rightContainer: {
        flex: 1
    },
    englishText: {
        fontFamily: "EB Garamond",
        textAlign: 'left',
        alignSelf: 'stretch',
        fontSize: 16,
        flex: 1
    },
    hebrewText: {
        fontFamily: "Taamey Frank CLM",
        textAlign: 'right',
        alignSelf: 'stretch',
        fontSize: 20,
        flex: 1
    },
    hebrewSystemFont: {
        fontFamily: "Open Sans Hebrew"
    },
	blank: {
	height:0,
	width:0
		}
});
AppRegistry.registerComponent('ReaderApp', () => ReaderApp);