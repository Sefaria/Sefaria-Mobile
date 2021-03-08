import React from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
} from 'react-native';

import {
  CategoryColorLine,
  TwoBox,
  LanguageToggleButton,
  ContentTextWithFallback,
} from './Misc.js';
import styles from './Styles.js';
import strings from "./LocalizedStrings";
import {CloseButton, HebrewInEnglishText} from "./Misc";
import { Topic } from './Topic';
import { useGlobalState } from './Hooks';
var moment = require("moment");


const SheetMeta = ({ sheet, close, openTopic }) => {
  const { interfaceLanguage, menuLanguage, theme } = useGlobalState();
  const langStyle = interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt;
  const topics = Object.values(sheet.topics.reduce((obj, curr) => {
    obj[`${curr.slug}|${curr.asTyped}`] = curr;  
    return obj;
  }, {})) || [];
  const sheetTopics = topics.map((topic, i) => (
    <TouchableOpacity  style={[styles.textBlockLink,theme.textBlockLink]}  onPress={()=> openTopic(new Topic({slug:topic.slug}))} key={i}>
      <ContentTextWithFallback
        {...topic}
        extraStyles={[{marginBottom: -10}, theme.text]}
        lang={menuLanguage}
      />
    </TouchableOpacity>
  ));


  return (
    <View style={[styles.menu, theme.menu]}>
      <CategoryColorLine category="Sheets"/>
      <View style={[styles.header, theme.header]}>
        <CloseButton onPress={close} />
        <Text style={[langStyle, styles.textTocHeaderTitle, styles.textCenter, theme.text]}>
          {strings.tableOfContents}
        </Text>
        <LanguageToggleButton />
      </View>

      <ScrollView style={styles.menuContent} contentContainerStyle={{paddingTop: 20, paddingBottom: 40}}>
        <View style={[styles.textTocTopBox, theme.bordered]}>
          <View>
            <Text style={[styles.en, styles.textTocTitle, theme.text]}>
              <HebrewInEnglishText text={sheet.title} stylesHe={[styles.heInEn]} stylesEn={[]}/>
            </Text>
          </View>
          <View style={styles.textTocCategoryBox}>
            {interfaceLanguage == "hebrew" ?
              <Text style={[styles.he, styles.textTocCategory, theme.secondaryText]}>דף</Text> :
              <Text style={[styles.en, styles.textTocCategory, theme.secondaryText]}>Sheet</Text>
            }
          </View>
          <View style={{flexDirection: "row", flex: 1}}>
            <Image
              style={[styles.userAvatarMini]}
              source={{uri: sheet.ownerImageUrl}}
            />
            <Text style={[{alignSelf: "flex-start", color: "#999"}, styles.enInt]}>
              by {sheet.ownerName}
            </Text>
          </View>
          <View style={{flexDirection: "row", flex: 1}}>
            <Text style={[{alignSelf: "flex-end",color: "#999", margin: 5}, styles.enInt]}>
              {sheet.views} Views
            </Text>
            <Text style={[{alignSelf: "flex-end", color: "#999", margin: 5}, styles.enInt]}>
              Created {moment(sheet.dateCreated, "YYYY-MM-DDTHH:mm:ss.SSS").fromNow()}
            </Text>
          </View>
          <Text style={[{alignSelf: "flex-end", color: "#999"}, styles.en]}>
            {sheet.summary}
          </Text>
        </View>
        <TwoBox language={menuLanguage}>
          { sheetTopics }
        </TwoBox>
      </ScrollView>
    </View>
  );
}


export default SheetMeta;
