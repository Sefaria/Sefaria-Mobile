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
    const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
    const theme = getTheme(themeStr);
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
    const isIntHe = interfaceLanguage === 'hebrew';
    const intStyle = isIntHe ? styles.heInt : styles.enInt;
    return (
        <FlatList
            data={sortedSheets}
            renderItem={({ item:sheet }) => (
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
                    <View style={{flexDirection: "row", flexWrap: "wrap", marginTop: 10, marginLeft: -4}}>
                        {
                            sheet.topics && sheet.topics.map((t, i) => 
                                <Pressable onPress={()=>{openSheetTag(t.slug)}} android_ripple={{color: "#999"}} style={{paddingHorizontal: 5, paddingVertical: 2, backgroundColor: "#eee", borderRadius: 5, marginVertical: 3, marginHorizontal: 4}}>
                                    <InterfaceTextWithFallback key={`${t.slug}|${t.asTyped}`} en={t.en} he={t.he} />
                                </Pressable>
                            )
                        }    
                    </View>
                </Pressable>
            )}
        />
    );
}

export default SheetListInConnections;
