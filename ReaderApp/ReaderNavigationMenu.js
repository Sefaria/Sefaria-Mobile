'use strict';
import React, { Component } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

var {
  CategoryColorLine,
  CategoryBlockLink,
  TwoBox,
  LanguageToggleButton
} = require('./Misc.js');

var SearchBar = require('./SearchBar');
var ReaderNavigationCategoryMenu = require('./ReaderNavigationCategoryMenu');
var styles = require('./Styles.js');
var strings = require('./LocalizedStrings.js');


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
    openSettings:   React.PropTypes.func.isRequired,
    openRecent:     React.PropTypes.func.isRequired,
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
                themeStr={this.props.themeStr}
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
        var openCat = function() {
          this.props.setCategories([cat]);
          Sefaria.track.event("Reader","Navigation Sub Category Click",cat);
        }.bind(this);
        var heCat   = Sefaria.hebrewCategory(cat);
        return (<CategoryBlockLink
                  theme={this.props.theme}
                  category={cat}
                  heCat={heCat}
                  upperCase={true}
                  language={language}
                  onPress={openCat}
                  key={cat} />);
      }.bind(this));
      var more = (<CategoryBlockLink
                    theme={this.props.theme}
                    category={"More"}
                    heCat={"עוד"}
                    upperCase={true}
                    language={language}
                    onPress={this.showMore}
                    withArrow={true}
                    key={"More"} />);
      categories = this.state.showMore ? categories : categories.slice(0,9).concat(more);
      categories = (<View style={styles.readerNavCategories}><TwoBox content={categories} language={language}/></View>);


      return(<View style={[styles.menu, this.props.theme.menu]}>
              <CategoryColorLine category={"Other"} />
              <SearchBar
                theme={this.props.theme}
                themeStr={this.props.themeStr}
                openNav={this.props.openNav}
                closeNav={this.props.closeNav}
                leftMenuButton="close"
                onQueryChange={this.props.openSearch}
                setIsNewSearch={this.props.setIsNewSearch}
                toggleLanguage={this.props.toggleLanguage}
                language={language} />
              <ScrollView style={styles.menuContent}>

                <RecentSection
                  theme={this.props.theme}
                  openRef={this.props.openRef}
                  language={language}
                  interfaceLang={this.props.interfaceLang}
                  openRecent={this.props.openRecent} />

                <ReaderNavigationMenuSection
                  theme={this.props.theme}
                  title={strings.browse}
                  heTitle="טקסטים"
                  content={categories}
                  interfaceLang={this.props.interfaceLang}
                  hasmore={false} />

                <CalendarSection
                  theme={this.props.theme}
                  openRef={this.props.openRef}
                  language={language}
                  interfaceLang={this.props.interfaceLang} />


                <View style={styles.navBottomLinks}>
                  <TouchableOpacity style={[styles.navBottomLink]} onPress={this.props.openSettings}>
                    <Text style={[this.props.theme.tertiaryText]}>{strings.settings}</Text>
                  </TouchableOpacity>

                  <Text style={[styles.navBottomLink, this.props.theme.tertiaryText]}>•</Text>

                  <TouchableOpacity style={[styles.navBottomLink]} onPress={() => {Linking.openURL("http://www.sefaria.org/about");}}>
                    <Text style={[this.props.theme.tertiaryText]}>{strings.about}</Text>
                  </TouchableOpacity>

                  <Text style={[styles.navBottomLink, this.props.theme.tertiaryText]}>•</Text>

                  <TouchableOpacity style={[styles.navBottomLink]} onPress={() => {Linking.openURL("mailto:ios@sefaria.org");}}>
                    <Text style={[this.props.theme.tertiaryText]}>{strings.feedback}</Text>
                  </TouchableOpacity>

                </View>

                <Text style={[styles.dedication, this.props.theme.secondaryText]}>
                  {strings.dedicated}
                </Text>

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
    language:      React.PropTypes.string.isRequired,
    openRecent:    React.PropTypes.func.isRequired,
  },
  render: function() {
    if (!Sefaria.recent || !Sefaria.recent.length) { return null; }

    var recent = Sefaria.recent.slice(0,3).map(function(item) {
      return (<CategoryBlockLink
                    theme={this.props.theme}
                    category={item.ref}
                    heCat={item.heRef}
                    language={this.props.language}
                    style={{"borderColor": Sefaria.palette.categoryColor(item.category)}}
                    onPress={this.props.openRef.bind(null, item.ref)}
                    key={item.ref} />);
    }.bind(this));

    var more = (<CategoryBlockLink
                  theme={this.props.theme}
                  category={"More"}
                  heCat={"עוד"}
                  upperCase={true}
                  language={this.props.language}
                  onPress={this.props.openRecent}
                  withArrow={true}
                  key={"More"} />);

    recent = recent.concat(more);

    return (<ReaderNavigationMenuSection
              hasmore={false}
              theme={this.props.theme}
              title={strings.recent}
              heTitle={strings.recent}
              content={<TwoBox content={recent} language={this.props.language}/>}
              interfaceLang={this.props.interfaceLang}
              moreClick={this.props.openRecent} />);
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
    if (!Sefaria.calendar) { return null; }

    var parashah = Sefaria.parashah();
    var dafYomi  = Sefaria.dafYomi();
    var calendar = [
            <CategoryBlockLink
              theme={this.props.theme}
              category={parashah.name}
              heCat={"פרשה"}
              language={this.props.language}
              style={{"borderColor": Sefaria.palette.categoryColor("Tanakh")}}
              onPress={this.props.openRef.bind(null, parashah.ref)}
              key="parashah" />,
            <CategoryBlockLink
              theme={this.props.theme}
              category={"Haftara"}
              heCat={"הפטרה"}
              language={this.props.language}
              style={{"borderColor": Sefaria.palette.categoryColor("Tanakh")}}
              onPress={this.props.openRef.bind(null, parashah.haftara[0])}
              key="haftara" />,
            <CategoryBlockLink
              theme={this.props.theme}
              category={"Daf Yomi"}
              heCat={"דף יומי"}
              language={this.props.language}
              style={{"borderColor": Sefaria.palette.categoryColor("Talmud")}}
              onPress={this.props.openRef.bind(null, dafYomi.ref)}
              key="dafYomi" />];

    var calendarContent = <TwoBox content={calendar} language={this.props.language}/>;

    return (<ReaderNavigationMenuSection
              hasmore={false}
              theme={this.props.theme}
              title={strings.calendar}
              heTitle={strings.calendar}
              content={calendarContent}
              interfaceLang={this.props.interfaceLang}
              hasmore={false} />);
  }
});


