'use strict';

import React, {useContext} from 'react';
import {
  View,
  Text,
  ScrollView,
} from 'react-native';
import PropTypes from 'prop-types';
import HTMLView from 'react-native-htmlview';
import {
  LoadingView,
  OrderedList,
  SText,
} from './Misc';
import styles from './Styles.js';
import { GlobalStateContext, getTheme } from './StateManager';


class LexiconBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      searchedWord: null,   // This is used only to counteract the influence of a ref, currently, but should really be show in the search box after search, and bubble up to state.
      entries: [],
      loaded: false
    };
  }
  componentDidMount() {
    if(this.props.selectedWords){
      this.getLookups(this.props.selectedWords, this.props.oref);
    }
  }
  componentDidUpdate(prevProps, prevState) {
    if (!this.props.selectedWords) {
      this.clearLookups();
    } else if (this.props.selectedWords !== prevProps.selectedWords) {
      this.clearLookups();
      this.getLookups(this.props.selectedWords, this.props.oref);
    }
  }
  clearLookups() {
    this.setState({
      searchedWord: null,
      loaded: false,
      entries: []
    });
  }
  searchWord(word) {
    this.clearLookups();
    this.setState({searchedWord: word});
    this.getLookups(word);
  }
  getLookups(words, oref) {
    if(this.shouldActivate(words)) {
      let ref = oref ? oref.ref : undefined;
      Sefaria.api.lexicon(words, ref).then(data => {
        this.setState({
          loaded: true,
          entries: data
        });
      });
    }
  }
  shouldActivate(selectedWords){
    if (this.state.searchedWord) {
      return true;
    }
    if(selectedWords && selectedWords.match(/[\s:\u0590-\u05ff.]+/)) {
      const wordList = selectedWords.split(/[\s:\u05c3\u05be\u05c0.]+/);
      const inputLength = wordList.length;
      return (inputLength <= 3);
    } else {
        return null;
    }
  }
  render() {
    const refCats = (this.props.oref && (!this.state.searchedWord)) ? this.props.oref.categories.join(", ") : null; //TODO: the way to filter by categories is very limiting.
    const activated = this.shouldActivate(this.props.selectedWords);
    const enEmpty = `No definitions found${activated ? ` for "${this.props.selectedWords}".` : ''}`;
    const heEmpty = `לא נמצאו תוצאות${activated ? ` "${ this.props.selectedWords}".` : ''}`;
    let content = (<Text>{enEmpty}</Text>);
    if(activated) {
      if(!this.state.loaded) {
          content = (<LoadingView />);
      } else {
          let entries = this.state.entries;
          let tempContent =  entries.filter(e => (!refCats) || e['parent_lexicon_details']['text_categories'].length === 0 || e['parent_lexicon_details']['text_categories'].indexOf(refCats) > -1).map(function(entry, i) {
                return (<LexiconEntry
                    themeStr={this.props.themeStr}
                    data={entry}
                    openRef={this.props.openRef}
                    openUri={this.props.openUri}
                    key={i} />)
              }.bind(this));
          if (tempContent.length) { content = tempContent; }
      }
    }

    return (
      <ScrollView style={{flex: 1}} key={this.props.selectedWords} contentContainerStyle={{paddingLeft: 20, paddingRight: 40, paddingTop: 20, paddingBottom: 40}}>
        { content }
      </ScrollView>
    );
  }
}
LexiconBox.propTypes = {
  interfaceLang:    PropTypes.string.isRequired,
  selectedWords: PropTypes.string,
  oref:          PropTypes.object,
  openRef:       PropTypes.func.isRequired,
  openUri:       PropTypes.func.isRequired,
};

const LexiconText = ({ value, openRef, openUri, lang, fSize, style }) => {
  const {themeStr} = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  style = style || {};
  return (
    <HTMLView
      value={value}
      onLinkPress={url => {
        const internal = (url.length > 0 && url[0] === '/') || (url.indexOf('sefaria.org/') > -1);
        internal ? openRef(Sefaria.urlToRef(url.replace('/', '')).ref) : openUri(url);
      }}
      stylesheet={styles}
      RootComponent={Text}
      TextComponent={({children, style, textComponentProps, ...props}) => (
        <HTMLView
          value={Sefaria.util.getDisplayableHTML(children, lang)}
          textComponentProps={textComponentProps}
          {...props}
        />
      )}
      textComponentProps={{
        stylesheet: styles,
        RootComponent: Text,
        TextComponent: SText,
        textComponentProps: {
          lang,
          style: {...(lang === 'hebrew' ? styles.he : styles.en), fontSize: fSize, ...theme.text, ...style},
        }
      }}

    />
  );
}

