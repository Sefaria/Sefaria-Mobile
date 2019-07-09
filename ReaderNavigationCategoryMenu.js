'use strict';

import PropTypes from 'prop-types';

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  SectionList,
} from 'react-native';

import {
  CategoryColorLine,
  CategoryAttribution,
  TwoBoxRow,
  LanguageToggleButton,
  MenuButton,
  DisplaySettingsButton,
  ToggleSet,
  LoadingView
} from './Misc.js';

import styles from './Styles.js';


class ReaderNavigationCategoryMenu extends React.PureComponent {
  // Navigation Menu for a single category of texts (e.g., "Tanakh", "Bavli")
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    themeStr:       PropTypes.string.isRequired,
    category:       PropTypes.string.isRequired,
    categories:     PropTypes.array.isRequired,
    setCategories:  PropTypes.func.isRequired,
    openRef:        PropTypes.func.isRequired,
    navHome:        PropTypes.func.isRequired,
    toggleLanguage: PropTypes.func.isRequired,
    menuLanguage:   PropTypes.string.isRequired,
    openUri:        PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.categories = props.categories[0] === "Talmud" && props.categories.length == 1 ?
      ["Talmud", "Bavli"] : props.categories;
    this.state = {
      sections: this.getSections(this.categories, Sefaria.tocItemsByCategories(this.categories)),
    };
  }
  getSections = (categories, contents, recurseLevel=0) => {
    let finalItems = [];
    const booksWithoutCat = [];
    let booksWithoutCatIndex = null;
    var cats = categories || [];
    //remove commentary category
    let specialCaseCats = [ "Mishneh Torah", "Shulchan Arukh", "Midrash Rabbah", "Maharal", "Tosefta"];
    if (cats.length > 0 && (cats[cats.length - 1] === "Commentary" ||
      cats[cats.length - 1] === "Targum")) {
      specialCaseCats = specialCaseCats.concat(contents.map(item=>item.category ? item.category : item.title));
    }
    for (let i = 0; i < contents.length; i++) {
      const item = contents[i];
      const isCat = !!item.category;
      const newCats = isCat ? cats.concat(item.category) : undefined;
      if (isCat && recurseLevel === 0 && Sefaria.util.inArray(item.category, specialCaseCats) === -1) {
        if (item.category == "Commentary") {
          specialCaseCats.push(item)
        }
        // add category
        finalItems.push({
          heTitle: item.heCategory,
          title: item.category.toUpperCase(),
          cats: newCats,
          data: this.getSections(newCats, item.contents, recurseLevel+1),
        });
      } else {
        // add book
        let oref;
        if (!isCat) {
          oref = Sefaria.history.getHistoryRefForTitle(item.title);
          if (!oref) {
            oref = { ref: item.firstSection };
          }
        }
        const title = isCat ? item.category : item.title.replace(/^(Mishneh Torah,|Shulchan Arukh,|Jerusalem Talmud|Mishnah(?! Berurah)|Tosefta) /, "");
        const heTitle = isCat ? Sefaria.hebrewCategory(item.category) : item.heTitle.replace(/^(משנה תורה,|תלמוד ירושלמי|משנה(?! ברורה)|תוספתא) /, "");
        const book = {
          title,
          heTitle,
          cats: newCats,
          oref,
        };
        if (recurseLevel === 0) {
          // this is a book w/o a cat
          if (booksWithoutCatIndex === null) {
            booksWithoutCatIndex = finalItems.length;
          }
          booksWithoutCat.push(book);
        } else { finalItems.push(book); }
      }
    }
    if (recurseLevel === 0 && booksWithoutCat.length > 0) {
      finalItems.splice(booksWithoutCatIndex, 0, { title: '', heTitle: '', data: booksWithoutCat });

    }
    return finalItems;
  };

  renderListHeader = () => {
    let toggle = null;
    if (this.categories[0] === "Talmud" && this.props.categories.length <= 2) {
      const options = [{
        name: "Bavli",
        text: "Bavli",
        heText: "בבלי",
        onPress: this.props.setCategories.bind(null, ["Talmud", "Bavli"])
      },
      {
        name: "Yerushalmi",
        text: "Yerushalmi",
        heText: "ירושלמי",
        onPress: this.props.setCategories.bind(null, ["Talmud", "Yerushalmi"])
      }];

      toggle = (
        <ToggleSet
          theme={this.props.theme}
          options={options}
          active={this.categories[1]}
          contentLang={this.props.menuLanguage}
        />
      );
    }
    return (
      <View>
        {toggle}
        <CategoryAttribution
          categories={this.categories}
          language={this.props.menuLanguage}
          context={"navigationCategory"}
          openUri={this.props.openUri}
          theme={this.props.theme}/>
      </View>
    );
  }

  renderSectionHeader = ({ section }) => {
    const showHebrew = this.props.menuLanguage == "hebrew";
    if (!section.title) { return null; }
    return (
      <View style={styles.category} key={`category|${section.title}`}>
        { showHebrew ?
            <Text style={[styles.heInt, styles.categorySectionTitle, this.props.theme.categorySectionTitle]}>{section.heTitle}</Text> :
            <Text style={[styles.enInt, styles.categorySectionTitle, this.props.theme.categorySectionTitle]}>{section.title}</Text> }
      </View>
    );
  };

  renderRow = ({ section, index }) => {
    // play a couple of tricks to get SectionList to render rows
    // see: https://stackoverflow.com/questions/47833581/react-native-sectionlist-numcolumns-support
    const numColumns = 2;
    if (index % numColumns !== 0) return null;
    const children = [];
    for (let i = index; i < index + numColumns; i++) {
      if (i >= section.data.length) {
        break;
      }
      children.push(this.renderItem({ item: section.data[i] }));
    }
    return (
      <TwoBoxRow language={this.props.menuLanguage}>
        { children }
      </TwoBoxRow>
    );
  };

  renderItem = ({ item }) => {
    const showHebrew = this.props.menuLanguage == "hebrew";
    const { ref, versions } = item.oref || {};
    return (
      <BookButton
        key={i}
        theme={this.props.theme}
        showHebrew={showHebrew}
        title={item.title}
        heTitle={item.heTitle}
        cats={item.cats}
        tref={ref}
        versions={versions}
        setCategories={this.props.setCategories}
        openRef={this.props.openRef}
      />
    );
  };
  extractKey = (item, index) => (`${item.title}|${index}`);
  render() {
    const showHebrew = this.props.menuLanguage == "hebrew";
    if (!Sefaria.toc) { return (<LoadingView />); }
    const enTitle = this.props.category.toUpperCase();
    const heTitle = Sefaria.hebrewCategory(this.props.category);
    return (
      <View key={this.props.category} style={[styles.menu, this.props.theme.menu]}>
        <CategoryColorLine category={this.categories[0]} />
        <View style={[styles.header, this.props.theme.header]}>
          <CategoryColorLine category={this.categories[0]} />
          <MenuButton onPress={this.props.navHome} theme={this.props.theme} themeStr={this.props.themeStr}/>
          {showHebrew ?
            <Text style={[styles.he, styles.categoryTitle, this.props.theme.categoryTitle]}>{heTitle}</Text> :
            <Text style={[styles.en, styles.categoryTitle, this.props.theme.categoryTitle]}>{enTitle}</Text> }
            <LanguageToggleButton
            theme={this.props.theme}
            interfaceLang={this.props.interfaceLang}
            toggleLanguage={this.props.toggleLanguage}
            language={this.props.menuLanguage} />
        </View>

        <SectionList
          style={styles.menuContent}
          contentContainerStyle={styles.menuScrollViewContent}
          ListHeaderComponent={this.renderListHeader}
          renderItem={this.renderRow}
          renderSectionHeader={this.renderSectionHeader}
          sections={this.state.sections}
          extraData={this.props.menuLanguage}
          numColumns={2}
          keyExtractor={this.extractKey}
          scrollEventThrottle={100}
          stickySectionHeadersEnabled={false}
        />
      </View>
    );
  }
}

class BookButton extends React.PureComponent {
  openCat = () => {
    this.props.setCategories(this.props.cats);
  };
  openRef = () => {
    this.props.openRef(this.props.tref, this.props.versions);
  };
  onPress = () => {
    !!this.props.cats ? this.openCat() : this.openRef();
  };
  render() {
    return (
      <TouchableOpacity onPress={this.onPress} style={[styles.textBlockLink,this.props.theme.textBlockLink]}>
        { this.props.showHebrew ?
          <Text style={[styles.hebrewText, styles.centerText, this.props.theme.text]}>{this.props.heTitle}</Text> :
          <Text style={[styles.englishText, styles.centerText, this.props.theme.text]}>{this.props.title}</Text> }
      </TouchableOpacity>
    );
  }
}


export default ReaderNavigationCategoryMenu;
