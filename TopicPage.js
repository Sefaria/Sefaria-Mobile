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
} from './Misc';
import { useAsyncVariable } from './Hooks';
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

const TopicCategory = ({ topic, topicTitle, setTopic, setNavTopic, onBack }) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const topicTocLoaded = useAsyncVariable(!!Sefaria.topic_toc, Sefaria.loadTopicToc);
  const getSubtopics = topic => {
    const subtopics = Sefaria.topicTocPage(topic);
    if (!subtopics) { return subtopics; }
    return subtopics.filter(t => t.shouldDisplay !== false).sort((a, b) => sortTopicCategories(a, b, interfaceLanguage));
  }
  const [subtopics, setSubtopics] = useState(getSubtopics(topic));
  useEffect(() => {
    setSubtopics(getSubtopics(topic));
  }, [topic, topicTocLoaded]);

  const headerTopic = topic || {
    en: "Explore by Topic", he: "Explore by Topic",
    description: {
      en: "Selections of texts and user created source sheets about thousands of subjects",
      he: "Selections of texts and user created source sheets about thousands of subjects",
    }
  };
  return (
    <View style={[styles.menu, theme.menu]}>
      <SystemHeader
        title={strings.topics}
        onBack={onBack}
      />
      {
        (!topicTocLoaded || !subtopics) ? (<LoadingView />) : (
          <FlatList
            data={subtopics}
            renderItem={({ item:t }) => (
              <TopicCategoryButton
                {...t}
                setNavTopic={setNavTopic}
                setTopic={setTopic}
              />
            )}
            ListHeaderComponent={() => (
              <TopicCategoryHeader {...headerTopic} trendingTopics={subtopics.slice(0, 6)} />
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

const TopicCategoryHeader = ({ en, he, description, trendingTopics }) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  return (
    <View>
      <View style={{marginHorizontal: 15, marginVertical: 24}}>
        <Text style={[styles.enInt, {fontSize: 22}, theme.tertiaryText]}>{en}</Text>
        <Text style={[styles.enInt, {fontSize: 13, marginTop: 11}, theme.tertiaryText]}>{description.en}</Text>
      </View>
      <View style={{backgroundColor: "#eee", padding: 15}}>
        <TextInput
          style={[styles.enInt, {fontSize: 16, borderBottomWidth: 2, borderBottomColor: "#ccc", paddingBottom: 5}, theme.tertiaryText]}
          editable={false}
          value={"Trending Topics"}
        />
        <View style={{flexDirection: "row", flexWrap: 'wrap'}}>
          { trendingTopics.map((t, i) => (
            <React.Fragment key={t.slug}>
              { i !== 0 ? <Text style={[styles.en, {fontSize: 18, color: "#ccc"}]}>{" ● "}</Text> : null}
              <Text style={[styles.en, {fontSize: 18}, theme.text]}>{t.en}</Text>
            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );
};

const TopicCategoryButton = ({ slug, children, en, he, description, setNavTopic, setTopic }) => {
  const openTopic = () => {
    children ? setNavTopic(slug, {en, he}) : setTopic(slug, {en, he});
  };
  return (
    <TouchableOpacity onPress={()=>{}} style={{paddingHorizontal: 15, paddingVertical: 20}}>
      <Text style={[styles.en, {fontSize: 24}]}>{en}</Text>
      {description ? <Text style={[styles.enInt, {fontSize: 13, color: "#666"}]}>{description.en}</Text> : null}
    </TouchableOpacity>
  );
};

const TopicPage = ({}) => {
  return (
    <View>
      <Text>
        { "welcome" }
      </Text>
    </View>
  )
};

export {
  TopicPage,
  TopicCategory,
};
