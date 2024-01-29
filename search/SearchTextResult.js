'use strict';
import React, {useState} from 'react';
import {
    Text, TouchableOpacity, View, Image,
} from 'react-native';
import styles from '../Styles.js';
import {useGlobalState, useRtlFlexDir} from "../Hooks";
import {
    StoryFrame,
    ColorBarBox,
    StoryTitleBlock,
    StoryBodyBlock,
} from "../Story";
import {iconData} from "../IconData";

export const SearchTextResult = ({text, tref, heTref, openRef, lang, versionTitle, duplicates, isDuplicate}) => {
    const en = lang === "english" ? text : "";
    const he = lang === "hebrew" ? text : "";
    const shortLang = lang === "english" ? "en" : "he";
    const onClick = () => {
        openRef(tref, {[shortLang]: versionTitle}, true, false, true);
    };
    return (
        <StoryFrame extraStyles={[{marginVertical: 16}]}>
            {isDuplicate ? null :
                <StoryTitleBlock en={tref} he={Sefaria.normHebrewRef(heTref)} onClick={onClick}/>
            }
            <ColorBarBox tref={tref}>
                <StoryBodyBlock en={en} he={he}/>
            </ColorBarBox>
            <VersionTitleLine versionTitle={versionTitle} />
            <SimilarResults duplicates={duplicates} />
        </StoryFrame>
    );
};

const VersionTitleLine = ({ versionTitle }) => {
    const {theme} = useGlobalState();
    if (!versionTitle) {
        return null;
    }
    return (
        <Text style={[styles.enInt, styles.searchVersionTitle, theme.tertiaryText]}>
            {versionTitle}
        </Text>
    );
};

const SimilarResults = ({ duplicates, openRef }) => {
    const [showDuplicates, setShowDuplicates] = useState(false);
    const toggleDuplicates = ()=>setShowDuplicates(curr=>!curr);
    if (!duplicates || duplicates.length === 0) {
        return null;
    }
    return (
        <View>
            <SimilarResultsButton
                showDuplicates={showDuplicates}
                numDuplicates={duplicates.length}
                toggleDuplicates={toggleDuplicates}
            />
            <View>
                { (showDuplicates ? duplicates : []).map(item => (
                    <SearchTextResult
                        key={item.version}
                        lang={item.textType}
                        tref={item.title}
                        heTref={item.heTitle}
                        text={item.text}
                        versionTitle={item.version}
                        openRef={openRef}
                        isDuplicate
                    />
                )) }
            </View>
        </View>
    )
};


const SimilarResultsButton = ({ showDuplicates, toggleDuplicates, numDuplicates }) => {
    const { theme, interfaceLanguage, themeStr } = useGlobalState();
    const flexDirection = useRtlFlexDir(interfaceLanguage)
    const iconName = showDuplicates ? 'up' : 'down';
    return (
        <TouchableOpacity onPress={toggleDuplicates} style={{flexDirection, alignItems: "center"}}>
            <Text style={[styles.enInt, theme.secondaryText, {fontSize: 14}]}>{`${numDuplicates} more versions`}</Text>
            <Image source={iconData.get(iconName, themeStr)} resizeMode={'contain'} style={{marginHorizontal: 5, width: 8, height: 8}}/>
        </TouchableOpacity>
    );
};