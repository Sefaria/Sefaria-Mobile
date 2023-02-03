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
import { SimpleHTMLView } from '../Misc';
import { GlobalStateContext, getTheme } from '../StateManager';
import styles from '../Styles.js';

const SearchSheetResult = ({
  text,
  title,
  heTitle,
  textType,
  onPress,
  ownerImageUrl,
  ownerName,
  tags,
  views,
}) => {
  const { interfaceLanguage, themeStr } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const refTitleStyle = interfaceLanguage === "hebrew" ? styles.he : styles.en;
  text = textType == "hebrew" ? text.replace(/(\r\n|\n|\r)/gm, "").substring(0, 124)+"..." : text.replace(/(\r\n|\n|\r)/gm, "").substring(0, 124)+"...";

  return (
    <TouchableOpacity
      style={[styles.searchTextResult, theme.searchTextResult]}
      onPress={onPress}
      delayPressIn={200}
    >
      <View>
        <View>
          <Text style={[refTitleStyle, styles.textListCitation, theme.text]}>{title.replace(/\s\s+/g, ' ')}</Text>
        </View>
        {text ?
          (<SimpleHTMLView
            text={text}
            lang={textType}
            extraStyles={[theme.searchResultSummaryText]}
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
