'use strict';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';
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
import { STATE_ACTIONS, DispatchContext, GlobalStateContext } from './StateManager';
import VersionNumber from 'react-native-version-number';
import SearchBar from './SearchBar';
import ReaderNavigationCategoryMenu from './ReaderNavigationCategoryMenu';
import ReaderNavigationSheetMenu from './ReaderNavigationSheetMenu';
import styles from './Styles.js';
import strings from './LocalizedStrings.js';


const ReaderNavigationMenu = props => {
  // The Navigation menu for browsing and searching texts
  const { theme, themeStr, interfaceLanguage, menuLanguage } = useContext(GlobalStateContext);
  const [showMore, setShowMore] = useState(false);
  const isWhite = themeStr === "white";

  if (props.categories.length) {
    // List of Text in a Category
    return (<ReaderNavigationCategoryMenu
              key={props.categories.slice(-1)[0]}
              categories={props.categories}
              category={props.categories.slice(-1)[0]}
              setCategories={props.setCategories}
              openRef={props.openRef}
              toggleLanguage={props.toggleLanguage}
              navHome={() => { props.setCategories([]); }}
              openUri={props.openUri}/>);
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
    categories = categories.map(cat => (
      <CategoryBlockLink
        category={cat}
        heCat={Sefaria.hebrewCategory(cat)}
        upperCase={true}
        onPress={() => { props.setCategories([cat]); }}
        key={cat}
      />
    ));
    const more = (
      <CategoryBlockLink
        category={"More"}
        heCat={"עוד"}
        upperCase={true}
        onPress={() => { setShowMore(true); }}
        withArrow={true}
        key={"More"}
      />
    );
    categories = showMore ? categories : categories.slice(0,9).concat(more);
    categories = (
      <View style={styles.readerNavCategories}>
        <TwoBox language={menuLanguage}>
          { categories }
        </TwoBox>
      </View>
    );
    const isHeb = interfaceLanguage === "hebrew";
    const langStyle = !isHeb ? styles.enInt : styles.heInt;
    return(<View style={[styles.menu, theme.menu]}>
            <CategoryColorLine category={"Other"} />
            <SearchBar
              onBack={props.onBack}
              leftMenuButton="close"
              search={props.openSearch}
              setIsNewSearch={props.setIsNewSearch}
              toggleLanguage={props.toggleLanguage}
              onChange={props.onChangeSearchQuery}
              query={props.searchQuery}
              searchType={props.searchType}
              onFocus={props.openAutocomplete}/>
            <ScrollView style={styles.menuContent} contentContainerStyle={styles.menuScrollViewContent}>
              <SavedHistorySection
                isWhite={isWhite}
                openHistory={props.openHistory}
                openSaved={props.openSaved}
              />

              <ReaderNavigationMenuSection
                title={strings.browse}
                heTitle="טקסטים"
                content={categories}
                hasmore={false} />

              <ResourcesSection
                openSheets={this.props.openSheets}
              />

              <CalendarSection
                openRef={props.openRef}
              />

              <MoreSection
                isHeb={isHeb}
                openUri={props.openUri}
                openSettings={props.openSettings}
              />

              <AuthSection
                openLogin={props.openLogin}
                openRegister={props.openRegister}
                logout={props.logout}
              />

              <Text style={[styles.dedication, isHeb ? styles.hebrewSystemFont : null, theme.secondaryText]}>
                { Platform.OS === 'ios' ? strings.dedicatedIOS : strings.dedicatedAndroid }
              </Text>

            </ScrollView>
          </View>);
  }
}
ReaderNavigationMenu.propTypes = {
  categories:     PropTypes.array.isRequired,
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
  logout:         PropTypes.func.isRequired,
};

const AuthSection = ({ openLogin, openRegister, logout, }) => {
  const { isLoggedIn } = useContext(GlobalStateContext);
  const authButtons = isLoggedIn ? (
    <View>
      <SystemButton
        onPress={logout}
        text={strings.logout}
      />
    </View>
  ) : (
    <View>
      <SystemButton
        onPress={openRegister}
        text={strings.create_your_account}
        isBlue={true}
      />
      <SystemButton
        onPress={openLogin}
        text={strings.sign_in}
      />
    </View>
  );
  return (
    <ReaderNavigationMenuSection
      hasmore={false}
      title={strings.sign_in.toUpperCase()}
      heTitle={strings.sign_in}
      content={authButtons}
    />
  );
}
AuthSection.propTypes = {
  openLogin: PropTypes.func.isRequired,
  openRegister: PropTypes.func.isRequired,
  logout: PropTypes.func.isRequired,
};

const getEmailBody = () => {
  let nDownloaded = Sefaria.downloader.titlesDownloaded().length;
  const nAvailable  = Sefaria.downloader.titlesAvailable().length;
  nDownloaded = nDownloaded <= nAvailable ? nDownloaded : nAvailable;
  return encodeURIComponent(`App Version: ${VersionNumber.appVersion}
          Texts Downloaded: ${nDownloaded} / ${nAvailable}
          Packages: ${Object.keys(Sefaria.packages.selected).join(", ")}
          OS Version: ${Platform.OS} ${Platform.Version}\n`);
};

