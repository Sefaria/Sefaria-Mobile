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
      <Text style={[isHeb ? styles.SystemH2He : styles.ContentH2En, {textAlign: 'center', paddingTop: 10}, theme.text]}>{isHeb ? 'האפליקציה של ספריא עבור אנדרואיד ו-iOS' : 'Sefaria App for iOS and Android'}</Text>
      <Text style={[isHeb ? styles.SystemBodyHe : styles.ContentBodyEn, {fontStyle: isHeb ? 'normal' : 'italic', textAlign: 'center', paddingTop: 20}, theme.text]}>{isHeb ? "מוקדש " +
        "לכבודם של הנרי וג'וליה קושיצקי ע''י ילדיהם" : 'Dedicated in honor of Henry and Julia Koschitzky ' +
        'by their children'}</Text>
      <TouchableOpacity onPress={() => console.log("YO")}><Text selectable style={[isHeb ? styles.SystemBodyHe : styles.SystemBodyEn, justifyStyle, theme.text, {paddingTop: 40}]}>{isHeb ? "בהשראת הערכים של צדקה וחובה קהילתי, יהודי ולאפשר רווחה חברתית הנרי וג'וליה הקדישו את חייהם לחזק חינוך לקהילות בקנדה, ארה''ב, וישראל. ספריא מתכבדת להשיק את האפליקציות שלנו לכבודם."
        : 'Inspired by the values of tzedaka and communal obligation, Henry and Julia have devoted their lives to' +
        ' strengthening Jewish education and ensuring basic social welfare in Canada, the US, and Israel. It is' +
        ' a privilege to release these apps in their honor.'}</Text></TouchableOpacity>
      <Text style={[isHeb ? styles.SystemBodyHe : styles.SystemBodyEn, justifyStyle, theme.text, {paddingTop: 20}]}>{isHeb ? "האפליקציות מנגישות את העושר של הספרייה הדיגיטלית וחינמית שלנו " +
        "לכל העולם, עם ההקשה של אצבע אחת בלבד. האפליקציות משקפות " +
        "את אתר האינטרנט שלנו במלואו, גם מבחינת היופי וגם הפשטות שלו, ומכילות את אותם משאבים " +
        "טקסטואליים -- תנ''ך ותלמוד עם פירושים, מדרש, קבלה, הלכה, מוסר, מחשבת ישראל, ועוד."
        :'The apps makes the richness of Sefaria’s free, digital library and all of its' +
      ' resources available anywhere in the world with just the tap of a finger. The apps mirror Sefaria’s web platform' +
      ' in both beauty and simplicity, and contain all of the same textual resources – Tanakh and Talmud with' +
      ' commentaries, Midrash, Kabbalah, Halakha, Musar, philosophy, and more.'}</Text>
      <Text style={[isHeb ? styles.SystemBodyHe : styles.SystemBodyEn, justifyStyle, theme.text, {paddingTop: 20}]}>{isHeb ? "אנו אסירי תודה להנרי ולג'וליה לא רק עבור המנהיגות ודוגמא אישית שלהם, אלא גם לכל בני משפחת קושיצקי עבור הרעות המתמשכת ביננו. משפחת קושיצקי הייתה אחת התורמים הראשוניים שלנו, ומתכבדים לעבוד איתם שוב כדי להשיק את האפליקציות."
        : 'We are enormously grateful not only to Henry and Julia for their leadership and example, but to the entire Koschitzky family for their continued friendship. The family served as founding supporters of Sefaria, and Sefaria is honored to partner with them in releasing these apps.'}</Text>
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
              { Platform.OS === 'ios' ? strings.dedicatedIOS : strings.dedicatedAndroid }
            </Text>  
        </View>
      );
};
ShortDedication.propTypes = {
  openDedication: PropTypes.func.isRequired
};
