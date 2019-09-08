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
import { GlobalStateContext } from './StateManager';
import HTMLView from 'react-native-htmlview'; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)

import styles from './Styles.js';

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
  const { theme, defaultTextLanguage, interfaceLanguage } = useContext(GlobalStateContext);
  const refTitleStyle = defaultTextLanguage === "hebrew" ? styles.he : styles.en;
  const refTitle = defaultTextLanguage === "hebrew" ? heTitle : title;
  return (


    <TouchableOpacity style={[styles.textBlockLink, theme.textBlockLink, {margin:0, borderBottomWidth: 1, borderBottomColor: "#ccc", paddingTop: 13}]}
                      onPress={onPress} >

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

        {text ?
        <HTMLView
          value= {textType == "hebrew" ? "<hediv>"+text.replace(/(\r\n|\n|\r)/gm, "").substring(0, 124)+"...</hediv>" : "<endiv>"+text.replace(/(\r\n|\n|\r)/gm, "").substring(0, 124)+"...</endiv>"}
          stylesheet={styles}
          textComponentProps={{style: [textType == "hebrew" ? styles.hebrewText : styles.englishText, theme.text]}}
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
