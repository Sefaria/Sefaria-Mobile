'use strict';

import React, {useContext, useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
} from 'react-native';
import PropTypes from 'prop-types';
import {
  LoadingView,
  OrderedList,
  SimpleHTMLView,
  SText,
  CSS_CLASS_STYLES,
} from './Misc';
import styles from './Styles.js';
import strings from './LocalizedStrings';
import { GlobalStateContext, getTheme } from './StateManager';
import { HTMLContentModel, HTMLElementModel } from 'react-native-render-html';

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

const LexiconBox = ({ selectedWords, oref, handleOpenURL }) => {
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState([]);
  const {themeStr, fontSize, interfaceLanguage} = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
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

  const refCats = (oref && oref.categories) ? oref.categories.join(", ") : null; //TODO: the way to filter by categories is very limiting.
  const activated = shouldActivate(selectedWords);
  const enEmpty = `No definitions found${activated ? ` for "${ selectedWords }".` : ''}`;
  const heEmpty = `לא נמצאו תוצאות${activated ? ` "${ selectedWords}".` : ''}`;
  const isHeb = interfaceLanguage === 'hebrew';
  let content = (<Text style={[isHeb ? styles.heInt : styles.enInt, {paddingTop: 15}, theme.text]}>{isHeb ? heEmpty : enEmpty}</Text>);
  if (activated) {
    if(!loaded) {
        content = (<LoadingView />);
    } else {
        const tempContent = entries
          .filter(e => (!refCats) || e['parent_lexicon_details']['text_categories'].length === 0 || e['parent_lexicon_details']['text_categories'].indexOf(refCats) > -1)
          .map((entry, i) => (
            <LexiconEntry
              entry={entry}
              handleOpenURL={handleOpenURL}
              key={i}
            />
          ));
        if (tempContent.length) { content = tempContent; }
    }
  }

  return (
    <ScrollView style={{flex: 1}} key={selectedWords} contentContainerStyle={{paddingLeft: 42, paddingRight: 64, paddingTop: 20, paddingBottom: 40}}>
      <View style={[{flexDirection: isHeb ? "row-reverse" : "row", borderBottomWidth: 1, paddingBottom: 15}, theme.borderedBottom]}>
        <SText lang={"english"} style={[styles.enInt, theme.tertiaryText, {fontSize: 0.8*fontSize}]}>{`${strings.define}: `}</SText>
        <SText lang={"hebrew"} style={[styles.he, {fontSize}, theme.text]}>{selectedWords}</SText>
      </View>
      { content }
    </ScrollView>
  );
}
LexiconBox.propTypes = {
  selectedWords: PropTypes.string,
  oref:          PropTypes.object,
  handleOpenURL:  PropTypes.func.isRequired,
};

/*
  Renders HTML content with ability to click on inline refs / external links
*/

const LexiconText = ({ value, handleOpenURL, lang, fSize, style }) => {
  style = style || {};
  return (
    <SimpleHTMLView
      text={value}
      lang={lang}
      onPressATag={handleOpenURL}
      renderers={{span: ({ TDefaultRenderer, ...props }) => {
        if (props.tnode.init.textNode) {
          const css_styles = props.tnode.classes.map(cls => CSS_CLASS_STYLES[cls]);
          return (
            <SText
              lang={lang}
              lineMultiplier={1.15}
              style={[(lang === 'hebrew' ? styles.he : styles.en), { fontSize: fSize }, style].concat(css_styles)}  // note, not including theme.text here because it doesn't work with blue a tags. Decided to forgo theme for blue a tags.
            >
              {props.tnode.init.textNode.data}
            </SText>
          );
        }
        return (
          <TDefaultRenderer {...props} />
        );
      }}}
    />
  );
}

const makeSenseTree = (content, isBDB) => {
  if (!isBDB) {
    const grammar = ('grammar' in content) ? '(' + content['grammar']['verbal_stem'] + ')' : "";
    const def = ('definition' in content) ? (content['definition']) : "";
    const alternative = ('alternative' in content) ? (content['alternative']) : "";
    const notes = ('notes' in content) ? (content['notes']) : "";

    const senses = ('senses' in content) ? content['senses'].reduce((accum, sense) => accum.concat(makeSenseTree(sense, isBDB)), []) : null;
    const firstItem = (grammar || def || alternative || notes) ? (`${grammar} ${def} ${alternative} ${notes}`) : null;
    return [
      firstItem,
      senses,
    ].filter(x => !!x);
  } else {
    const note = ('note' in content) ? '<em>Note.</em>' : '';
    const preNun = ('pre_num' in content) ? content['pre_num'] : '';
    const allCited = ('all_cited' in content) ? '†' : '';
    const num = ('num' in content) ? content['num'] : '';
    const form = ('form' in content) ? content['form'] : '';
    const occurrences = ('occurrences' in content) ? content['occurrences'] : '';
    let def = ('definition' in content) ? `<span>${content['definition']}</span>` : '';
    let senses = ('senses' in content) ? content['senses'].reduce((accum, sense) => accum.concat(makeSenseTree(sense, isBDB)), []) : null;
    const pre = `${note} ${preNun} ${allCited}<b>${num}${form}</b><small>${occurrences}</small>`;
    if (senses) {
      senses[0] = `${pre} ${senses[0]}`;
      return senses;
    } else {
      def = `${pre} ${def}`;
      return [def];
    }
  }
}

