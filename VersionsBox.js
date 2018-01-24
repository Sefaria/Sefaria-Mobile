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



class VersionsBox extends React.Component {
  static propTypes = {
    theme:                    PropTypes.object.isRequired,
    versions:                 PropTypes.array.isRequired,
    currVersions:             PropTypes.object.isRequired,
    mode:                     PropTypes.oneOf(["versions", "version Open"]),
    mainVersionLanguage:      PropTypes.oneOf(["english", "bilingual", "hebrew"]).isRequired,
    vFilterIndex:             PropTypes.number,
    recentVFilters:           PropTypes.array,
    setConnectionsMode:       PropTypes.func.isRequired,
    setFilter:                PropTypes.func.isRequired,
    selectVersion:            PropTypes.func.isRequired,
    onRangeClick:             PropTypes.func.isRequired,
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
      initialCurrVersions,
      initialMainVersionLanguage: props.mainVersionLanguage === "bilingual" ? "hebrew" : props.mainVersionLanguage,
    };
    const {versionLangMap, versionLangs} = this.getVersionLangs(state, props.versions);
    state.versionLangMap = versionLangMap;
    state.versionLangs = versionLangs;
    this.state = state;
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
        else if (a in standard_langs && !(b in standard_langs))   {return -1;}
        else if (b in standard_langs && !(a in standard_langs))   {return  1;}
        else if (a < b)                                           {return -1;}
        else if (b > a)                                           {return  1;}
        else                                                      {return  0;}
      }
    );
    return {versionLangMap, versionLangs};
  };
  openVersionInSidebar = (versionTitle, versionLanguage) => {
    this.props.setConnectionsMode("version open");
    this.props.setFilter(versionTitle);
  };
  renderModeVersions() {
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
    return (
      <ScrollView>
        {
          this.state.versionLangs.map((lang) => (
            <View key={lang}>
              <Text>{strings[Sefaria.util.translateISOLanguageCode(lang)]}<Text>{` (${this.state.versionLangMap[lang].length})`}</Text></Text>
              {
                this.state.versionLangMap[lang].map((v) => (
                  <VersionBlock
                    theme={this.props.theme}
                    version={v}
                    currVersions={currVersions}
                    key={v.versionTitle + lang}
                    openVersionInReader={this.props.selectVersion}
                    openVersionInSidebar={this.openVersionInSidebar}
                    isCurrent={(this.props.currVersions.en && this.props.currVersions.en.versionTitle === v.versionTitle) ||
                              (this.props.currVersions.he && this.props.currVersions.he.versionTitle === v.versionTitle)}
                  />
                ))
              }
            </View>
          ))
        }
      </ScrollView>
    );
  }
  renderModeSelected() {
    // open text in versionslist with current version selected
    const currSelectedVersions = this.props.vFilterIndex ? {[Sefaria.api.versionLanguage(this.props.recentVFilters[this.props.vFilterIndex])]: this.props.recentVFilters[this.props.vFilterIndex]} : {en: null, he: null};
    const onRangeClick = (sref)=>{this.props.onRangeClick(sref, false, currSelectedVersions)};
    return null;
    /*return (
      <VersionsTextList
        srefs={this.props.srefs}
        vFilter={this.props.vFilter}
        recentVFilters={this.props.recentVFilters}
        setFilter={this.props.setFilter}
        onRangeClick={onRangeClick}
      />
    );*/
  }
  render() {
    return (this.props.mode === "versions" ? this.renderModeVersions() : this.renderModeSelected());
  }
}


/*class VersionsTextList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
    };
  }
  componentDidMount() {
    this.preloadText(this.props.vFilter);
  }
  componentWillReceiveProps(nextProps) {
    this.preloadText(nextProps.vFilter);
  }
  preloadText(filter) {
    if (filter.length) {
      this.setState({loaded: false});
      const sectionRef = this.getSectionRef();
      const language = Sefaria.versionLanguage(filter[0]);
      let enVersion = null, heVersion = null;
      if (language === "en") { enVersion = filter[0]; }
      else                   { heVersion = filter[0]; }
      Sefaria.text(sectionRef, {enVersion, heVersion}, () => {this.setState({loaded: true})});
    }
  }
  getSectionRef() {
    const ref = this.props.srefs[0]; // TODO account for selections spanning sections
    const sectionRef = Sefaria.sectionRef(ref) || ref;
    return sectionRef;
  }
  render() {
    const vlang = Sefaria.versionLanguage(this.props.vFilter[0]);

    return !this.state.loaded || !this.props.vFilter.length ?
      (<LoadingMessage />) :
      (<div className="versionsTextList">
        <RecentFilterSet
          srefs={this.props.srefs}
          asHeader={false}
          filter={this.props.vFilter}
          recentFilters={this.props.recentVFilters}
          setFilter={this.props.setFilter}/>
        <TextRange
          panelPosition ={this.props.panelPosition}
          sref={Sefaria.humanRef(this.props.srefs)}
          currVersions={{[vlang]: this.props.vFilter[0]}}
          useVersionLanguage={true}
          hideTitle={true}
          numberLabel={0}
          basetext={false}
          onRangeClick={this.props.onRangeClick} />
      </div>);
  }
}
VersionsTextList.propTypes = {
  srefs:           PropTypes.array,
  vFilter:         PropTypes.array,
  recentVFilters:  PropTypes.array,
  setFilter:       PropTypes.func.isRequired,
  onRangeClick:    PropTypes.func.isRequired,
};*/

module.exports = VersionsBox;
