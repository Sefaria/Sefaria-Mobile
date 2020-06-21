'use strict';

import React, {useContext, useState, useEffect} from 'react';
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

const shouldActivate = selectedWords => {
  if(selectedWords && selectedWords.match(/[\s:\u0590-\u05ff.]+/)) {
    const wordList = selectedWords.split(/[\s:\u05c3\u05be\u05c0.]+/);
    const inputLength = wordList.length;
    return (inputLength <= 3);
  } else {
      return null;
  }
};

const getLookups = (words, oref) => {
  const ref = oref ? oref.ref : undefined;
  return Sefaria.api.lexicon(words, ref);
};

const LexiconBox = ({ selectedWords, oref, openRef, openUri }) => {
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState([]);
  useEffect(() => {
    if (selectedWords && shouldActivate(selectedWords)) {
      getLookups(selectedWords, oref).then(data => {
        setLoaded(true);
        setEntries(data);
      });
    }
    return () => {
      setLoaded(false);
      setEntries([]);
    };
  }, [selectedWords]);

  const refCats = oref ? oref.categories.join(", ") : null; //TODO: the way to filter by categories is very limiting.
  const activated = shouldActivate(selectedWords);
  const enEmpty = `No definitions found${activated ? ` for "${ selectedWords }".` : ''}`;
  const heEmpty = `לא נמצאו תוצאות${activated ? ` "${ selectedWords}".` : ''}`;
  let content = (<Text>{enEmpty}</Text>);
  if (activated) {
    if(!loaded) {
        content = (<LoadingView />);
    } else {
        const tempContent = entries
          .filter(e => (!refCats) || e['parent_lexicon_details']['text_categories'].length === 0 || e['parent_lexicon_details']['text_categories'].indexOf(refCats) > -1)
          .map((entry, i) => (
            <LexiconEntry
              entry={entry}
              openRef={openRef}
              openUri={openUri}
              key={i}
            />
          ));
        if (tempContent.length) { content = tempContent; }
    }
  }

  return (
    <ScrollView style={{flex: 1}} key={selectedWords} contentContainerStyle={{paddingLeft: 42, paddingRight: 64, paddingTop: 20, paddingBottom: 40}}>
      { content }
    </ScrollView>
  );
}
LexiconBox.propTypes = {
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

const makeSenseTree = content => {
  const grammar     = ('grammar' in content) ? '('+ content['grammar']['verbal_stem'] + ')' : "";
  const def         = ('definition' in content) ? (content['definition']) : "";
  const alternative = ('alternative' in content) ? (content['alternative']) : "";
  const notes       = ('notes' in content) ? (content['notes']) : "";

  const senses = ('senses' in content) ? content['senses'].reduce((accum, sense) => accum.concat(makeSenseTree(sense)), []) : null;
  const firstItem = (grammar || def || alternative || notes) ? (`${grammar} ${def} ${alternative} ${notes}`) : null;
  return [
    firstItem,
    senses,
  ].filter(x => !!x);
}

const LexiconAttribution = ({ entry }) => {
  const {themeStr, fontSize} = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);

  const lexicon_dtls = entry['parent_lexicon_details'];
  const sourceContent = `Source: ${lexicon_dtls['source'] || lexicon_dtls['source_url']}`.trim();
  const attributionContent = `Creator: ${lexicon_dtls['attribution'] || lexicon_dtls['attribution_url']}`.trim();
  const fullContent = [
    lexicon_dtls['source_url'] ? `<a href="${lexicon_dtls["source_url"]}">${sourceContent}</a>` : `${sourceContent}\n`,
    lexicon_dtls['attribution_url'] ? `<a href="${lexicon_dtls['attribution_url']}">${attributionContent}</a>` : attributionContent,
  ].join('');
  return (
      <HTMLView
        value={fullContent}
        stylesheet={styles}
        textComponentProps={{
          style: {fontSize: fontSize, ...theme.quaternaryText}
        }}
      />
  );
};

const LexiconEntry = ({ entry, openRef, openUri }) => {
  const {themeStr, fontSize} = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);

  let headwords = [entry['headword']];
  if ('alt_headwords' in entry) {
    headwords = headwords.concat(entry['alt_headwords']);
  }
  const headwordText = headwords.join(', ');
  const morphology = ('morphology' in entry['content']) ?  (
    <SText lang="english" style={[styles.en, {textAlign: 'left', fontSize: fontSize}, theme.secondaryText]}>
      {` (${entry['content']['morphology']})`}
    </SText>
  ) : null;

  let langText = null;
  if ('language_code' in entry || 'language_reference' in entry) {
    let langValue = ('language_code' in entry) ? ` ${entry['language_code']}` : "";
    langValue += ('language_reference' in entry) ? ` ${entry['language_reference']}` : "";
    langText = (<LexiconText lang='english' openRef={openRef} openUri={openUri} fSize={fontSize} value={langValue} />);
  }

  const entryHead = (
    <View style={{flexDirection: 'row'}}>
      <SText lang="hebrew" style={[styles.he, {fontSize: fontSize}, theme.text]}>{headwordText}</SText>
      {morphology}
      {langText}
    </View>
  );

  const endnotes = ('notes' in entry) ? <LexiconText lang='english' openRef={openRef} openUri={openUri} fSize={fontSize} value={entry['notes']}/> : null;
  const derivatives = ('derivatives' in entry) ? <LexiconText lang='english' openRef={openRef} openUri={openUri} fSize={fontSize} value={entry['derivatives']} /> : null;
  const senses = makeSenseTree(entry['content']);
  return (
    <View style={{marginTop: 20}}>
      <View>{entryHead}</View>
      <OrderedList
        items={senses}
        renderItem={(item, index) => (
          <View key={index} style={{flexDirection: 'row'}}>
            <SText lang='english' style={[styles.en, {textAlign: 'left', fontSize: fontSize}, theme.text]}>{`${index+1}. `}</SText>
            <LexiconText
              lang='english'
              openRef={openRef}
              openUri={openUri}
              fSize={fontSize}
              value={item}
            />
          </View>
        )}
      />
      <View>{endnotes}{derivatives}</View>
      <View style={{marginTop: 15}}>
        <LexiconAttribution entry={entry} />
      </View>
    </View>
  );
}
LexiconEntry.propTypes = {
  entry: PropTypes.object.isRequired,
  openRef:      PropTypes.func.isRequired,
  openUri:      PropTypes.func.isRequired,
};


export default LexiconBox;