var ReaderNavigationMenuSection = React.createClass({
  // A Section on the main navigation which includes a title over a grid of options
  propTypes: {
    theme:         React.PropTypes.object,
    title:         React.PropTypes.string,
    heTitle:       React.PropTypes.string,
    interfaceLang: React.PropTypes.string,
    content:       React.PropTypes.object,
    hasmore:       React.PropTypes.bool,
    moreClick:     React.PropTypes.func
  },
  render: function() {
    if (!this.props.content) { return null; }

    var isheb = this.props.interfaceLang === "hebrew";
    var title = !isheb ? this.props.title : this.props.heTitle;
    var langStyle = !isheb ? styles.enInt : styles.heInt;
    var moreHeStyle = !isheb || !this.props.hasmore ? [styles.readerNavSectionMoreInvisible, styles.readerNavSectionMoreHe] : [styles.readerNavSectionMoreHe];
    var moreEnStyle = isheb || !this.props.hasmore ? [styles.readerNavSectionMoreInvisible, styles.readerNavSectionMoreEn] : [styles.readerNavSectionMoreEn];
    return (<View style={styles.readerNavSection}>
              <View style={styles.readerNavSectionTitleOuter}>
                <TouchableOpacity onPress={isheb ? this.props.moreClick : ()=>{}}>
                  <Text style={moreHeStyle}> עוד &gt;</Text>
                </TouchableOpacity>
                <Text style={[styles.readerNavSectionTitle, this.props.theme.readerNavSectionTitle, langStyle]}>{title}</Text>
                <TouchableOpacity onPress={!isheb ? this.props.moreClick : ()=>{}}>
                  <Text style={moreEnStyle}> MORE &gt;</Text>
                </TouchableOpacity>
              </View>
              {this.props.content}
            </View>);
  }
});


module.exports = ReaderNavigationMenu;
