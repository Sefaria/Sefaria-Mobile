'use strict';
import React, { Component } from 'react';
import {
  View,
  ScrollView,
  ListView,
  Text,
  TouchableOpacity,
  Dimensions
} from 'react-native';
var styles         = require('./Styles.js');
var HTMLView       = require('react-native-htmlview');
var TextListHeader = require('./TextListHeader');

const ViewPort = Dimensions.get('window');

var {
  CategoryColorLine,
  TwoBox
} = require('./Misc.js');


var TextList = React.createClass({
  propTypes: {
    settings:       React.PropTypes.object,
    openRef:        React.PropTypes.func.isRequired,
    openCat:        React.PropTypes.func.isRequired,
    closeCat:       React.PropTypes.func.isRequired,
    updateCat:      React.PropTypes.func.isRequired,
    onLinkLoad:     React.PropTypes.func.isRequired,
    linkContents:   React.PropTypes.array,
    segmentIndexRef:     React.PropTypes.number,
    links:          React.PropTypes.array,
    filterIndex:    React.PropTypes.number,
    recentFilters:  React.PropTypes.array, /* of the form [{title,heTitle,refList}...] */
    columnLanguage: React.PropTypes.string
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
        this.props.onLinkLoad({en:JSON.stringify(error),he:JSON.stringify(error)},rowId);
        let index = this._rowsLoading.indexOf(rowId);
        if (index != -1) this._rowsLoading.splice(index,1);
      })(ref,rowId);

      //here's the meat
      Sefaria.links.loadLinks(ref).then(resolve).catch(reject);
    };
    this._rowsToLoad = [];
  },
  componentWillUpdate: function(nextProps) {
    if (this.props.segmentIndexRef != nextProps.segmentIndexRef) {
      this.props.updateCat(nextProps.links,null);
    }
  },

  renderRow: function(linkContentObj,sectionId,rowId) {
    var ref = this.props.recentFilters[this.props.filterIndex].refList[rowId];
    var loading = false;
    if (linkContentObj == null) {
      loading = true;
      this._rowsToLoad.push({ref:ref,rowId:rowId});
      linkContentObj = {en:"Loading...",he:"טוען..."};
    }

    return (<LinkContent
              settings={this.props.settings}
              openRef={this.props.openRef}
              refStr={ref}
              linkContentObj={linkContentObj}
              columnLanguage={this.props.columnLanguage}
              loading={loading}
            />);
  },

  render: function() {
    var isSummaryMode = this.props.filterIndex == null;
    if (isSummaryMode) {

      var viewList = [];
      this.props.links.map((cat)=>{
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
            category={cat.category}
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
    }

    if (isSummaryMode) {
       return (<ScrollView>
        {viewList}
      </ScrollView>);
    } else {
      return (
      <View style={styles.textListContentOuter}>
        <TextListHeader
          Sefaria={Sefaria}
          updateCat={this.props.updateCat}
          closeCat={this.props.closeCat}
          category={this.props.recentFilters[this.props.filterIndex].category}
          filterIndex={this.props.filterIndex}
          recentFilters={this.props.recentFilters}
          columnLanguage={this.props.columnLanguage}
        />
        {this.props.linkContents.length == 0 ?
          <View style={styles.noLinks}><HTMLView value={"<i>No Links</i>"}/></View>:
          <ListView style={styles.textListContentListView}
            dataSource={dataSourceRows}
            renderRow={this.renderRow}
          />
        }

      </View>
      );
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

    var filter = {title:this.props.category,heTitle:heCategory,refList:this.props.refList,category:this.props.category};
    return (<TouchableOpacity
              style={[styles.readerNavCategory, style]}
              onPress={()=>{this.props.openCat(filter)}}>
              {content}
            </TouchableOpacity>);
  }
});

var LinkBook = React.createClass({
  propTypes: {
    openCat:  React.PropTypes.func.isRequired,
    title:    React.PropTypes.string,
    heTitle:  React.PropTypes.string,
    category: React.PropTypes.string,
    refList:  React.PropTypes.array,
    language: React.PropTypes.string,
    count:    React.PropTypes.number
  },

  render: function() {
    var countStr = " (" + this.props.count + ")";
    var filter = {title:this.props.title,heTitle:this.props.heTitle,refList:this.props.refList,category:this.props.category};
    return (
      <TouchableOpacity
        style={styles.textBlockLink}
        onPress={()=>{this.props.openCat(filter)}}>
        { this.props.language == "hebrew" ?
          <Text style={[styles.he, styles.centerText]}>{this.props.heTitle + countStr}</Text> :
          <Text style={[styles.en, styles.centerText]}>{this.props.title + countStr}</Text> }
      </TouchableOpacity>
    );
  }
});

var LinkContent = React.createClass({
  propTypes: {
    settings:          React.PropTypes.object,
    openRef:           React.PropTypes.func.isRequired,
    refStr:            React.PropTypes.string,
    linkContentObj:    React.PropTypes.object, /* of the form {en,he} */
    columnLanguage:    React.PropTypes.string,
    loading:           React.PropTypes.bool
  },

  render: function() {
    var lco = this.props.linkContentObj;
    var lang = Sefaria.util.getColumnLanguageWithContent(this.props.columnLanguage,lco.en,lco.he);
    var textViews = [];

    var hebrewElem =  <Text style={[styles.hebrewText,  {fontSize:this.props.settings.fontSize}]}>    <HTMLView stylesheet={styles} value={lco.he}/></Text>;
    var englishElem = <Text style={[styles.englishText, {fontSize:0.8*this.props.settings.fontSize}]}><HTMLView stylesheet={styles} value={lco.en}/></Text>;
    if (lang == "bilingual") {
      textViews = [hebrewElem,englishElem];
    } else if (lang == "hebrew") {
      textViews = [hebrewElem];
    } else if (lang == "english") {
      textViews = [englishElem];
    }

    return (
      <TouchableOpacity style={styles.searchTextResult} onPress={()=>{this.props.openRef(this.props.refStr,true)}}>
        <Text>{this.props.refStr}</Text>
        {textViews}
      </TouchableOpacity>
    );
  }
});
module.exports = TextList;
