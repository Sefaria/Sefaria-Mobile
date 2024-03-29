import React, { useContext, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
} from 'react-native';

import {
  LoadingView,
} from './Misc.js';
import { GlobalStateContext, getTheme } from './StateManager';
import {VersionBlockWithPreview} from './VersionBlock';
import strings from './LocalizedStrings';
import styles from'./Styles.js';
import {useGlobalState} from "./Hooks";

const getVLangState = (initialCurrVersions, initialMainVersionLanguage, versions) => {
  const versionLangMap = {};
  for (let v of versions) {
    const matches = v.versionTitle.match(new RegExp("\\[([a-z]{2})\\]$")); // two-letter ISO language code
    const lang = matches ? matches[1] : v.language;
    //if version is the initial one selected, put it first
    versionLangMap[lang] = !!versionLangMap[lang] ?
      (initialCurrVersions[lang] === v.versionTitle ? [v].concat(versionLangMap[lang]) : versionLangMap[lang].concat(v)) : [v];
  }

  //sort versions by language so that
  //- initialMainVersionLanguage shows up first
  //- Hebrew shows up second
  //- everything else shows up in alphabetical order
  const versionLangs = Object.keys(versionLangMap).sort(
    (a, b) => {
      if      (a === initialMainVersionLanguage.slice(0,2)) {return -1;}
      else if (b === initialMainVersionLanguage.slice(0,2)) {return  1;}
      else if (a === 'he' && b !== 'he')                    {return  -1;}
      else if (a !== 'he' && b === 'he')                    {return 1;}
      else if (a < b)                                       {return -1;}
      else if (b > a)                                       {return  1;}
      else                                                  {return  0;}
    }
  );
  return { versionLangMap, versionLangs };
};

const useVLangState = (currVersionObjects, versions) => {
  const [initialCurrVersions,] = useState(Object.entries(currVersionObjects).reduce(
    (obj, [lang, val]) => {
      obj[lang] = !!val ? val.versionTitle : null;
      return obj;
    }, {}
  ));
  const getVLangStateBound = versions => (
    getVLangState(initialCurrVersions, initialMainVersionLanguage, versions)
  );
  const initialMainVersionLanguage = "english"; // hardcode to english to prioritize english versions. used to be: useState(textLanguage === "bilingual" ? "hebrew" : textLanguage);
  const [vLangState, setVLangState] = useState(getVLangStateBound(versions));
  return {
    vLangState,
    setVLangState: versions => {
      setVLangState(getVLangStateBound(versions));
    },
  };
}

const TranslationsBox = ({
  currVersionObjects,
  segmentRef,
  openFilter,
  openUri,
  openRef,
}) => {
  const {theme, interfaceLanguage} = useGlobalState();
  const {vLangState, setVLangState } = useVLangState(currVersionObjects, []);
  const [apiError, setApiError] = useState(false)
  const loadData = async () => {
    setApiError(false);
    setVLangState([]);
    try {
      const translations = await Sefaria.offlineOnline.loadTranslations(segmentRef);
      setVLangState(translations.versions || []);
    } catch(error) {
      setApiError(true);
    }
  }
  useEffect(() => {
    loadData();
  }, [segmentRef]);
  const flexStyles = {
    flexDirection: "column",
    alignSelf: "stretch",
    flex: 1
  };
  const textAlign = {textAlign: (interfaceLanguage==='hebrew' ? 'right': 'left')};

  if (apiError) {
    return (
      <View style={[{flex:1}, styles.readerSideMargin]}>
        <Text style={[styles.emptyLinksMessage, theme.secondaryText]}>{strings.connectToVersionsMessage}</Text>
      </View>
    );
  }
  if (!Object.keys(vLangState.versionLangMap).length) {
    return (
      <View style={flexStyles}>
        <LoadingView />
      </View>
    );
  }
  const currVersionTitles = {};
  for (let vlang in currVersionObjects) {
    const tempV = currVersionObjects[vlang];
    currVersionTitles[vlang] = !!tempV ? tempV.versionTitle : null;
  }
  return (
    <ScrollView
      contentContainerStyle={[styles.versionsBoxScrollView, styles.readerSideMargin, ]}>
      <Text style={[theme.tertiaryText, styles.translationsHeader, textAlign]}>{strings.translations}</Text>
      <Text style={[theme.tertiaryText, styles.fontSize14, textAlign]}>
        {strings.translationsDescription + ' '}
        <Text onPress={() => openUri('https://www.sefaria.org/sheets/511573')} style={{textDecorationLine: 'underline'}}>{strings.learnMore} ›</Text>
      </Text>
      {
        vLangState.versionLangs.map((lang) => (
          <View key={lang}>
            <View style={[styles.translationsBoxLang, theme.languageName]}>
              <Text style={[styles.versionsBoxLangText, theme.tertiaryText, textAlign]}>{(strings[Sefaria.util.translateISOLanguageCode(lang)] || lang)}<Text>{` (${vLangState.versionLangMap[lang].length})`}</Text></Text>
            </View>
            {
              vLangState.versionLangMap[lang].map((v, idx) => (
                <VersionBlockWithPreview
                  version={v}
                  openFilter={openFilter}
                  key={v.versionTitle + lang}
                  segmentRef={segmentRef}
                  openUri={openUri}
                  isCurrent={v.versionTitle === currVersionObjects.en.versionTitle}
                  openRef={openRef}
                  heVersionTitle={currVersionObjects.he.versionTitle}
                />
              ))
            }
          </View>
        ))
      }
    </ScrollView>
  );
}
TranslationsBox.propTypes = {
  currVersionObjects:       PropTypes.object.isRequired,
  segmentRef:               PropTypes.string.isRequired,
  openFilter:               PropTypes.func.isRequired,
  openUri:                  PropTypes.func.isRequired,
  openRef:                  PropTypes.func.isRequired,
};

export default TranslationsBox;
