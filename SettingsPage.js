'use strict';

import PropTypes from 'prop-types';
import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ScrollView,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import RNFB from 'rn-fetch-blob';
import VersionNumber from 'react-native-version-number';
import NetInfo from "@react-native-community/netinfo";
import ProgressBar from './ProgressBar';
import {
  CategoryColorLine,
  ConditionalProgressWrapper,
  CloseButton,
  ButtonToggleSetNew,
  LibraryNavButton,
  SefariaProgressBar,
  SystemButton,
} from './Misc.js';
import { GlobalStateContext, DispatchContext, STATE_ACTIONS, getTheme } from './StateManager';
import styles from './Styles';
import strings from './LocalizedStrings';
import {
  PackagesState,
  Tracker as DownloadTracker,
  downloadPackage,
  checkUpdatesFromServer,
  promptLibraryUpdate,
  wereBooksDownloaded,
  markLibraryForDeletion,
  Package,
  deleteBooks,
  doubleDownload, getLocalBookList,
  isDownloadAllowed,
  FILE_DIRECTORY, downloadUpdate
} from './DownloadControl';
import Sefaria from "./sefaria";
const DEBUG_MODE = false;

const generateOptions = (options, onPress) => options.map(o => ({
  name: o,
  text: strings[o],
  onPress: () => { onPress(o); },
}));

const getIsDisabledObj = () => {
  const isDisabledObj = {};
  for (let [pkgName, pkgObj] of Object.entries(PackagesState)) {
    isDisabledObj[pkgName] = !!pkgObj.supersededByParent;
  }
  return isDisabledObj;
};

const onPressDisabled = (child, parent) => {
  Alert.alert(
    strings.alreadyDownloaded,
    `${strings.areIncludedIn} "${parent}"`,
    [
      {text: strings.ok, onPress: () => {}}
    ]
  );
};

let packageDownloadLock = {locked: false};

const usePkgState = () => {
  const { interfaceLanguage, downloadNetworkSetting } = useContext(GlobalStateContext);
  const [isDisabledObj, setIsDisabledObj] = useState(getIsDisabledObj());  // React Hook


  const onPackagePress = async (pkgObj) => {
    const onPressActive = async (pkgName) => {
      const removePackage = async () => {
        if (DownloadTracker.downloadInProgress()) {
          DownloadTracker.cancelDownload();
        }
        const booksToDelete = await PackagesState[pkgName].unclick();
        setIsDisabledObj(getIsDisabledObj());
        await deleteBooks(booksToDelete);
      };
      const addPackage = async () => {
        const netState = await NetInfo.fetch();
        if (!isDownloadAllowed(netState, downloadNetworkSetting)) {
          Alert.alert(
            "Download Blocked by Network",
            `Current network setting forbids download. Please change settings or connect to internet and try again.`,
            [{text: strings.ok}]
          );
          return
        }
        await PackagesState[pkgName].markAsClicked();
        await DownloadTracker.startDownloadSession(pkgName);
        setIsDisabledObj(getIsDisabledObj());
        try {
          await downloadPackage(pkgName, downloadNetworkSetting);
        } catch (e) {
          console.log(e)
        }
      };
      if (PackagesState[pkgName].clicked) { await removePackage()}
      else {
        if (packageDownloadLock.locked || DownloadTracker.downloadInProgress()) {
          doubleDownload();
          return
        }
        packageDownloadLock.locked = true;
        try {
          await addPackage();
        } finally {
          packageDownloadLock.locked = false;
        }
      }
    };
    const parent = pkgObj.parent;
    const shortIntLang = interfaceLanguage.slice(0,2);
    //NOTE: onPressDisabled() takes pkgNames in curr intLang while onPress() takes eng
    if (pkgObj.supersededByParent) {
      onPressDisabled(pkgObj[shortIntLang], PackagesState[parent].jsonData[shortIntLang]); }
    else {
     await onPressActive(pkgObj.name);
    }
  };

  return {
    isDisabledObj,
    setIsDisabledObj,
    onPackagePress,
  };
};

function abstractUpdateChecker(disableUpdateComponent, networkMode) {
  async function f() {
    if (DownloadTracker.downloadInProgress()) {
      doubleDownload();
      return
    }
    disableUpdateComponent(true);
    try {
      const [totalDownloads, newBooks] = await checkUpdatesFromServer();

      if (totalDownloads.length > 0) {
        promptLibraryUpdate(totalDownloads, newBooks, networkMode);
      }
      else {
        Alert.alert(
          strings.libraryUpToDate,
          strings.libraryUpToDateMessage,
          [
            {text: strings.ok}
          ])}
    } catch (e) {
      console.log(e);  // todo: proper error handling
    }
    finally {
      disableUpdateComponent(false);
    }
  }
  return f
}

