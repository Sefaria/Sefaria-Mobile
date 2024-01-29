import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
} from 'react-native';

import { GlobalStateContext, getTheme } from './StateManager';
import strings from './LocalizedStrings';
import styles from './Styles';
import VersionBlock from './VersionBlock';
var moment = require("moment");


const AboutBox = ({ textToc, currVersionObjects, textTitle, sheet, openUri }) => {
  const { themeStr, interfaceLanguage, textLanguage } = React.useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const d = textToc;
  const vh = currVersionObjects.he;
  const ve = currVersionObjects.en;
  const hei = interfaceLanguage === "hebrew";


  if (sheet) {
        return (
    <ScrollView contentContainerStyle={[styles.aboutBoxScrollView, styles.readerSideMargin]}>
      <View>
        <View style={[styles.aboutHeaderWrapper, theme.bordered]}>
          <Text style={[styles.aboutHeader, theme.secondaryText, hei ? styles.heInt : null]}>{strings.aboutThisText}</Text>
        </View>
        <Text style={[styles.aboutTitle, hei ? styles.he : styles.en, theme.text]}>
          { Sefaria.util.stripHtml(sheet.title) }
        </Text>
          <Text style={[styles.aboutSubtitle, hei ? styles.heInt : styles.enInt, theme.secondaryText]}>
            {sheet.ownerName}
          </Text>


          <Text style={[styles.aboutSubtitle, hei ? styles.heInt : styles.enInt, theme.secondaryText]}>
            Created {moment(sheet.dateCreated, "YYYY-MM-DDTHH:mm:ss.SSS").fromNow()}
          </Text>
        <Text style={[styles.aboutDescription, styles.enInt, theme.text]}>{sheet.summary}</Text>

      </View>
    </ScrollView>
  );

  }

  let detailSection = null;
  if (d) {
    let authorsEn, authorsHe;
    if (d.authors && d.authors.length) {
      const authorArrayEn = d.authors.filter((elem) => !!elem.en);
      const authorArrayHe = d.authors.filter((elem) => !!elem.he);
      authorsEn = [<Text key="authorText">{"Author: "}</Text>];
      authorsHe = [<Text key="authorText">{"מחבר: "}</Text>];
      authorsEn = authorsEn.concat(authorArrayEn.map(author => <Text key={author.en}>{author.en}</Text> ));
      authorsHe = authorsHe.concat(authorArrayHe.map(author => <Text key={author.en}>{author.he}</Text> ));
    }
    // use compPlaceString and compDateString if available. then use compPlace o/w use pubPlace o/w nothing
    let placeTextEn, placeTextHe;
    if (d.compPlaceString) {
      placeTextEn = d.compPlaceString.en;
      placeTextHe = d.compPlaceString.he;
    } else if (d.compPlace){
      placeTextEn = d.compPlace;
      placeTextHe = d.compPlace;
    } else if (d.pubPlace) {
      placeTextEn = d.pubPlace;
      placeTextHe = d.pubPlace;
    }

    let dateTextEn, dateTextHe;
    if (d.compDateString) {
      dateTextEn = d.compDateString.en;
      dateTextHe = d.compDateString.he
    } else if (d.compDate) {
      if (d.errorMargin !== 0) {
        //I don't think there are any texts which are mixed BCE/CE
        const lowerDate = Math.abs(d.compDate - d.errorMargin);
        const upperDate = Math.abs(d.compDate - d.errorMargin);
        dateTextEn = `(c.${lowerDate} - c.${upperDate} ${d.compDate < 0 ? "BCE" : "CE"})`;
        dateTextHe = `(${lowerDate} - ${upperDate} ${d.compDate < 0 ? 'לפנה"ס בקירוב' : 'לספירה בקירוב'})`;
      } else {
        dateTextEn = `(${Math.abs(d.compDate)} ${d.compDate < 0 ? "BCE" : "CE"})`;
        dateTextHe = `(${Math.abs(d.compDate)} ${d.compDate < 0 ? 'לפנה"ס בקירוב' : 'לספירה בקירוב'})`;
      }
    } else if (d.pubDate) {
      dateTextEn = `(${Math.abs(d.pubDate)} ${d.pubDate < 0 ? "BCE" : "CE"})`;
      dateTextHe = `(${Math.abs(d.pubDate)} ${d.pubDate < 0 ? 'לפנה"ס בקירוב' : 'לספירה בקירוב'})`;
    }
    detailSection = (
      <View>
        <View style={[styles.aboutHeaderWrapper, theme.bordered]}>
          <Text style={[styles.aboutHeader, theme.secondaryText, hei ? styles.heInt : null]}>{strings.aboutThisText}</Text>
        </View>
        <Text style={[styles.aboutTitle, hei ? styles.he : styles.en, theme.text]}>
          { hei ? d.heTitle : d.title }
        </Text>
        { authorsEn && authorsEn.length ?
          <Text style={[styles.aboutSubtitle, hei ? styles.heInt : styles.enInt, theme.secondaryText]}>
            { hei ? authorsHe : authorsEn}
          </Text> : null
        }
        { !!placeTextEn || !!dateTextEn ?
          <Text style={[styles.aboutSubtitle, hei ? styles.heInt : styles.enInt, theme.secondaryText]}>
            { hei ? `נוצר/נערך: ${!!placeTextHe ? placeTextHe : ""} ${!!dateTextHe ? dateTextHe : ""}` : `Composed: ${!!placeTextEn ? placeTextEn : ""} ${!!dateTextEn ? dateTextEn : ""}`}
          </Text> : null
        }
        { hei ? (!!d.heDesc ? <Text style={[styles.aboutDescription, styles.heInt, theme.text]}>{d.heDesc}</Text> : null) :
                (!!d.enDesc ? <Text style={[styles.aboutDescription, styles.enInt, theme.text]}>{d.enDesc}</Text> : null)
        }
      </View>
    );
  }
  const showSourceVersionDetails = textLanguage !== 'english';
  const showTranslationVersionDetails = textLanguage !== 'hebrew';
  const versionSectionHe =
    (!!vh && showSourceVersionDetails ? <View style={styles.currVersionSection}>
      <View style={[styles.aboutHeaderWrapper, theme.bordered]}>
        <Text style={[styles.aboutHeader, theme.secondaryText, hei ? styles.heInt : null]}>{ strings.currentHebrewVersion }</Text>
      </View>
      <VersionBlock
        version={vh}
        openUri={openUri}
      />
    </View> : null );
  const versionSectionEn =
    (!!ve && showTranslationVersionDetails ? <View style={styles.currVersionSection}>
      <View style={[styles.aboutHeaderWrapper, theme.bordered]}>
        <Text style={[styles.aboutHeader, theme.secondaryText, hei ? styles.heInt : null]}>{ strings.currentEnglishVersion }</Text>
      </View>
      <VersionBlock
        version={ve}
        openUri={openUri}
      />
    </View> : null );
  return (
    <ScrollView contentContainerStyle={[styles.aboutBoxScrollView, styles.readerSideMargin]}>
      { detailSection }
      { textLanguage === "english" ?
        (<View>{versionSectionEn}{versionSectionHe}</View>) :
        (<View>{versionSectionHe}{versionSectionEn}</View>)
      }
    </ScrollView>
  );
};
AboutBox.propTypes = {
  textToc:             PropTypes.object,
  sheet:               PropTypes.object,
  currVersionObjects:  PropTypes.object.isRequired,
  textTitle:           PropTypes.string.isRequired,
  openUri:             PropTypes.func.isRequired,
};

export default AboutBox;
