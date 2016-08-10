'use strict';

var React = require('react-native');
var Sefaria = require('./sefaria');

var {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} = React;

var {
  CategoryColorLine,
  TwoBox,
  LanguageToggleButton
} = require('./Util.js');

var SearchBar = require('./SearchBar');

var styles = require('./Styles.js');


var ReaderNavigationMenu = React.createClass({
  // The Navigation menu for browsing and searching texts
  propTypes: {
    categories:    React.PropTypes.array.isRequired,
    settings:      React.PropTypes.object.isRequired,
    interfaceLang: React.PropTypes.string.isRequired,
    setCategories: React.PropTypes.func.isRequired,
    closeNav:      React.PropTypes.func.isRequired,
    openNav:       React.PropTypes.func.isRequired,
    openSearch:    React.PropTypes.func.isRequired,
    //onTextClick:   React.PropTypes.func.isRequired,
    //onRecentClick: React.PropTypes.func.isRequired,
    //closePanel:    React.PropTypes.func,
  },
  getInitialState: function() {
    return {
      showMore: false,
    };
  },
  componentDidMount: function() {

  },
  showMore: function() {
    this.setState({showMore: true});
  },
  navHome: function() {
    this.props.setCategories([]);
  },
  render: function() {
    if (this.props.categories.length) {
      // List of Text in a Category
      return (<ReaderNavigationCategoryMenu
                categories={this.props.categories}
                category={this.props.categories.slice(-1)[0]}
                closeNav={this.props.closeNav}
                setCategories={this.props.setCategories}
                openText={this.props.openText}
                toggleLanguage={this.props.toggleLanguage}
                navHome={this.navHome} />);
    } else {
      // Root Library Menu
      var categories = [
        "Tanakh",
        "Mishnah",
        "Talmud",
        "Midrash",
        "Halakhah",
        "Kabbalah",
        "Liturgy",
        "Philosophy",
        "Tosefta",
        "Chasidut",
        "Musar",
        "Responsa",
        "Apocrypha",
        "Modern Works",
        "Other"
      ];
      var language = this.props.settings.language == "hebrew" ? "hebrew" : "english";
      categories = categories.map(function(cat) {
        var openCat = function() {this.props.setCategories([cat])}.bind(this);
        var heCat   = Sefaria.hebrewCategory(cat);
        return (<CategoryBlockLink
                  category={cat}
                  heCat={heCat}
                  language={language}
                  onPress={openCat} />);
      }.bind(this));
      var more = (<CategoryBlockLink 
                    category={"More"}
                    heCat={"עוד"}
                    language={language}
                    onPress={this.showMore} />);
      categories = this.state.showMore ? categories : categories.slice(0,9).concat(more);
      categories = (<View style={styles.readerNavCategories}><TwoBox content={categories} /></View>);

      var title = (<View style={styles.navigationMenuTitle}>
                    <LanguageToggleButton toggleLanguage={this.props.toggleLanguage} language={language} />
                    { this.props.interfaceLang == "english" ?
                      <Text styles={styles.intEn}>The Sefaria Library</Text> :
                      <Text styles={styles.intHe}>האוסף של ספאריה</Text>}
                  </View>);

      return(<View style={[styles.container, styles.menu]}>
              <SearchBar 
                closeNav={this.props.closeNav}
                onQueryChange={this.props.openSearch} />
              <View>
                {title}
                <ReaderNavigationMenuSection 
                  title="Browse" 
                  heTitle="טקסטים"
                  content={categories} 
                  interfaceLang={this.props.interfaceLang} />
              </View>
            </View>);
    }
  }
});


var CategoryBlockLink = React.createClass({
  propTypes: {
    category: React.PropTypes.string,
    language: React.PropTypes.string,
    style:    React.PropTypes.string,
    onPress:  React.PropTypes.function
  },
  render: function() {
    var style = this.props.style || {"borderColor": Sefaria.palette.categoryColor(this.props.category)};
    var content = this.props.language == "english"?
      (<Text style={styles.en}>{this.props.category}</Text>) :
      (<Text style={styles.he}>){Sefaria.hebrewCategory(this.props.category)}</Text>);
    return (<TouchableOpacity onPress={this.props.onPress} style={[styles.readerNavCategory, style]}>
              {content}
            </TouchableOpacity>);
  }
});


var ReaderNavigationMenuSection = React.createClass({
  // A Section on the main navigation which includes a title over a grid of options
  propTypes: {
    title:         React.PropTypes.string,
    heTitle:       React.PropTypes.string,
    interfaceLang: React.PropTypes.string,
    content:       React.PropTypes.object
  },
  render: function() {
    if (!this.props.content) { return null; }
    return (
      <View style={styles.readerNavSection}>
        {this.props.title ? 
          (<View style={styles.readerNavSectionTitle} >
            { this.props.interfaceLang !== "hebrew" ?
            <Text styles={styles.intEn}>{this.props.title}</Text> :
            <Text styles={styles.intHe}>{this.props.heTitle}</Text>}
          </View>) 
        : null }
        {this.props.content}
      </View>
      );
  }
});


var ReaderNavigationCategoryMenu = React.createClass({
  // Navigation Menu for a single category of texts (e.g., "Tanakh", "Bavli")
  propTypes: {
    category:       React.PropTypes.string.isRequired,
    categories:     React.PropTypes.array.isRequired,
    closeNav:       React.PropTypes.func.isRequired,
    setCategories:  React.PropTypes.func.isRequired,
    navHome:        React.PropTypes.func.isRequired,
    toggleLanguage: React.PropTypes.func.isRequired,
  },
  render: function() {
    return (<View style={[styles.container, styles.menu]}>
              <Text>Navigation: {this.props.category}</Text>
              <TouchableOpacity onPress={this.props.closeNav}>
                <Text>close</Text>
              </TouchableOpacity>
            </View>);  
  }
});


module.exports = ReaderNavigationMenu;