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
import { GlobalStateContext, getTheme } from './StateManager';

import styles from './Styles.js';
import { SimpleHTMLView } from './Misc';

const SheetResult = ({
  text,
  title,
  heTitle,
  textType,
  onPress,
  ownerImageUrl,
  ownerName,
  views,
}) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  text = textType == "hebrew" ? text.replace(/(\r\n|\n|\r)/gm, "").substring(0, 124)+"..." : text.replace(/(\r\n|\n|\r)/gm, "").substring(0, 124)+"..."
  return (
    <TouchableOpacity
      style={[styles.textBlockLink, theme.textBlockLink, {margin:0, borderBottomWidth: 1, borderBottomColor: "#ccc", paddingTop: 13}]}
      onPress={onPress}
      delayPressIn={200}
    >

    <View style={{ flexDirection: (interfaceLanguage == "hebrew" ? "row-reverse" : "row"),flex:1}}>

      <Image
          style={styles.userAvatar}
          source={{uri: ownerImageUrl}}
      />
    <View style={{ flexDirection: "column",flex:1, marginRight: interfaceLanguage == "hebrew" ? 20 : 10, marginLeft: interfaceLanguage == "hebrew" ? 10 : 20}}>
        <View style={{flexDirection: (interfaceLanguage == "hebrew" ? "row-reverse" : "row"), flex: 0, justifyContent: "space-between"}}>
           <Text style={[styles.enInt, {alignSelf: "flex-start", color:"#666"}]}>{ownerName}</Text>
           <View style={{flexDirection: (interfaceLanguage == "hebrew" ? "row-reverse" : "row"), alignSelf: "flex-end"}}>
              <Text style={[{color:"#999"}, styles.enInt]}>{views}</Text>
              <Image style={{marginTop: 5, marginLeft: 0, width:15, height: 10}} source={interfaceLanguage == "hebrew" ? require('./img/eye-r.png') : require('./img/eye.png')}/>
           </View>
         </View>
        <View>
          <Text style={[styles.sheetListTitle, {textAlign: interfaceLanguage == "hebrew" ? "right" : "left"}]}>{title.replace(/\s\s+/g, ' ')}</Text>
        </View>

        { text ?
        <SimpleHTMLView
          text={text}
          lang={textType}
        /> : null }

      </View>
    </View>


    </TouchableOpacity>



  );
}
SheetResult.propTypes = {
  text:     PropTypes.string,
  title:    PropTypes.string,
  heTitle:  PropTypes.string,
  textType: PropTypes.oneOf(["english","hebrew"]),
  onPress:  PropTypes.func.isRequired
};

export default SheetResult;
