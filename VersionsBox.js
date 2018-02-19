import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';

const {
  LoadingView,
} = require('./Misc.js');

const VersionBlock = require('./VersionBlock');
const strings = require('./LocalizedStrings');
const styles = require('./Styles.js');
const { VersionFilter } = require('./Filter');



class VersionsBox extends React.Component {
  static propTypes = {
    theme:                    PropTypes.object.isRequired,
    versions:                 PropTypes.array.isRequired,
    currVersions:             PropTypes.object.isRequired,
    mode:                     PropTypes.oneOf(["versions", "version Open"]),
    interfaceLang:            PropTypes.oneOf(["english", "hebrew"]).isRequired,
    mainVersionLanguage:      PropTypes.oneOf(["english", "bilingual", "hebrew"]).isRequired,
    vFilterIndex:             PropTypes.number,
    recentVFilters:           PropTypes.array,
    segmentRef:               PropTypes.string.isRequired,
    setConnectionsMode:       PropTypes.func.isRequired,
    openFilter:               PropTypes.func.isRequired,
    loadNewVersion:           PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.versionBlockYMap = {};
    this.langBlockYMap = {};
    this.scrollViewHeight = 0;
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
  onLayoutScrollView = event => {
    this.scrollViewHeight = event.nativeEvent.layout.height;
  };
  onLayoutLangBlock = (vlang, y) => {
    this.langBlockYMap[vlang] = y;
  };
  onLayoutVersionBlock = (vlang, vtitle, y) => {
    this.versionBlockYMap[`${vlang}|${vtitle}`] = y;
  };
  onPressRead = (vlang, vtitle) => {
    this.props.loadNewVersion(this.props.segmentRef, { [vlang]: vtitle });
  }
  onPressVersionBlock = (vlang, vtitle) => {
    let newState = `${vlang}|${vtitle}`;
    let y = this.langBlockYMap[vlang] + this.versionBlockYMap[newState] - this.scrollViewHeight + 100;
    if (y < 0) { y = 0; }
    this.scrollViewRef.scrollTo({
      x:0,
      y,
      animated: false,
    });
    if (this.state.openVersionBox === newState) { newState = null; } // if already set, toggle off
    this.setState({ openVersionBox: newState });
  };
  _getScrollViewRef = ref => {
    this.scrollViewRef = ref;
  }
  render() {
    if (!this.state.versionLangMap) {
      //TODO deal with no internet case
      return (
        <View>
          <LoadingView />
        </View>
      );
    }
    const currVersions = {};
    for (let vlang in this.props.currVersions) {
      const tempV = this.props.currVersions[vlang];
      currVersions[vlang] = !!tempV ? tempV.versionTitle : null;
    }
    const isheb = this.props.interfaceLang === "hebrew";
    const textStyle = isheb ? styles.hebrewText : styles.englishText;
    return (
      <ScrollView
        ref={this._getScrollViewRef}
        contentContainerStyle={[styles.textListSummaryScrollView, styles.versionsBoxScrollView]}
        onLayout={this.onLayoutScrollView}>
        {
          this.state.versionLangs.map((lang) => (
            <View key={lang} onLayout={event => { this.onLayoutLangBlock(lang, event.nativeEvent.layout.y); }}>
              <View style={[styles.versionsBoxLang]}>
                <Text style={[textStyle, styles.versionsBoxLangText, this.props.theme.text]}>{strings[Sefaria.util.translateISOLanguageCode(lang)].toUpperCase()}<Text>{` (${this.state.versionLangMap[lang].length})`}</Text></Text>
              </View>
              {
                this.state.versionLangMap[lang].map(v => (
                  <TouchableOpacity
                    onLayout={event => { this.onLayoutVersionBlock(lang, v.versionTitle, event.nativeEvent.layout.height + event.nativeEvent.layout.y); }}
                    style={[styles.versionsBoxVersionBlockWrapper, this.props.theme.bordered]}
                    key={v.versionTitle + lang}
                    onPress={()=>{ this.onPressVersionBlock(lang, v.versionTitle); }}>
                    <VersionBlock
                      theme={this.props.theme}
                      version={v}
                      margin={true}
                      currVersions={currVersions}
                      openVersionInReader={()=>{}}
                      isCurrent={(this.props.currVersions.en && this.props.currVersions.en.versionTitle === v.versionTitle) ||
                                (this.props.currVersions.he && this.props.currVersions.he.versionTitle === v.versionTitle)}
                    />
                  { this.state.openVersionBox === `${lang}|${v.versionTitle}` ?
                    <View style={[styles.versionBlockBottomBar, this.props.theme.bordered]}>
                      <TouchableOpacity style={styles.versionBoxBottomBarButton} onPress={()=>{ this.onPressRead(v.language, v.versionTitle); }}>
                        <Text>{"READ"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.versionBoxBottomBarButton} onPress={()=> { this.openVersionInSidebar(v.versionTitle, v.versionTitleInHebrew, v.language); }}>
                        <Text>{"COMPARE"}</Text>
                      </TouchableOpacity>
                    </View> :
                    null
                  }
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

module.exports = VersionsBox;
