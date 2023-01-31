'use strict';
import React, {useState} from 'react';
import {
    Text, TouchableOpacity, View,
} from 'react-native';
import styles from '../Styles.js';
import {useGlobalState} from "../Hooks";
import {
    StoryFrame,
    ColorBarBox,
    StoryTitleBlock,
    StoryBodyBlock,
} from "../Story";

export const SearchTextResult = ({text, tref, heTref, openRef, lang, versionTitle, duplicates, isDuplicate}) => {
    const en = lang === "english" ? text : "";
    const he = lang === "hebrew" ? text : "";
    return (
        <StoryFrame extraStyles={[{marginVertical: 16}]}>
            {isDuplicate ? null :
                <StoryTitleBlock en={tref} he={Sefaria.normHebrewRef(heTref)} onClick={() => openRef(tref)}/>
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
    const { theme } = useGlobalState();
    const [showDuplicates, setShowDuplicates] = useState(false);
    const toggleShowDuplicates = ()=>setShowDuplicates(curr=>!curr);
    if (!duplicates || duplicates.length === 0) {
        return null;
    }
    return (
        <View>
            <TouchableOpacity onPress={toggleShowDuplicates}>
                <Text style={[styles.enInt, theme.secondaryText, {fontSize: 14}]}>{`${duplicates.length} more versions`}</Text>
            </TouchableOpacity>
            <View style={{paddingStart: 30}}>
                { showDuplicates ? duplicates.map(item => (
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
                )) : null}
            </View>
        </View>
    )
};
