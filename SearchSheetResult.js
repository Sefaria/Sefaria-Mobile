'use strict';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
import HTMLView from 'react-native-htmlview'; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)
import { GlobalStateContext } from './StateManager';
import styles from './Styles.js';

const SearchSheetResult = ({ text, title, heTitle, textType, onPress }) => {
  const { interfaceLanguage, theme } = useContext(GlobalStateContext);
  const refTitleStyle = interfaceLanguage === "hebrew" ? styles.he : styles.en;

  return (
    <TouchableOpacity
      style={[styles.searchTextResult, theme.searchTextResult]}
      onPress={onPress}
    >
      <View style={searchSheetResult}>
        <View>
          <Text style={[refTitleStyle, styles.textListCitation, theme.text]}>{title.replace(/\s\s+/g, ' ')}</Text>
        </View>
        {text ?
          (<HTMLView
            value= {textType == "hebrew" ? "<hediv>"+text.replace(/(\r\n|\n|\r)/gm, "").substring(0, 124)+"...</hediv>" : "<endiv>"+text.replace(/(\r\n|\n|\r)/gm, "").substring(0, 124)+"...</endiv>"}
            stylesheet={styles}
            textComponentProps={{style: [textType == "hebrew" ? styles.hebrewText : styles.englishText, theme.searchResultSummaryText]}}
          />) : null
        }


        <View style={{ flexDirection: (interfaceLanguage == "hebrew" ? "row-reverse" : "row"), flex:1, marginTop: 10}}>
          <Image
              style={styles.userAvatar}
              source={{uri: ownerImageUrl}}
          />
          <View style={{flexDirection: "column", flex: 1, justifyContent: "space-between", marginHorizontal: 10}}>
             <Text style={[styles.enInt, {alignSelf: "flex-start", color:"#666"}]}>{ownerName}</Text>
             <Text style={[{color:"#999"}, styles.enInt]}>{views} Views {tags.length > 0 ? "· " + tags.join(", ") : null}</Text>
           </View>
         </View>
       </View>
    </TouchableOpacity>
  );
}
SearchSheetResult.propTypes = {
  text:     PropTypes.string,
  title:    PropTypes.string,
  heTitle:  PropTypes.string,
  textType: PropTypes.oneOf(["english","hebrew"]),
  onPress:  PropTypes.func.isRequired
};

export default SearchSheetResult;
