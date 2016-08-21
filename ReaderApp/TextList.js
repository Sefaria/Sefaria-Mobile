'use strict';
import React, { Component } from 'react';
import { 	
  View,
  ScrollView,
  ListView,
  Text,
  TouchableOpacity
} from 'react-native';
var styles = require('./Styles.js');
var {
  CategoryColorLine,
  TwoBox
} = require('./Misc.js');


var TextList = React.createClass({
  propTypes: {
    openRef:      React.PropTypes.func.isRequired,
    openCat:      React.PropTypes.func.isRequired,
    segmentRef:   React.PropTypes.number,
    links:        React.PropTypes.array,
    filter:       React.PropTypes.array, /* for legacy reasons it's an array */
    recentFilters:React.PropTypes.array
  },

  getInitialState: function() {
    Sefaria = this.props.Sefaria; //Is this bad practice to use getInitialState() as an init function
    return {
      dataSource: new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2})
    };
  },

  onPressRef: function(q) {
    this.props.openRef(q);
  },

  renderRow: function(rowData) {
    return (<Text onClick={this.props.openRef}>{rowData}</Text>);
  },

  render: function() {
    var isSummaryMode = this.props.filter.length == 0;
    if (isSummaryMode) {
      var links = Sefaria.linkSummary(this.props.links);

      var viewList = [];
      links.map((cat)=>{
        viewList.push(
          <LinkCategory 
            category={cat.category}
            refList={cat.refList} 
            count={cat.count} 
            language={"english"} 
            openCat={this.props.openCat}
          />);
        var innerViewList = cat.books.map((obook)=>{
          return (
          <LinkBook 
            title={obook.title} 
            heTitle={obook.heTitle}
            refList={obook.refList} 
            count={obook.count} 
            language={"english"} 
            openCat={this.props.openCat}
          />);
        });
        viewList.push(<TwoBox content={innerViewList}/>);

      });
    } else {
      var dataSourceRows = this.state.dataSource.cloneWithRows(this.props.filter[0].refList);
    }

    if (isSummaryMode) {
       return (<ScrollView>
        {viewList}
      </ScrollView>);
    } else {
      return (<ListView 
        dataSource={dataSourceRows}
        renderRow={this.renderRow}
      />);
    }
  }
  

});

var LinkCategory = React.createClass({

  propTypes: {
    openCat:  React.PropTypes.func.isRequired,
    category: React.PropTypes.string,
    refList:  React.PropTypes.array,
    language: React.PropTypes.string,
    count:    React.PropTypes.number
  },

  render: function() {
    var countStr = " | " + this.props.count;
    var style = {"borderColor": Sefaria.palette.categoryColor(this.props.category)};
    var heCategory = Sefaria.hebrewCategory(this.props.category);
    var content = this.props.language == "english"?
      (<Text style={styles.en}>{this.props.category.toUpperCase() + countStr}</Text>) :
      (<Text style={styles.he}>{heCategory + countStr}</Text>);
    return (<TouchableOpacity 
              style={[styles.readerNavCategory, style]} 
              onPress={()=>{this.props.openCat(this.props.category,heCategory,this.props.refList)}}>
              {content}
            </TouchableOpacity>);
  }
});

var LinkBook = React.createClass({
  propTypes: {
    openCat:  React.PropTypes.func.isRequired,
    title:    React.PropTypes.string,
    heTitle:  React.PropTypes.string,
    refList:  React.PropTypes.array,
    language: React.PropTypes.string,
    count:    React.PropTypes.number
  },

  render: function() {
    var countStr = " (" + this.props.count + ")";
    return (
      <TouchableOpacity  
        style={styles.textBlockLink} 
        onPress={()=>{this.props.openCat(this.props.title,this.props.heTitle,this.props.refList)}}>
        { this.props.language == "hebrew" ? 
          <Text style={[styles.he, styles.centerText]}>{this.props.heTitle + countStr}</Text> :
          <Text style={[styles.en, styles.centerText]}>{this.props.title + countStr}</Text> }
      </TouchableOpacity>
    );
  }
});

module.exports = TextList;
