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
    onLinkLoad:   React.PropTypes.func.isRequired,
    linkContents: React.PropTypes.array,
    segmentRef:   React.PropTypes.number,
    links:        React.PropTypes.array,
    filter:       React.PropTypes.object, /* of the form {title,heTitle,refList} */
    recentFilters:React.PropTypes.array
  },

  _rowsToLoad:[],
  _rowsLoading:[],

  getInitialState: function() {
    Sefaria = this.props.Sefaria; //Is this bad practice to use getInitialState() as an init function
    return {
      dataSource: new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2})
    };
  },

  onPressRef: function(q) {
    this.props.openRef(q);
  },
  componentDidUpdate: function() {
    for (let item of this._rowsToLoad) {
      var ref = item.ref;
      var rowId = item.rowId;
      if (this._rowsLoading.indexOf(rowId) == -1) {
        this._rowsLoading.push(rowId);
      } else
        continue; //wait for it to finish loading


      //closures to save ref and rowId
      var resolve = ((ref,rowId)=>(data)=>{
        this.props.onLinkLoad(data,rowId);
        let index = this._rowsLoading.indexOf(rowId);
        if (index != -1) this._rowsLoading.splice(index,1);
      })(ref,rowId);
      var reject = ((ref,rowId)=>(error)=>{
        this.props.onLinkLoad(error,rowId);
        let index = this._rowsLoading.indexOf(rowId);
        if (index != -1) this._rowsLoading.splice(index,1);
      })(ref,rowId);

      //here's the meat
      Sefaria.links.load_link(ref).then(resolve).catch(reject);
    };
    this._rowsToLoad = [];
  },

  renderRow: function(linkContent,sectionId,rowId) {
    if (linkContent == null) {
      var ref = this.props.filter.refList[rowId];
      this._rowsToLoad.push({ref:ref,rowId:rowId});
      linkContent = "Loading...";      
    } 

    return (<Text selectable={true}>{JSON.stringify(linkContent)}</Text>);
  },

  render: function() {
    var isSummaryMode = this.props.filter == null;
    if (isSummaryMode) {
      var links = Sefaria.links.linkSummary(this.props.links);

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
      var dataSourceRows = this.state.dataSource.cloneWithRows(this.props.linkContents);
      //console.log("links","refreshing links");
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
