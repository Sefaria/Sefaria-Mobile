'use strict';
import React, { Component } from 'react';
import { 	AppRegistry,
  StyleSheet,
  View,
  ScrollView,
  Text,
  ListView
} from 'react-native';

var TextList = React.createClass({

  componentDidMount: function() {

  },


  componentWillReceiveProps: function(nextProps) {


  },


  onPressRef: function(q) {

//	 console.log(this.props);
    this.props.RefPressed(q);


  },


  render: function() {
    console.log(this.props.segmentRef);

    var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

    return (
      <ListView style={styles.listview}
                dataSource={ds.cloneWithRows(this.props.data[this.props.segmentRef].links)}
                renderRow={(rowData) =>  
      <View style={styles.verseContainer}>
      		<Text onPress={ () => this.onPressRef(rowData.sourceRef) } style={styles.englishText}>{rowData.sourceRef}</Text>
      </View>}
      />

    );
  }
  

});


var styles = StyleSheet.create({
  listView: {
    flex: 1,
    padding: 20,
    alignSelf: 'stretch'
  },

  verseContainer: {
    flex: 1,
//        flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 20,
    alignItems: "flex-start",
    width: 320

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


  container: {}

});

module.exports = TextList;
