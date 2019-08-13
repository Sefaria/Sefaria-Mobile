import React, { useContext, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';

import {
  LoadingView,
} from './Misc.js';
import { GlobalStateContext } from './StateManager';
import VersionBlock from './VersionBlock';
import strings from './LocalizedStrings';
import styles from'./Styles.js';
import { VersionFilter } from './Filter';

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
  //- mainVersionLanguage shows up first
  //- standard_langs show up second
  //- everything else shows up in alphabetical order
  const standard_langs = ["en", "he"];
  const versionLangs = Object.keys(versionLangMap).sort(
    (a, b) => {
      if      (a === initialMainVersionLanguage.slice(0,2)) {return -1;}
      else if (b === initialMainVersionLanguage.slice(0,2)) {return  1;}
      else if (a in standard_langs && !(b in standard_langs))     {return -1;}
      else if (b in standard_langs && !(a in standard_langs))     {return  1;}
      else if (a < b)                                             {return -1;}
      else if (b > a)                                             {return  1;}
      else                                                        {return  0;}
    }
  );
  return { versionLangMap, versionLangs };
};

const useVLangState = (currVersions, versions) => {
  const { textLanguage } = useContext(GlobalStateContext);
  const [initialCurrVersions,] = useState(currVersions.reduce(
    (obj, lang) => {
      obj[lang] = !!currVersions[lang] ? currVersions[lang].versionTitle : null;
      return obj;
    }, {}
  ));
  const getVLangState = versions => {
    getVLangState(initialCurrVersions, initialMainVersionLanguage, versions);
  };
  const [initialMainVersionLanguage,] = useState(textLanguage === "bilingual" ? "hebrew" : textLanguage);
  const [vLangState, setVLangState] = useState(getVLangState(versions));
  return {
    vLangState,
    setVLangState: versions => {
      setVLangState(getVLangState(versions));
    },
  };
}

const VersionsBox = ({
  versions,
  versionsApiError,
  currVersions,
  mode,
  vFilterIndex,
  recentVFilters,
  segmentRef,
  setConnectionsMode,
  openFilter,
  openUri,
}) => {
  const { theme, interfaceLanguage, textLanguage } = useContext(GlobalStateContext);
  const {
    vLangState,
    setVLangState
  } = useVLangState(currVersions, versions);
  useEffect(() => {
    setVLangState(versions);
  }, [versions]);
  const openVersionInSidebar = (versionTitle, heVersionTitle, versionLanguage) => {
    const filter = new VersionFilter(versionTitle, heVersionTitle, versionLanguage, segmentRef);
    openFilter(filter, "version");
  };
  if (versionsApiError) {
    return (
      <View style={[{flex:1}, styles.readerSideMargin]}>
        <Text style={[styles.emptyLinksMessage, theme.secondaryText]}>{strings.connectToVersionsMessage}</Text>
      </View>
    );
  }
  if (!vLangState.versionLangMap) {
    return (
      <View style={styles.readerSideMargin}>
        <LoadingView />
      </View>
    );
  }
  const currVersionTitles = {};
  for (let vlang in currVersions) {
    const tempV = currVersions[vlang];
    currVersionTitles[vlang] = !!tempV ? tempV.versionTitle : null;
  }
  const isheb = interfaceLanguage === "hebrew";
  const textStyle = isheb ? styles.hebrewText : styles.englishText;
  return (
    <ScrollView
      contentContainerStyle={[styles.versionsBoxScrollView, styles.readerSideMargin]}>
      {
        vLangState.versionLangs.map((lang) => (
          <View key={lang}>
            <View style={[styles.versionsBoxLang]}>
              <Text style={[textStyle, styles.versionsBoxLangText, theme.text]}>{strings[Sefaria.util.translateISOLanguageCode(lang)].toUpperCase()}<Text>{` (${vLangState.versionLangMap[lang].length})`}</Text></Text>
            </View>
            {
              vLangState.versionLangMap[lang].map(v => (
                <TouchableOpacity
                  style={[styles.versionsBoxVersionBlockWrapper, theme.bordered]}
                  key={v.versionTitle + lang}
                  onPress={()=>{ this.openVersionInSidebar(v.versionTitle, v.versionTitleInHebrew, v.language); }}>
                  <VersionBlock
                    theme={theme}
                    version={v}
                    currVersions={currVersionTitles}
                    openVersionInReader={()=>{}}
                    isCurrent={(currVersions.en && currVersions.en.versionTitle === v.versionTitle) ||
                              (currVersions.he && currVersions.he.versionTitle === v.versionTitle)}
                    openUri={this.props.openUri}
                  />
                </TouchableOpacity>
              ))
            }
          </View>
        ))
      }
    </ScrollView>
  );
}
VersionsBox.propTypes = {
  versions:                 PropTypes.array.isRequired,
  versionsApiError:         PropTypes.bool.isRequired,
  currVersions:             PropTypes.object.isRequired,
  mode:                     PropTypes.oneOf(["versions", "version Open"]),
  vFilterIndex:             PropTypes.number,
  recentVFilters:           PropTypes.array,
  segmentRef:               PropTypes.string.isRequired,
  setConnectionsMode:       PropTypes.func.isRequired,
  openFilter:               PropTypes.func.isRequired,
  openUri:                  PropTypes.func.isRequired,
};

export default VersionsBox;
