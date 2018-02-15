'use strict';
import PropTypes from 'prop-types';
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


class ReaderNavigationMenu extends React.Component {
  // The Navigation menu for browsing and searching texts
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    themeStr:       PropTypes.string.isRequired,
    categories:     PropTypes.array.isRequired,
    settings:       PropTypes.object.isRequired,
    interfaceLang:  PropTypes.oneOf(["english","hebrew"]).isRequired,
    setCategories:  PropTypes.func.isRequired,
    openRef:        PropTypes.func.isRequired,
    closeNav:       PropTypes.func.isRequired,
    openNav:        PropTypes.func.isRequired,
    openSearch:     PropTypes.func.isRequired,
    setIsNewSearch: PropTypes.func.isRequired,
    openSettings:   PropTypes.func.isRequired,
    openRecent:     PropTypes.func.isRequired,
    toggleLanguage: PropTypes.func.isRequired,
    Sefaria:        PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);
    Sefaria = props.Sefaria;

    this.state = {
      showMore: false,
    };
  }

  componentDidMount() {

  }

  showMore = () => {
    this.setState({showMore: true});
  };

  navHome = () => {
    this.props.setCategories([]);
  };

  render() {
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
        "Tanaitic",
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
              <ScrollView contentContainerStyle={styles.menuContent}>

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

                  <TouchableOpacity style={[styles.navBottomLink]} onPress={() => {Linking.openURL("https://www.sefaria.org/about");}}>
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
}

class RecentSection extends React.Component {
  static propTypes = {
    theme:         PropTypes.object.isRequired,
    openRef:       PropTypes.func.isRequired,
    interfaceLang: PropTypes.string.isRequired,
    language:      PropTypes.string.isRequired,
    openRecent:    PropTypes.func.isRequired,
  };

  render() {
    if (!Sefaria.recent || !Sefaria.recent.length) { return null; }

    let recent = Sefaria.recent.slice(0,3).map(function(item) {
      return (<CategoryBlockLink
                    theme={this.props.theme}
                    category={item.ref}
                    heCat={item.heRef}
                    language={this.props.language}
                    style={{"borderColor": Sefaria.palette.categoryColor(item.category)}}
                    onPress={()=>{ this.props.openRef(item.ref, item.versions); }}
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
}

class CalendarSection extends React.Component {
  static propTypes = {
    theme:         PropTypes.object.isRequired,
    openRef:       PropTypes.func.isRequired,
    interfaceLang: PropTypes.string.isRequired,
    language:      PropTypes.string.isRequired
  };

  render() {
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
              onPress={() => { this.props.openRef(parashah.ref); }}
              key="parashah" />,
            <CategoryBlockLink
              theme={this.props.theme}
              category={"Haftara"}
              heCat={"הפטרה"}
              language={this.props.language}
              style={{"borderColor": Sefaria.palette.categoryColor("Tanakh")}}
              onPress={() => { this.props.openRef(parashah.haftara[0]); }}
              key="haftara" />,
            <CategoryBlockLink
              theme={this.props.theme}
              category={"Daf Yomi"}
              heCat={"דף יומי"}
              language={this.props.language}
              style={{"borderColor": Sefaria.palette.categoryColor("Talmud")}}
              onPress={() => { this.props.openRef(dafYomi.ref); }}
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
}

class ReaderNavigationMenuSection extends React.Component {
  // A Section on the main navigation which includes a title over a grid of options
  static propTypes = {
    theme:         PropTypes.object,
    title:         PropTypes.string,
    heTitle:       PropTypes.string,
    interfaceLang: PropTypes.string,
    content:       PropTypes.object,
    hasmore:       PropTypes.bool,
    moreClick:     PropTypes.func
  };

  render() {
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
}


module.exports = ReaderNavigationMenu;
