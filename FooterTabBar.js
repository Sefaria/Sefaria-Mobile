'use strict';

import React  from 'react';
import {
    View,
    Text,
    Image, TouchableOpacity,
} from 'react-native';
import { TabMetadata } from './PageHistory';
import { iconData } from "./IconData";
import styles from './Styles';
import {useGlobalState} from "./Hooks";


export const FooterTabBar = ({ selectedTabName, setTab }) => {
    const { theme } = useGlobalState();
    return (
      <View style={[styles.footerBar, theme.mainTextPanel, theme.lightGreyBorder ]}>
        {
          TabMetadata.namesWithIcons().map(({name, icon:iconName}) => (
            <FooterTabButton
                key={name}
                isSelected={name===selectedTabName}
                text={name}
                iconName={iconName}
                setTab={setTab}
            />
          ))
        }
      </View>
    );
};

const FooterTabButton = ({text, iconName, isSelected, setTab}) => {
    const { themeStr, theme } = useGlobalState();
    const onPress = () => setTab(text);
    return (
      <TouchableOpacity style={styles.footerButton} onPress={onPress}>
        <Image source={iconData.get(iconName, themeStr, isSelected)} resizeMode={'contain'}/>
        <Text style={[styles.footerButtonText, theme.tertiaryText, isSelected ? theme.primaryText : undefined]}>{text}</Text>
      </TouchableOpacity>
    );
};