import React, {useContext} from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
  StyleSheet
} from 'react-native';

import {
  LoadingView,
} from './Misc.js';
import { GlobalStateContext, getTheme } from './StateManager';
import HTMLView from 'react-native-htmlview';
import strings from './LocalizedStrings';
import styles from './Styles';
import { RainbowBar, CircleCloseButton } from './Misc'

const dStyles = StyleSheet.create({
  welcome: {
    fontSize: 40,
    textAlign: 'center',
    margin: 10
  },
  dedication: {
    fontStyle: "italic",
    // fontFamily: "Amiri",
    fontSize: 24,
    textAlign: "center",
    marginBottom: 20
  },
  simple: {
    textAlign: 'center',
    fontSize: 18,
    margin: 10
  },
  quote: {
    textAlign: 'center',
    fontSize: 32,
    margin: 10,
    flexDirection: 'row-reverse'
  }
});


const Dedication = function(props) {
  const { interfaceLanguage } = useContext(GlobalStateContext);
  const isHeb = interfaceLanguage === 'hebrew';
  const flexDirection = isHeb ? 'row-reverse' : 'row';
  return <View>
    <RainbowBar/>
    <View>
      <CircleCloseButton onPress={props.close}/>
    </View>
    <ScrollView>
      <Text style={[dStyles.welcome, {flexDirection: flexDirection}]}>{isHeb ? 'האפליקציה של ספריא עבור אנדרואיד ו-iOS' : 'Sefaria App for iOS and Android'}</Text>
      <Text style={[dStyles.dedication, {flexDirection: flexDirection}]}>{isHeb ? "מוקדש " +
        "לכבודם של הנרי וג'וליה קושיצקי ע''י ילדיהם" : 'Dedicated in honor of Henry and Julia Koschitzky ' +
        'by their children'}</Text>
      <Text style={[dStyles.simple, {flexDirection: flexDirection}]}>{isHeb ? "בהשראת הערכים של צדקה וחובה קהילתי," +
        "יהודי ולאפשר רווחה חברתית הנרי וג'וליה הקדישו את חייהם לחזק חינוך" +
        " לקהילות בקנדה, ארה''ב, וישראל. ספריא מתכבדת להשיק את האפליקציות שלנו לכבודם."
        : 'Inspired by the values of tzedaka and communal obligation, Henry and Julia have devoted their lives to' +
        ' strengthening Jewish education and ensuring basic social welfare in Canada, the US, and Israel. It is' +
        ' a privilege to release these apps in their honor.'}</Text>
      <Text style={[dStyles.simple, {flexDirection: flexDirection}]}>{isHeb ? "האפליקציות מנגישות את העושר של הספרייה הדיגיטלית וחינמית שלנו " +
        "לכל העולם, עם ההקשה של אצבע אחת בלבד. האפליקציות משקפות " +
        "את אתר האינטרנט שלנו במלואו, גם מבחינת היופי וגם הפשטות שלו, ומכילות את אותם משאבים " +
        "טקסטואליים -- תנ''ך ותלמוד עם פירושים, מדרש, קבלה, הלכה, מוסר, מחשבת ישראל, ועוד."
        :'The apps makes the richness of Sefaria’s free, digital library and all of its' +
      ' resources available anywhere in the world with just the tap of a finger. The apps mirror Sefaria’s web platform' +
      ' in both beauty and simplicity, and contain all of the same textual resources – Tanakh and Talmud with' +
      ' commentaries, Midrash, Kabbalah, Halakha, Musar, philosophy, and more.'}</Text>
      <Text style={[dStyles.simple, {flexDirection: flexDirection}]}>{isHeb ? "אנו אסירי תודה להנרי ולג'וליה לא רק עבור המנהיגות ודוגמא אישית שלהם, אלא גם לכל בני משפחת קושיצקי עבור הרעות המתמשכת ביננו. משפחת קושיצקי הייתה אחת התורמים הראשוניים שלנו, ומתכבדים לעבוד איתם שוב כדי להשיק את האפליקציות."
        : 'We are enormously grateful not only to Henry and Julia for their leadership and example, but to the entire Koschitzky family for their continued friendship. The family served as founding supporters of Sefaria, and Sefaria is honored to partner with them in releasing these apps.'}</Text>
      <Text style={dStyles.quote}>יגיע כפיך כי תאכל אשריך וטוב לך</Text>
      <Text style={dStyles.quote}>(תהילים קכ"ח)</Text>
    </ScrollView>
  </View>
};

Dedication.propTypes = {
  close: PropTypes.func.isRequired
};

export default Dedication;
