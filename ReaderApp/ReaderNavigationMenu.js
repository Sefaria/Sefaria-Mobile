'use strict';
import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';

var {
  CategoryColorLine,
  TwoBox,
  LanguageToggleButton
} = require('./Misc.js');

var SearchBar = require('./SearchBar');
var ReaderNavigationCategoryMenu = require('./ReaderNavigationCategoryMenu');
var styles = require('./Styles.js');


var ReaderNavigationMenu = React.createClass({
  // The Navigation menu for browsing and searching texts
  propTypes: {
    theme:          React.PropTypes.object.isRequired,
    themeStr:       React.PropTypes.string.isRequired,
    categories:     React.PropTypes.array.isRequired,
    settings:       React.PropTypes.object.isRequired,
    interfaceLang:  React.PropTypes.oneOf(["english","hebrew"]).isRequired,
    setCategories:  React.PropTypes.func.isRequired,
    openRef:        React.PropTypes.func.isRequired,
    closeNav:       React.PropTypes.func.isRequired,
    openNav:        React.PropTypes.func.isRequired,
    openSearch:     React.PropTypes.func.isRequired,
    setIsNewSearch: React.PropTypes.func.isRequired,
    toggleLanguage: React.PropTypes.func.isRequired,
    Sefaria:        React.PropTypes.object.isRequired
  },
  getInitialState: function() {
    Sefaria = this.props.Sefaria;
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
                theme={this.props.theme}
                categories={this.props.categories}
                category={this.props.categories.slice(-1)[0]}
                settings={this.props.settings}
                closeNav={this.props.closeNav}
                setCategories={this.props.setCategories}
                openRef={this.props.openRef}
                toggleLanguage={this.props.toggleLanguage}
                navHome={this.navHome}
                Sefaria={Sefaria} />);
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
                  theme={this.props.theme}
                  category={cat}
                  heCat={heCat}
                  upperCase={true}
                  language={language}
                  onPress={openCat} />);
      }.bind(this));
      var more = (<CategoryBlockLink
                    theme={this.props.theme}
                    category={"More"}
                    heCat={"עוד"}
                    upperCase={true}
                    language={language}
                    onPress={this.showMore} />);
      categories = this.state.showMore ? categories : categories.slice(0,9).concat(more);
      categories = (<View style={styles.readerNavCategories}><TwoBox content={categories} language={language}/></View>);


      return(<View style={[styles.menu, this.props.theme.menu]}>
              <CategoryColorLine category={"Other"} />
              <SearchBar
                theme={this.props.theme}
                themeStr={this.props.themeStr}
                closeNav={this.props.closeNav}
                onQueryChange={this.props.openSearch}
                setIsNewSearch={this.props.setIsNewSearch}
                toggleLanguage={this.props.toggleLanguage}
                language={language} />
              <ScrollView style={styles.menuContent}>

                <RecentSection
                  theme={this.props.theme}
                  openRef={this.props.openRef}
                  language={language}
                  interfaceLang={this.props.interfaceLang} />

                <ReaderNavigationMenuSection
                  theme={this.props.theme}
                  title="BROWSE"
                  heTitle="טקסטים"
                  content={categories}
                  interfaceLang={this.props.interfaceLang} />

                <CalendarSection
                  theme={this.props.theme}
                  openRef={this.props.openRef}
                  language={language}
                  interfaceLang={this.props.interfaceLang} />

                <View style={{height: 20}} />
              </ScrollView>
            </View>);
    }
  }
});


var RecentSection = React.createClass({
  propTypes: {
    theme:         React.PropTypes.object.isRequired,
    openRef:       React.PropTypes.func.isRequired,
    interfaceLang: React.PropTypes.string.isRequired,
    language:      React.PropTypes.string.isRequired
  },
  render: function() {
    if (!Sefaria.recent || !Sefaria.recent.length) { return null; }

    var recent = Sefaria.recent.map(function(item) {
      return (<CategoryBlockLink
                    theme={this.props.theme}
                    category={item.ref}
                    heCat={item.heRef}
                    language={this.props.language}
                    style={{"borderColor": Sefaria.palette.categoryColor(item.category)}}
                    onPress={this.props.openRef.bind(null, item.ref,true)} />);
    }.bind(this));

    return (<ReaderNavigationMenuSection
              theme={this.props.theme}
              title="RECENT"
              heTitle="נצפו לאחרונה"
              content={<TwoBox content={recent} language={this.props.language}/>}
              interfaceLang={this.props.interfaceLang} />);
  }
});


