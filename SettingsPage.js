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
import VersionNumber from 'react-native-version-number';
import NetInfo from "@react-native-community/netinfo";
import ProgressBar from './ProgressBar';
import {
  CategoryColorLine,
  ConditionalProgressWrapper,
  CloseButton,
  ButtonToggleSet,
  LibraryNavButton,
  SefariaProgressBar,
  SystemButton,
  LoadingView,  
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
import * as FileSystem from 'expo-file-system';
const DEBUG_MODE = false;

/**
 * 
 * @param {array} options 
 * @param {func} onPress 
 * @param {array} values. optional list of values that should be passed to onPress if present. should be same length as options 
 */
const generateOptions = (options, onPress, values=[]) => Sefaria.util.zip([options, values]).map(([o,v]) => ({
  name: o,
  text: strings[o],
  value: v,
  onPress: () => { onPress(typeof v == 'undefined' ? o : v); },
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
        DownloadTracker.cancelDownload();
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
      if (PackagesState[pkgName].clicked) {
        Alert.alert(
          strings.delete,
          strings.areYouSureDeletePackage,
          [{text: strings.yes, onPress: removePackage}, {text: strings.no}]
        )
      }
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
  const [isProcessing, setIsProcessing] = useState(false);

  const deleteLibrary = async () => {
    DownloadTracker.cancelDownload(true);
    const booksToDelete = await markLibraryForDeletion();
    setIsDisabledObj(getIsDisabledObj);
    await deleteBooks(booksToDelete);
  };
  const deleteAccount = () => {
    Alert.alert( //ask for confirmation
      strings.deleteAccount,
      strings.deleteAccountMsg,
      [
        {
          text: strings.cancel, onPress: () => {console.log("cancel delete")}, style: "cancel"
        },
        { text: strings.ok, onPress: () => {
            setIsProcessing(true);
            Sefaria.track.event("DeleteUser", {platform: "app"});
            console.log("Deleting account");
            Sefaria.api.deleteUserAccount()
                .then(()=> { //Inform user account has been deleted
                   Alert.alert("", strings.deleteAccountOK, [{
                    text: strings.ok, onPress: () => {
                      setIsProcessing(false); //do it here so the delete account link doesnt re appear for a moment after deleting account
                      logout();
                    }
                  }]);
                })
                .catch(e => {// If an error occurred, inform user and open an email window to allow sending us an email 
                  setIsProcessing(false);
                  Alert.alert("", strings.deleteAccountError, [{
                    text: strings.ok, onPress: () => {
                      Sefaria.util.openComposedEmail("hello@sefaria.org", `Delete Account Error`, "");
                    }
                  }]);
            });
          } 
        }
      ], {cancelable: true }
    );
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
        <View>
          <Text style={[langStyle, styles.settingsSectionHeader, theme.tertiaryText]}>{strings.offlineAccess}</Text>
        </View>
        
        {wereBooksDownloaded() ?
          <View>
            <SystemButton
              onPress={checkUpdatesForSettings}
              text={updatesDisabled ? strings.checking : strings.checkForUpdates}
              isLoading={updatesDisabled}
            />

            <SystemButton
              onPress={() => {
                Alert.alert(
                  strings.deleteLibrary,
                  strings.confirmDeleteLibraryMessage,
                  [{text: strings.yes, onPress: deleteLibrary}, {text: strings.no}]
                )
              }}
              text={strings.deleteLibrary}
            />

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
              <TouchableOpacity style={styles.button} onPress={() => FileSystem.getInfoAsync(FILE_DIRECTORY).then(x => console.log(
                `${x.filter(f => f.endsWith('zip')).length} files on disk`
              ))}>
                <Text style={[langStyle, styles.buttonText]}>Check Disk</Text>
              </TouchableOpacity>
            </View>
            : null
        }
        <OfflinePackageList isDisabledObj={isDisabledObj} onPackagePress={onPackagePress} />
        <View style={[styles.readerDisplayOptionsMenuDivider, styles.settingsDivider, styles.underOfflinePackages, theme.readerDisplayOptionsMenuDivider]}/>
        <TouchableWithoutFeedback onPress={() => {
          if (numPressesDebug < 6) { setNumPressesDebug(prev => prev + 1); }
          else {
            Sefaria.debugNoLibrary = !Sefaria.debugNoLibrary;
            setNumPressesDebug(0);
            Alert.alert(
              'Debug No Offline Library Mode',
              `You've just ${Sefaria.debugNoLibrary ? "enabled" : "disabled"} debugging without the offline library. You can change this by tapping 'System' 7 times.`,
              [
                {text: 'OK', onPress: ()=>{}},
              ]
            );
          }
        }}>
          <Text style={[langStyle, styles.settingsSectionHeader, theme.tertiaryText]}>{strings.system}</Text>
        </TouchableWithoutFeedback>
        { isLoggedIn ?
          <SystemButton onPress={logout} text={strings.logout} isHeb={interfaceLanguage === "hebrew"} />
          : null
        }
        <SystemButton onPress={()=>{ openUri('https://www.sefaria.org/terms'); }} text={strings.termsAndPrivacy} isHeb={interfaceLanguage === "hebrew"} />
        <View style={{marginTop: 10}}>
          <Text style={[langStyle, styles.settingsSectionHeader, theme.tertiaryText]}>
            {`${strings.appVersion}: ${VersionNumber.appVersion}`}
          </Text>
        </View>
        { isLoggedIn ?
            (isProcessing ? <LoadingView/> :
            <Text style={[{marginTop:30, marginBottom:30}, langStyle, styles.settingsSectionHeader, theme.tertiaryText]} onPress={deleteAccount}>
                  { strings.deleteAccount }
            </Text>)
          : null
        }    
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
  const setReadingHistory = isReadingHistory => {
    const dispatcher = () => (
      dispatch({
        type: STATE_ACTIONS.setReadingHistory,
        value: isReadingHistory,
        time: Sefaria.util.epoch_time(),
      })
    );
    if (!isReadingHistory && globalState.readingHistory) {
      Alert.alert(
        strings.delete,
        strings.turningThisFeatureOff,
        [
          {text: strings.cancel, onPress: ()=>{}},
          {
            text: strings.delete,
            onPress: dispatcher,
            style: 'destructive',
          }
        ]
      );
    } else { dispatcher(); }
  };
  const setGroggerActive = isActive => {
    dispatch({
      type: STATE_ACTIONS.setGroggerActive,
      value: isActive,
    });
  };
  const options = {
    interfaceLanguageOptions: generateOptions(['english', 'hebrew'], setInterfaceLanguage),
    textLanguageOptions: generateOptions(['english', 'bilingual', 'hebrew'], setTextLanguage),
    emailFrequencyOptions: generateOptions(['daily', 'weekly', 'never'], setEmailFrequency),
    preferredCustomOptions: generateOptions(['sephardi', 'ashkenazi'], setPreferredCustom),
    downloadNetworkSettingOptions: generateOptions(['wifiOnly', 'mobileNetwork'], setDownloadNetworkSetting),
    readingHistoryOptions: generateOptions(['onFem', 'offFem'], setReadingHistory, [true, false]),
    groggerActiveOptions: generateOptions(['on', 'off'], setGroggerActive),
  };
  /* stateKey prop is used for testing */
  const toggleButtons = ['textLanguage', 'interfaceLanguage', 'emailFrequency', 'readingHistory', 'preferredCustom', 'downloadNetworkSetting'];
  if (Sefaria.isGettinToBePurimTime()) { toggleButtons.push('groggerActive'); }
  return (
    <View>
      {toggleButtons.map(s => (
        <View style={styles.settingsSection} key={s} stateKey={s}>
          <View>
            <Text style={[langStyle, styles.settingsSectionHeader, theme.tertiaryText]}>{strings[s]}</Text>
          </View>
          <ButtonToggleSet
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

  // clicking multiple times in succession causes issues and is likely a mistake. Give a small timeout to prevent double clicks
  const [doubleTap, setDoubleTap] = useState(false);
  const preventDoubleTap = () => {
    setDoubleTap(true);
    setTimeout(() => setDoubleTap(false), 1500);
  };

  const onPress = doubleTap ? () => {} : async () => {
    preventDoubleTap();
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