class LexiconEntry extends React.Component {
  makeSenseTree(content) {
    const grammar     = ('grammar' in content) ? '('+ content['grammar']['verbal_stem'] + ')' : "";
    const def         = ('definition' in content) ? (content['definition']) : "";
    const alternative = ('alternative' in content) ? (content['alternative']) : "";
    const notes       = ('notes' in content) ? (content['notes']) : "";

    const senses = ('senses' in content) ? content['senses'].reduce((accum, sense) => accum.concat(this.makeSenseTree(sense)), []) : null;
    const firstItem = (grammar || def || alternative || notes) ? (`${grammar} ${def} ${alternative} ${notes}`) : null;
    return [
      firstItem,
      senses,
    ].filter(x => !!x);
  }
  getRef() {
    var ind = this.props.data.parent_lexicon_details.index_title;
    return ind ? `${ind}, ${this.props.data.headword}`: "";

  }
  renderLexiconAttribution () {
    const {data: entry} = this.props;
    const lexicon_dtls = entry['parent_lexicon_details'];
    const sourceContent = `Source: ${lexicon_dtls['source'] || lexicon_dtls['source_url']}`;
    const attributionContent = `Creator: ${lexicon_dtls['attribution'] || lexicon_dtls['attribution_url']}`;
    const fullContent = [
      lexicon_dtls['source_url'] ? `<a href=${lexicon_dtls["source_url"]}>${sourceContent}</a>` : sourceContent,
      lexicon_dtls['attribution_url'] ? `<a href=${lexicon_dtls['attribution_url']}>${attributionContent}</a>` : attributionContent,
    ].join('\n');
    return (
        <HTMLView
          value={fullContent}
          stylesheet={styles}
          textComponentProps={{
            style: {color: "#AAA"}
          }}
        />
    );
  }
  render() {
    const {data: entry, themeStr, openRef, openUri} = this.props;
    const theme = getTheme(themeStr);

    let headwords = [entry['headword']];
    if ('alt_headwords' in entry) {
      headwords = headwords.concat(entry['alt_headwords']);
    }
    const headwordText = headwords.join(', ');
    const fSize = 20;
    const morphology = ('morphology' in entry['content']) ?  (
      <SText lang="english" style={[styles.en, {textAlign: 'left', fontSize: fSize}, theme.secondaryText]}>
        {` (${entry['content']['morphology']})`}
      </SText>
    ) : null;

    let langText = null;
    if ('language_code' in entry || 'language_reference' in entry) {
      let langValue = ('language_code' in entry) ? ` ${entry['language_code']}` : "";
      langValue += ('language_reference' in entry) ? ` ${entry['language_reference']}` : "";
      langText = (<LexiconText lang='english' openRef={openRef} openUri={openUri} fSize={fSize} value={langValue} />);
    }

    const entryHead = (
      <View style={{flexDirection: 'row'}}>
        <SText lang="hebrew" style={[styles.he, {fontSize: fSize}, theme.text]}>{headwordText}</SText>
        {morphology}
        {langText}
      </View>
    );

    const endnotes = ('notes' in entry) ? <LexiconText lang='english' openRef={openRef} openUri={openUri} fSize={14} value={entry['notes']}/> : null;
    const derivatives = ('derivatives' in entry) ? <LexiconText lang='english' openRef={openRef} openUri={openUri} fSize={14} value={entry['derivatives']} /> : null;
    const senses = this.makeSenseTree(entry['content']);
    const attribution = this.renderLexiconAttribution();
    return (
      <View style={{marginTop: 20}}>
        <View>{entryHead}</View>
        <OrderedList
          items={senses}
          renderItem={(item, index) => (
            <View key={index} style={{flexDirection: 'row'}}>
              <Text>{`${index+1}. `}</Text>
              <LexiconText
                lang='english'
                openRef={openRef}
                openUri={openUri}
                fSize={14}
                value={item}
              />
            </View>
          )}
        />
        <View>{endnotes}{derivatives}</View>
        <View>{attribution}</View>
      </View>
    );
  }
}
LexiconEntry.propTypes = {
  data: PropTypes.object.isRequired,
  openRef:      PropTypes.func.isRequired,
  openUri:      PropTypes.func.isRequired,
};


export default LexiconBox;
