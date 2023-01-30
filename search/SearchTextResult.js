'use strict';
import React from 'react';
import {
    Text,
} from 'react-native';
import styles from '../Styles.js';
import {useGlobalState} from "../Hooks";
import {
    StoryFrame,
    ColorBarBox,
    StoryTitleBlock,
    StoryBodyBlock,
} from "../Story";

export const SearchTextResult = ({text, tref, heRef, openRef, lang, versionTitle}) => {
    const {theme} = useGlobalState();
    const en = lang === "english" ? text : "";
    const he = lang === "hebrew" ? text : "";
    return (
        <StoryFrame extraStyles={styles.topicItemMargins}>
            <StoryTitleBlock en={tref} he={Sefaria.normHebrewRef(heRef)} onClick={() => openRef(tref)}/>
            <ColorBarBox tref={tref}>
                <StoryBodyBlock en={en} he={he}/>
                {!!versionTitle ? <Text style={[styles.enInt, {
                    fontSize: 12,
                    marginTop: 4
                }, theme.textListCitation]}>{versionTitle}</Text> : null}
            </ColorBarBox>
        </StoryFrame>
    );
};
