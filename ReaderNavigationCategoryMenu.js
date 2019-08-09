'use strict';

import PropTypes from 'prop-types';

import React, { useContext } from 'react';
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
import { GlobalStateContext } from './StateManager';
import styles from './Styles.js';

const getSections = (categories, contents, recurseLevel=0) => {
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
        data: getSections(newCats, item.contents, recurseLevel+1),
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

const ReaderNavigationCategoryMenu = ({
  category,
  categories,
  setCategories,
  openRef,
  navHome,
  toggleLanguage,
  openUri,
}) => {
  // Navigation Menu for a single category of texts (e.g., "Tanakh", "Bavli")
  const { theme, menuLanguage } = useContext(GlobalStateContext);
  const showTalmudToggle = categories[0] === "Talmud" && categories.length <= 2;
  categories = categories[0] === "Talmud" && categories.length == 1 ? ["Talmud", "Bavli"] : categories;
  const sections = getSections(categories, Sefaria.tocItemsByCategories(categories));

  const renderListHeader = () => (
    <ListHeader
      showTalmudToggle={showTalmudToggle}
      categories={categories}
      setCategories={setCategories}
      openUri={openUri}
    />
  );
  const renderNavRow = ({ section, index }) => (
    <NavRow
      section={section}
      index={index}
      openRef={openRef}
      setCategories={setCategories}
    />
  );
  const extractKey = (item, index) => (`${item.title}|${index}`);
  const showHebrew = menuLanguage == "hebrew";
  if (!Sefaria.toc) { return (<LoadingView />); }
  const enTitle = category.toUpperCase();
  const heTitle = Sefaria.hebrewCategory(category);
  return (
    <View key={category} style={[styles.menu, theme.menu]}>
      <CategoryColorLine category={categories[0]} />
      <View style={[styles.header, theme.header]}>
        <CategoryColorLine category={categories[0]} />
        <MenuButton onPress={navHome} />
        {showHebrew ?
          <Text style={[styles.he, styles.categoryTitle, theme.categoryTitle]}>{heTitle}</Text> :
          <Text style={[styles.en, styles.categoryTitle, theme.categoryTitle]}>{enTitle}</Text> }
          <LanguageToggleButton
            toggleLanguage={toggleLanguage}
            language={menuLanguage}
          />
      </View>

      <SectionList
        style={styles.menuContent}
        contentContainerStyle={styles.menuScrollViewContent}
        ListHeaderComponent={renderListHeader}
        renderItem={renderNavRow}
        renderSectionHeader={SectionHeader}
        sections={sections}
        extraData={menuLanguage}
        numColumns={2}
        keyExtractor={extractKey}
        scrollEventThrottle={100}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}
ReaderNavigationCategoryMenu.propTypes = {
  category:       PropTypes.string.isRequired,
  categories:     PropTypes.array.isRequired,
  setCategories:  PropTypes.func.isRequired,
  openRef:        PropTypes.func.isRequired,
  navHome:        PropTypes.func.isRequired,
  toggleLanguage: PropTypes.func.isRequired,
  openUri:        PropTypes.func.isRequired,
};

const ListHeader = ({ showTalmudToggle, setCategories, categories, openUri }) => {
  let toggle = null;
  if (showTalmudToggle) {
    const options = [{
      name: "Bavli",
      text: "Bavli",
      heText: "בבלי",
      onPress: setCategories.bind(null, ["Talmud", "Bavli"])
    },
    {
      name: "Yerushalmi",
      text: "Yerushalmi",
      heText: "ירושלמי",
      onPress: setCategories.bind(null, ["Talmud", "Yerushalmi"])
    }];

    toggle = (
      <ToggleSet
        options={options}
        active={categories[1]}
      />
    );
  }
  return (
    <View>
      {toggle}
      <CategoryAttribution
        categories={categories}
        context={"navigationCategory"}
        openUri={openUri}
      />
    </View>
  );
}

const SectionHeader = ({ section }) => {
  const { theme, menuLanguage } = useContext(GlobalStateContext);
  const showHebrew = menuLanguage == "hebrew";
  if (!section.title) { return null; }
  return (
    <View style={styles.category} key={`category|${section.title}`}>
      { showHebrew ?
          <Text style={[styles.heInt, styles.categorySectionTitle, theme.categorySectionTitle]}>{section.heTitle}</Text> :
          <Text style={[styles.enInt, styles.categorySectionTitle, theme.categorySectionTitle]}>{section.title}</Text> }
    </View>
  );
};

const NavItem = ({ item, setCategories, openRef }) => {
  const { menuLanguage } = useContext(GlobalStateContext);
  const showHebrew = menuLanguage == "hebrew";
  const { ref, versions } = item.oref || {};
  return (
    <BookButton
      key={i}
      showHebrew={showHebrew}
      title={item.title}
      heTitle={item.heTitle}
      cats={item.cats}
      tref={ref}
      versions={versions}
      setCategories={setCategories}
      openRef={openRef}
    />
  );
};

const NavRow = ({ section, index, setCategories, openRef }) => {
  // play a couple of tricks to get SectionList to render rows
  // see: https://stackoverflow.com/questions/47833581/react-native-sectionlist-numcolumns-support
  const { menuLanguage } = useContext(GlobalStateContext);
  const numColumns = 2;
  if (index % numColumns !== 0) return null;
  const children = [];
  for (let i = index; i < index + numColumns; i++) {
    if (i >= section.data.length) {
      break;
    }
    children.push(
      <NavItem
        item={section.data[i]}
        setCategories={setCategories}
        openRef={openRef}
      />
    );
  }
  return (
    <TwoBoxRow language={menuLanguage}>
      { children }
    </TwoBoxRow>
  );
};

const BookButton = ({
  title,
  heTitle,
  showHebrew,
  cats,
  tref,
  versions,
  setCategories,
  openRef,
  openCat,
}) => {
  const { theme } = useContext(GlobalStateContext);
  const openCat = () => { setCategories(cats); };
  const openRef = () => { openRef(tref, versions); };
  const onPress = () => { !!cats ? openCat() : openRef(); };
  render() {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.textBlockLink, theme.textBlockLink]}>
        { showHebrew ?
          <Text style={[styles.hebrewText, styles.centerText, theme.text]}>{heTitle}</Text> :
          <Text style={[styles.englishText, styles.centerText, theme.text]}>{title}</Text> }
      </TouchableOpacity>
    );
  }
}


export default ReaderNavigationCategoryMenu;