var CalendarSection = React.createClass({
  propTypes: {
    theme:         React.PropTypes.object.isRequired,
    openRef:       React.PropTypes.func.isRequired,
    interfaceLang: React.PropTypes.string.isRequired,
    language:      React.PropTypes.string.isRequired
  },
  render: function() {
    if (!Sefaria.calendar) {
      Sefaria.loadCalendar(function() { this.forceUpdate(); }.bind(this));
      return (<ReaderNavigationMenuSection
                theme={this.props.theme}
                title="CALENDAR LOADING..."
                heTitle="לוח יומי..."
                content={null}
                interfaceLang={this.props.interfaceLang} />);
    }
    var parashah = Sefaria.parashah();
    var dafYomi  = Sefaria.dafYomi();
    var calendar = [<CategoryBlockLink
                    theme={this.props.theme}
                    category={parashah.name}
                    heCat={"פרשה"}
                    language={this.props.language}
                    style={{"borderColor": Sefaria.palette.categoryColor("Tanakh")}}
                    onPress={this.props.openRef.bind(null, parashah.ref)} />,
          <CategoryBlockLink
                    theme={this.props.theme}
                    category={"Haftara"}
                    heCat={"הפטרה"}
                    language={this.props.language}
                    style={{"borderColor": Sefaria.palette.categoryColor("Tanakh")}}
                    onPress={this.props.openRef.bind(null, parashah.haftara[0])} />,
          <CategoryBlockLink
                    theme={this.props.theme}
                    category={"Daf Yomi"}
                    heCat={"דף יומי"}
                    language={this.props.language}
                    style={{"borderColor": Sefaria.palette.categoryColor("Talmud")}}
                    onPress={this.props.openRef.bind(null, dafYomi.ref)} />];

    return (<ReaderNavigationMenuSection
              theme={this.props.theme}
              title="CALENDAR"
              heTitle="לוח יומי"
              content={<TwoBox content={calendar} language={this.props.language}/>}
              interfaceLang={this.props.interfaceLang} />);
  }
});


var CategoryBlockLink = React.createClass({
  propTypes: {
    theme:     React.PropTypes.object.isRequired,
    category:  React.PropTypes.string,
    language:  React.PropTypes.string,
    style:     React.PropTypes.object,
    upperCase: React.PropTypes.bool,
    onPress:   React.PropTypes.func,
  },
  render: function() {
    var style  = this.props.style || {"borderColor": Sefaria.palette.categoryColor(this.props.category)};
    var enText = this.props.upperCase ? this.props.category.toUpperCase() : this.props.category;
    var heText = this.props.heCat || Sefaria.hebrewCategory(this.props.category);
    var textStyle  = [styles.centerText, this.props.theme.text, this.props.upperCase ? styles.spacedText : null];
    var content = this.props.language == "english"?
      (<Text style={[styles.en].concat(textStyle)}>{enText}</Text>) :
      (<Text style={[styles.he].concat(textStyle)}>{heText}</Text>);
    return (<TouchableOpacity onPress={this.props.onPress} style={[styles.readerNavCategory, this.props.theme.readerNavCategory, style]}>
              {content}
            </TouchableOpacity>);
  }
});


var ReaderNavigationMenuSection = React.createClass({
  // A Section on the main navigation which includes a title over a grid of options
  propTypes: {
    theme:         React.PropTypes.object,
    title:         React.PropTypes.string,
    heTitle:       React.PropTypes.string,
    interfaceLang: React.PropTypes.string,
    content:       React.PropTypes.object
  },
  render: function() {
    if (!this.props.content) { return null; }
    var title = this.props.interfaceLang !== "hebrew" ? this.props.title : this.props.heTitle;
    var langStyle = this.props.interfaceLang !== "hebrew" ? styles.enInt : styles.heInt;
    return (<View style={styles.readerNavSection}>
              <Text style={[styles.readerNavSectionTitle, this.props.theme.readerNavSectionTitle, langStyle]}>{title}</Text>
              {this.props.content}
            </View>);
  }
});


module.exports = ReaderNavigationMenu;
