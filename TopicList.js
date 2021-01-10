'use strict';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
} from 'react-native';
import { Topic } from './Topic';
import {
  DataSourceLine,
} from './Misc';
import styles from './Styles';
import strings from './LocalizedStrings';
import { GlobalStateContext, getTheme } from './StateManager';
import {
    LoadingView,
    InterfaceTextWithFallback,
    ContentTextWithFallback
} from './Misc';

const TopicList = ({ topics, openTopic }) => {
  const topicsAggregated = Sefaria.links.aggregateTopics(topics);
  return (
    <FlatList
      data={topicsAggregated}
      renderItem={({ item }) => (
        <TopicListItem
          topic={item}
          openTopic={openTopic}
        />        
      )}
      keyExtractor={item => item.topic}
    />
  );
  return (
    <View style={{backgroundColor: "grey"}}>
      {
        false ? (
          <View style={styles.webpageListEmpty}>
            <LoadingView />
          </View>
        ) : (!topicsAggregated || !topicsAggregated.length) ? (
          <View style={styles.webpageListEmpty}>
            <InterfaceTextWithFallback
              en={"No topics known here."}
              he={"אין נושאים ידועים."}
            />
          </View>
        ) : topicsAggregated.map(
          topic => (
            <TopicListItem
              key={topic.topic}
              topic={topic}
              openTopic={openTopic}
            />
          )
        )
      }
    </View>
  );
}
  
const TopicListItem = ({ topic, openTopic }) => {
  // TODO generalize DataSourceLine to handle ref text instead of topicTitle
  const {themeStr, interfaceLanguage} = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  //       
  return (
    <Pressable onPress={() => { openTopic(new Topic({ slug: topic.topic, title: topic.title })); }} style={[{borderBottomWidth: 1, paddingVertical: 20}, theme.bordered, styles.readerSideMargin]}>
      <DataSourceLine dataSources={topic.dataSources} topicTitle={topic.title}>
        <ContentTextWithFallback {...topic.title} />
      </DataSourceLine>
      {
        topic.description && (topic.description.en || topic.description.he) ? (
          <ContentTextWithFallback {...topic.description} />
        ) : null
      }
    </Pressable>
  );
}

  export default TopicList;