const SettingsPage = ({ close, logout, openUri }) => {
  const [numPressesDebug, setNumPressesDebug] = useState(0);
  const { themeStr, interfaceLanguage, isLoggedIn, downloadNetworkSetting } = useContext(GlobalStateContext);
  const { isDisabledObj, setIsDisabledObj, onPackagePress } = usePkgState();
  const theme = getTheme(themeStr);
  const [updatesDisabled, setUpdatesDisabled] = useState(false);
  const checkUpdatesForSettings = abstractUpdateChecker(setUpdatesDisabled, downloadNetworkSetting);

  const deleteLibrary = async () => {
    if (DownloadTracker.downloadInProgress()) { DownloadTracker.cancelDownload() }
    const booksToDelete = await markLibraryForDeletion();
    setIsDisabledObj(getIsDisabledObj);
    await deleteBooks(booksToDelete);
  };

  const langStyle = interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt;
  return (
    <View style={[styles.menu, theme.menu]}>
      <CategoryColorLine category={"Other"} />
      <View style={[styles.header, theme.header]}>
        <CloseButton onPress={close} />
        <Text style={[langStyle, styles.settingsHeader, theme.text]}>{strings.settings.toUpperCase()}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.menuContent}>

        <ButtonToggleSection
          langStyle={langStyle}
        />

        <View style={[styles.readerDisplayOptionsMenuDivider, styles.settingsDivider, theme.readerDisplayOptionsMenuDivider]}/>

        {wereBooksDownloaded() ?
          <View>
            <TouchableOpacity style={styles.button} disabled={updatesDisabled} onPress={checkUpdatesForSettings}>
              <Text style={[langStyle, styles.buttonText]}>{updatesDisabled ? strings.checking : strings.checkForUpdates}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={deleteLibrary}>
              <Text style={[langStyle, styles.buttonText]}>{strings.deleteLibrary}</Text>
            </TouchableOpacity>
            {DEBUG_MODE ? <TouchableOpacity style={styles.button} onPress={() => {
              console.log('pressed Mess up Library');
              getLocalBookList().then(books => {
                deleteBooks(books).then(() => console.log('finished messing up library'));
              })
            }}>
              <Text style={[langStyle, styles.buttonText]}>Mess up Library</Text>
            </TouchableOpacity> : null}
          </View>
          : null
        }
        {
          DEBUG_MODE ?
            <View>
              <TouchableOpacity style={styles.button} onPress={() => RNFB.fs.ls(FILE_DIRECTORY).then(x => console.log(
                `${x.filter(f => f.endsWith('zip')).length} files on disk`
              ))}>
                <Text style={[langStyle, styles.buttonText]}>Check Disk</Text>
              </TouchableOpacity>
            </View>
            : null
        }
        <OfflinePackageList isDisabledObj={isDisabledObj} onPackagePress={onPackagePress} />
        <View style={[styles.readerDisplayOptionsMenuDivider, styles.settingsDivider, styles.underOfflinePackages, theme.readerDisplayOptionsMenuDivider]}/>
        <View>
          <Text style={[langStyle, styles.settingsSectionHeader, theme.tertiaryText]}>{strings.system}</Text>
        </View>
        { isLoggedIn ?
          <SystemButton onPress={logout} text={strings.logout} isHeb={interfaceLanguage === "hebrew"} />
          : null
        }
        <SystemButton onPress={()=>{ openUri('https://www.sefaria.org/terms'); }} text={strings.termsAndPrivacy} isHeb={interfaceLanguage === "hebrew"} />
        <View>
          <Text style={[langStyle, styles.settingsSectionHeader, theme.tertiaryText]}>
            {`${strings.appVersion}: ${VersionNumber.appVersion}`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};
SettingsPage.propTypes = {
  close:   PropTypes.func.isRequired,
  logout:  PropTypes.func.isRequired,
  openUri: PropTypes.func.isRequired,
};

const ButtonToggleSection = ({ langStyle }) => {
  const dispatch = useContext(DispatchContext);
  const globalState = useContext(GlobalStateContext);
  const theme = getTheme(globalState.themeStr);
  const setInterfaceLanguage = language => {
    dispatch({
      type: STATE_ACTIONS.setInterfaceLanguage,
      value: language,
      time: Sefaria.util.epoch_time(),
    });
  };
  // not synced with web settings
  const setTextLanguage = language => {
    dispatch({
      type: STATE_ACTIONS.setTextLanguage,
      value: language,
    })
  };
  const setEmailFrequency = freq => {
    dispatch({
      type: STATE_ACTIONS.setEmailFrequency,
      value: freq,
      time: Sefaria.util.epoch_time(),
    });
  };
  const setPreferredCustom = custom => {
    dispatch({
      type: STATE_ACTIONS.setPreferredCustom,
      value: custom,
      time: Sefaria.util.epoch_time(),
    });
  };
  const setDownloadNetworkSetting = wifiOnly => {
    dispatch({
      type: STATE_ACTIONS.setDownloadNetworkSetting,
      value: wifiOnly,
    });
    // changing network settings mid-download is problematic. Best is to drop download and request a new one
    if (DownloadTracker.hasEventListener()) {
      DownloadTracker.cancelDownload(true);
      DownloadTracker.removeEventListener();
      downloadUpdate(wifiOnly, false).then(() => {})
    }
  };
  const options = {
    interfaceLanguageOptions: generateOptions(['english', 'hebrew'], setInterfaceLanguage),
    textLanguageOptions: generateOptions(['english', 'bilingual', 'hebrew'], setTextLanguage),
    emailFrequencyOptions: generateOptions(['daily', 'weekly', 'never'], setEmailFrequency),
    preferredCustomOptions: generateOptions(['sephardi', 'ashkenazi'], setPreferredCustom),
    downloadNetworkSettingOptions: generateOptions(['wifiOnly', 'mobileNetwork'], setDownloadNetworkSetting),

  };
  /* stateKey prop is used for testing */
  return (
    <View>
      {['textLanguage', 'interfaceLanguage', 'emailFrequency', 'preferredCustom', 'downloadNetworkSetting'].map(s => (
        <View style={styles.settingsSection} key={s} stateKey={s}>
          <View>
            <Text style={[langStyle, styles.settingsSectionHeader, theme.tertiaryText]}>{strings[s]}</Text>
          </View>
          <ButtonToggleSetNew
            options={options[`${s}Options`]}
            lang={globalState.interfaceLanguage}
            active={globalState[s]} />
        </View>))}
    </View>
  );
};

const OfflinePackageList = ({ isDisabledObj, onPackagePress }) => {
  return (
    <View style={styles.settingsOfflinePackages}>
      {
        /*
        * Note the usage of Global state here. Having a context manager or reducer (useContext or useReducer) might
        * be a better way to handle this data. Or possibly a Prop on a higher level component.
        *
        * This works because after initialization we change state on ReaderApp and force a re-render. Clicking a package
        * works because we change state on a click to PackageComponent. Essentially the changes to packages are caught
        * in the re-render. We aren't tuned in to changes to PackagesState or the Package objects directly and are
        * relying on peripheral changes in order to render the correct result.
        */
        Object.values(PackagesState).sort((a, b) => a.order - b.order).map(p => {
          return (
            <View key={p.name}>
              <PackageComponent onPackagePress={onPackagePress} packageObj={p} isDisabledObj={isDisabledObj}/>
            </View>
          )
        })
      }

  </View>
  );
};

const PackageComponent = ({ packageObj, onPackagePress, isDisabledObj }) => {
  const isSelected = packageObj.clicked;

  const onPress = async () => {
    await onPackagePress(packageObj);
  };

  return (
    <View key={packageObj.name}>
      <LibraryNavButton
        catColor={Sefaria.palette.categoryColor(packageObj.jsonData.color)}
        enText={packageObj.name}
        heText={packageObj.jsonData['he']}
        count={`${Math.round(packageObj.jsonData['size'] / 1e6)}mb`  /* NOTE: iOS uses 1e6 def of mb*/ }
        onPress={onPress}
        onPressCheckBox={onPress}
        checkBoxSelected={0+isSelected}
        buttonStyle={{margin: 0, padding: 0, opacity: isDisabledObj[packageObj.en] ? 0.6 : 1.0}}
        withArrow={false}
      />
      <ConditionalProgressWrapper
        conditionMethod={ (state, props) => state && state.downloadNotification === props.packageName}
        initialValue={DownloadTracker.getDownloadStatus()}
        downloader={DownloadTracker}
        listenerName={`PackageComponent${packageObj.name}`}
        packageName={packageObj.name}
      >
        <SefariaProgressBar
          download={DownloadTracker}
          onClose={() => DownloadTracker.cancelDownload()}
          identity={'SettingsPage'}
          downloadSize={packageObj.jsonData.size} />
      </ConditionalProgressWrapper>
    </View>
  )
};
PackageComponent.propTypes = {
  packageObj: PropTypes.instanceOf(Package).isRequired,
  onPackagePress: PropTypes.func.isRequired,
  isDisabledObj: PropTypes.object
};

export default SettingsPage;
