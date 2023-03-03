'use strict';

import React from 'react';
import {
    View,
    Text,
    Image, TouchableOpacity,
} from 'react-native';
import {TabMetadata} from './PageHistory';
import {iconData} from "./IconData";
import styles from './Styles';
import {useGlobalState} from "./Hooks";
import {FlexFrame, Icon, InterfaceText} from "./Misc";


export const FooterTabBar = ({selectedTabName, setTab}) => {
    const {theme} = useGlobalState();
    return (
        <View style={[styles.footerBar, theme.mainTextPanel, theme.lightGreyBorder]}>
            <FlexFrame dir={"row"} justifyContent={"space-between"}>
                {
                    TabMetadata.namesWithIcons().map(({name, stringKey, icon: iconName}) => (
                        <FooterTabButton
                            key={name}
                            isSelected={name === selectedTabName}
                            stringKey={stringKey}
                            iconName={iconName}
                            setTab={setTab}
                            name={name}
                        />
                    ))
                }
            </FlexFrame>
        </View>
    );
};

const FooterTabButton = ({stringKey, name, iconName, isSelected, setTab}) => {
    const {theme} = useGlobalState();
    const onPress = () => setTab(name);
    return (
        <TouchableOpacity style={styles.footerButton} onPress={onPress}>
            <Icon name={iconName} isSelected={isSelected} length={20}/>
            <InterfaceText allowFontScaling={false} stringKey={stringKey} extraStyles={[styles.footerButtonText, theme.tertiaryText, isSelected ? theme.primaryText : undefined]} />
        </TouchableOpacity>
    );
};