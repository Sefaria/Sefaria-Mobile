'use strict';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableNativeFeedback,
  TouchableWithoutFeedback,
  View,
  Image,
  Platform,
  Linking,
  Alert,
} from 'react-native';

import {
  CategoryColorLine,
  CategoryBlockLink,
  TwoBox,
  LanguageToggleButton,
  SystemButton,
} from './Misc.js';
import VersionNumber from 'react-native-version-number';
import SearchBar from './SearchBar';
import ReaderNavigationCategoryMenu from './ReaderNavigationCategoryMenu';
import ReaderNavigationSheetMenu from './ReaderNavigationSheetMenu';
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
    onBack:         PropTypes.func.isRequired,
    openSearch:     PropTypes.func.isRequired,
    setIsNewSearch: PropTypes.func.isRequired,
    openSettings:   PropTypes.func.isRequired,
    openHistory:    PropTypes.func.isRequired,
    openSaved:      PropTypes.func.isRequired,
    openSheets:      PropTypes.func.isRequired,
    toggleLanguage: PropTypes.func.isRequired,
    onChangeSearchQuery:PropTypes.func.isRequired,
    searchQuery:    PropTypes.string.isRequired,
    openAutocomplete: PropTypes.func.isRequired,
    openUri:        PropTypes.func.isRequired,
    searchType:     PropTypes.oneOf(['text', 'sheet']).isRequired,
    toggleDebugInterruptingMessage: PropTypes.func.isRequired,
    debugInterruptingMessage: PropTypes.bool.isRequired,
    isLoggedIn:     PropTypes.bool.isRequired,
    logout:         PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this._numPressesDebug = 0;
    this.state = {
      showMore: false,
    };
  }

  onDebugSupportPress = () => {
    this._numPressesDebug++;
    if (this._numPressesDebug >= 7) {
      this._numPressesDebug = 0;
      Alert.alert(
      'Testing InterruptingMessage Mode',
      `You've just ${this.props.debugInterruptingMessage ? "disabled" : "enabled"} debugging interrupting message. You can change this by tapping 'SUPPORT SEFARIA' 7 times.`,
      [
        {text: 'OK', onPress: ()=>{this.forceUpdate();}},
      ]);
      this.props.toggleDebugInterruptingMessage();
    }
  };

  showMore = () => {
    this.setState({showMore: true});
  };

  navHome = () => {
    this.props.setCategories([]);
  };

  render() {
    const isWhite = this.props.themeStr === "white";

    if (this.props.categories.length) {
      // List of Text in a Category
      return (<ReaderNavigationCategoryMenu
                key={this.props.categories.slice(-1)[0]}
                theme={this.props.theme}
                themeStr={this.props.themeStr}
                categories={this.props.categories}
                category={this.props.categories.slice(-1)[0]}
                menuLanguage={this.props.menuLanguage}
                interfaceLang={this.props.interfaceLang}
                setCategories={this.props.setCategories}
                openRef={this.props.openRef}
                toggleLanguage={this.props.toggleLanguage}
                navHome={this.navHome}
                openUri={this.props.openUri}/>);
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
      categories = (
        <View style={styles.readerNavCategories}>
          <TwoBox language={this.props.menuLanguage}>
            { categories }
          </TwoBox>
        </View>
      );
      const isHeb = this.props.interfaceLang === "hebrew";
      const langStyle = !isHeb ? styles.enInt : styles.heInt;
      return(<View style={[styles.menu, this.props.theme.menu]}>
              <CategoryColorLine category={"Other"} />
              <SearchBar
                interfaceLang={this.props.interfaceLang}
                theme={this.props.theme}
                themeStr={this.props.themeStr}
                onBack={this.props.onBack}
                leftMenuButton="close"
                search={this.props.openSearch}
                setIsNewSearch={this.props.setIsNewSearch}
                toggleLanguage={this.props.toggleLanguage}
                language={this.props.menuLanguage}
                onChange={this.props.onChangeSearchQuery}
                query={this.props.searchQuery}
                searchType={this.props.searchType}
                onFocus={this.props.openAutocomplete}/>
              <ScrollView style={styles.menuContent} contentContainerStyle={styles.menuScrollViewContent}>

                <SavedHistorySection
                  theme={this.props.theme}
                  isWhite={isWhite}
                  menuLanguage={this.props.menuLanguage}
                  openHistory={this.props.openHistory}
                  openSaved={this.props.openSaved}
                />

                <ReaderNavigationMenuSection
                  theme={this.props.theme}
                  title={strings.browse}
                  heTitle="טקסטים"
                  content={categories}
                  interfaceLang={this.props.interfaceLang}
                  hasmore={false} />

                <ResourcesSection
                  theme={this.props.theme}
                  openRef={this.props.openRef}
                  language={this.props.menuLanguage}
                  interfaceLang={this.props.interfaceLang}
                  openSheets={this.props.openSheets} />

                <CalendarSection
                  theme={this.props.theme}
                  openRef={this.props.openRef}
                  language={this.props.menuLanguage}
                  interfaceLang={this.props.interfaceLang} />

                <MoreSection
                  theme={this.props.theme}
                  themeStr={this.props.themeStr}
                  isHeb={isHeb}
                  openUri={this.props.openUri}
                  openSettings={this.props.openSettings}
                />

                <AuthSection
                  theme={this.props.theme}
                  openLogin={this.props.openLogin}
                  openRegister={this.props.openRegister}
                  isLoggedIn={this.props.isLoggedIn}
                  logout={this.props.logout}
                  interfaceLang={this.props.interfaceLang}
                />

                <Text style={[styles.dedication, isHeb ? styles.hebrewSystemFont : null, this.props.theme.secondaryText]}>
                  { Platform.OS === 'ios' ? strings.dedicatedIOS : strings.dedicatedAndroid }
                </Text>

              </ScrollView>
            </View>);
    }
  }
}

