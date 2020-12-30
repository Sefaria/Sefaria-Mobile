'use strict';

import React  from 'react';
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
const StoryFrame = ({cls, cardColor, children}) => (
     <View>
        {children}
     </View>
);
StoryFrame.propTypes = {
    cls:        PropTypes.string,   // Story type as class name
    cardColor:  PropTypes.string
};


const StoryTitleBlock = ({url, he, en, children}) => {
        const SBlock = url ? SimpleLinkedBlock : SimpleInterfaceBlock;
        return <View>
            <SBlock classes="storyTitle pageTitle" url={url} he={he} en={en}/>
            {children}
        </View>;
};


const ColorBarBox = ({tref, children}) =>  <View style={{"borderColor": Sefaria.palette.refColor(tref)}}>{children}</View>;


const StoryBodyBlock = ({en, he}) => <SimpleContentBlock en={en} he={he}/>;


const SheetBlock = ({sheet, compact, cozy, smallfonts, isTitle, toggleSignUpModal}) => {
      const historyObject = {ref: "Sheet " + sheet.sheet_id,
                  sheet_title: sheet.sheet_title,
                  versions: {}};

      return (<View>
        <SaveLine historyObject={historyObject} toggleSignUpModal={toggleSignUpModal}>
            <SimpleLinkedBlock en={sheet.sheet_title} he={sheet.sheet_title} url={"/sheets/" + sheet.sheet_id} />
        </SaveLine>
        {(sheet.sheet_summary && !(compact || cozy))?<SimpleInterfaceBlock en={sheet.sheet_summary} he={sheet.sheet_summary}/>:null}
        {cozy?"":<ProfileListing
          uid={sheet.publisher_id}
          url={sheet.publisher_url}
          image={sheet.publisher_image}
          name={sheet.publisher_name}
          is_followed={sheet.publisher_followed}
          smallfonts={smallfonts}
          position={sheet.publisher_position}
          organization={sheet.publisher_organization}
          toggleSignUpModal={toggleSignUpModal}
        />}
      </View>);
};
SheetBlock.propTypes = {sheet: sheetPropType.isRequired};


const SaveLine = (props) => (
    <View>
        <View>
            {props.children}
        </View>
        <SaveButton tooltip={true}
            historyObject={props.historyObject || {ref: props.dref, versions: props.versions || {}}}
            toggleSignUpModal={props.toggleSignUpModal}
        />
      { props.afterChildren ? props.afterChildren : null }
    </View>
);

SaveLine.propTypes = {
  historyObject:        PropTypes.object,   // One or
  dref:                 PropTypes.string,   // the other
  toggleSignUpModal:    PropTypes.func,
  versions:             PropTypes.object,
  classes:              PropTypes.string,
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
