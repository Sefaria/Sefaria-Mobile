'use strict';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  Image,
  TouchableOpacity,
} from 'react-native';
import styles from './Styles';
import strings from './LocalizedStrings';
import { GlobalStateContext, getTheme } from './StateManager';
import {
    InterfaceTextWithFallback
} from './Misc';
import Sefaria from './sefaria';
import { Topic } from './Topic';

const SheetListInConnections = ({ sheets, openRefSheet, openTopic }) => {
    const { interfaceLanguage } = useContext(GlobalStateContext);
    const [sortedSheets, setSortedSheets] = useState([]);
    useEffect(() => {
        sheets = sheets || [];
        const tempSortedSheets = Object.values(sheets.reduce((obj, curr) => { obj[curr.id] = curr; return obj; }, {}));
        tempSortedSheets.sort((a, b) => {
            const aHe = 0 + Sefaria.hebrew.isHebrew(a.title);
            const bHe = 0 + Sefaria.hebrew.isHebrew(b.title);
            if (bHe - aHe === 0) {
                // sort by views
                return b.views - a.views;
            }
            if (interfaceLanguage === 'hebrew') { return bHe - aHe; }
            return aHe - bHe;
        });
        setSortedSheets(tempSortedSheets);
    }, [sheets]);
    return (
        <FlatList
            data={sortedSheets}
            renderItem={({item}) => <SheetItemInConnections sheet={item} openRefSheet={openRefSheet} openTopic={openTopic}/>}
        />
    );
}

const SheetItemInConnections = ({sheet, openRefSheet, openTopic}) => {
    const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
    const theme = getTheme(themeStr);
    const isIntHe = interfaceLanguage === 'hebrew';
    const intStyle = isIntHe ? styles.heInt : styles.enInt;
    const [showMore, setShowMore] = useState(false);
    const MORE_THRESH = 5
    const topics = !sheet.topics ? [] : showMore ? sheet.topics : sheet.topics.slice(0, MORE_THRESH+1);
    if (!showMore && sheet.topics && sheet.topics.length > MORE_THRESH + 1) {
        // only add more button when it will add content. if the more button is replacing the last topic, dont add it!
        topics[MORE_THRESH] = {more: true};
    }
    return (
        <View
            key={sheet.id}
            style={[{borderBottomWidth: 1, paddingVertical: 20}, theme.bordered, styles.readerSideMargin]}
        >
            <TouchableOpacity onPress={()=> openRefSheet(sheet.id, sheet, true, 'text list')}>
                <Text style={[{fontSize: 20, lineHeight: 27}, Sefaria.hebrew.isHebrew(sheet.title) ? styles.he : styles.en, theme.text, {"textAlign": isIntHe ? 'right' : 'left'}]}>
                    { Sefaria.util.stripHtml(sheet.title.replace(/\s\s+/g, ' ')) }
                </Text>
            </TouchableOpacity>
            <View style={[{flexDirection: isIntHe ? "row-reverse" : "row" }]}>
                <Image
                    style={styles.userAvatar}
                    source={{uri: sheet.ownerImageUrl}}
                />
                <View style={[{marginHorizontal: 10, justifyContent: "space-between"}]}>
                    <Text style={[theme.tertiaryText, Sefaria.hebrew.isHebrew(sheet.ownerName) ? styles.heInt : styles.enInt, {"textAlign": isIntHe ? 'right' : 'left'}]}>{sheet.ownerName}</Text>
                    <Text style={[theme.secondaryText, intStyle]}>{`${sheet.views} ${strings.views}`}</Text>
                </View>
            </View>
            <View style={{flexDirection: isIntHe ? "row-reverse" : "row", flexWrap: "wrap", marginTop: 10, marginLeft: -4}}>
                { topics.map(topic => <SheetTopicButton topic={topic} setShowMore={setShowMore} openTopic={openTopic} key={topic.more ? "MORE" : `${topic.slug}|${topic.asTyped}`}/>) }    
            </View>
        </View>
    );
}

const SheetTopicButton = ({ topic, setShowMore, openTopic }) => {
    const { themeStr } = useContext(GlobalStateContext);
    const theme = getTheme(themeStr);
    return (
        topic.more ? (
            <TouchableOpacity onPress={()=>{setShowMore(true)}} style={[styles.sheetTopicButton, theme.readerDisplayOptionsMenuItemSelected]}>
                <InterfaceTextWithFallback en={strings.more} he={strings.more} extraStyles={theme.tertiaryText} />
            </TouchableOpacity>
        ) : (
            <TouchableOpacity onPress={()=>{openTopic(new Topic({ slug: topic.slug }))}} style={[styles.sheetTopicButton, theme.readerDisplayOptionsMenuItemSelected]}>
                <InterfaceTextWithFallback en={topic.en} he={topic.he} extraStyles={theme.tertiaryText} />
            </TouchableOpacity>
        )
    );
}

export default SheetListInConnections;