class AuthSection extends React.Component{
  static propTypes = {
    openLogin: PropTypes.func.isRequired,
    openRegister: PropTypes.func.isRequired,
    logout: PropTypes.func.isRequired,
    isLoggedIn: PropTypes.bool.isRequired,
    theme:      PropTypes.object.isRequired,
    interfaceLang: PropTypes.string.isRequired,
  }
  render() {
    const authButtons = this.props.isLoggedIn ? (
      <View>
        <SystemButton
          theme={this.props.theme}
          onPress={this.props.logout}
          text={strings.logout}
        />
      </View>
    ) : (
      <View>
        <SystemButton
          theme={this.props.theme}
          onPress={this.props.openRegister}
          text={strings.create_your_account}
          isBlue={true}
        />
        <SystemButton
          theme={this.props.theme}
          onPress={this.props.openLogin}
          text={strings.sign_in}
        />
      </View>
    );
    return (<ReaderNavigationMenuSection
              hasmore={false}
              theme={this.props.theme}
              title={strings.sign_in.toUpperCase()}
              heTitle={strings.sign_in}
              content={authButtons}
              interfaceLang={this.props.interfaceLang} />);
  }
}

class MoreSection extends React.Component {
  static propTypes = {
    theme:         PropTypes.object.isRequired,
    themeStr:      PropTypes.string.isRequired,
    isHeb:         PropTypes.bool.isRequired,
    openUri:       PropTypes.func.isRequired,
    openSettings:  PropTypes.func.isRequired,
  };
  getEmailBody = () => {
    let nDownloaded = Sefaria.downloader.titlesDownloaded().length;
    const nAvailable  = Sefaria.downloader.titlesAvailable().length;
    nDownloaded = nDownloaded <= nAvailable ? nDownloaded : nAvailable;
    return encodeURIComponent(`App Version: ${VersionNumber.appVersion}
            Texts Downloaded: ${nDownloaded} / ${nAvailable}
            Packages: ${Object.keys(Sefaria.packages.selected).join(", ")}
            OS Version: ${Platform.OS} ${Platform.Version}\n`);
  };
  onDonate = () => {
    this.props.openUri("https://sefaria.nationbuilder.com/");
  };
  onAbout = () => {
    this.props.openUri("https://www.sefaria.org/about");
  };
  onFeedback = () => {
    Linking.openURL(`mailto:hello@sefaria.org?subject=${encodeURIComponent(Platform.OS+" App Feedback")}&body=${this.getEmailBody()}`);
  };
  render() {
    return (
      <View style={styles.readerNavSection}>
        <TouchableWithoutFeedback onPress={this.onDebugSupportPress}>
          <View>
            <Text style={[styles.readerNavSectionTitle, this.props.theme.readerNavSectionTitle, (this.props.isHeb ? styles.heInt : styles.enInt), {textAlign: "center"}]}>
              {strings.supportSefaria}
            </Text>
          </View>
        </TouchableWithoutFeedback>
        <TwoBox>
          <SystemButton
            theme={this.props.theme}
            text={strings.donate}
            img={this.props.themeStr == "white" ? require('./img/heart.png'): require('./img/heart-light.png')}
            onPress={this.onDonate}
            isHeb={this.props.isHeb}
          />
          <SystemButton
            theme={this.props.theme}
            text={strings.settings}
            img={this.props.themeStr == "white" ? require('./img/settings.png'): require('./img/settings-light.png')}
            onPress={this.props.openSettings}
            isHeb={this.props.isHeb}
          />
          <SystemButton
            theme={this.props.theme}
            text={strings.about}
            img={this.props.themeStr == "white" ? require('./img/info.png'): require('./img/info-light.png')}
            onPress={this.onAbout}
            isHeb={this.props.isHeb}
          />
          <SystemButton
            theme={this.props.theme}
            text={strings.feedback}
            img={this.props.themeStr == "white" ? require('./img/feedback.png'): require('./img/feedback-light.png')}
            onPress={this.onFeedback}
            isHeb={this.props.isHeb}
          />
        </TwoBox>
      </View>
    );
  }
}

