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
  Image,
} from 'react-native';

import {
  CategoryColorLine,
  CategoryBlockLink,
  TwoBox,
  LanguageToggleButton,
  Platform,
} from './Misc.js';
import VersionNumber from 'react-native-version-number';
import SearchBar from './SearchBar';
import ReaderNavigationCategoryMenu from './ReaderNavigationCategoryMenu';
import styles from './Styles.js';
import strings from './LocalizedStrings.js';


class ReaderNavigationMenu extends React.Component {
  // The Navigation menu for browsing and searching texts
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    themeStr:       PropTypes.string.isRequired,
    categories:     PropTypes.array.isRequired,
    menuLanguage:   PropTypes.string.isRequired,
    interfaceLang:  PropTypes.oneOf(["english","hebrew"]).isRequired,
    setCategories:  PropTypes.func.isRequired,
    openRef:        PropTypes.func.isRequired,
    openTextTocDirectly: PropTypes.func.isRequired,
    closeNav:       PropTypes.func.isRequired,
    openNav:        PropTypes.func.isRequired,
    openSearch:     PropTypes.func.isRequired,
    setIsNewSearch: PropTypes.func.isRequired,
    openSettings:   PropTypes.func.isRequired,
    openHistory:    PropTypes.func.isRequired,
    openSaved:      PropTypes.func.isRequired,
    toggleLanguage: PropTypes.func.isRequired,
    onChangeSearchQuery:PropTypes.func.isRequired,
    searchQuery:    PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);

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

  getEmailBody = () => {
    const nDownloaded = Sefaria.downloader.titlesDownloaded().length;
    const nAvailable  = Sefaria.downloader.titlesAvailable().length;
    return encodeURIComponent(`App Version: ${VersionNumber.appVersion}\n
            Texts Downloaded: ${nDownloaded} / ${nAvailable}\n
            iOS Version: ${Platform.Version}\n\n\n`);
  };

  render() {
    const isWhite = this.props.themeStr === "white";

    if (this.props.categories.length) {
      // List of Text in a Category
      return (<ReaderNavigationCategoryMenu
                theme={this.props.theme}
                themeStr={this.props.themeStr}
                categories={this.props.categories}
                category={this.props.categories.slice(-1)[0]}
                menuLanguage={this.props.menuLanguage}
                closeNav={this.props.closeNav}
                setCategories={this.props.setCategories}
                openRef={this.props.openRef}
                toggleLanguage={this.props.toggleLanguage}
                navHome={this.navHome}/>);
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
                  language={this.props.menuLanguage}
                  onPress={openCat}
                  key={cat} />);
      }.bind(this));
      var more = (<CategoryBlockLink
                    theme={this.props.theme}
                    category={"More"}
                    heCat={"עוד"}
                    upperCase={true}
                    language={this.props.menuLanguage}
                    onPress={this.showMore}
                    withArrow={true}
                    key={"More"} />);
      categories = this.state.showMore ? categories : categories.slice(0,9).concat(more);
      categories = (<View style={styles.readerNavCategories}><TwoBox content={categories} language={this.props.menuLanguage}/></View>);
      const isHeb = this.props.interfaceLang === "hebrew";
      const langStyle = !isHeb ? styles.enInt : styles.heInt;

      return(<View style={[styles.menu, this.props.theme.menu]}>
              <CategoryColorLine category={"Other"} />
              <SearchBar
                interfaceLang={this.props.interfaceLang}
                theme={this.props.theme}
                themeStr={this.props.themeStr}
                openNav={this.props.openNav}
                closeNav={this.props.closeNav}
                leftMenuButton="close"
                onQueryChange={this.props.openSearch}
                setIsNewSearch={this.props.setIsNewSearch}
                toggleLanguage={this.props.toggleLanguage}
                language={this.props.menuLanguage}
                onChange={this.props.onChangeSearchQuery}
                query={this.props.searchQuery}
                openRef={this.props.openRef}
                openTextTocDirectly={this.props.openTextTocDirectly}
                setCategories={this.props.setCategories}/>
              <ScrollView style={styles.menuContent} contentContainerStyle={styles.menuScrollViewContent}>

                <View style={styles.twoBoxRow}>
                  <View style={styles.twoBoxItem}>
                    <CategoryBlockLink
                      theme={this.props.theme}
                      category={"History"}
                      heCat={"היסטוריה"}
                      language={this.props.menuLanguage}
                      style={{borderTopWidth: 0, paddingVertical: 12}}
                      isSans={true}
                      icon={isWhite ? require('./img/clock.png') : require('./img/clock-light.png')}
                      onPress={this.props.openHistory}
                    />
                  </View>
                  <View style={styles.twoBoxItem}>
                    <CategoryBlockLink
                      theme={this.props.theme}
                      category={"Saved"}
                      heCat={"שמורים"}
                      language={this.props.menuLanguage}
                      style={{borderTopWidth: 0, paddingVertical: 12}}
                      isSans={true}
                      icon={isWhite ? require('./img/starUnfilled.png') : require('./img/starUnfilled-light.png')}
                      onPress={this.props.openSaved}
                    />
                  </View>
                </View>

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
                  language={this.props.menuLanguage}
                  interfaceLang={this.props.interfaceLang} />

                <View style={styles.readerNavSection}>
                  <Text style={[styles.readerNavSectionTitle, this.props.theme.readerNavSectionTitle, langStyle, {textAlign: "center"}]}>{strings.supportSefaria}</Text>
                  <TouchableOpacity style={[styles.button, this.props.theme.borderDarker, this.props.theme.mainTextPanel, {flexDirection: isHeb ? "row-reverse" : "row", justifyContent: "center", marginTop: 15}]} onPress={() => {Linking.openURL("https://www.sefaria.org/donate");}}>
                    <Image source={this.props.themeStr == "white" ? require('./img/heart.png'): require('./img/heart-light.png') }
                      style={isHeb ? styles.menuButtonMarginedHe : styles.menuButtonMargined}
                      resizeMode={Image.resizeMode.contain} />
                    <Text style={[styles.buttonText, langStyle]}>{strings.makeADonation}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.navBottomLinks}>
                  <TouchableOpacity onPress={this.props.openSettings}>
                    <Text style={[isHeb ? styles.heInt : styles.enInt, this.props.theme.tertiaryText]}>{strings.settings}</Text>
                  </TouchableOpacity>

                  <Text style={[styles.navBottomLinkDot, this.props.theme.tertiaryText]}>•</Text>

                  <TouchableOpacity onPress={() => {Linking.openURL("https://www.sefaria.org/about");}}>
                    <Text style={[isHeb ? styles.heInt : styles.enInt, this.props.theme.tertiaryText]}>{strings.about}</Text>
                  </TouchableOpacity>

                  <Text style={[styles.navBottomLinkDot, this.props.theme.tertiaryText]}>•</Text>

                  <TouchableOpacity onPress={() => {Linking.openURL(`mailto:ios@sefaria.org?subject=${encodeURIComponent("iOS App Feedback")}&body=${this.getEmailBody()}`);}}>
                    <Text style={[isHeb ? styles.heInt : styles.enInt, this.props.theme.tertiaryText]}>{strings.feedback}</Text>
                  </TouchableOpacity>

                </View>

                <Text style={[styles.dedication, isHeb ? styles.hebrewSystemFont : null, this.props.theme.secondaryText]}>
                  {strings.dedicated}
                </Text>

              </ScrollView>
            </View>);
    }
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


export default ReaderNavigationMenu;
