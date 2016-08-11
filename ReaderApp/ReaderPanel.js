'use strict';

var React = require('react-native');

var {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} = React;

var ReaderNavigationMenu = require('./ReaderNavigationMenu');
var SearchPage           = require('./SearchPage');
var TextColumn           = require('./TextColumn');
var TextList             = require('./TextList');
var styles               = require('./Styles.js');


var ReaderPanel = React.createClass({
  propTypes: {

  },
  getInitialState: function () {
    return {
      menuOpen: null,
    	textFlow: this.props.textFlow || 'segmented', 	// alternative is 'continuous'
    	columnLanguage: this.props.columnLanguage || 'english', 	// alternative is 'hebrew' &  'bilingual'
      searchQuery: '',
      searchQueryResult: 'yoyoy'
    };
  },
  openMenu: function(menu) {
    this.setState({menuOpen: menu});
  },
  closeMenu: function() {
    this.openMenu(null);
  },
  openNav: function() {
    this.openMenu("navigation");
  },
  openSearch: function() {
    this.openMenu("search");
  },
  onQueryChange: function(query) {
    console.log("yo");
    var req = JSON.stringify(Sefaria.search.get_query_object(query,false,[],10,1,"text"));
    console.log(req);
    this.setState({searchQueryResult:"loading"});
    fetch(Sefaria.search.baseUrl,{
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: req
    })
    .then((response) => response.json())
    .then((responseJson) => {this.setState({searchQueryResult:JSON.stringify(responseJson["hits"]["hits"])});})
    .catch((error) => {
      this.setState({searchQueryResult:"error"});
    });
    
  },
  toggleTextFlow:function() {
    if (this.state.textFlow == "continuous") {
  	 this.setState({textFlow:  "segmented"})
  	} else {
  	 this.setState({textFlow:  "continuous"})
  	 
  	 if (this.state.columnLanguage == "bilingual") {
        this.setState({columnLanguage:  "hebrew"})
  	 }
  	}
  },
  togglecolumnLanguage:function() {
    switch(this.state.columnLanguage) {
      case "english":
          this.setState({columnLanguage:  "hebrew"})
          break;
      case "hebrew":
      	this.state.textFlow == "continuous" ? this.setState({columnLanguage:  "english"}) : this.setState({columnLanguage:  "bilingual"})
          break;
      case "bilingual":
          this.setState({columnLanguage:  "english"})
          break;
      default:
          this.setState({columnLanguage:  "bilingual"})
    }
  },
  render: function() {
    
    switch(this.state.menuOpen) {
      case (null):
        break;
      case ("navigation"):
        return (
          <ReaderNavigationMenu 
            openNav={this.openNav}
            closeNav={this.closeMenu} />);
        break;
      case ("search"):
        return(
          <SearchPage
          closeNav={this.closeMenu}
          onQueryChange={this.onQueryChange}
          searchQuery={this.state.searchQuery}
          searchQueryResult={this.state.searchQueryResult}/>);
        break;
    }

    return (
  		<View style={styles.container}>
    		<View style={styles.header}>
    			
          <TouchableOpacity onPress={this.openNav} style={[{width:30}]}>
            <Text>☰</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={this.toggleTextFlow} style={[{width:100}]}>
    				<Text style={styles.title}>
    					{this.state.textFlow}
    				</Text>
    			</TouchableOpacity>

    			<TouchableOpacity onPress={this.togglecolumnLanguage} style={[{width:100}]}>
    				<Text style={styles.title}>
    					{this.state.columnLanguage}
    				</Text>
    			</TouchableOpacity>

          <TouchableOpacity onPress={this.openSearch} style={[{width:30}]}>
            <Text>Search</Text>
          </TouchableOpacity>
    			
          <Text style={[{width:100}]}>
    			   {this.props.textReference}
    			</Text>
    		</View>
  	   	
        <View style={styles.mainTextPanel}>
          <TextColumn textRef={this.props.textRef} segmentRef={this.props.segmentRef} textFlow={this.state.textFlow} columnLanguage={this.state.columnLanguage} TextSegmentPressed={ this.props.TextSegmentPressed } />
        </View>
        <View style={styles.commentaryTextPanel}>
          <TextList textRef={this.props.textRef} segmentRef={this.props.segmentRef} textFlow={this.state.textFlow} columnLanguage={this.state.columnLanguage} RefPressed={ this.props.RefPressed } />
        </View>
      </View>);
  }
});


module.exports = ReaderPanel;
