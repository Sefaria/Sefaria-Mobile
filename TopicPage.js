'use strict';

import React, { useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';

import {
  SystemHeader,
  LoadingView,
  SText,
  TabView,
  TabRowView,
  LocalSearchBar,
} from './Misc';

import {
  SheetBlock,
  SaveLine,
  StoryTitleBlock,
  ColorBarBox,
  StoryBodyBlock,
  StoryFrame,
  textPropType
} from './Story';

import { useAsyncVariable, useIncrementalLoad } from './Hooks';
import { GlobalStateContext, DispatchContext, STATE_ACTIONS, getTheme } from './StateManager';
import Sefaria from './sefaria';
import strings from './LocalizedStrings';
import styles from './Styles';

const sortTopicCategories = (a, b, interfaceLanguage) => {
  // Don't use display order intended for top level a category level. Bandaid for unclear semantics on displayOrder.
  // TODO: I ripped off bandaid :grimacing:
  const [aDisplayOrder, bDisplayOrder] = [a, b].map(x => x.displayOrder);
  // Sort alphabetically according to interface lang in absense of display order
  if (aDisplayOrder === bDisplayOrder) {
    const stripInitialPunctuation = str => str.replace(/^["#]/, "");
    const [aAlpha, bAlpha] = [a, b].map(x => {
      if (interfaceLanguage === "hebrew") {
        return (x.he.length) ?
          stripInitialPunctuation(x.he) :
         "תתת" + stripInitialPunctuation(x.en);
      } else {
        return (x.en.length) ?
          stripInitialPunctuation(x.en) :
          stripInitialPunctuation(x.he)
      }
    });
    return aAlpha < bAlpha ? -1 : 1;
  }
  return aDisplayOrder - bDisplayOrder;
};

const norm_hebrew_ref = tref => tref.replace(/[׳״]/g, '');


const fetchBulkText = inRefs =>
  Sefaria.api.getBulkText(
    inRefs.map(x => x.ref),
    true, 500, 600
  ).then(outRefs => {
    for (let tempRef of inRefs) {
      // annotate outRefs with `order` and `dataSources` from `topicRefs`
      if (outRefs[tempRef.ref]) {
        outRefs[tempRef.ref].order = tempRef.order;
        outRefs[tempRef.ref].dataSources = tempRef.dataSources;
      }
    }
    return Object.entries(outRefs);
  }
);


const fetchBulkSheet = inSheets =>
    Sefaria.api.getBulkSheets(inSheets.map(x => x.sid)).then(outSheets => {
    for (let tempSheet of inSheets) {
      if (outSheets[tempSheet.sid]) {
        outSheets[tempSheet.sid].order = tempSheet.order;
      }
    }
    return Object.values(outSheets);
  }
);


const refSort = (currSortOption, a, b, { interfaceLang }) => {
  a = a[1]; b = b[1];
  if (!a.order && !b.order) { return 0; }
  if ((0+!!a.order) !== (0+!!b.order)) { return (0+!!b.order) - (0+!!a.order); }
  if (currSortOption === 'Chronological') {
    if (a.order.comp_date === b.order.comp_date) {
      if (a.order.order_id < b.order.order_id) { return -1; }
      if (b.order.order_id < a.order.order_id) { return 1; }
      return 0;
    }
    return a.order.comp_date - b.order.comp_date;
  }
  else {
    const aAvailLangs = a.order.availableLangs || [];
    const bAvailLangs = b.order.availableLangs || [];
    if (interfaceLang === 'english' && aAvailLangs.length !== bAvailLangs.length) {
      if (aAvailLangs.indexOf('en') > -1) { return -1; }
      if (bAvailLangs.indexOf('en') > -1) { return 1; }
      return 0;
    }
    else if (a.order.pr !== b.order.pr) { return b.order.pr - a.order.pr; }
    else { return (b.order.numDatasource * b.order.tfidf) - (a.order.numDatasource * a.order.tfidf); }
  }
};


const sheetSort = (currSortOption, a, b, { interfaceLang }) => {
  if (!a.order && !b.order) { return 0; }
  if ((0+!!a.order) !== (0+!!b.order)) { return (0+!!b.order) - (0+!!a.order); }
  const aTLangHe = 0 + (a.order.titleLanguage === 'hebrew');
  const bTLangHe = 0 + (b.order.titleLanguage === 'hebrew');
  const aLangHe  = 0 + (a.order.language      === 'hebrew');
  const bLangHe  = 0 + (b.order.language      === 'hebrew');
  if (interfaceLang === 'hebrew' && (aTLangHe ^ bTLangHe || aLangHe ^ bLangHe)) {
    if (aTLangHe ^ bTLangHe && aLangHe ^ bLangHe) { return bTLangHe - aTLangHe; }  // title lang takes precedence over content lang
    return (bTLangHe + bLangHe) - (aTLangHe + aLangHe);
  } else if (interfaceLang === 'english' && (aTLangHe ^ bTLangHe || aLangHe ^ bLangHe)) {
    if (aTLangHe ^ bTLangHe && aLangHe ^ bLangHe) { return aTLangHe - bTLangHe; }  // title lang takes precedence over content lang
    return (aTLangHe + aLangHe) - (bTLangHe + bLangHe);
  }
  if (currSortOption === 'Views') {
    return b.order.views - a.order.views;
  } else if (currSortOption === 'Newest') {
    if (b.order.dateCreated < a.order.dateCreated) { return -1; }
    if (a.order.dateCreated < b.order.dateCreated) { return 1; }
  } else {
    // relevance
    if (b.order.relevance == a.order.relevance) { return b.order.views - a.order.views; }
    return (Math.log(b.order.views) * b.order.relevance) - (Math.log(a.order.views) * a.order.relevance);
  }
};

const TopicCategory = ({ topic, openTopic, onBack }) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);

  const theme = getTheme(themeStr);
  const topicTocLoaded = useAsyncVariable(!!Sefaria.topic_toc, Sefaria.loadTopicToc);
  const getSubtopics = slug => {
    const subtopics = Sefaria.topicTocPage(slug);
    if (!subtopics) { return subtopics; }
    return subtopics.filter(t => t.shouldDisplay !== false).sort((a, b) => sortTopicCategories(a, b, interfaceLanguage));
  }
  const slug = topic && topic.slug;
  const [subtopics, setSubtopics] = useState(getSubtopics(slug));
  useEffect(() => {
    setSubtopics(getSubtopics(slug));
  }, [slug, topicTocLoaded]);
  const [trendingTopics, setTrendingTopics] = useState(Sefaria.api._trendingTags);
  useEffect(() => {
    // only set trending topics when at topic toc root => slug == null
    if (!slug) { Sefaria.api.trendingTags(true).then(setTrendingTopics); }
    else { setTrendingTopics(null); }
  }, [slug]);

  const headerTopic = topic || {
    en: "Explore by Topic", he: "Explore by Topic",
    description: {
      en: "Selections of texts and user created source sheets about thousands of subjects",
      he: "Selections of texts and user created source sheets about thousands of subjects",
    }
  };

  return (
    <View style={[styles.menu, theme.buttonBackground]} key={slug}>
      <SystemHeader
        title={strings.topics}
        onBack={onBack}
      />
      {
        (!topicTocLoaded || !subtopics) ? (<LoadingView />) : (
          <FlatList
            data={subtopics}
            renderItem={({ item }) => (
              <TopicCategoryButton
                topic={item}
                openTopic={openTopic}
              />
            )}
            ListHeaderComponent={() => (
              <TopicCategoryHeader {...headerTopic} trendingTopics={trendingTopics} openTopic={openTopic} />
            )}
            ItemSeparatorComponent={()=>(
              <View style={{height: 1, backgroundColor: "#ccc", marginHorizontal: 15}} />
            )}
            keyExtractor={t => t.slug}
          />
        )
      }
    </View>
  );
};

const TopicCategoryHeader = ({ en, he, description, trendingTopics, openTopic }) => {
  const { themeStr, interfaceLanguage, textLanguage } = useContext(GlobalStateContext);
  const menu_language = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage);
  const isHeb = menu_language == 'hebrew';
  const theme = getTheme(themeStr);
  return (
    <View>
      <View style={{marginHorizontal: 15, marginVertical: 24}}>
        <Text style={[styles.enInt, {fontSize: 22}, theme.tertiaryText]}>{en}</Text>
        {description ? <Text style={[styles.enInt, {fontSize: 13, marginTop: 11}, theme.tertiaryText]}>{description.en}</Text> : null}
      </View>
      { trendingTopics ? (
        <View style={{backgroundColor: "#fbfbfa", padding: 15}}>
          <TextInput
            style={[styles.enInt, {fontSize: 16, borderBottomWidth: 2, borderBottomColor: "#ccc", paddingBottom: 5}, theme.tertiaryText]}
            editable={false}
            value={"Trending Topics"}
          />
          <View style={{flexDirection: isHeb ? "row-reverse" : "row", flexWrap: 'wrap', marginTop: 5}}>
            { trendingTopics.slice(0, 6).map((t, i) => (
              <React.Fragment key={t.slug}>
                { i !== 0 ? <SText lang={"english"} style={[styles.en, {fontSize: 13, color: "#ccc", marginTop: 7}]}>{" ● "}</SText> : null}
                <TouchableOpacity onPress={()=>openTopic(t, false)}>
                  <SText lang={menu_language} style={[isHeb ? styles.he : styles.en, {fontSize: 18, marginTop: 6}, theme.text]}>{isHeb ? t.he : t.en}</SText>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>
      ) : null }
    </View>
  );
};

const TopicCategoryButton = ({ topic, openTopic }) => {
  const { themeStr, interfaceLanguage, textLanguage } = useContext(GlobalStateContext);
  const menu_language = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage);
  const theme = getTheme(themeStr);
  const isHeb = menu_language == 'hebrew';
  const { slug, en, he, description } = topic;
  return (
    <TouchableOpacity onPress={()=>{ openTopic(topic, !!Sefaria.topicTocPage(slug)); }} style={{paddingHorizontal: 15, paddingVertical: 20}}>
      <SText style={[isHeb ? styles.he : styles.en, {fontSize: 24}, theme.text]}>{isHeb ? he : en}</SText>
      {description ? <Text style={[isHeb ? styles.heInt : styles.enInt, {marginTop: 10, fontSize: 13, color: "#666"}]}>{isHeb ? description.he : description.en}</Text> : null}
    </TouchableOpacity>
  );
};

const TopicPage = ({ topic, onBack, openTopic }) => {
  const { themeStr, interfaceLanguage, textLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const defaultTopicData = {primaryTitle: null, textRefs: false, sheetRefs: false, isLoading: true};
  const [topicData, setTopicData] = useState(Sefaria.api._topic || defaultTopicData);
  const [sheetData, setSheetData] = useState(topicData ? topicData.sheetData : null);
  const [textData, setTextData]   = useState(topicData ? topicData.textData : null);
  const [textRefsToFetch, setTextRefsToFetch] = useState(false);
  const [sheetRefsToFetch, setSheetRefsToFetch] = useState(false);
  const [parashaData, setParashaData] = useState(null);
  const [currTabIndex, setCurrTabIndex] = useState(0);
  const [query, setQuery] = useState(null);
  const tabs = [{text: "Sources", id: 'sources'}, {text: "Sheets", id: 'sheets'}];
  useEffect(() => {
    Sefaria.api.topic(topic.slug).then(setTopicData);
  }, [topic.slug]);
  useEffect(() => {
    setTopicData(defaultTopicData); // Ensures topicTitle displays while loading
    const { promise, cancel } = Sefaria.util.makeCancelable((async () => {
      const d = await Sefaria.api.topic(topic.slug);
      if (d.parasha) { Sefaria.api.getParashaNextRead(d.parasha).then(setParashaData); }  //TODO
      setTopicData(d);
      // Data remaining to fetch that was not already in the cache
      const textRefsWithoutData = d.textData ? d.textRefs.slice(d.textData.length) : d.textRefs;
      const sheetRefsWithoutData = d.sheetData ? d.sheetRefs.slice(d.sheetData.length) : d.sheetRefs;
      if (textRefsWithoutData.length) { setTextRefsToFetch(textRefsWithoutData); }
      else { setTextData(d.textData); }
      if (sheetRefsWithoutData.length) { setSheetRefsToFetch(sheetRefsWithoutData); }
      else { setSheetData(d.sheetData); }
    })());
    promise.catch((error) => { if (!error.isCanceled) { console.log('TopicPage Error', error); } });
    return () => {
      cancel();
      setTopicData(false);
      setTextData(null);
      setSheetData(null);
      setTextRefsToFetch(false);
      setSheetRefsToFetch(false);
    }
  }, [topic.slug]);

  // Fetching textual data in chunks
  useIncrementalLoad(
    fetchBulkText,
    textRefsToFetch,
    70,
    data => setTextData(prev => {
      const updatedData = (!prev || data === false) ? data : [...prev, ...data];
      if (topicData) { topicData.textData = updatedData; } // Persist textData in cache
      return updatedData;
    }),
    topic.slug
  );

  // Fetching sheet data in chunks
  useIncrementalLoad(
    fetchBulkSheet,
    sheetRefsToFetch,
    70,
    data => setSheetData(prev => {
      const updatedData = (!prev || data === false) ? data : [...prev, ...data];
      if (topicData) { topicData.sheetData = updatedData; } // Persist sheetData in cache
      return updatedData;
    }),
    topic
  );
  
  const TopicPageHeaderRendered = (
    <TopicPageHeader
      {...topic}
      description={topicData && topicData.description}
      currTabIndex={currTabIndex}
      setCurrTabIndex={setCurrTabIndex}
      query={query}
      setQuery={setQuery}
      tabs={tabs}
    />
  );
  const ListRendered = (
    currTabIndex === 0 ? (
      <FlatList
        data={textData}
        renderItem={({ item }) =>(
          <TextPassage
            key={item[0]}
            text={item[1]}
            topicTitle={topicData && topicData.primaryTitle}
          />
        )}
        keyExtractor={item => item[0]}
        ListHeaderComponent={TopicPageHeaderRendered}
      />
    ) : (
      <FlatList
        data={sheetData}
        renderItem={({ item }) => <Text>{item.sheet_title}</Text>}
        keyExtractor={item => item.sheet_id}
        ListHeaderComponent={TopicPageHeaderRendered}
      />
    )
  );

  return (
    <View style={[styles.menu, theme.mainTextPanel]} key={topic.slug}>
      <SystemHeader
        title={strings.topics}
        onBack={onBack}
        hideLangToggle
      />
      {
        topicData ? ListRendered : null
      }
    </View>
  )
};

const TopicPageHeader = ({ en, he, slug, description, currTabIndex, setCurrTabIndex, query, setQuery, tabs }) => {
  const { themeStr, interfaceLanguage, textLanguage } = useContext(GlobalStateContext);

  const menu_language = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage);
  const isHeb = menu_language === 'hebrew';
  const theme = getTheme(themeStr);
  const category = Sefaria.topicTocCategory(slug);
  return (
    <View style={{marginHorizontal: 15, marginVertical: 20}}>
      <Text style={[isHeb ? styles.he : styles.en, {fontSize: 30}]}>{ isHeb ? he : en }</Text>
      { category ? (
        <Text style={[styles.enInt, {fontSize: 13, marginBottom: 20}, theme.tertiaryText]}>
          { isHeb ? category.he : category.en.toUpperCase() }
        </Text>
      ) : null }
      { description ? (
        <Text style={[styles.enInt, {fontSize: 13}, theme.tertiaryText]}>
          { isHeb ? description.he : description.en }
        </Text>
      ) : null }
      <TabRowView
        tabs={tabs}
        renderTab={(tab, active, index) => <TabView {...tab} active={active} />}
        currTabIndex={currTabIndex}
        setTab={setCurrTabIndex}
      />
      <View style={{ marginVertical: 10 }}>
        <LocalSearchBar
          query={query}
          onChange={setQuery}
        />
      </View>
    </View>
  );
};

const TextPassage = ({text, topicTitle }) => {
  if (!text.ref) { return null; }
  // let dataSourceText = '';
  // const langKey = interfaceLang === 'english' ? 'en' : 'he';
  // if (!!text.dataSources && Object.values(text.dataSources).length > 0) {
  //   dataSourceText = `${Sefaria._('This source is connected to ')}"${topicTitle && topicTitle[langKey]}" ${Sefaria._('by')} ${Object.values(text.dataSources).map(d => d[langKey]).join(' & ')}.`;
  // }
  return <StoryFrame>
      <SaveLine dref={text.ref}>
          <StoryTitleBlock en={text.ref} he={norm_hebrew_ref(text.heRef)} />
      </SaveLine>
      <ColorBarBox tref={text.ref}>
          <StoryBodyBlock en={text.en} he={text.he}/>
      </ColorBarBox>
  </StoryFrame>;
};
TextPassage.propTypes = {
  text: textPropType,
};

export {
  TopicPage,
  TopicCategory,
};
