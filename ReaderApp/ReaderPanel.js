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
    interfaceLang: React.PropTypes.string.isRequired
  },
  getInitialState: function () {
    return {
      menuOpen: "navigation",
      navigationCategories: [],
    	textFlow: this.props.textFlow || 'segmented', 	// alternative is 'continuous'
    	columnLanguage: this.props.columnLanguage || 'english', 	// alternative is 'hebrew' &  'bilingual'
      searchQuery: '',
      settings: {
        language:      "bilingual",
        layoutDefault: "segmented",
        layoutTalmud:  "continuous",
        layoutTanakh:  "segmented",
        color:         "light",
        fontSize:      62.5
      }
    };
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
  onQueryChange: function(query) {
    this.setState({searchQuery: query})
  },
  search: function(query) {
    this.setState({searchQuery: query || ''});    
    this.openSearch();
  },
  clearMenuState: function() {
    this.setState({
      navigationCategories: []
    });
  },
  toggleLanguage: function() {
    // Toggle current display language between english/hebrew only
    if (this.state.settings.language == "english") {
      this.state.settings.language = "hebrew";
    } else {
      this.state.settings.language = "english";
    }
    this.setState({settings: this.state.settings});
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
            categories={this.state.navigationCategories}
            setCategories={this.setNavigationCategories} 
            openNav={this.openNav}
            closeNav={this.closeMenu}
            openSearch={this.search} 
            settings={this.state.settings}
            interfaceLang={this.props.interfaceLang} />);
        break;
      case ("search"):
        return(
          <SearchPage
          closeNav={this.closeMenu}
          onQueryChange={this.onQueryChange}
          searchQuery={this.state.searchQuery}/>);
        break;
    }

    return (
  		<View style={styles.container}>
    		<View style={styles.header}>
    			
          <TouchableOpacity onPress={this.openNav}>
            <Text style={styles.headerButton}>☰</Text>
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
          <TextColumn data={this.props.data} segmentRef={this.props.segmentRef} textFlow={this.state.textFlow} columnLanguage={this.state.columnLanguage} TextSegmentPressed={ this.props.TextSegmentPressed } />
        </View>
        <View style={styles.commentaryTextPanel}>
          <TextList data={this.props.data} segmentRef={this.props.segmentRef} textFlow={this.state.textFlow} columnLanguage={this.state.columnLanguage} RefPressed={ this.props.RefPressed } />
        </View>
      </View>);
  }
});


module.exports = ReaderPanel;
