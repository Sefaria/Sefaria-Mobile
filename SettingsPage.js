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
} from 'react-native';
import VersionNumber from 'react-native-version-number';

import ProgressBar from './ProgressBar';
import {
  CategoryColorLine,
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
  deleteLibrary as downloaderDeleteLibrary,
} from './DownloadControl';

const generateOptions = (options, onPress) => options.map(o => ({
  name: o,
  text: strings[o],
  onPress: () => { onPress(o); },
}));

const getIsDisabledObj = () => {
  const isDisabledObj = {};
  for (let [pkgName, pkgObj] of Object.entries(PackagesState)) {
    isDisabledObj[pkgName] = !!pkgObj.disabled;
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

const usePkgState = () => {
  const { interfaceLanguage } = useContext(GlobalStateContext);
  const [isDisabledObj, setIsDisabledObj] = useState(getIsDisabledObj());  // React Hook

  const onPackagePress = (pkgObj, setDownloadFunction) => {
    const onPressActive = async (pkgName) => {
      if (!!PackagesState[pkgName].clicked) { // if pressed when clicked, we are removing the package
        await PackagesState[pkgName].unclick();
        setIsDisabledObj(getIsDisabledObj())
      }
      else {
        DownloadTracker.subscribe('settingsPagePackageDownload', setDownloadFunction);
        await PackagesState[pkgName].markAsClicked();
        setIsDisabledObj(getIsDisabledObj());
        await downloadPackage(pkgName);
      }
    };
    const parent = pkgObj.parent;
    const shortIntLang = interfaceLanguage.slice(0,2);
    //NOTE: onPressDisabled() takes pkgNames in curr intLang while onPress() takes eng
    if (pkgObj.disabled) { onPressDisabled(pkgObj[shortIntLang], parent[shortIntLang]); }
    else { onPressActive(pkgObj.name); }
  };

  return {
    isDisabledObj,
    setIsDisabledObj,
    onPackagePress,
  };
};

function abstractUpdateChecker(disableUpdateComponent) {
  async function f() {
    disableUpdateComponent(true);
    try {
      const [totalDownloads, newBooks] = await checkUpdatesFromServer();
      if (totalDownloads > 0) {
        promptLibraryUpdate(totalDownloads, newBooks);
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
  const { themeStr, interfaceLanguage, isLoggedIn } = useContext(GlobalStateContext);
  const { isDisabledObj, setIsDisabledObj, onPackagePress } = usePkgState();
  const theme = getTheme(themeStr);
  const [updatesDisabled, setUpdatesDisabled] = useState(false);
  const checkUpdatesForSettings = abstractUpdateChecker(setUpdatesDisabled);

  const deleteLibrary = async () => {
    await downloaderDeleteLibrary();
    setIsDisabledObj(getIsDisabledObj);
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
  const options = {
    interfaceLanguageOptions: generateOptions(['english', 'hebrew'], setInterfaceLanguage),
    textLanguageOptions: generateOptions(['english', 'bilingual', 'hebrew'], setTextLanguage),
    emailFrequencyOptions: generateOptions(['daily', 'weekly', 'never'], setEmailFrequency),
    preferredCustomOptions: generateOptions(['sephardi', 'ashkenazi'], setPreferredCustom),
  };
  /* stateKey prop is used for testing */
  return (
    <View>
      {['textLanguage', 'interfaceLanguage', 'emailFrequency', 'preferredCustom'].map(s => (
        <View style={styles.settingsSection} key={s} stateKey={s}>
          <View>
            <Text style={[langStyle, styles.settingsSectionHeader, theme.tertiaryText]}>{strings[s]}</Text>
          </View>
          <ButtonToggleSetNew
            options={options[`${s}Options`]}
            lang={globalState.interfaceLanguage}
            active={globalState[s]} />
        </View>
      ))}
    </View>
  );
};

const OfflinePackageList = ({ isDisabledObj, onPackagePress }) => {

  // We set up a subscription to the download tracker when a package is clicked. We need to make sure this is cleaned up
  useEffect(() => {
    return () => {
      DownloadTracker.unsubscribe('settingsPagePackageDownload');
    }  // we can use the isDisabledObj prop to limit when we unsubscribe. Unclear if this is necessary at this point.
  });
  return (
    <View style={styles.settingsOfflinePackages}>
      {
        Object.values(PackagesState).sort((a, b) => a.order - b.order).map(p => {
          const isSelected = p.clicked;
          const {isD, setDownload} = useState(false);
           const onPress = () => { onPackagePress(p, setDownload); };

          return (
            <View key={`${p.name}|${isDisabledObj[p.name]}|parent`}>
              <LibraryNavButton
                catColor={Sefaria.palette.categoryColor(p.color)}
                enText={p.name}
                heText={p.jsonData['he']}
                count={`${Math.round(p.jsonData['size'] / 1e6)}mb` /* NOTE: iOS uses 1e6 def of mb*/}
                onPress={onPress}
                onPressCheckBox={onPress}
                checkBoxSelected={0+isSelected}
                buttonStyle={{margin: 0, padding: 0, opacity: isDisabledObj[p.en] ? 0.6 : 1.0}}
                withArrow={false}
              />
            { isD ?
                <SefariaProgressBar
                  download={DownloadTracker}
                /> : null
              }
            </View>
          );
        })
    }
  </View>
  );
};

export default SettingsPage;
