'use strict';

import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  Image,
  FlatList,
} from 'react-native';
import { TabHistory, TabMetadata } from './PageHistory';
import { iconData } from "./IconData";
import {useGlobalState} from "./Hooks";


export const FooterTabBar = ({}) => {
  return (
      <View style={{flexDirection: "row", justifyContent: "space-between", marginHorizontal: 5}}>
        {
          TabMetadata.namesWithIcons().map(([name, iconName]) => {
            return (
                <FooterTabButton key={name} text={name} iconName={iconName} />
            );
          })
        }
      </View>
  );
};

const FooterTabButton = ({text, iconName}) => {
    const { themeStr } = useGlobalState();
    return (
      <View style={{flex: 1, marginHorizontal: 17, marginVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "column"}}>
        <Image source={iconData.get(iconName, themeStr)} resizeMode={'contain'}/>
        <Text style={{ fontSize: 8, fontFamily: "OpenSans", fontWeight: "normal", fontStyle: "normal" }}>{text}</Text>
      </View>
    );
};