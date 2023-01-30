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
    const en = lang === "english" ? text : "";
    const he = lang === "hebrew" ? text : "";
    return (
        <StoryFrame extraStyles={[{marginVertical: 16}]}>
            <StoryTitleBlock en={tref} he={Sefaria.normHebrewRef(heRef)} onClick={() => openRef(tref)}/>
            <ColorBarBox tref={tref}>
                <StoryBodyBlock en={en} he={he}/>
            </ColorBarBox>
            <VersionTitleLine versionTitle={versionTitle} />
        </StoryFrame>
    );
};

const VersionTitleLine = ({ versionTitle }) => {
    const {theme} = useGlobalState();
    if (!versionTitle) {
        return null;
    }
    return (
        <Text style={[styles.enInt, styles.searchVersionTitle, theme.textListCitation]}>
            {versionTitle}
        </Text>
    );
};
