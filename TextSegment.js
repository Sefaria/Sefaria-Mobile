'use strict';

import PropTypes from 'prop-types';

import React, { useState, useEffect, useContext, Fragment } from 'react';
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import HTML from 'react-native-render-html';
import { SelectableText } from "@astrocoders/react-native-selectable-text";
import { GlobalStateContext, getTheme } from './StateManager';
import styles from './Styles.js';
import iPad from './isIPad';

const TextSegment = React.memo(({
  rowRef,
  segmentKey,
  data,
  textType,
  bilingual,
  textSegmentPressed,
  onLongPress,
  fontScale,
}) => {
  const [resetKey, setResetKey] = useState(0);
  const { themeStr, fontSize, biLayout } = useContext(GlobalStateContext);
  useEffect(() => {
    setResetKey(resetKey+1);  // hacky fix to reset htmlview when theme colors change
    return () => {};
  }, [themeStr, fontSize]);
  const theme = getTheme(themeStr);
  const onPress = () => {
    let key = segmentKey;
    let section = parseInt(key.split(":")[0]);
    let segment = parseInt(key.split(":")[1]);
    textSegmentPressed(section, segment, rowRef, true);
  };

  const isStacked = biLayout === 'stacked';
  const lineHeightMultiplierHe = Platform.OS === 'android' ? 1.3 : 1.2;
  const justifyStyle = {textAlign: (isStacked && Platform.OS === 'ios') ? 'justify' : (textType === 'hebrew' ? 'right' : 'left')};
  const style = textType == "hebrew" ?
                [styles.hebrewText, theme.text, styles.hediv, justifyStyle, {lineHeight: Animated.multiply(fontSize * lineHeightMultiplierHe, fontScale), fontSize: Animated.multiply(fontSize, fontScale)}] :
                [styles.englishText, theme.text, styles.endiv, justifyStyle, {fontSize: Animated.multiply(0.8*fontSize, fontScale), lineHeight: Animated.multiply(fontSize * 1.04, fontScale) }];
  if (bilingual && textType == "english") {
    if (isStacked) {
      style.push(styles.bilingualEnglishText);
    }
    style.push(theme.bilingualEnglishText);
  }
  const smallSheet = {
    small: {
      fontSize: fontSize * 0.8 * (textType === "hebrew" ? 1 : 0.8)
    },
    hediv: {
      ...styles.hediv,
      ...justifyStyle,
    },
    endiv: {
      ...styles.endiv,
      ...justifyStyle,
    }
  };
  const htmlStyles = {
    strong: {
      fontWeight: "bold"
    },
    small: {
      fontSize: 14
    },
    b: {
      fontWeight: "bold"
    },
    i: {
      fontStyle: "italic"
    },
    gemarraregular: {
      fontWeight: "500",

    },
    gemarraitalic: {
      fontStyle: "italic",
      fontWeight: "500",
    },
    a: {
      fontWeight: "300",
    },
    hediv: {
      fontFamily: "Taamey Frank Taamim Fix",
      writingDirection: "rtl",
      flex: -1,
      paddingTop: 15,
      marginTop: -10,
      textAlign: Platform.OS == "android" ? "right" : "justify",
    },
    endiv: {
      fontFamily: "Amiri",
      fontWeight: "normal",
      textAlign: 'justify',
      paddingTop: 15,
      marginTop: -10,
    },
  }
  return (
    <TouchableOpacity
      hitSlop= {{top: 10, bottom: 10, left: 10, right: 10}}
      onPress={onPress}
      onLongPress={() => { console.log("LOOOONG")}}
      delayLongPress={200}
      delayPressIn={200}
      style={{flex: textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
    >
      <SelectableText
        menuItems={['Copy', 'Share', 'Lookup']}
        onSelection={({ eventType, content, selectionStart, selectionEnd }) => { console.log("SELECT", content)}}
        value={data}
        textValueProp={'html'}
        TextComponent={HTML}
        textComponentProps={{
          customWrapper: children => <Animated.Text style={style}>{children}</Animated.Text>,
        }}
      />
    </TouchableOpacity>
  );
});
TextSegment.whyDidYouRender = true;
TextSegment.propTypes = {
  rowRef:             PropTypes.string.isRequired, /* this ref keys into TextColumn.rowRefs */
  segmentKey:         PropTypes.string,
  data:               PropTypes.string,
  textType:           PropTypes.oneOf(["english","hebrew"]),
  bilingual:          PropTypes.bool,
  textSegmentPressed: PropTypes.func.isRequired,
  onLongPress:        PropTypes.func.isRequired,
  fontScale:          PropTypes.object,
};


export default TextSegment;
