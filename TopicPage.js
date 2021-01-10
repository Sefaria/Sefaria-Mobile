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
  Pressable,
} from 'react-native';

import { Topic } from './Topic';
import {
  SystemHeader,
  LoadingView,
  SText,
  TabView,
  TabRowView,
  LocalSearchBar,
  DataSourceLine,
  FilterableFlatList,
  InterfaceTextWithFallback,
  ContentTextWithFallback,
  DotSeparatedList,
  SystemButton,
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


const refSort = (currSortOption, a, b, { interfaceLanguage }) => {
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
    if (interfaceLanguage === 'english' && aAvailLangs.length !== bAvailLangs.length) {
      if (aAvailLangs.indexOf('en') > -1) { return -1; }
      if (bAvailLangs.indexOf('en') > -1) { return 1; }
      return 0;
    }
    else if (a.order.pr !== b.order.pr) { return b.order.pr - a.order.pr; }
    else { return (b.order.numDatasource * b.order.tfidf) - (a.order.numDatasource * a.order.tfidf); }
  }
};


const sheetSort = (currSortOption, a, b, { interfaceLanguage }) => {
  if (!a.order && !b.order) { return 0; }
  if ((0+!!a.order) !== (0+!!b.order)) { return (0+!!b.order) - (0+!!a.order); }
  const aTLangHe = 0 + (a.order.titleLanguage === 'hebrew');
  const bTLangHe = 0 + (b.order.titleLanguage === 'hebrew');
  const aLangHe  = 0 + (a.order.language      === 'hebrew');
  const bLangHe  = 0 + (b.order.language      === 'hebrew');
  if (interfaceLanguage === 'hebrew' && (aTLangHe ^ bTLangHe || aLangHe ^ bLangHe)) {
    if (aTLangHe ^ bTLangHe && aLangHe ^ bLangHe) { return bTLangHe - aTLangHe; }  // title lang takes precedence over content lang
    return (bTLangHe + bLangHe) - (aTLangHe + aLangHe);
  } else if (interfaceLanguage === 'english' && (aTLangHe ^ bTLangHe || aLangHe ^ bLangHe)) {
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

const refFilter = (currFilter, ref) => {
  const n = text => !!text ? text.toLowerCase() : '';
  currFilter = n(currFilter);
  ref[1].categories = Sefaria.categoriesForRef(ref[1].ref).join(" ");
  for (let field of ['en', 'he', 'ref', 'categories']) {
    if (n(ref[1][field]).indexOf(currFilter) > -1) { return true; }
  }
};

const sheetFilter = (currFilter, sheet) => {
  const n = text => !!text ? text.toLowerCase() : '';
  currFilter = n(currFilter);
  for (let field of ['sheet_title', 'publisher_name', 'publisher_position', 'publisher_organization']) {
    if (n(sheet[field]).indexOf(currFilter) > -1) { return true; }
  }
};

const organizeLinks = (topic, links) => {
  const category = Sefaria.topicTocCategory(topic.slug);
  const linkTypeArray = links ? (
    Object.values(links)
    .filter(linkType => !!linkType && linkType.shouldDisplay && linkType.links.filter(l => l.shouldDisplay !== false).length > 0)
    .sort((a, b) => {
      const aInd = a.title.en.indexOf('Related');
      const bInd = b.title.en.indexOf('Related');
      if (aInd > -1 && bInd > -1) { return 0; }
      if (aInd > -1) { return -1; }
      if (bInd > -1) { return 1; }
      //alphabetical by en just to keep order consistent
      return a.title.en.localeCompare(b.title.en);
    })
    .map(linkType => {
      linkType.links = linkType.links.map(l => new Topic({slug: l.topic, ...l}));
      return linkType;
    })
  ) : [];
  if (linkTypeArray.length === 0) {
    linkTypeArray.push({
      title: {
        en: !category ? 'Explore Topics' : category.en,
        he: !category ?  'נושאים כלליים' : category.he,
      },
      links: Sefaria.topicTocPage(category && category.slug).slice(0, 20).map(({slug, en, he}) => (new Topic ({
        slug,
        title: {en, he},
        isCategory: !category,
      }))),
    })
  } else if (linkTypeArray[0].title.en === 'Related') {
    // rename
    linkTypeArray[0].title = {
      en: `Topics Related to ${topic.title.en}`,
      he: `נושאים קשורים ל-${topic.title.he}`,
    };
  }
  return linkTypeArray;
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
    title: {
      en: "Explore by Topic", he: "Explore by Topic",
    },
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

/*
<TouchableOpacity onPress={()=>openTopic(t, false)}>
          <SText lang={menu_language} style={[isHeb ? styles.he : styles.en, {fontSize: 18, marginTop: 6}, theme.text]}>{isHeb ? t.he : t.en}</SText>
        </TouchableOpacity>
*/
const TopicCategoryHeader = ({ title, description, trendingTopics, openTopic }) => {
  const { themeStr, interfaceLanguage, textLanguage } = useContext(GlobalStateContext);
  const menu_language = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage);
  const isHeb = menu_language == 'hebrew';
  const theme = getTheme(themeStr);
  return (
    <View>
      <View style={{marginHorizontal: 15, marginVertical: 24}}>
        <Text style={[styles.enInt, {fontSize: 22}, theme.tertiaryText]}>{title.en}</Text>
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
            <DotSeparatedList
              items={trendingTopics.slice(0, 6)}
              renderItem={t => (
                <TopicLink
                  topic={new Topic({slug: t.slug, title: t})}
                  openTopic={openTopic}
                />
              )}
              keyExtractor={t => t.slug}
            />
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
    <Pressable onPress={()=>{ openTopic(new Topic({ slug, title: {en, he}, description}), !!Sefaria.topicTocPage(slug)); }} style={{paddingHorizontal: 15, paddingVertical: 20}}>
      <SText style={[isHeb ? styles.he : styles.en, {fontSize: 24}, theme.text]}>{isHeb ? he : en}</SText>
      {description ? <Text style={[isHeb ? styles.heInt : styles.enInt, {marginTop: 10, fontSize: 13, color: "#666"}]}>{isHeb ? description.he : description.en}</Text> : null}
    </Pressable>
  );
};

const TopicPage = ({ topic, onBack, openTopic, showToast, openRef, openRefSheet }) => {
  const { themeStr, interfaceLanguage, textLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  // why doesn't this variable update?
  const topicTocLoaded = useAsyncVariable(!!Sefaria.topic_toc, Sefaria.loadTopicToc);
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
  const textFinishedLoading = useIncrementalLoad(
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
  const sheetFinishedLoading = useIncrementalLoad(
    fetchBulkSheet,
    sheetRefsToFetch,
    70,
    data => setSheetData(prev => {
      const updatedData = (!prev || data === false) ? data : [...prev, ...data];
      if (topicData) { topicData.sheetData = updatedData; } // Persist sheetData in cache
      return updatedData;
    }),
    topic.slug
  );
  if (!topicTocLoaded) { return <LoadingView />; }
  const TopicSideColumnRendered =  topicData ?
    (<TopicSideColumn topic={topic} links={topicData.links}
      openTopic={openTopic} openRef={openRef}
      parashaData={parashaData} tref={topicData.ref}
    />)
    : null;
  const TopicPageHeaderRendered = (
    <TopicPageHeader
      {...topic}
      topicRef={topicData && topicData.ref}
      parasha={topicData && topicData.parasha}
      description={topicData && topicData.description}
      currTabIndex={currTabIndex}
      setCurrTabIndex={setCurrTabIndex}
      query={query}
      setQuery={setQuery}
      tabs={tabs}
      openRef={openRef}
    />
  );
  const ListRendered = (
    currTabIndex === 0 ? (
      <FilterableFlatList
        key="sources"
        data={textData}
        renderItem={({ item }) =>(
          item.isSplice ? (
            TopicSideColumnRendered
          ): (
            <TextPassage
              text={item[1]}
              topicTitle={topicData && topicData.primaryTitle}
              showToast={showToast}
              openRef={openRef}
            />
          )
        )}
        keyExtractor={item => item.isSplice ? 'splice' : item[0]}
        ListHeaderComponent={TopicPageHeaderRendered}
        ListFooterComponent={textFinishedLoading ? null : <LoadingView />}
        spliceIndex={1}
        currFilter={query}
        filterFunc={refFilter}
        sortFunc={(a, b) => refSort('Relevance', a, b, { interfaceLanguage })}
      />
    ) : (
      <FilterableFlatList
        key="sheets"
        data={sheetData}
        renderItem={({ item }) => (
          <SheetBlock
            sheet={item} compact showToast={showToast}
            onClick={()=>{ openRefSheet(item.sheet_id, item); }}
            extraStyles={styles.topicItemMargins}
          />
        )}
        keyExtractor={item => ""+item.sheet_id}
        ListHeaderComponent={TopicPageHeaderRendered}
        ListFooterComponent={sheetFinishedLoading ? null : <LoadingView />}
        currFilter={query}
        filterFunc={sheetFilter}
        sortFunc={(a, b) => sheetSort('Relevance', a, b, { interfaceLanguage })}
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
      { ListRendered }
    </View>
  )
};
TopicPage.propTypes = {
  openRef: PropTypes.func.isRequired,
  openRefSheet: PropTypes.func.isRequired,
};

const TopicPageHeader = ({ title, slug, description, currTabIndex, setCurrTabIndex, query, setQuery, tabs, topicRef, parasha, openRef }) => {
  const { themeStr, interfaceLanguage, textLanguage } = useContext(GlobalStateContext);

  const menu_language = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage);
  const isHeb = menu_language === 'hebrew';
  const theme = getTheme(themeStr);
  const category = Sefaria.topicTocCategory(slug);
  return (
    <View style={{marginHorizontal: 15, marginVertical: 20}}>
      <Text style={[isHeb ? styles.he : styles.en, {fontSize: 30}]}>{ isHeb ? title.he : title.en }</Text>
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
      {topicRef ?
        (
          <SystemButton
            text={parasha ? strings.readThePortion : (isHeb ? norm_hebrew_ref(topicRef.he) : topicRef.en)}
            img={require('./img/book-dark.png')}
            extraStyles={[styles.readThePortionButton]}
            extraImageStyles={[{tintColor: "#fff"}]}
            onPress={() => { openRef(topicRef.en); }} isHeb={isHeb} isBlue
          />
        )
      : null}
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

const TextPassage = ({text, topicTitle, showToast, openRef }) => {
  if (!text.ref) { return null; }
  return (
    <StoryFrame extraStyles={styles.topicItemMargins}>
      <DataSourceLine dataSources={text.dataSources} topicTitle={topicTitle}>
        <SaveLine dref={text.ref} showToast={showToast}>
          <StoryTitleBlock en={text.ref} he={norm_hebrew_ref(text.heRef)} onClick={() => openRef(text.ref)} />
        </SaveLine>
      </DataSourceLine>
      <ColorBarBox tref={text.ref}>
        <StoryBodyBlock en={text.en} he={text.he}/>
      </ColorBarBox>
    </StoryFrame>
  );
};
TextPassage.propTypes = {
  text: textPropType,
};

const TopicLink = ({topic, openTopic, isTransliteration, isCategory}) => {
  return (
    <Pressable
      style={{marginTop: 6}}
      onPress={() => openTopic(topic, isCategory)} key={topic.slug}
    >
      <ContentTextWithFallback {...topic.title} />
    </Pressable>
  );
}
TopicLink.propTypes = {
  topic: PropTypes.object.isRequired,
  isTransliteration: PropTypes.object,
};


const TopicSideColumn = ({ topic, links, openTopic, openRef, parashaData, tref }) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const [showMore, setShowMore] = useState(false);
  const [linkTypeArray, setLinkTypeArray] = useState(null);
  useEffect(() => {
    setLinkTypeArray(organizeLinks(topic, links));
  }, [topic.slug, links]);
  const sortLinks = (a, b) => {
    const shortLang = interfaceLanguage == 'hebrew' ? 'he' : 'en';
    if (!!a.title[shortLang] !== !!b.title[shortLang]) {
      return (0+!!b.title[shortLang]) - (0+!!a.title[shortLang]);
    }
    if (!a.order && !b.order) { return 0; }
    if ((0+!!a.order) !== (0+!!b.order)) { return (0+!!b.order) - (0+!!a.order); }
    return b.order.tfidf - a.order.tfidf;
  };
  const renderLink = l => (
    <TopicLink
      topic={l}
      openTopic={openTopic}
      isTransliteration={l.titleIsTransliteration}
      isCategory={l.isCategory}
    />
  );
  const readingsComponent = (parashaData && tref) ? (
    <ReadingsComponent parashaData={parashaData} tref={tref} openRef={openRef} />
  ) : null;
  const linksComponent = (
    linkTypeArray ? linkTypeArray.slice(0, !showMore ? 1 : undefined).map(({ title, pluralTitle, links }, iLinkType) => (
        <View key={title.en} style={styles.topicLinkSection}>
          <InterfaceTextWithFallback
            en={(links.length > 1 && pluralTitle) ? pluralTitle.en : title.en}
            he={(links.length > 1 && pluralTitle) ? pluralTitle.he : title.he}
            extraStyles={[styles.SystemBodyEn, styles.topicLinkTypeHeader, theme.tertiaryText, theme.lighterGreyBorder]}
          />
          <View style={styles.topicLinkSideList}>
            <DotSeparatedList
              items={links.filter(l => l.shouldDisplay !== false).sort(sortLinks).slice(0, !showMore && iLinkType === 0 ? 10 : undefined)}
              renderItem={renderLink}
              keyExtractor={l => l.slug}
            />
          </View>
        </View>
      ))
    : null
  );
  const hasMore = linkTypeArray && (linkTypeArray[0].links.filter(l => l.shouldDisplay !== false) > 10 || linkTypeArray.length > 1);
  const moreSource = themeStr === 'white' ? (showMore ? require('./img/up.png') : require('./img/down.png')) : (showMore ? require('./img/up-light.png') : require('./img/down-light.png'))
  const moreButton = hasMore ?
    (
      <Pressable style={styles.topicLinkSideMore} onPress={() => setShowMore(prevShowMore => !prevShowMore)}>
        <InterfaceTextWithFallback
          en={showMore ? "See Less" : "See More"}
          he={showMore ? "ראה פחות" : "ראה עוד"}
          extraStyles={[theme.secondaryText, {fontSize: 13}]}
        />
        <Image
          source={moreSource}
          style={{width: 8, height: 8, marginLeft: 5, alignSelf: 'center'}}
          resizeMode={'contain'}
        />
      </Pressable>
    )
    : null;
  return (
    <View style={[theme.lightestGreyBackground, {padding: 14, marginBottom: 30}]}>
      { readingsComponent }
      { linksComponent }
      { moreButton }
    </View>
  )
}
TopicSideColumn.propTypes = {
  topicData: PropTypes.object,
};


const ReadingsComponent = ({ parashaData, tref, openRef }) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const parashaDate = Sefaria.util.localeDate(parashaData.date, interfaceLanguage);
  return (
    <View>
      <View style={[styles.readingsHeader, styles.readingsSection, theme.lighterGreyBorder]}>
        <InterfaceTextWithFallback en={"Readings"} he={"פרשיות והפטרות"} extraStyles={[styles.SystemBodyEn, styles.topicLinkTypeHeader, theme.tertiaryText, {borderBottomWidth: 0}]}/>
        <View style={{flexDirection: "row"}}>
          <InterfaceTextWithFallback en={parashaDate} he={parashaDate} extraStyles={[theme.secondaryText]} />
          <Text style={styles.separator}> · </Text>
          <InterfaceTextWithFallback {...parashaData.he_date} extraStyles={[theme.secondaryText]} />
        </View>
      </View>
      <View style={styles.readingsSection}>
        <InterfaceTextWithFallback en={"Torah"} he={"תורה"} extraStyles={[theme.tertiaryText, {marginBottom: 5}]} />
        <Pressable onPress={()=>{ openRef(tref.en); }} style={{marginTop: 6}}>
          <ContentTextWithFallback en={tref.en} he={norm_hebrew_ref(tref.he)} />
        </Pressable>
      </View>
      <View style={styles.readingsSection}>
        <InterfaceTextWithFallback en={"Haftarah"} he={"הפטרה"} extraStyles={[theme.tertiaryText, {marginBottom: 5}]} />
        <View style={{flexDirection: "row"}}>
          <DotSeparatedList
            items={parashaData.haftarah}
            renderItem={h => (
              <Pressable onPress={()=>{ openRef(h.displayValue.en); }} style={{marginTop: 6}}>
                <ContentTextWithFallback en={h.displayValue.en} he={norm_hebrew_ref(h.displayValue.he)} />
              </Pressable>
            )}
            keyExtractor={h => h.url}
          />
        </View>
      </View>
    </View>
  );
}

export {
  TopicPage,
  TopicCategory,
};