class ResourcesSection extends React.Component {

  static propTypes = {
    theme:         PropTypes.object.isRequired,
    openRef:       PropTypes.func.isRequired,
    interfaceLang: PropTypes.string.isRequired,
    language:      PropTypes.string.isRequired
  };

  render() {
    var isheb = this.props.interfaceLang === "hebrew";
    var langStyle = !isheb ? styles.enInt : styles.heInt;

    return (
<View style={{marginVertical: 15}}>
                    <View style={{marginBottom: 15}}>
                      <Text style={[styles.readerNavSectionTitle, this.props.theme.readerNavSectionTitle, langStyle, {textAlign: "center"}]}>
                        {strings.resources}
                      </Text>
                    </View>

             <CategoryBlockLink
        theme={this.props.theme}
        category={"Sheets"}
        heCat={"דפי מקורות"}
        language={this.props.language}
        isSans={true}
        icon={require('./img/sheet.png')}
        onPress={this.props.openSheets}
        iconSide="start"
        style={[{height: 49, borderColor: Sefaria.palette.colors.darkblue}]}
      />
</View>

    );
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

    const { parasha, dafYomi, p929, rambam, mishnah } = Sefaria.getCalendars();
    var calendar = [
            !!parasha ? <CategoryBlockLink
              theme={this.props.theme}
              category={"Parashat Hashavua"}
              heCat={"פרשת השבוע"}
              language={this.props.language}
              style={{"borderColor": Sefaria.palette.categoryColor("Tanakh")}}
              subtext={parasha.parasha}
              onPress={() => { this.props.openRef(parasha.ref.en); }}
              key="parashah" /> : null,
            !!parasha ? <CategoryBlockLink
              theme={this.props.theme}
              category={"Haftara"}
              heCat={"הפטרה"}
              language={this.props.language}
              style={{"borderColor": Sefaria.palette.categoryColor("Tanakh")}}
              subtext={parasha.haftara[1]["ashkenazi"]}
              onPress={() => { this.props.openRef(parasha.haftara[0].en); }}
              key="haftara" /> : null,
            !!dafYomi ? <CategoryBlockLink
              theme={this.props.theme}
              category={"Daf Yomi"}
              heCat={"דף יומי"}
              language={this.props.language}
              style={{"borderColor": Sefaria.palette.categoryColor("Talmud")}}
              subtext={Array.isArray(dafYomi) ? dafYomi.map(x => x.ref) : dafYomi.ref}
              onPress={() => { this.props.openRef(Array.isArray(dafYomi) ? dafYomi[0].ref.en : dafYomi.ref.en); }}
              key="dafYomi" /> : null,
            !!p929 ? <CategoryBlockLink
              theme={this.props.theme}
              category={"929"}
              heCat={"929"}
              language={this.props.language}
              style={{"borderColor": Sefaria.palette.categoryColor("Tanakh")}}
              subtext={p929.ref}
              onPress={() => { this.props.openRef(p929.ref.en); }}
              key="929" /> : null,
            !!mishnah ? <CategoryBlockLink
              theme={this.props.theme}
              category={"Daily Mishnah"}
              heCat={"משנה יומית"}
              language={this.props.language}
              style={{"borderColor": Sefaria.palette.categoryColor("Mishnah")}}
              subtext={mishnah.map(x => x.ref)}
              onPress={() => { this.props.openRef(mishnah[0].ref.en); }}
              key="mishnah" /> : null,
            !!rambam ? <CategoryBlockLink
              theme={this.props.theme}
              category={"Daily Rambam"}
              heCat={"הרמב״ם היומי"}
              language={this.props.language}
              style={{"borderColor": Sefaria.palette.categoryColor("Halakhah")}}
              subtext={{en: rambam.ref.en.replace("Mishneh Torah, ", ""), he: rambam.ref.he.replace("משנה תורה, ", "")}}
              onPress={() => { this.props.openRef(rambam.ref.en); }}
              key="rambam" /> : null
            ];

    var calendarContent = (
      <TwoBox language={this.props.language}>
        { calendar }
      </TwoBox>
    );

    return (<ReaderNavigationMenuSection
              hasmore={false}
              theme={this.props.theme}
              title={strings.calendar}
              heTitle={strings.calendar}
              content={calendarContent}
              interfaceLang={this.props.interfaceLang} />);
  }
}

const SavedHistorySection = ({ theme, isWhite, menuLanguage, openHistory, openSaved }) => (
  <View style={[styles.twoBoxRow, {marginVertical: 15}]}>
    <View style={styles.twoBoxItem}>
      <CategoryBlockLink
        theme={theme}
        category={"History"}
        heCat={"היסטוריה"}
        language={menuLanguage}
        style={{flex:1 , paddingVertical: 12, borderRadius: 5, borderWidth: 1, borderTopWidth: 1, borderColor: "#ccc"}}
        isSans={true}
        icon={isWhite ? require('./img/clock.png') : require('./img/clock-light.png')}
        onPress={openHistory}
        iconSide="start"
      />
    </View>
    <View style={styles.twoBoxItem}>
      <CategoryBlockLink
        theme={theme}
        category={"Saved"}
        heCat={"שמורים"}
        language={menuLanguage}
        style={{flex: 1, paddingVertical: 12, borderRadius: 5, borderWidth: 1, borderTopWidth: 1, borderColor: "#ccc"}}
        isSans={true}
        icon={isWhite ? require('./img/starUnfilled.png') : require('./img/starUnfilled-light.png')}
        onPress={openSaved}
        iconSide="start"
      />
    </View>
  </View>
);

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