const LexiconAttribution = ({ entry, handleOpenURL }) => {
  const {themeStr, fontSize} = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const englishFontSize = 0.65*fontSize;
  const lexicon_dtls = entry['parent_lexicon_details'];
  const sourceContent = `Source: ${lexicon_dtls['source'] || lexicon_dtls['source_url']}`.trim();
  const attributionContent = `Creator: ${lexicon_dtls['attribution'] || lexicon_dtls['attribution_url']}`.trim();
  const fullContent = [
    lexicon_dtls['source_url'] ? `<a href="${lexicon_dtls["source_url"]}">${sourceContent}</a>` : `${sourceContent}`,
    lexicon_dtls['attribution_url'] ? `<a href="${lexicon_dtls['attribution_url']}">${attributionContent}</a>` : attributionContent,
  ].join('<br>');
  return (
    <SimpleHTMLView
      text={fullContent}
      onPressATag={handleOpenURL}
      extraStyles={[styles.enInt, {fontSize: englishFontSize}, theme.quaternaryText]}
      customHTMLElementModels={{
        'a': HTMLElementModel.fromCustomModel({
          tagName: 'a',
          mixedUAStyles: {
            textDecorationLine: 'underline',
          },
          contentModel: HTMLContentModel.mixed
        })
      }}
    />
  );
};

const LexiconEntry = ({ entry, handleOpenURL }) => {
  const {themeStr, fontSize} = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const englishFontSize = 0.8*fontSize;  // we actually use 0.8x of font size when displaying text in textcolumn. we want to duplicate that size here
  const isBDB = (entry) => {
    return RegExp(/^BDB.*?Dict/).test(entry['parent_lexicon']);
  }
  const headwordSting = (entry) => {
    if (!isBDB(entry)) {
      let headwords = [entry['headword']];
      if ('alt_headwords' in entry) {
        headwords = headwords.concat(entry['alt_headwords']);
      }
      return headwords.join(', ');
    } else {
      const peculiar = ('peculiar' in entry) ? '‡ ' : '';
      const allCited = ('all_cited' in entry) ? '† ' : '';
      const ordinal = ('ordinal' in entry) ? `${entry["ordinal"]} ` : '';
      const hw = `<span dir="rtl">${entry['headword'].replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]*$/, '')}</span>`;
      const occurrences = ('occurrences' in entry) ? `<sub>${entry['occurrences']}</sub>` : '';
      const alts = ('alt_headwords' in entry) ? entry['alt_headwords']
        .map(alt => {
            var ahw = `<span dir="rtl">${alt['word']}</span>`;
            var aocc = ('occurrences' in alt) ? `<sub>${alt['occurrences']}</sub>` : '';
          return `<span>, ${ahw}${aocc}</span>`
        })
        .reduce((prev, curr) => [prev, curr]) : '';
      const allHeadwords = ('headword_suffix' in entry) ? `<span>[${hw}${entry['headword_suffix']}]${occurrences}</span>` :
        (entry['brackets'] == 'all') ? `<span>[${hw}${occurrences}${alts}]</span>` :
          (entry['brackets'] == 'first_word') ? `<span>[${hw}${occurrences}]${alts}</span>` :
            hw + occurrences + alts;
      console.log(peculiar + allCited + ordinal + allHeadwords)
      return (<SimpleHTMLView
          text={peculiar + allCited + ordinal + allHeadwords}
          lang="english"
          extraStyles={[styles.he, {fontSize: englishFontSize}, theme.text]}
      />);
      }
  }
  const headwordText = headwordSting(entry)
  const morphology = ('morphology' in entry['content']) ?  (
    <LexiconText
      lang="english"
      handleOpenURL={handleOpenURL}
      fSize={englishFontSize}
      value={` (${entry['content']['morphology']})`}
      style={theme.secondaryText}
    />
  ) : null;

  let langText = null;
  if ('language_code' in entry || 'language_reference' in entry) {
    let langValue = ('language_code' in entry) ? ` ${entry['language_code']}` : "";
    langValue += ('language_reference' in entry) ? ` ${entry['language_reference']}` : "";
    langText = (<LexiconText lang='english' handleOpenURL={handleOpenURL} fSize={englishFontSize} value={langValue} />);
  }

  const entryHead = (
    <View style={{flexDirection: 'row'}}>
      <SText lang="english" style={[styles.he, {fontSize: fontSize}, theme.text]} lineMultiplier={0.9}>{headwordText}</SText>
      {morphology}
      {langText}
    </View>
  );
  const endnotes = ('notes' in entry) ? <LexiconText lang='english' handleOpenURL={handleOpenURL} fSize={englishFontSize} value={entry['notes']}/> : null;
  const derivatives = ('derivatives' in entry) ? <LexiconText lang='english' handleOpenURL={handleOpenURL} fSize={englishFontSize} value={entry['derivatives']} /> : null;
  const senses = makeSenseTree(entry['content'], isBDB(entry));
  return (
    <View style={{marginTop: 20}}>
      <View>{entryHead}</View>
      <OrderedList
        items={senses}
        renderItem={(item, index) => (
          <View key={index} style={{flexDirection: 'row'}}>
            <SText lang='english' style={[styles.en, {textAlign: 'left', fontSize: englishFontSize}, theme.text]} lineMultiplier={1.15}>{!isBDB(entry) && `${index+1}. `}</SText>
            <LexiconText
              lang='english'
              handleOpenURL={handleOpenURL}
              fSize={englishFontSize}
              value={item}
            />
          </View>
        )}
      />
      <View>{endnotes}{derivatives}</View>
      <View style={{marginTop: 15}}>
        <LexiconAttribution entry={entry} handleOpenURL={handleOpenURL} />
      </View>
    </View>
  );
}
LexiconEntry.propTypes = {
  entry: PropTypes.object.isRequired,
  handleOpenURL: PropTypes.func.isRequired,
};


export default LexiconBox;
