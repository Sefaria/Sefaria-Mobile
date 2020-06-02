'use strict';

import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  ScrollView,
} from 'react-native';
//const DictionarySearch = require('./DictionarySearch');
import PropTypes from 'prop-types';
import {
  LoadingView,
  OrderedList,
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
    // console.log("component will receive props: ", nextProps.selectedWords);
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
      // console.log('getting data: ', words, oref.ref);
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
    const enEmpty = 'No definitions found for "' + this.props.selectedWords + '".';
    const heEmpty = 'לא נמצאו תוצאות "' + this.props.selectedWords + '".';
    let content = "";
    if(this.shouldActivate(this.props.selectedWords)) {
      if(!this.state.loaded) {
          content = (<LoadingView />);
      } else if(this.state.entries.length === 0) {
          if (this.props.selectedWords.length > 0) {
          content = (<Text>{enEmpty}{heEmpty}</Text>);
          }
      } else {
          let entries = this.state.entries;
          content =  entries.filter(e => (!refCats) || e['parent_lexicon_details']['text_categories'].length === 0 || e['parent_lexicon_details']['text_categories'].indexOf(refCats) > -1).map(function(entry, i) {
                return (<LexiconEntry
                    themeStr={this.props.themeStr}
                    data={entry}
                    onEntryClick={this.props.onEntryClick}
                    onCitationClick={this.props.onCitationClick}
                    key={i} />)
              }.bind(this));
          content = content.length ? content : <Text>{enEmpty}{heEmpty}</Text>;
      }
    }
/*
         <DictionarySearch
              interfaceLang={this.props.interfaceLang}
              showWordList={this.searchWord}
              contextSelector=".lexicon-content"/>
*/
    return (
        <ScrollView style={{flex: 1}} key={this.props.selectedWords} contentContainerStyle={{marginHorizontal: 10, marginVertical: 20}}>
          { content }
        </ScrollView>
      );
  }
}
LexiconBox.propTypes = {
  interfaceLang:    PropTypes.string.isRequired,
  selectedWords: PropTypes.string,
  oref:          PropTypes.object,
  onEntryClick:  PropTypes.func,
  onCitationClick: PropTypes.func
};


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
    var entry = this.props.data;
    var lexicon_dtls = entry['parent_lexicon_details'];

    var sourceContent = <View>
      <Text>Source: </Text>
      <Text>מקור:</Text>
      <Text>{'source' in lexicon_dtls ? lexicon_dtls['source'] : lexicon_dtls['source_url']}</Text>
    </View>;

    var attributionContent = <View>
      <Text>Creator: </Text>
      <Text>יוצר:</Text>
      <Text>{'attribution' in lexicon_dtls ? lexicon_dtls['attribution'] : lexicon_dtls['attribution_url']}</Text>
    </View>;

    return (
        <View>
          {('source_url' in lexicon_dtls) ?
            sourceContent : //<a target="_blank" href={ lexicon_dtls['source_url'] }>{sourceContent}</a> :
            sourceContent}
          {('attribution_url' in lexicon_dtls) ?
            attributionContent : //<a target="_blank" href={ lexicon_dtls['attribution_url'] }>{attributionContent}</a> :
            attributionContent}
        </View>
    );
  }
  render() {
    var entry = this.props.data;
    const theme = getTheme(this.props.themeStr);

    var headwords = [entry['headword']];
    if ('alt_headwords' in entry) {
      headwords = headwords.concat(entry['alt_headwords']);
    }

    var morphologyHtml = ('morphology' in entry['content']) ?  (<Text>{` (${entry['content']['morphology']})`}</Text>) : null;

    var langHtml = null;
    if ('language_code' in entry || 'language_reference' in entry) {
      langHtml = (<Text>
        {('language_code' in entry) ? ` ${entry['language_code']}` : ""}
        {('language_reference' in entry) ? ` ${entry['language_reference']}` : ""}
      </Text>);
    }

    var entryHeadHtml = (<View style={{flexDirection: 'row'}}>
      {headwords
          .map((e,i) => <Text style={[styles.he, theme.text]} key={i}>{e}</Text>)
          .reduce((prev, curr) => [prev, ', ', curr])}
      {morphologyHtml}
      {langHtml}
      </View>);

    // TODO: are these meant to be in ordered list??
    var endnotes = ('notes' in entry) ? <Text>{ entry['notes']}</Text> : null;
    var derivatives = ('derivatives' in entry) ? <Text>{entry['derivatives']}></Text> : null;

    const senses = this.makeSenseTree(entry['content']);
    const attribution = this.renderLexiconAttribution();
    return (
        <View>
          <View>{entryHeadHtml}</View>
          <OrderedList
            items={senses}
            renderItem={(item, index) => (
              <View key={index} style={{flexDirection: 'row'}}>
                <Text>{`${index+1}. `}</Text>
                <Text>{item}</Text>
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
  onEntryClick:  PropTypes.func,
  onCitationClick: PropTypes.func
};


export default LexiconBox;
