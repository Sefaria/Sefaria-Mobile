import React, {useContext} from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
  StyleSheet, Platform, TouchableOpacity,
} from 'react-native';

import {
  LoadingView,
} from './Misc.js';
import { GlobalStateContext, getTheme } from './StateManager';
import strings from './LocalizedStrings';
import styles from './Styles';
import { RainbowBar, CircleCloseButton } from './Misc'
import {useGlobalState} from "./Hooks";

export const Dedication = function(props) {
  const { interfaceLanguage, theme } = useGlobalState();
  const isHeb = interfaceLanguage === 'hebrew';
  const flexDirection = isHeb ? 'row-reverse' : 'row';
  const justifyStyle = {textAlign: (Platform.OS === 'ios') ? 'justify' : isHeb ? 'right' : 'left', writingDirection: isHeb ? "rtl" : "ltr"};

  return <View style={[{alignSelf: "stretch", flex: 1}, theme.mainTextPanel]}>
    <RainbowBar/>
    <ScrollView contentContainerStyle={{paddingHorizontal: 50, textAlign: 'center'}}>
      <View style={{marginHorizontal: -50, flexDirection: 'row-reverse'}}>
        <CircleCloseButton onPress={props.close}/>
      </View>
      <Text style={[isHeb ? styles.SystemH2He : styles.ContentH2En, {textAlign: 'center', paddingTop: 10}, theme.text]}>{strings.about.app_for_ios_and_android}</Text>
      <Text style={[isHeb ? styles.SystemBodyHe : styles.ContentBodyEn, {fontStyle: isHeb ? 'normal' : 'italic', textAlign: 'center', paddingTop: 20}, theme.text]}>{strings.about.dedication_honor}</Text>
      <TouchableOpacity onPress={() => console.log("YO")}><Text selectable style={[isHeb ? styles.SystemBodyHe : styles.SystemBodyEn, justifyStyle, theme.text, {paddingTop: 40}]}>{strings.about.dedication_inspired}</Text></TouchableOpacity>
      <Text style={[isHeb ? styles.SystemBodyHe : styles.SystemBodyEn, justifyStyle, theme.text, {paddingTop: 20}]}>{strings.about.dedication_apps}</Text>
      <Text style={[isHeb ? styles.SystemBodyHe : styles.SystemBodyEn, justifyStyle, theme.text, {paddingTop: 20}]}>{strings.about.dedication_grateful}</Text>
      <Text style={[styles.ContentBodyHe, theme.text, {paddingTop: 40, textAlign: 'center'}]}>יגיע כפיך כי תאכל אשריך וטוב לך</Text>
      <Text style={[styles.ContentBodyHe, theme.text, {textAlign: 'center', paddingBottom: 50}]}>(תהילים קכ"ח)</Text>
    </ScrollView>
  </View>
};

Dedication.propTypes = {
  close: PropTypes.func.isRequired
};

export const ShortDedication = ({openDedication}) => {
  const { theme, interfaceLanguage } = useGlobalState();
  return(
        <View style={[styles.navReDedicationBox, theme.lightestGreyBackground]}>
            <Text style={[styles.dedication, (interfaceLanguage === "hebrew") ? styles.hebrewSystemFont : null, theme.secondaryText]} 
                  onPress={openDedication}>
              { Platform.OS === 'ios' ? strings.about.dedicated_ios : strings.about.dedicated_android }
            </Text>  
        </View>
      );
};
ShortDedication.propTypes = {
  openDedication: PropTypes.func.isRequired
};