const MoreSection = ({ isHeb, openUri, openSettings }) => {
  const { theme, themeStr, debugInterruptingMessage } = useContext(GlobalStateContext);
  const dispatch = useContext(DispatchContext);
  const [, forceUpdate] = useReducer(x => x + 1, 0);  // HACK

  const [numPressesDebug, setNumPressesDebug] = useState(0);

  const onDebugSupportPress = () => {
    const newNumPressesDebug = numPressesDebug + 1;
    if (newNumPressesDebug >= 7) {
      setNumPressesDebug(0);
      Alert.alert(
      'Testing InterruptingMessage Mode',
      `You've just ${debugInterruptingMessage ? "disabled" : "enabled"} debugging interrupting message. You can change this by tapping 'SUPPORT SEFARIA' 7 times.`,
      [
        {text: 'OK', onPress: ()=>{forceUpdate();}},
      ]);
      dispatch({
        type: STATE_ACTIONS.toggleDebugInterruptingMessage,
      });
    } else {
      setNumPressesDebug(newNumPressesDebug);
    }
  };
  const onDonate = () => {
    openUri("https://sefaria.nationbuilder.com/");
  };
  const onAbout = () => {
    openUri("https://www.sefaria.org/about");
  };
  const onFeedback = () => {
    Linking.openURL(`mailto:hello@sefaria.org?subject=${encodeURIComponent(Platform.OS+" App Feedback")}&body=${getEmailBody()}`);
  };
  return (
    <View style={styles.readerNavSection}>
      <TouchableWithoutFeedback onPress={onDebugSupportPress}>
        <View>
          <Text style={[styles.readerNavSectionTitle, theme.readerNavSectionTitle, (isHeb ? styles.heInt : styles.enInt), {textAlign: "center"}]}>
            {strings.supportSefaria}
          </Text>
        </View>
      </TouchableWithoutFeedback>
      <TwoBox>
        <SystemButton
          text={strings.donate}
          img={themeStr == "white" ? require('./img/heart.png'): require('./img/heart-light.png')}
          onPress={onDonate}
          isHeb={isHeb}
        />
        <SystemButton
          text={strings.settings}
          img={themeStr == "white" ? require('./img/settings.png'): require('./img/settings-light.png')}
          onPress={openSettings}
          isHeb={isHeb}
        />
        <SystemButton
          text={strings.about}
          img={themeStr == "white" ? require('./img/info.png'): require('./img/info-light.png')}
          onPress={onAbout}
          isHeb={isHeb}
        />
        <SystemButton
          text={strings.feedback}
          img={themeStr == "white" ? require('./img/feedback.png'): require('./img/feedback-light.png')}
          onPress={onFeedback}
          isHeb={isHeb}
        />
      </TwoBox>
    </View>
  );
}
MoreSection.propTypes = {
  isHeb:         PropTypes.bool.isRequired,
  openUri:       PropTypes.func.isRequired,
  openSettings:  PropTypes.func.isRequired,
};

const ResourcesSection = ({ openSheets }) => {
  const { theme, interfaceLanguage } = useContext(GlobalStateContext);
  const isheb = interfaceLanguage === "hebrew";
  const langStyle = !isheb ? styles.enInt : styles.heInt;

  return (
    <View style={{marginVertical: 15}}>
      <View style={{marginBottom: 15}}>
        <Text style={[styles.readerNavSectionTitle, theme.readerNavSectionTitle, langStyle, {textAlign: "center"}]}>
          {strings.resources}
        </Text>
      </View>
      <CategoryBlockLink
        category={"Sheets"}
        heCat={"דפי מקורות"}
        isSans={true}
        icon={require('./img/sheet.png')}
        onPress={openSheets}
        iconSide="start"
        style={[{height: 49, borderColor: Sefaria.palette.colors.darkblue}]}
      />
    </View>
  );
}
ResourcesSection.propTypes = {
  openSheets:       PropTypes.func.isRequired,
};



