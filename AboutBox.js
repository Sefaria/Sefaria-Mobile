import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
} from 'react-native';

import {
  LoadingView,
} from './Misc.js';

import HTMLView from 'react-native-htmlview';
import strings from './LocalizedStrings';
import styles from './Styles';
import VersionBlock from './VersionBlock';


class AboutBox extends React.Component {
  static propTypes = {
    theme:               PropTypes.object.isRequired,
    currVersions:        PropTypes.object.isRequired,
    contentLang:         PropTypes.oneOf(["english", "hebrew"]).isRequired,
    interfaceLang:       PropTypes.oneOf(["english", "hebrew"]).isRequired,
    mainVersionLanguage: PropTypes.oneOf(["english", "hebrew", "bilingual"]),
    textTitle:           PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);
    Sefaria.textToc(this.props.textTitle).then(textToc => {
      this.setState({ textToc });
    });
    this.state = {
      textToc: null,
    }
  }
  render() {
    const d = this.state.textToc;
    const vh = this.props.currVersions.he;
    const ve = this.props.currVersions.en;
    const hec = this.props.contentLang === "hebrew";
    const hei = this.props.interfaceLang === "hebrew";
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
          <View style={[styles.aboutHeaderWrapper, this.props.theme.bordered]}>
            <Text style={[styles.aboutHeader, this.props.theme.secondaryText, hei ? styles.heInt : null]}>{strings.aboutThisText}</Text>
          </View>
          <Text style={[styles.aboutTitle, this.props.theme.text]}>
            { hec ? d.heTitle : d.title }
          </Text>
          { authorsEn && authorsEn.length ?
            <Text style={[styles.aboutSubtitle, this.props.theme.secondaryText]}>
              { hec ? authorsHe : authorsEn}
            </Text> : null
          }
          { !!placeTextEn || !!dateTextEn ?
            <Text style={[styles.aboutSubtitle, this.props.theme.secondaryText]}>
              { hec ? `נוצר/נערך: ${!!placeTextHe ? placeTextHe : ""} ${!!dateTextHe ? dateTextHe : ""}` : `Composed: ${!!placeTextEn ? placeTextEn : ""} ${!!dateTextEn ? dateTextEn : ""}`}
            </Text> : null
          }
          { hec ? (!!d.heDesc ? <Text style={[styles.aboutDescription, this.props.theme.text]}>{d.heDesc}</Text> : null) :
                  (!!d.enDesc ? <Text style={[styles.aboutDescription, this.props.theme.text]}>{d.enDesc}</Text> : null)
          }
        </View>
      );
    }
    const versionSectionHe =
      (!!vh && !vh.disabled ? <View style={styles.currVersionSection}>
        <View style={[styles.aboutHeaderWrapper, this.props.theme.bordered]}>
          <Text style={[styles.aboutHeader, this.props.theme.secondaryText, hei ? styles.heInt : null]}>{ strings.currentHebrewVersion }</Text>
        </View>
        <VersionBlock
          theme={this.props.theme}
          version={vh}
          interfaceLang={this.props.interfaceLang}
        />
      </View> : null );
    const versionSectionEn =
      (!!ve && !ve.disabled ? <View style={styles.currVersionSection}>
        <View style={[styles.aboutHeaderWrapper, this.props.theme.bordered]}>
          <Text style={[styles.aboutHeader, this.props.theme.secondaryText, hei ? styles.heInt : null]}>{ strings.currentEnglishVersion }</Text>
        </View>
        <VersionBlock
          theme={this.props.theme}
          version={ve}
          interfaceLang={this.props.interfaceLang}
        />
      </View> : null );
    return (
      <ScrollView contentContainerStyle={[styles.textListSummaryScrollView, styles.aboutBoxScrollView]}>
        { detailSection }
        { this.props.mainVersionLanguage === "english" ?
          (<View>{versionSectionEn}{versionSectionHe}</View>) :
          (<View>{versionSectionHe}{versionSectionEn}</View>)
        }
      </ScrollView>
    );
  }
}

export default AboutBox;
