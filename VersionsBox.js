import React from 'react';
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

import VersionBlock from './VersionBlock';
import strings from './LocalizedStrings';
import styles from'./Styles.js';
import { VersionFilter } from './Filter';


class VersionsBox extends React.Component {
  static propTypes = {
    theme:                    PropTypes.object.isRequired,
    versions:                 PropTypes.array.isRequired,
    versionsApiError:         PropTypes.bool.isRequired,
    currVersions:             PropTypes.object.isRequired,
    mode:                     PropTypes.oneOf(["versions", "version Open"]),
    interfaceLang:            PropTypes.oneOf(["english", "hebrew"]).isRequired,
    mainVersionLanguage:      PropTypes.oneOf(["english", "bilingual", "hebrew"]).isRequired,
    vFilterIndex:             PropTypes.number,
    recentVFilters:           PropTypes.array,
    segmentRef:               PropTypes.string.isRequired,
    setConnectionsMode:       PropTypes.func.isRequired,
    openFilter:               PropTypes.func.isRequired,
    openUri:                  PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    const initialCurrVersions = {};
    for (let vlang in props.currVersions) {
      const tempV = props.currVersions[vlang];
      initialCurrVersions[vlang] = !!tempV ? tempV.versionTitle : null;
    }
    const state = {
      versionLangMap: null,  // object with version languages as keys and array of versions in that lang as values
      openVersionBox: null,
      initialCurrVersions,
      initialMainVersionLanguage: props.mainVersionLanguage === "bilingual" ? "hebrew" : props.mainVersionLanguage,
    };
    this.state = {
      ...state,
      ...this.getVersionLangs(state, props.versions),
    };
  }
  componentDidUpdate(prevProps, prevState) {
    if (this.props.versions !== prevProps.versions) {
      this.setState(this.getVersionLangs(this.state, this.props.versions));
    }
  }
  getVersionLangs = (state, versions) => {
    const versionLangMap = {};
    for (let v of versions) {
      const matches = v.versionTitle.match(new RegExp("\\[([a-z]{2})\\]$")); // two-letter ISO language code
      const lang = matches ? matches[1] : v.language;
      //if version is the initial one selected, put it first
      versionLangMap[lang] = !!versionLangMap[lang] ?
        (state.initialCurrVersions[lang] === v.versionTitle ? [v].concat(versionLangMap[lang]) : versionLangMap[lang].concat(v)) : [v];
    }

    //sort versions by language so that
    //- mainVersionLanguage shows up first
    //- standard_langs show up second
    //- everything else shows up in alphabetical order
    const standard_langs = ["en", "he"];
    const versionLangs = Object.keys(versionLangMap).sort(
      (a, b) => {
        if      (a === state.initialMainVersionLanguage.slice(0,2)) {return -1;}
        else if (b === state.initialMainVersionLanguage.slice(0,2)) {return  1;}
        else if (a in standard_langs && !(b in standard_langs))     {return -1;}
        else if (b in standard_langs && !(a in standard_langs))     {return  1;}
        else if (a < b)                                             {return -1;}
        else if (b > a)                                             {return  1;}
        else                                                        {return  0;}
      }
    );
    return { versionLangMap, versionLangs };
  };
  openVersionInSidebar = (versionTitle, heVersionTitle, versionLanguage) => {
    const filter = new VersionFilter(versionTitle, heVersionTitle, versionLanguage, this.props.segmentRef);
    this.props.openFilter(filter, "version");
  };
  render() {
    const {
      currVersions,
      interfaceLang,
      theme,
    } = this.props;
    if (this.props.versionsApiError) {
      return (
        <View style={[{flex:1}, styles.readerSideMargin]}>
          <Text style={[styles.emptyLinksMessage, this.props.theme.secondaryText]}>{strings.connectToVersionsMessage}</Text>
        </View>
      );
    }
    if (!this.state.versionLangMap) {
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
    const isheb = interfaceLang === "hebrew";
    const textStyle = isheb ? styles.hebrewText : styles.englishText;
    return (
      <ScrollView
        contentContainerStyle={[styles.versionsBoxScrollView, styles.readerSideMargin]}>
        {
          this.state.versionLangs.map((lang) => (
            <View key={lang}>
              <View style={[styles.versionsBoxLang]}>
                <Text style={[textStyle, styles.versionsBoxLangText, theme.text]}>{strings[Sefaria.util.translateISOLanguageCode(lang)].toUpperCase()}<Text>{` (${this.state.versionLangMap[lang].length})`}</Text></Text>
              </View>
              {
                this.state.versionLangMap[lang].map(v => (
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
}

export default VersionsBox;
