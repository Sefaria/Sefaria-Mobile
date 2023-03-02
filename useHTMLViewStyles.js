import { useContext, useCallback } from 'react';
import { GlobalStateContext, getTheme } from './StateManager';
import { CSS_CLASS_STYLES } from './Misc';
import styles from './Styles.js';

export function useHTMLViewStyles(bilingual, textType) {
    const { themeStr, fontSize, biLayout } = useContext(GlobalStateContext);
    const theme = getTheme(themeStr);
    const isStacked = biLayout === 'stacked';

    const getHTMLViewStyles = useCallback((bilingual, textType) => {
      const isHeb = textType === "hebrew";
      const lineHeightMultiplier = isHeb ? (Platform.OS === 'android' ? 1.333 : 1.25) : 1.15;
      const fontSizeMultiplier = isHeb ? 1 : 0.8;
      const justifyStyle = {textAlign: (isStacked && Platform.OS === 'ios') ? 'justify' : (isHeb ? 'right' : 'left'), writingDirection: isHeb ? "rtl" : "ltr"};
      const lineHeight = fontSize * lineHeightMultiplier;
      const fontSizeScaled = fontSize * fontSizeMultiplier;
      const textStyle = [
        theme.text,
        justifyStyle,
        {
          lineHeight,
        },
      ];
      if (bilingual && textType == "english") {
        if (isStacked) {
          textStyle.push(styles.bilingualEnglishText);
        }
        textStyle.push(theme.bilingualEnglishText);
      }
      const tagsStyles = {
        small: {
          fontSize: fontSize * 0.8 * (textType === "hebrew" ? 1 : 0.8)
        },
        big: {
          fontSize,  // disabling big tags for now because they cause line to get cutoff
        },
        sup : {
          fontSize: fontSize * 0.6 * (textType === "hebrew" ? 1 : 0.8)
        },
        sub : {
          fontSize: fontSize * 0.6 * (textType === "hebrew" ? 1 : 0.8)
        }
      };

      // fontSize used to be in textStyle but apparently that overrides styles in tagsStyles so small tags wouldn't render with smaller fontSize
      const classesStyles = {
        hebrew: {
          ...CSS_CLASS_STYLES.hebrew,
          fontSize: fontSizeScaled,
        },
        english: {
          ...CSS_CLASS_STYLES.english,
          fontSize: fontSizeScaled,
        }
      }
    
      return {
        classesStyles,
        tagsStyles,
        textStyle: {style: textStyle},
      }
    }, [isStacked, bilingual, textType, fontSize, theme]);
    return getHTMLViewStyles(bilingual, textType);
  };