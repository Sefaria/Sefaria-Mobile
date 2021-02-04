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
} from './Misc.js';
import styles from './Styles.js';
import strings from "./LocalizedStrings";
import {CloseButton, HebrewInEnglishText} from "./Misc";
import { Topic } from './Topic.js';
var moment = require("moment");


class SheetMeta extends React.Component {
  static propTypes = {};
  
  render() {
    const { interfaceLanguage, textLanguage, theme } = this.props;
    const langStyle = interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt;
    var showHebrew = false;
    const topics = this.props.sheet.topics || [];
    const sheetTopics = topics.map((topic, i) => (
      <TouchableOpacity  style={[styles.textBlockLink,theme.textBlockLink]}  onPress={()=> this.props.openTopic(new Topic({slug:topic.slug}))} key={i}>
        { showHebrew ?
          <Text style={[styles.hebrewText, styles.centerText, theme.text]}>{topic.he}</Text> :
          <Text style={[styles.englishText, styles.centerText, theme.text]}>{topic.en}</Text>
        }
      </TouchableOpacity>
    ));


    return (
      <View style={[styles.menu, theme.menu]}>
        <CategoryColorLine category="Sheets"/>
        <View style={[styles.header, theme.header]}>
          <CloseButton onPress={this.props.close} />
          <Text style={[langStyle, styles.textTocHeaderTitle, styles.textCenter, theme.text]}>
            {strings.tableOfContents}
          </Text>
          <LanguageToggleButton />
        </View>

        <ScrollView style={styles.menuContent} contentContainerStyle={{paddingTop: 20, paddingBottom: 40}}>
          <View style={[styles.textTocTopBox, theme.bordered]}>
            <View>
              <Text style={[styles.en, styles.textTocTitle, theme.text]}>
                <HebrewInEnglishText text={this.props.sheet.title} stylesHe={[styles.heInEn]} stylesEn={[]}/>
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
                source={{uri: this.props.sheet.ownerImageUrl}}
              />
              <Text style={[{alignSelf: "flex-start", color: "#999"}, styles.enInt]}>
                by {this.props.sheet.ownerName}
              </Text>
            </View>
            <View style={{flexDirection: "row", flex: 1}}>
              <Text style={[{alignSelf: "flex-end",color: "#999", margin: 5}, styles.enInt]}>
                {this.props.sheet.views} Views
              </Text>
              <Text style={[{alignSelf: "flex-end", color: "#999", margin: 5}, styles.enInt]}>
                Created {moment(this.props.sheet.dateCreated, "YYYY-MM-DDTHH:mm:ss.SSS").fromNow()}
              </Text>
            </View>
            <Text style={[{alignSelf: "flex-end", color: "#999"}, styles.en]}>
              {this.props.sheet.summary}
            </Text>
          </View>
          <TwoBox language={textLanguage}>
            { sheetTopics }
          </TwoBox>
        </ScrollView>
      </View>
    );
  }
}


export default SheetMeta;
