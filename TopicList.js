'use strict';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  FlatList,
} from 'react-native';
import { Topic } from './Topic';
import { useGlobalState, useRtlFlexDir } from './Hooks';
import {
  DataSourceLine,
} from './Misc';
import styles from './Styles';
import strings from './LocalizedStrings';
import {
    InterfaceTextWithFallback,
    ContentTextWithFallback,
    SefariaPressable,
} from './Misc';

const TopicList = ({ topics, openTopic, segmentRef, heSegmentRef }) => {
  const topicsAggregated = Sefaria.links.aggregateTopics(topics);
  return (
    <FlatList
      data={topicsAggregated}
      ListEmptyComponent={<View style={{marginTop: 16, alignItems: "center"}}>
        <InterfaceTextWithFallback
          en={"No topics known here."}
          he={"אין נושאים ידועים."}
          extraStyles={[{fontStyle: "italic"}]}
        />
      </View>}
      renderItem={({ item }) => (
        <TopicListItem
          topic={item}
          openTopic={openTopic}
          segmentRef={segmentRef}
          heSegmentRef={heSegmentRef}
        />        
      )}
      keyExtractor={item => item.topic}
    />
  );
}
  
const TopicListItem = ({ topic, openTopic, segmentRef, heSegmentRef }) => {
  // TODO generalize DataSourceLine to handle ref text instead of topicTitle
  const {theme, menuLanguage} = useGlobalState();
  const flexDirection = useRtlFlexDir(menuLanguage)       
  return (
    <SefariaPressable
      onPress={() => { openTopic(new Topic({ slug: topic.topic, ...topic })); }}
      extraStyles={[{borderBottomWidth: 1, paddingVertical: 20}, theme.bordered, styles.readerSidePadding]}
    >
      <DataSourceLine dataSources={topic.dataSources} title={{en: segmentRef, he: heSegmentRef}} flexDirection={flexDirection} prefixText={strings.thisTopicIsConnectedTo}>
        <ContentTextWithFallback {...topic.title} lang={menuLanguage} lineMultiplier={1.05} extraStyles={[{marginBottom: -10}, theme.text]} />
      </DataSourceLine>
      {
        topic.description && (topic.description.en || topic.description.he) ? (
          <InterfaceTextWithFallback {...topic.description} extraStyles={[theme.tertiaryText, {marginTop: 10}]} lang={menuLanguage}/>
        ) : null
      }
    </SefariaPressable>
  );
}

  export default TopicList;