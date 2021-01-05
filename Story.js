'use strict';

import React, { useContext }  from 'react';
import PropTypes  from 'prop-types';
import {
  View,
} from 'react-native';

import {
    SaveButton,
    SimpleInterfaceBlock,
    SimpleContentBlock,
    SimpleLinkedBlock,
    ProfileListing,
} from './Misc';
import styles from './Styles';
import { GlobalStateContext, getTheme } from './StateManager';

const sheetPropType = PropTypes.shape({
            publisher_id: PropTypes.number,
            publisher_name: PropTypes.string,
            publisher_url:  PropTypes.string,
            publisher_image:PropTypes.string,
            publisher_position: PropTypes.string,
            publisher_organization: PropTypes.string,
            publisher_followed: PropTypes.bool,
            sheet_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
            sheet_title: PropTypes.string,
            sheet_summary: PropTypes.string,
      });
const textPropType = PropTypes.shape({
          "ref": PropTypes.string.isRequired,
          "heRef": PropTypes.string.isRequired,
          "en": PropTypes.string.isRequired,
          "he": PropTypes.string.isRequired,
      });
const bilingualPropType = PropTypes.shape({
          en: PropTypes.string.isRequired,
          he: PropTypes.string.isRequired,
      });

 /****************************
*                             *
*           Pieces            *
*                             *
 *****************************/

// todo: if we don't want the monopoly card effect, this component isn't needed.    // style={{"borderColor": cardColor || "#18345D"}}>
const StoryFrame = ({extraStyles, children}) => (
     <View style={extraStyles}>
        {children}
     </View>
);
StoryFrame.propTypes = {
    cls:        PropTypes.string,   // Story type as class name
    cardColor:  PropTypes.string
};


const StoryTitleBlock = ({ he, en, children, onClick }) => {
  const { themeStr } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const SBlock = onClick ? SimpleLinkedBlock : SimpleInterfaceBlock;
  return (
    <View>
      <SBlock he={he} en={en} extraStyles={[styles.pageTitle, styles.topicSourceTitle]} onClick={onClick} />
      {children}
    </View>
  );
};


const ColorBarBox = ({tref, children}) =>  {
  const { interfaceLanguage } = useContext(GlobalStateContext);
  const langStyle = interfaceLanguage == 'hebrew' ? styles.colorBarBoxHebrew : styles.colorBarBoxEnglish;
  return (<View style={[langStyle, {"borderColor": Sefaria.palette.refColor(tref)}]}>{children}</View>);
};


const StoryBodyBlock = ({en, he}) => <SimpleContentBlock en={en} he={he}/>;


const SheetBlock = ({sheet, compact, cozy, smallfonts, isTitle, showToast, onClick }) => {
      const historyItem = {ref: "Sheet " + sheet.sheet_id,
                  sheet_title: sheet.sheet_title,
                  versions: {}};

      return (<View>
        <SaveLine historyItem={historyItem} showToast={showToast}>
            <SimpleLinkedBlock en={sheet.sheet_title} he={sheet.sheet_title} onClick={onClick}/>
        </SaveLine>
        {(sheet.sheet_summary && !(compact || cozy))?<SimpleInterfaceBlock en={sheet.sheet_summary} he={sheet.sheet_summary}/>:null}
        {cozy?"":<ProfileListing
          image={sheet.publisher_image}
          name={sheet.publisher_name}
          organization={sheet.publisher_organization}
        />}
      </View>);
};
SheetBlock.propTypes = {sheet: sheetPropType.isRequired};


const SaveLine = (props) => (
    <View style={styles.saveLine}>
      {props.children}
      <SaveButton
        historyItem={props.historyItem || {ref: props.dref, versions: props.versions || {}, book: Sefaria.textTitleForRef(props.dref)}}
        showToast={props.showToast}
      />
    </View>
);

SaveLine.propTypes = {
  historyItem:        PropTypes.object,   // One or
  dref:                 PropTypes.string,   // the other
  versions:             PropTypes.object,
  afterChildren:        PropTypes.object,
};


export {
  SheetBlock,
  SaveLine,
  StoryTitleBlock,
  ColorBarBox,
  StoryBodyBlock,
  StoryFrame,
  textPropType,
};
