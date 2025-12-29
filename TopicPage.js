'use strict';

import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  Image,
  FlatList,
  Platform,
} from 'react-native';

import { Topic } from './Topic';
import {
  SystemHeader,
  LoadingView,
  SText,
  TabView,
  TabRowView,
  SearchBarWithIcon,
  DataSourceLine,
  FilterableFlatList,
  InterfaceTextWithFallback,
  ContentTextWithFallback,
  DotSeparatedList,
  SystemButton,
  SefariaPressable, CategoryButton, GreyBoxFrame, BackButtonRow, SimpleLinkedBlock,
} from './Misc';

import {
  SaveLine,
  StoryTitleBlock,
  ColorBarBox,
  StoryBodyBlock,
  StoryFrame,
  textPropType
} from './Story';

import { useAsyncVariable, useIncrementalLoad, useGlobalState, useRtlFlexDir } from './Hooks';
import Sefaria from './sefaria';
import strings from './LocalizedStrings';
import styles from './Styles';
import {iconData} from "./IconData";
import {SimpleMarkdown} from './Misc'

const sortTopicCategories = (a, b, interfaceLanguage, isRoot) => {
  // Don't use display order intended for top level a category level. Bandaid for unclear semantics on displayOrder.
  const [aDisplayOrder, bDisplayOrder] = [a, b].map(x => !isRoot && Sefaria.isTopicTopLevel(x.slug) ? 10000 : x.displayOrder);
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
    if ((interfaceLanguage === 'english') &&
        (a.order.curatedPrimacy.en > 0 || b.order.curatedPrimacy.en > 0)) {
      return b.order.curatedPrimacy.en - a.order.curatedPrimacy.en;
    } else if ((interfaceLanguage === 'hebrew') &&
        (a.order.curatedPrimacy.he > 0 || b.order.curatedPrimacy.he > 0)) {
      return b.order.curatedPrimacy.he - a.order.curatedPrimacy.he;
    }
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


const refFilter = (currFilter, ref) => {
  const n = text => !!text ? text.toLowerCase() : '';
  currFilter = n(currFilter);
  const cats = Sefaria.categoriesForRef(ref[1].ref) || [];
  ref[1].categories = cats.join(" ");
  for (let field of ['en', 'he', 'ref', 'categories']) {
    if (n(ref[1][field]).indexOf(currFilter) > -1) { return true; }
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
    const subtopics = Sefaria.topicTocPage(category && category.slug) || [];
    linkTypeArray.push({
      title: {
        en: !category ? 'Explore Topics' : category.en,
        he: !category ?  'נושאים כלליים' : category.he,
      },
      links: subtopics.slice(0, 20).map(({slug, en, he}) => (new Topic ({
        slug,
        title: {en, he},
        isCategory: !category,
      }))),
    })
  } else if (linkTypeArray[0].title.en === 'Related') {
    // rename
    const title = topic.title || {}
    linkTypeArray[0].title = {
      en: `Topics Related to ${title.en}`,
      he: `נושאים קשורים ל-${title.he}`,
    };
  }
  return linkTypeArray;
};


const TopicCategory = ({ topic, openTopic, onBack, openNav }) => {
  const { theme, interfaceLanguage } = useGlobalState();

  const topicTocLoaded = useAsyncVariable(!!Sefaria.topic_toc, Sefaria.loadTopicToc);
  const getSubtopics = slug => {
    const subtopics = Sefaria.topicTocPage(slug);
    if (!subtopics) { return subtopics; }
    return subtopics.filter(t => t.shouldDisplay !== false).sort((a, b) => sortTopicCategories(a, b, interfaceLanguage, !topic));
  }
  const slug = topic && topic.slug;
  const [subtopics, setSubtopics] = useState(getSubtopics(slug));
  useEffect(() => {
    if (topic) {
      const newTopic = Sefaria.getTopicTocObject(topic.slug);
      if (newTopic) {
        openTopic(newTopic, true, false);  // make sure topic is set with all available info if it wasn't set correctly initially (e.g. came from external link)
      }
    }
    const tempSubtopics = getSubtopics(slug);
    if (tempSubtopics) {
      tempSubtopics.splice(3, 0, {isSplice: true});
    }
    setSubtopics(tempSubtopics);
  }, [slug, topicTocLoaded]);
  const [trendingTopics, setTrendingTopics] = useState(Sefaria.api._trendingTags);
  useEffect(() => {
    // only set trending topics when at topic toc root => slug == null
    if (!slug) {
      Sefaria.api.trendingTags(true).then((trendingTags) => {
        setTrendingTopics(trendingTags.map(tag => new Topic({ slug: tag.slug, title: {en: tag.en, he: tag.he}})));
      });
    }
    else { setTrendingTopics(null); }
  }, [slug]);

  const headerTopic = topic || {
    title: {
      en: "Explore by Topic", he: "חיפוש לפי נושאים",
    },
    description: {
      en: "Selections of texts about thousands of subjects",
      he: "מבחר מקורות באלפי נושאים שונים",
    }
  };

  return (
    <View style={[styles.menu, theme.readerNavCategory]} key={slug}>
      {
        (!topicTocLoaded || !subtopics) ? (<LoadingView />) : (
          <FlatList
            data={subtopics}
            renderItem={({ item, index }) => (
                item.isSplice ? (
                  <TrendingTopics trendingTopics={trendingTopics} openTopic={openTopic} />
                ) : (
                  <View style={[styles.topicCategoryButtonWrapper, index > 0 && subtopics[index-1].isSplice ? {borderTopWidth: 0} : null, theme.lighterGreyBorder]}>
                    <TopicCategoryButton
                        topic={item}
                        openTopic={openTopic}
                    />
                  </View>
                )
            )}
            ListHeaderComponent={() => (
              <TopicCategoryHeader {...headerTopic} onBack={!!topic && onBack}/>
            )}
            keyExtractor={t => t.slug || 'splice'}
          />
        )
      }
    </View>
  );
};

const TopicCategoryHeader = ({ title, description, categoryDescription, children, onBack }) => {
  const { theme, interfaceLanguage } = useGlobalState();
  const displayDescription = categoryDescription || description;
  return (
    <View>
      <View style={{marginHorizontal: 15, marginBottom: 24, marginTop: !!onBack ? 0 : 24}}>
        { !!onBack && <BackButtonRow onPress={onBack} />}
        <InterfaceTextWithFallback
          {...title}
          lang={interfaceLanguage}
          extraStyles={[{fontSize: 22, fontWeight: 'bold'}, theme.tertiaryText]}
        />
        {displayDescription ? (
          <InterfaceTextWithFallback
            {...displayDescription}
            lang={interfaceLanguage}
            extraStyles={[{fontSize: 13, marginTop: 11}, theme.tertiaryText]}
          />
        ) : null}
      </View>
      { children }
    </View>
  );
};

const TrendingTopics = ({ trendingTopics, openTopic }) => {
  const { theme, menuLanguage } = useGlobalState();
  const isHeb = menuLanguage === 'hebrew';
  return (
    trendingTopics ? (
      <View style={[{padding: 15}, theme.lightestGreyBackground]}>
        <View style={[{borderBottomWidth: 1, paddingBottom: 5}, theme.lightGreyBorder]}>
          <InterfaceTextWithFallback
            en={strings.trendingTopics}
            he={strings.trendingTopics}
            lang={menuLanguage}
            extraStyles={[{fontSize: 16, fontWeight: "bold"}, theme.tertiaryText]}
          />
        </View>
        <View style={{flexDirection: isHeb ? "row-reverse" : "row", flexWrap: 'wrap', marginTop: 10}}>
          <DotSeparatedList
            flexDirection={isHeb ? 'row-reverse' : 'row'}
            items={trendingTopics.slice(0, 6)}
            renderItem={t => (
              <TopicLink
                lang={menuLanguage}
                topic={t}
                openTopic={openTopic}
              />
            )}
            keyExtractor={t => t.slug}
          />
        </View>
      </View>
    ) : null
  );
}

const TopicCategoryButton = ({ topic, openTopic }) => {
  const { slug, en, he, description, categoryDescription } = topic;
  const onPress = useCallback(() => {
    openTopic(new Topic({ slug, title: {en, he}, description, categoryDescription}), !!Sefaria.topicTocPage(slug));
  }, [slug]);
  const displayDescription = categoryDescription || description;
  return (
      <CategoryButton
          title={{en, he}}
          description={displayDescription}
          onPress={onPress}
      />
  );
};

const TopicPage = ({ topic, onBack, openNav, openTopic, showToast, openRef, setTopicsTab, topicsTab, openUri }) => {
  const { theme, interfaceLanguage } = useGlobalState();
  // why doesn't this variable update?
  const topicTocLoaded = useAsyncVariable(!!Sefaria.topic_toc, Sefaria.loadTopicToc);
  const defaultTopicData = {primaryTitle: null, textRefs: false, isLoading: true};
  const [topicData, setTopicData] = useState(Sefaria.api._topic[topic.slug] || defaultTopicData);
  const [textData, setTextData]   = useState(topicData ? topicData.textData : null);
  const [textRefsToFetch, setTextRefsToFetch] = useState(false);
  const [parashaData, setParashaData] = useState(null);
  const [query, setQuery] = useState(null);
  const [portal, setPortal] = useState(null);
  const isAuthor = topicData?.subclass === 'author';
  const hasWorks = isAuthor && topicData?.indexes?.length;
  const tabs = [];
  if (hasWorks) {
    tabs.push({text: strings.worksOnSefaria, id: 'works'});
  } else if (topicData?.textRefs?.length) {
    tabs.push({text: strings.sources, id: 'sources'});
  }
  useEffect(() => {
    if (tabs.length && tabs[0].id !== topicsTab) { setTopicsTab(tabs[0].id); }
  }, [topic.slug, topicData]);

  useEffect(() => {
    Sefaria.api.topic(topic.slug).then(setTopicData);
  }, [topic.slug]);
  useEffect(() => {
    setTopicData(defaultTopicData); // Ensures topicTitle displays while loading
    const { promise, cancel } = Sefaria.util.makeCancelable((async () => {
      const d = await Sefaria.api.topic(topic.slug);
      openTopic(new Topic({ slug: d.slug, title: d.primaryTitle, description: d.description }), false, false);
      if (d.parasha) { Sefaria.api.getParashaNextRead(d.parasha).then(setParashaData); }
      setTopicData(d);
      // Data remaining to fetch that was not already in the cache
      const textRefsWithoutData = d.textData ? d.textRefs.slice(d.textData.length) : d.textRefs;
      if (textRefsWithoutData.length) { setTextRefsToFetch(textRefsWithoutData); }
      else { setTextData(d.textData); }
    })());
    promise.catch((error) => { if (!error.isCanceled) { console.log('TopicPage Error', error); } });
    return () => {
      cancel();
      setTopicData(false);
      setTextData(null);
      setTextRefsToFetch(false);
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

  const [searchBarY, setSearchBarY] = useState(null);
  const flatListRef = useRef();
  const jumpToSearchBar = () => {
    if (searchBarY !== null && flatListRef) {
      flatListRef.current.scrollToOffset({offset: searchBarY, animated: true});
    }
  };
  if (!topicTocLoaded) { return <LoadingView />; }

  if (topicData?.portal_slug) {
    Sefaria.api.portal(topicData.portal_slug).then(setPortal);
  }
  const TopicSideColumnRendered =  topicData ?
    (<TopicSideColumn topic={topic} links={topicData.links}
      openTopic={openTopic} openRef={openRef}
      parashaData={parashaData} tref={topicData.ref}
    />)
    : null;
  const TopicPageHeaderRendered = (
    <TopicPageHeader
      {...topic}
      onBack={onBack}
      topicRef={topicData && topicData.ref}
      parasha={topicData && topicData.parasha}
      description={topicData && topicData.description}
      topicsTab={topicsTab}
      setTopicsTab={setTopicsTab}
      query={query}
      setQuery={setQuery}
      tabs={tabs}
      openRef={openRef}
      openUri={openUri}
      jumpToSearchBar={jumpToSearchBar}
      setSearchBarY={setSearchBarY}
      portal={portal}
      showSearch={!hasWorks}
    />
  );
  const WorksListRendered = hasWorks ? (
    <FlatList
      ref={flatListRef}
      key="works"
      data={topicData.indexes}
      renderItem={({ item }) => (
        <AuthorWork work={item} openUri={openUri} />
      )}
      keyExtractor={item => item.url}
      ListHeaderComponent={TopicPageHeaderRendered}
      contentContainerStyle={{minHeight: 700}}
    />
  ) : null;

  const SourcesListRendered = !hasWorks ? (
    <FilterableFlatList
      ref={flatListRef}
      key="sources"
      data={textData}
      renderItem={({ item }) =>(
        item.isSplice ? (
          TopicSideColumnRendered
        ) : (
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
      ListEmptyComponent={<TopicListEmpty query={query} tab={topicsTab} isLoading={!textFinishedLoading} />}
      spliceIndex={query ? undefined : 2}
      currFilter={query}
      filterFunc={refFilter}
      sortFunc={(a, b) => refSort('Relevance', a, b, { interfaceLanguage })}
      contentContainerStyle={{minHeight: 700}}
    />
  ) : null;

  return (
    <View style={[styles.menu, theme.mainTextPanel]} key={topic.slug}>
      { WorksListRendered || SourcesListRendered }
    </View>
  )
};
TopicPage.propTypes = {
  openRef: PropTypes.func.isRequired,
};

const TopicListEmpty = ({ query, tab, isLoading }) => {
  const { theme } = useGlobalState();
  if (!query || isLoading) { return null; }
  const message = `${strings.noResultsContaining} "${query}"`
  return (
    <View style={{flex: 1, alignItems: "center"}}>
      <ContentTextWithFallback
        en={message}
        he={message}
        extraStyles={[{fontStyle: "italic"}, theme.secondaryText]}
      />
    </View>
  );
};

const TopicTabView = ({text, active}) => {
  const { interfaceLanguage, theme } = useGlobalState();
  return (
      <TabView
          text={text}
          active={active}
          lang={interfaceLanguage}
          textStyleByLang={{
            english: styles.enInt,
            hebrew: styles.heInt,
          }}
          activeTextStyle={theme.tertiaryText}
          inactiveTextStyle={theme.secondaryText}
          baseTextStyles={[styles.systemH3]}
      />
  );
};

const TopicPageHeader = ({ title, slug, description, topicsTab, setTopicsTab, query, setQuery, tabs, topicRef, parasha, openRef, jumpToSearchBar, setSearchBarY, onBack, openUri, portal, showSearch = true }) => {
  const { theme, interfaceLanguage } = useGlobalState();
  const flexDirection = useRtlFlexDir(interfaceLanguage);
  const isHeb = interfaceLanguage === 'hebrew';
  const category = Sefaria.topicTocCategory(slug);
  return (
    <View style={{marginHorizontal: 15, marginBottom: 20}}>
      <BackButtonRow onPress={onBack} />
      {title ? (
        <ContentTextWithFallback
          {...title}
          extraStyles={[{fontSize: 30}, theme.text]}
          lang={interfaceLanguage}
        />
      ) : null}
      { category ? (
        <InterfaceTextWithFallback
          extraStyles={[{fontSize: 13, marginBottom: 20}, theme.tertiaryText]}
          he={category.he} en={category.en.toUpperCase()}
        />
      ) : null }
      { description ? (
        <InterfaceTextWithFallback
          extraStyles={[{fontSize: 13}, theme.tertiaryText]}
          {...description}
          RenderingComponent={SimpleMarkdown}
        />
      ) : null }
      <PortalLink topicSlug={slug} portal={portal} openUri={openUri} />
      {topicRef ?
        (
          <SystemButton
            text={parasha ? strings.readThePortion : (isHeb ? Sefaria.normHebrewRef(topicRef.he) : topicRef.en)}
            img={require('./img/book-black.png')}
            extraStyles={[isHeb ? styles.readThePortionButtonHe : styles.readThePortionButton, {alignSelf: isHeb ? "flex-end" : "flex-start"}]}
            extraImageStyles={[{tintColor: "#fff"}]}
            onPress={() => { openRef(topicRef.en); }} isHeb={isHeb} isBlue
            placeholderImg={false}
          />
        )
      : null}
      <TabRowView
        tabs={tabs}
        renderTab={(tab, active) => <TopicTabView text={tab.text} active={active} />}
        currTabId={topicsTab}
        setTab={setTopicsTab}
        flexDirection={flexDirection}
      />
      {showSearch ? (
        <View style={{ marginTop: 15, marginBottom: 10 }} onLayout={event => {
          setSearchBarY(event.nativeEvent.layout.y);
        }}>
          <SearchBarWithIcon
            onFocus={jumpToSearchBar}
            query={query}
            onChange={setQuery}
          />
        </View>
      ) : null}
    </View>
  );
};

const PortalLink = ({ topicSlug, portal, openUri }) => {
  if (!portal) { return null; }
  const uri = `https://sefaria.org/topics/${topicSlug}`;
  const {en, he} = portal.name;
  const linkText = {
    en: `\n${en} on Sefaria`, he: `\n${he} בספריא`
  }
  return <SimpleLinkedBlock {...linkText} onClick={()=>openUri(uri)} />;
}

const TextPassage = ({text, topicTitle, showToast, openRef }) => {
  const { interfaceLanguage } = useGlobalState();
  if (!text.ref) { return null; }
  const flexDirection = useRtlFlexDir(interfaceLanguage);
  return (
    <StoryFrame extraStyles={styles.topicItemMargins}>
      <View style={{marginBottom: 10}}>
        <DataSourceLine dataSources={text.dataSources} title={topicTitle} flexDirection={flexDirection} prefixText={strings.thisSourceIsConnectedTo} imageStyles={[{marginTop: -12}]}>
          <SaveLine dref={text.ref} showToast={showToast} flexDirection={flexDirection} imageStyles={[{marginTop: -12}]}>
            <StoryTitleBlock en={text.ref} he={Sefaria.normHebrewRef(text.heRef)} onClick={() => openRef(text.ref)} />
          </SaveLine>
        </DataSourceLine>
      </View>
      <ColorBarBox tref={text.ref}>
        <StoryBodyBlock en={text.en} he={text.he}/>
      </ColorBarBox>
    </StoryFrame>
  );
};
TextPassage.propTypes = {
  text: textPropType,
};

const AuthorWork = ({ work, openUri }) => {
  const { theme, interfaceLanguage } = useGlobalState();
  const { url, title, description } = work;
  const hasDescription = description?.en || description?.he;
  const onPress = () => {
    const fullUrl = `https://www.sefaria.org${url}`;
    openUri(fullUrl);
  };
  return (
    <SefariaPressable onPress={onPress} extraStyles={{marginHorizontal: 15, marginBottom: 20}}>
      <ContentTextWithFallback
        {...title}
        lang={interfaceLanguage}
        extraStyles={[{fontSize: 24}, theme.text]}
      />
      {hasDescription ? (
        <InterfaceTextWithFallback
          {...description}
          lang={interfaceLanguage}
          extraStyles={[{marginTop: 6, fontSize: 13}, theme.tertiaryText]}
        />
      ) : null}
    </SefariaPressable>
  );
};

const TopicLink = ({topic, openTopic, isTransliteration, isCategory, lang}) => {
  const { theme } = useGlobalState();
  return (
    <SefariaPressable
      extraStyles={{marginTop: 6}}
      onPress={() => openTopic(topic, isCategory)} key={topic.slug}
    >
      <ContentTextWithFallback {...topic.title} lang={lang} extraStyles={[Platform.OS == 'ios' && lang == 'english' ? {marginBottom: -7} : null, theme.text]}/>
    </SefariaPressable>
  );
}
TopicLink.propTypes = {
  topic: PropTypes.object.isRequired,
  isTransliteration: PropTypes.object,
};


const TopicSideColumn = ({ topic, links, openTopic, openRef, parashaData, tref }) => {
  const { theme, themeStr, interfaceLanguage } = useGlobalState();
  const [showMore, setShowMore] = useState(false);
  const [linkTypeArray, setLinkTypeArray] = useState(null);
  useEffect(() => {
    setLinkTypeArray(organizeLinks(topic, links));
  }, [topic.slug, links]);
  const isHeb = interfaceLanguage === 'hebrew';
  const sortLinks = (a, b) => {
    const shortLang = isHeb ? 'he' : 'en';
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

  // parashaData can be an empty array if it is missing
  const hasReadings = parashaData && !Array.isArray(parashaData)  && tref;
  const readingsComponent = hasReadings ? (
    <ReadingsComponent parashaData={parashaData} tref={tref} openRef={openRef} />
  ) : null;
  const linksComponent = (
    linkTypeArray ? linkTypeArray.slice(0, !showMore ? 1 : undefined).map(({ title, pluralTitle, links }, iLinkType) => (
        <View key={title.en} style={[styles.topicLinkSection, iLinkType === 0 ? {paddingTop: 0} : null]}>
          <View style={[{borderBottomWidth: 1}, theme.lighterGreyBorder]}>
            <InterfaceTextWithFallback
              en={(links.length > 1 && pluralTitle) ? pluralTitle.en : title.en}
              he={(links.length > 1 && pluralTitle) ? pluralTitle.he : title.he}
              extraStyles={[styles.SystemBodyEn, styles.topicLinkTypeHeader, theme.tertiaryText]}
            />
          </View>
          <View style={[styles.topicLinkSideList, {flexDirection: isHeb ? 'row-reverse' : 'row'}]}>
              <DotSeparatedList
                flexDirection={isHeb ? 'row-reverse' : 'row'}
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
  const moreIconName = showMore ? 'up' : 'down';
  const moreSource = iconData.get(moreIconName, themeStr);
  const moreButton = hasMore ?
    (
      <SefariaPressable extraStyles={[styles.topicLinkSideMore, {flexDirection: isHeb ? 'row-reverse': 'row'}]} onPress={() => setShowMore(prevShowMore => !prevShowMore)}>
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
      </SefariaPressable>
    )
    : null;
  return (
      <View style={{marginBottom: 30}}>
        <GreyBoxFrame>
          { readingsComponent }
          { linksComponent }
          { moreButton }
        </GreyBoxFrame>
      </View>
  );
};
TopicSideColumn.propTypes = {
  topicData: PropTypes.object,
};


const ReadingsComponent = ({ parashaData, tref, openRef }) => {
  const { theme, interfaceLanguage } = useGlobalState();
  const flexDirection = useRtlFlexDir(interfaceLanguage);
  const parashaDate = Sefaria.util.localeDate(parashaData.date, interfaceLanguage);
  return (
    <View>
      <View style={[styles.readingsHeader, styles.readingsSection, theme.lighterGreyBorder, {flexDirection}]}>
        <InterfaceTextWithFallback en={"Readings"} he={"פרשיות והפטרות"} extraStyles={[styles.SystemBodyEn, styles.topicLinkTypeHeader, theme.tertiaryText, {borderBottomWidth: 0}]}/>
        <View style={{flexDirection}}>
          <InterfaceTextWithFallback en={parashaDate} he={parashaDate} extraStyles={[theme.secondaryText]} />
          <Text style={styles.separator}> · </Text>
          <InterfaceTextWithFallback {...parashaData.he_date} extraStyles={[theme.secondaryText]} />
        </View>
      </View>
      <View style={styles.readingsSection}>
        <InterfaceTextWithFallback en={"Torah"} he={"תורה"} extraStyles={[theme.tertiaryText, {marginBottom: 5}]} />
        <SefariaPressable onPress={()=>{ openRef(tref.en); }} extraStyles={{marginTop: 6}}>
          <ContentTextWithFallback en={tref.en} he={Sefaria.normHebrewRef(tref.he)} extraStyles={[theme.text]}/>
        </SefariaPressable>
      </View>
      <View style={styles.readingsSection}>
        <InterfaceTextWithFallback en={"Haftarah"} he={"הפטרה"} extraStyles={[theme.tertiaryText, {marginBottom: 5}]} />
        <View style={{flexDirection}}>
          <DotSeparatedList
            flexDirection={flexDirection}
            items={parashaData.haftarah}
            renderItem={h => (
              <SefariaPressable onPress={()=>{ openRef(h.displayValue.en); }} extraStyles={{marginTop: 6}}>
                <ContentTextWithFallback en={h.displayValue.en} he={Sefaria.normHebrewRef(h.displayValue.he)} extraStyles={[theme.text]}/>
              </SefariaPressable>
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
