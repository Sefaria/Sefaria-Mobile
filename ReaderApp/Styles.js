'use strict'
const React = require('react-native');
const { StyleSheet } = React;

module.exports = StyleSheet.create({
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
    header: {
        height: 45,
        backgroundColor: '#F9F9F7',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexDirection: 'row',
    },
    menu: {
        backgroundColor: '#f9f9f7',
        alignSelf: 'stretch',
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
        color:'#ff0000',
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
