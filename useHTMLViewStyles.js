import { useContext, useCallback } from 'react';
import { GlobalStateContext, getTheme } from './StateManager';
import { CSS_CLASS_STYLES } from './Misc';
import styles from './Styles.js';

export function useHTMLViewStyles(bilingual, textType) {
    const { themeStr, fontSize, biLayout } = useContext(GlobalStateContext);
    const theme = getTheme(themeStr);
    const isStacked = biLayout === 'stacked';

    const getHTMLViewStyles = useCallback((bilingual, textType) => {
      const isHeb = textType == "hebrew";
      const lineHeightMultiplier = isHeb ? (Platform.OS === 'android' ? 1.333 : 1.2) : 1.15;
      const fontSizeMultiplier = isHeb ? 1 : 0.8;
      const justifyStyle = {textAlign: (isStacked && Platform.OS === 'ios') ? 'justify' : (textType === 'hebrew' ? 'right' : 'left')};
      const lineHeight = fontSize * lineHeightMultiplier;
      const fontSizeScaled = fontSize * fontSizeMultiplier;
      const textStyle = [
        isHeb ? styles.hebrewText : styles.englishText,
        theme.text,
        justifyStyle,
        {
          lineHeight,
          fontSize: fontSizeScaled,
        },
      ];
      if (bilingual && textType == "english") {
        if (isStacked) {
          textStyle.push(styles.bilingualEnglishText);
        }
        textStyle.push(theme.bilingualEnglishText);
      }
      const classStyles = {
        small: {
          fontSize: fontSize * 0.8 * (textType === "hebrew" ? 1 : 0.8)
        },
        hebrew: {
          ...CSS_CLASS_STYLES.hebrew,
          ...justifyStyle,
        },
        english: {
          ...CSS_CLASS_STYLES.english,
          ...justifyStyle,
        }
      };
    
      return {
        classStyles,
        textStyle: {style: textStyle},
      }
    }, [isStacked, bilingual, textType, fontSize, theme]);
    return getHTMLViewStyles(bilingual, textType);
  };