'use strict';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  Image,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import styles from './Styles';
import strings from './LocalizedStrings';
import { GlobalStateContext, getTheme } from './StateManager';
import {
    InterfaceTextWithFallback
} from './Misc';
import Sefaria from './sefaria';

const SheetListInConnections = ({ sheets, openRefSheet, openSheetTag }) => {
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
            renderItem={({item}) => <SheetItemInConnections sheet={item} openRefSheet={openRefSheet} openSheetTag={openSheetTag}/>}
        />
    );
}

const SheetItemInConnections = ({sheet, openRefSheet, openSheetTag}) => {
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
        <Pressable
            onPress={()=> openRefSheet(sheet.id, sheet)}
            android_ripple={{color: "#ccc"}}
            key={sheet.id}
            style={[{borderBottomWidth: 1, paddingVertical: 20}, theme.bordered, styles.readerSideMargin]}
        >
            <Text style={[{fontSize: 20, lineHeight: 27}, Sefaria.hebrew.isHebrew(sheet.title) ? styles.he : styles.en, theme.text, {"textAlign": isIntHe ? 'right' : 'left'}]}>{ sheet.title.replace(/\s\s+/g, ' ') }</Text>
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
                { topics.map(topic => <SheetTopicButton topic={topic} setShowMore={setShowMore} openSheetTag={openSheetTag} key={topic.more ? "MORE" : `${topic.slug}|${topic.asTyped}`}/>) }    
            </View>
        </Pressable>
    );
}

const SheetTopicButton = ({ topic, setShowMore, openSheetTag }) => {
    const { themeStr } = useContext(GlobalStateContext);
    const theme = getTheme(themeStr);
    return (
        topic.more ? (
            <Pressable onPress={()=>{setShowMore(true)}} android_ripple={{color: "#999"}} style={[styles.sheetTopicButton, theme.readerDisplayOptionsMenuItemSelected]}>
                <InterfaceTextWithFallback en={strings.more} he={strings.more} extraStyles={theme.tertiaryText} />
            </Pressable>
        ) : (
            <Pressable onPress={()=>{openSheetTag(topic.slug)}} android_ripple={{color: "#999"}} style={[styles.sheetTopicButton, theme.readerDisplayOptionsMenuItemSelected]}>
                <InterfaceTextWithFallback en={topic.en} he={topic.he} extraStyles={theme.tertiaryText} />
            </Pressable>
        )
    );
}

export default SheetListInConnections;
