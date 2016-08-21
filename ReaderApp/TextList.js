'use strict';
import React, { Component } from 'react';
import { 	
  View,
  ScrollView,
  Text
} from 'react-native';
var styles = require('./Styles.js');
var {
  CategoryColorLine,
  TwoBox,
  TouchableOpacity
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
      viewList = viewList.concat(<LinkCategory category={cat.category} language={"english"}/>);
      var innerViewList = cat.books.map((obook)=>{
        return (<LinkBook title={obook.title} heTitle={obook.heTitle} language={"english"}/>);
      });
      viewList = viewList.concat(<TwoBox content={innerViewList}/>);

    });

    return (<ScrollView>
    {
      viewList
    }
      </ScrollView>);
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

var LinkCategory = React.createClass({

  propTypes: {
    category: React.PropTypes.string,
    language: React.PropTypes.string
  },

  render: function() {
    var style = {"borderColor": Sefaria.palette.categoryColor(this.props.category)};
    var content = this.props.language == "english"?
      (<Text style={styles.en}>{this.props.category}</Text>) :
      (<Text style={styles.he}>{Sefaria.hebrewCategory(this.props.category)}</Text>);
    return (<View style={[styles.readerNavCategory, style]}>
              {content}
            </View>);
  }
});

var LinkBook = React.createClass({
  propTypes: {
    title: React.PropTypes.string,
    heTitle: React.PropTypes.string,
    language: React.PropTypes.string
  },

  render: function() {
    return (
      <View  style={styles.textBlockLink}>
        { this.props.language == "hebrew" ? 
          <Text style={[styles.he, styles.centerText]}>{this.props.heTitle}</Text> :
          <Text style={[styles.en, styles.centerText]}>{this.props.title}</Text> }
      </View>
    );
  }
});

module.exports = TextList;