const CalendarSection = ({ openRef }) => {
  const { menuLanguage } = useContext(GlobalStateContext);
  if (!Sefaria.calendar) { return null; }
  const { parasha, dafYomi, p929, rambam, mishnah } = Sefaria.getCalendars();
  const calendar = [
          !!parasha ? <CategoryBlockLink
            category={"Parashat Hashavua"}
            heCat={"פרשת השבוע"}
            style={{"borderColor": Sefaria.palette.categoryColor("Tanakh")}}
            subtext={parasha.parasha}
            onPress={() => { openRef(parasha.ref.en); }}
            key="parashah" /> : null,
          !!parasha ? <CategoryBlockLink
            category={"Haftara"}
            heCat={"הפטרה"}
            style={{"borderColor": Sefaria.palette.categoryColor("Tanakh")}}
            subtext={parasha.haftara[1]["ashkenazi"]}
            onPress={() => { openRef(parasha.haftara[0].en); }}
            key="haftara" /> : null,
          !!dafYomi ? <CategoryBlockLink
            category={"Daf Yomi"}
            heCat={"דף יומי"}
            style={{"borderColor": Sefaria.palette.categoryColor("Talmud")}}
            subtext={Array.isArray(dafYomi) ? dafYomi.map(x => x.ref) : dafYomi.ref}
            onPress={() => { openRef(Array.isArray(dafYomi) ? dafYomi[0].ref.en : dafYomi.ref.en); }}
            key="dafYomi" /> : null,
          !!p929 ? <CategoryBlockLink
            category={"929"}
            heCat={"929"}
            style={{"borderColor": Sefaria.palette.categoryColor("Tanakh")}}
            subtext={p929.ref}
            onPress={() => { openRef(p929.ref.en); }}
            key="929" /> : null,
          !!mishnah ? <CategoryBlockLink
            category={"Daily Mishnah"}
            heCat={"משנה יומית"}
            style={{"borderColor": Sefaria.palette.categoryColor("Mishnah")}}
            subtext={mishnah.map(x => x.ref)}
            onPress={() => { openRef(mishnah[0].ref.en); }}
            key="mishnah" /> : null,
          !!rambam ? <CategoryBlockLink
            category={"Daily Rambam"}
            heCat={"הרמב״ם היומי"}
            style={{"borderColor": Sefaria.palette.categoryColor("Halakhah")}}
            subtext={{en: rambam.ref.en.replace("Mishneh Torah, ", ""), he: rambam.ref.he.replace("משנה תורה, ", "")}}
            onPress={() => { openRef(rambam.ref.en); }}
            key="rambam" /> : null
          ];

  var calendarContent = (
    <TwoBox language={menuLanguage}>
      { calendar }
    </TwoBox>
  );

  return (
    <ReaderNavigationMenuSection
      hasmore={false}
      title={strings.calendar}
      heTitle={strings.calendar}
      content={calendarContent}
    >
  );
}
CalendarSection.propTypes = {
  openRef:       PropTypes.func.isRequired,
};

const SavedHistorySection = ({ isWhite, openHistory, openSaved }) => (
  <View style={[styles.twoBoxRow, {marginVertical: 15}]}>
    <View style={styles.twoBoxItem}>
      <CategoryBlockLink
        category={"History"}
        heCat={"היסטוריה"}
        style={{flex:1 , paddingVertical: 12, borderRadius: 5, borderWidth: 1, borderTopWidth: 1, borderColor: "#ccc"}}
        isSans={true}
        icon={isWhite ? require('./img/clock.png') : require('./img/clock-light.png')}
        onPress={openHistory}
        iconSide="start"
      />
    </View>
    <View style={styles.twoBoxItem}>
      <CategoryBlockLink
        category={"Saved"}
        heCat={"שמורים"}
        style={{flex: 1, paddingVertical: 12, borderRadius: 5, borderWidth: 1, borderTopWidth: 1, borderColor: "#ccc"}}
        isSans={true}
        icon={isWhite ? require('./img/starUnfilled.png') : require('./img/starUnfilled-light.png')}
        onPress={openSaved}
        iconSide="start"
      />
    </View>
  </View>
);

const ReaderNavigationMenuSection = ({ title, heTitle, content, hasmore, moreClick }) => {
  // A Section on the main navigation which includes a title over a grid of options
  const { theme, interfaceLanguage } = useContext(GlobalStateContext);
  if (!content) { return null; }

  var isheb = interfaceLanguage === "hebrew";
  var title = !isheb ? title : heTitle;
  var langStyle = !isheb ? styles.enInt : styles.heInt;
  var moreHeStyle = !isheb || !hasmore ? [styles.readerNavSectionMoreInvisible, styles.readerNavSectionMoreHe] : [styles.readerNavSectionMoreHe];
  var moreEnStyle = isheb || !hasmore ? [styles.readerNavSectionMoreInvisible, styles.readerNavSectionMoreEn] : [styles.readerNavSectionMoreEn];
  return (<View style={styles.readerNavSection}>
            <View style={styles.readerNavSectionTitleOuter}>
              <TouchableOpacity onPress={isheb ? moreClick : ()=>{}}>
                <Text style={moreHeStyle}> עוד &gt;</Text>
              </TouchableOpacity>
              <Text style={[styles.readerNavSectionTitle, theme.readerNavSectionTitle, langStyle]}>{title}</Text>
              <TouchableOpacity onPress={!isheb ? moreClick : ()=>{}}>
                <Text style={moreEnStyle}> MORE &gt;</Text>
              </TouchableOpacity>
            </View>
            {this.props.content}
          </View>);
}
ReaderNavigationMenuSection.propTypes = {
  title:         PropTypes.string,
  heTitle:       PropTypes.string,
  content:       PropTypes.object,
  hasmore:       PropTypes.bool,
  moreClick:     PropTypes.func
};


export default ReaderNavigationMenu;
