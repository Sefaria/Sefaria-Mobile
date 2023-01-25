'use strict';
import PropTypes from 'prop-types';
import React, { useContext, useState, useReducer } from 'react';
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
  SystemButton,
  LoadingView, SefariaPressable,
} from './Misc.js';
import { STATE_ACTIONS, DispatchContext, GlobalStateContext, getTheme } from './StateManager';
import VersionNumber from 'react-native-version-number';
import ActionSheet from 'react-native-action-sheet';
import SearchBar from './SearchBar';
import ReaderNavigationCategoryMenu from './ReaderNavigationCategoryMenu';
import styles from './Styles.js';
import strings from './LocalizedStrings.js';
import Sefaria from './sefaria';
import {
  getFullBookList,
  getLocalBookList,
  PackagesState
} from './DownloadControl';
import { useAsyncVariable } from './Hooks';
import {iconData} from "./IconData";


const ReaderNavigationMenu = props => {
  // The Navigation menu for browsing and searching texts
  const { themeStr, interfaceLanguage, textLanguage } = useContext(GlobalStateContext);
  const [showMore, setShowMore] = useState(false);
  const theme = getTheme(themeStr);

  if (props.categories.length) {
    // List of Text in a Category
    return (<ReaderNavigationCategoryMenu
              key={props.categories.slice(-1)[0]}
              categories={props.categories}
              category={props.categories.slice(-1)[0]}
              setCategories={props.setCategories}
              openRef={props.openRef}
              navHome={() => { props.setCategories([]); }}
              openUri={props.openUri}/>);
  } else {
    let categories = Sefaria.topLevelCategories.map(cat => (
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
        <TwoBox language={Sefaria.util.get_menu_language(interfaceLanguage, textLanguage)}>
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
              hasLangToggle={true}
              onChange={props.onChangeSearchQuery}
              query={props.searchQuery}
              searchType={props.searchType}
              onFocus={props.openAutocomplete}/>
            <ScrollView style={styles.menuContent} contentContainerStyle={styles.menuScrollViewContent}>
              <SavedHistorySection
                themeStr={themeStr}
                isHeb={isHeb}
                openHistory={props.openHistory}
                openSaved={props.openSaved}
              />

              <ReaderNavigationMenuSection
                title={strings.browse}
                heTitle="טקסטים"
                content={categories}
                hasmore={false} />

              <ResourcesSection
                openTopicToc={props.openTopicToc}
                openMySheets={props.openMySheets}
                openLogin={props.openLogin}
              />

              <CalendarSection
                openRef={props.openRef}
                openUri={props.openUri}
              />

              <MoreSection
                isHeb={isHeb}
                openUri={props.openUri}
                openNavMenu={props.openNavMenu}
                openSettings={props.openSettings}
              />

              <AuthSection
                openLogin={props.openLogin}
                openRegister={props.openRegister}
                logout={props.logout}
              />

              <Text style={[styles.dedication, isHeb ? styles.hebrewSystemFont : null, theme.secondaryText]}
                  onPress={props.openDedication}>
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
  openTopicToc:   PropTypes.func.isRequired,
  openDedication: PropTypes.func.isRequired,
  onChangeSearchQuery:PropTypes.func.isRequired,
  searchQuery:    PropTypes.string.isRequired,
  openAutocomplete: PropTypes.func.isRequired,
  openUri:        PropTypes.func.isRequired,
  searchType:     PropTypes.oneOf(['text', 'sheet']).isRequired,
  logout:         PropTypes.func.isRequired,
};
ReaderNavigationMenu.whyDidYouRender = true;

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
        text={strings.sign_up}
        isBlue={true}
      />
      <SystemButton
        onPress={openLogin}
        text={strings.log_in}
      />
    </View>
  );
  return (
    <ReaderNavigationMenuSection
      hasmore={false}
      title={strings.account.toUpperCase()}
      heTitle={strings.account}
      content={authButtons}
    />
  );
}
AuthSection.propTypes = {
  openLogin: PropTypes.func.isRequired,
  openRegister: PropTypes.func.isRequired,
  logout: PropTypes.func.isRequired,
};

const getEmailBody = (downloaded, available) => {
  const nDownloaded = downloaded.length <= available.length ? downloaded.length : available.length;
  return `App Version: ${VersionNumber.appVersion}
          Texts Downloaded: ${nDownloaded} / ${available.length}
          Packages: ${Object.values(PackagesState).filter(p => p.wasSelectedByUser()).map(p => p.name).join(", ")}
          OS Version: ${Platform.OS} ${Platform.Version}\n`;
};

const MoreSection = ({ isHeb, openUri, openSettings, openNavMenu }) => {
  const { themeStr, debugInterruptingMessage, interfaceLanguage } = useContext(GlobalStateContext);
  const dispatch = useContext(DispatchContext);
  const [, forceUpdate] = useReducer(x => x + 1, 0);  // HACK
  const theme = getTheme(themeStr);

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
    if (interfaceLanguage === 'hebrew') {
      openUri("https://sefaria.nationbuilder.com/il_mobile?utm_source=Sefaria&utm_medium=App&utm_campaign=ILSupport");
    } else {
      openUri("https://sefaria.nationbuilder.com/give?utm_source=Sefaria&utm_medium=App&utm_campaign=Support");
    }
  };
  const onAbout = () => {
    openUri("https://www.sefaria.org/about");
  };
  const onFeedback = () => {
    Promise.all([getLocalBookList(), getFullBookList()]).then(x => {
      const emailBody = getEmailBody(...x);
      Sefaria.util.openComposedEmail("hello@sefaria.org", `${Platform.OS} App Feedback`, emailBody);
    });
  };
  return (
    <View style={styles.readerNavSection}>
      <TouchableWithoutFeedback onPress={onDebugSupportPress}>
        <View>
          <Text style={[styles.readerNavSectionTitleOuter, styles.readerNavSectionTitle, theme.readerNavSectionTitle, (isHeb ? styles.heInt : styles.enInt), {textAlign: "center"}]}>
            {strings.more.toUpperCase()}
          </Text>
        </View>
      </TouchableWithoutFeedback>
      <TwoBox>
        <SystemButton
          text={strings.donate}
          img={iconData.get('heart', themeStr)}
          onPress={onDonate}
          extraStyles={[styles.systemButtonTwoBox]}
          isHeb={isHeb}
        />
        <SystemButton
          text={strings.settings}
          img={iconData.get('settings', themeStr)}
          onPress={openSettings}
          extraStyles={[styles.systemButtonTwoBox]}
          isHeb={isHeb}
        />
        <SystemButton
          text={strings.about}
          img={iconData.get('info', themeStr)}
          onPress={openNavMenu}
          extraStyles={[styles.systemButtonTwoBox]}
          isHeb={isHeb}
        />
        <SystemButton
          text={strings.feedback}
          img={iconData.get('feedback', themeStr)}
          onPress={onFeedback}
          extraStyles={[styles.systemButtonTwoBox]}
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
MoreSection.whyDidYouRender = true;

const ResourcesSection = ({ openTopicToc, openMySheets, openLogin }) => {
  const { themeStr, interfaceLanguage, isLoggedIn } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const isHeb = interfaceLanguage === "hebrew";
  const langStyle = !isHeb ? styles.enInt : styles.heInt;

  return (
    <View style={{marginVertical: 15}}>
      <View style={{marginBottom: 15}}>
        <Text style={[styles.readerNavSectionTitle, theme.readerNavSectionTitle, langStyle, {textAlign: "center"}]}>
          {strings.resources}
        </Text>
      </View>
      <SystemButton
        text={strings.topics}
        img={iconData.get('hashtag', themeStr)}
        onPress={openTopicToc}
        isHeb={isHeb}
      />
      <SystemButton
        onPress={isLoggedIn ? openMySheets : openLogin}
        text={strings.mySheets}
        img={iconData.get('sheet', themeStr)}
        isHeb={isHeb}
      />
    </View>
  );
};
ResourcesSection.propTypes = {
  openTopicToc:       PropTypes.func.isRequired,
};
ResourcesSection.whyDidYouRender = true;



const CalendarSection = ({ openRef, openUri }) => {
  const { textLanguage, interfaceLanguage, preferredCustom } = useContext(GlobalStateContext);
  const calendarLoaded = useAsyncVariable(!!Sefaria.calendar, Sefaria._loadCalendar);
  // checking geolocation takes a long time. Default by looking at interfaceLanguage, then fix the calendar when location resolves
  const [galusOrIsrael, setGalusOrIsrael] = useState(Sefaria.galusOrIsrael || Sefaria.lastGalusStatus || (interfaceLanguage === "hebrew" ? "israel" : "diaspora"));
  const geoLocLoaded = useAsyncVariable(!!Sefaria.galusOrIsrael, Sefaria.getGalusStatus, setGalusOrIsrael, Sefaria.galusOrIsrael);
  if (!calendarLoaded) { return (<LoadingView />); }
  const calItems = Sefaria.getCalendars(preferredCustom, galusOrIsrael === 'diaspora');
  const isHeb = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == 'hebrew';
  return (
    <ReaderNavigationMenuSection
      hasmore={false}
      title={strings.calendar}
      heTitle={strings.calendar}
      content={
        <TwoBox language={Sefaria.util.get_menu_language(interfaceLanguage, textLanguage)}>
          { calItems.map(c => (
            <View key={c.order}>
              <CategoryBlockLink
                category={c.title.en}
                heCat={c.title.he}
                style={{"borderColor": Sefaria.palette.categoryColor(c.category)}}
                subtext={c.subs}
                allRefs={c.refs}
                onLongPress={() => {
                  ActionSheet.showActionSheetWithOptions({
                    options: c.subs.map(x => isHeb ? x.he : x.en).concat([strings.cancel]),
                    cancelButtonIndex: c.subs.length,
                  },
                  (buttonIndex) => {
                    if ((typeof buttonIndex == 'undefined') || buttonIndex >= c.subs.length) { return; }  // cancel button. button can be undefined when prreessing outside the long-press menu
                    (typeof c.refs == 'undefined') ? openUri(`${Sefaria.api._baseHost}${c.url}`) : openRef(c.refs[buttonIndex]);
                  })
                }}
                onPress={() => { (typeof c.refs == 'undefined') ? openUri(`${Sefaria.api._baseHost}${c.url}`) : openRef(c.refs[0]); }}
              />
            </View>
          ))}
        </TwoBox>
      }
    />
  );
};
CalendarSection.propTypes = {
  openRef: PropTypes.func.isRequired,
};
CalendarSection.whyDidYouRender = true;

const SavedHistorySection = ({ themeStr, isHeb, openHistory, openSaved }) => (
  <TwoBox>
    <SystemButton
      text={strings.history}
      img={iconData.get('clock', themeStr)}
      onPress={openHistory}
      isHeb={isHeb}
      extraStyles={[styles.systemButtonTwoBox]}
    />
    <SystemButton
      text={strings.saved}
      img={iconData.get('starUnfilled', themeStr)}
      onPress={openSaved}
      isHeb={isHeb}
      extraStyles={[styles.systemButtonTwoBox]}
    />
  </TwoBox>
);

const ReaderNavigationMenuSection = ({ title, heTitle, content, hasmore, moreClick }) => {
  // A Section on the main navigation which includes a title over a grid of options
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  if (!content) { return null; }

  var isheb = interfaceLanguage === "hebrew";
  title = !isheb ? title : heTitle;
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
            { content }
          </View>);
}
ReaderNavigationMenuSection.propTypes = {
  title:         PropTypes.string,
  heTitle:       PropTypes.string,
  content:       PropTypes.object,
  hasmore:       PropTypes.bool,
  moreClick:     PropTypes.func
};
ReaderNavigationMenuSection.whyDidYouRender = true;


export default ReaderNavigationMenu;
