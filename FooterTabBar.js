'use strict';

import React  from 'react';
import {
  View,
  Text,
  Image,
} from 'react-native';
import { TabMetadata } from './PageHistory';
import { iconData } from "./IconData";
import styles from './Styles';
import {useGlobalState} from "./Hooks";


export const FooterTabBar = ({ selectedTabName }) => {
    const { theme } = useGlobalState();
    return (
      <View style={[styles.footerBar, theme.mainTextPanel, theme.lightGreyBorder ]}>
        {
          TabMetadata.namesWithIcons().map(([name, iconName]) => {
              return (
                <FooterTabButton key={name} isSelected={name===selectedTabName} text={name} iconName={iconName} />
              );
          })
        }
      </View>
    );
};

const FooterTabButton = ({text, iconName, isSelected}) => {
    const { themeStr, theme } = useGlobalState();
    return (
      <View style={styles.footerButton}>
        <Image source={iconData.get(iconName, themeStr, isSelected)} resizeMode={'contain'}/>
        <Text style={[styles.footerButtonText, theme.tertiaryText, isSelected ? theme.primaryText : undefined]}>{text}</Text>
      </View>
    );
};