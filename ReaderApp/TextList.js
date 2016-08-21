'use strict';
import React, { Component } from 'react';
import { 	AppRegistry,
  StyleSheet,
  View,
  ScrollView,
  Text,
  ListView
} from 'react-native';

var {
  CategoryColorLine,
  TwoBox,
} = require('./Misc.js');


var TextList = React.createClass({
  propTypes: {
    openRef:    React.PropTypes.func.isRequired,
    segmentRef: React.PropTypes.number,
    links:      React.PropTypes.array
  },

  getInitialState: function() {
    Sefaria = this.props.Sefaria;
    
    return {};
  },

  componentDidMount: function() {

  },


  componentWillReceiveProps: function(nextProps) {


  },


  onPressRef: function(q) {

//	 console.log(this.props);
    this.props.openRef(q);


  },



  render: function() {

    var links = Sefaria.linkSummary(this.props.links);

    var viewList = [];
    links.map((cat)=>{
      viewList = viewList.concat(<Text>{cat.category}</Text>);
      var innerViewList = cat.books.map((obook)=>{
        return (<Text>{obook.book}</Text>);
      });
      viewList = viewList.concat(<TwoBox content={innerViewList}/>);

    });

    return (<View>
    {
      viewList
    }
      </View>);
    /*return (
      <ListView style={styles.listview}
                dataSource={ds.cloneWithRows(links)}
                renderRow={(rowData) =>  
      <View style={styles.verseContainer}>
      		<Text onPress={ () => this.onPressRef(rowData.sourceRef) } style={styles.englishText}>{rowData.category}</Text>
      </View>}
      />

    );*/
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
