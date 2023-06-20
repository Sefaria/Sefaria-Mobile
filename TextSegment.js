'use strict';

import PropTypes from 'prop-types';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Platform,
  Share,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import ActionSheet from 'react-native-action-sheet';
import { RenderHTML } from 'react-native-render-html';
import Clipboard from "@react-native-clipboard/clipboard";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import strings from './LocalizedStrings';
import { SYSTEM_FONTS } from './Misc';
import { useHTMLViewStyles } from './useHTMLViewStyles';
import { useGlobalState, useRenderersProps } from './Hooks';
import { getTheme } from './StateManager';

const useSource = (data) => {
  const [ source, setSource ] = useState({html: data});
  useEffect(() => {
    setSource({html: data});
    return () => {};
  }, [data]);
  return source;
};

// pass correct functions to TextSegment for sheet renderers. probably combine renderers and make it simpler
const TextSegment = React.memo(({
  segmentRef,
  segmentKey,
  data,
  textType,
  bilingual,
  setDictionaryLookup,
  showToast,
  handleOpenURL,
  onTextPress,
  shareCurrentSegment,
  getDisplayedText,
  setHighlightedWord,
  highlightedWordID,
}) => {
  const source = useSource(data);
  const renderersProps = useRenderersProps(handleOpenURL);
  const { width } = useWindowDimensions();
  const { textStyle, classesStyles, tagsStyles } = useHTMLViewStyles(bilingual, textType);
  const getTextWithUrl = useCallback((text, withUrl) => {
    return withUrl ? `${text}\n\n${Sefaria.refToFullUrl(segmentRef)}` : text;
  }, [segmentRef]);
  const shareText = useCallback((text) => {
    Share.share({
      message: getTextWithUrl(text, Platform.OS === 'android'),  // android for some reason doesn't share text with a url attached at the bottom
      title: segmentRef,
      url: Sefaria.refToFullUrl(segmentRef)
    })
  }, [segmentRef]);
  const copyToClipboard = useCallback((text) => {
    Clipboard.setString(text);
    showToast("Copied to clipboard");
  }, []);
  let menuItems = ['Copy', 'Define', 'Share'];
  if (textType === 'english') {
    menuItems.splice(1, 1);
  }

  const onLongPress = useCallback(() => {
    if (Platform.OS === 'ios') { return; /* no actionsheet for ios, this is handled by text selection */ }
    ActionSheet.showActionSheetWithOptions({
      options: [
        strings.copy,
        strings.share,
        strings.cancel,
      ],
      cancelButtonIndex: 2,
    },
    (buttonIndex) => {
      const section = parseInt(segmentKey.split(":")[0]);
      const segment = parseInt(segmentKey.split(":")[1]);
      if (buttonIndex === 0) { copyToClipboard(getDisplayedText(true, section, segment, segmentRef)); }
      else if (buttonIndex === 1) { shareCurrentSegment(section, segment, segmentRef); }
    })
  }, [segmentRef]);
  const onPress = useCallback((e, onlyOpen) => {
    onTextPress(onlyOpen);
  }, [onTextPress]);

  return (
    <TouchableOpacity
      onPress={onPress}
      delayPressIn={200}
    >
      <RenderHTML
        source={source}
        contentWidth={width}
        defaultTextProps={textStyle}
        classesStyles={classesStyles}
        tagsStyles={tagsStyles}
        systemFonts={SYSTEM_FONTS}
        renderersProps={renderersProps}
        dangerouslyDisableWhitespaceCollapsing
        renderers={{span: ({ TDefaultRenderer, ...props }) => {
          if (props.tnode.classes.indexOf('clickableWord') > -1) {
            return (
              <ClickableWord
                onPress={onPress}
                setDictionaryLookup={setDictionaryLookup}
                setHighlightedWord={setHighlightedWord}
                highlightedWordID={highlightedWordID}
                segmentRef={segmentRef}
                TDefaultRenderer={TDefaultRenderer}
                { ...props }
              />
            );
          }
          return (
            <TDefaultRenderer {...props} />
          );
        }}}
      />
    </TouchableOpacity>
  );
});
TextSegment.whyDidYouRender = {customName: 'TextSegment'};
TextSegment.propTypes = {
  segmentRef:         PropTypes.string.isRequired, /* this ref keys into TextColumn.rowRefs */
  segmentKey:         PropTypes.string,
  data:               PropTypes.string,
  textType:           PropTypes.oneOf(["english","hebrew"]),
  bilingual:          PropTypes.bool,
  onTextPress:        PropTypes.func.isRequired,
  showToast:          PropTypes.func.isRequired,
};

const ClickableWord = ({ onPress, setDictionaryLookup, setHighlightedWord, highlightedWordID, segmentRef, TDefaultRenderer, ...props }) => {
  const { themeStr } = useGlobalState();
  const theme = getTheme(themeStr);
  const word = props.tnode.init.textNode.data;
  const wordID = `${props.tnode.__nodeIndex}|${word}`;  // not guaranteed to be unique but hopefully good enough. these components are recycled by flatlist (i believe) so can't use a random number here
  const isHighlighted = wordID === highlightedWordID;
  const onLongPress = useCallback(() => {
    onPress(null, true);  // open resources
    ReactNativeHapticFeedback.trigger("impactMedium");
    setHighlightedWord(wordID, segmentRef);
    setDictionaryLookup({ dictLookup: word });
  }, [segmentRef]);  // not sure if I need wordID here also. Doesn't seem so.
  return (
    <Text onPress={onPress} style={isHighlighted ? theme.wordHighlight : null} onLongPress={onLongPress}>
      <TDefaultRenderer {...props} />
    </Text>
  );
};

export default TextSegment;
