'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';

import {
  CategoryColorLine,
  CategoryAttribution,
  TwoBox,
  LanguageToggleButton,
  MenuButton,
  DisplaySettingsButton,
  ToggleSet,
  LoadingView
} from './Misc.js';

import styles from './Styles.js';


class ReaderNavigationCategoryMenu extends React.Component {
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
    this.state = {};
  }

  render() {
    var showHebrew = this.props.menuLanguage == "hebrew";

    // Show Talmud with Toggles
    var categories  = this.props.categories[0] === "Talmud" && this.props.categories.length == 1 ?
                        ["Talmud", "Bavli"] : this.props.categories;


    if (categories[0] === "Talmud" && this.props.categories.length <= 2) {
      var options = [{
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

      var toggle = <ToggleSet
                      theme={this.props.theme}
                      options={options}
                      active={categories[1]}
                      contentLang={this.props.menuLanguage} />;
    } else {
      var toggle = null;
    }

    if (!Sefaria.toc) { return (<LoadingView />); }

    var catContents = Sefaria.tocItemsByCategories(categories);
    var enTitle = this.props.category.toUpperCase();
    var heTitle = Sefaria.hebrewCategory(this.props.category);
    return (<View key={this.props.category} style={[styles.menu, this.props.theme.menu]}>
              <CategoryColorLine category={categories[0]} />
              <View style={[styles.header, this.props.theme.header]}>
                <CategoryColorLine category={categories[0]} />
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

              <ScrollView style={styles.menuContent} contentContainerStyle={styles.menuScrollViewContent}>
                  {toggle}
                  <CategoryAttribution
                    categories={categories}
                    language={this.props.menuLanguage}
                    context={"navigationCategory"}
                    openUri={this.props.openUri}/>
                  <ReaderNavigationCategoryMenuContents
                    theme={this.props.theme}
                    contents={catContents}
                    categories={categories}
                    setCategories={this.props.setCategories}
                    openRef={this.props.openRef}
                    menuLanguage={this.props.menuLanguage} />
              </ScrollView>
            </View>);
  }
}

class ReaderNavigationCategoryMenuContents extends React.Component {
  // Inner content of Category menu (just category title and boxes)
  static propTypes = {
    theme:         PropTypes.object.isRequired,
    contents:      PropTypes.array.isRequired,
    categories:    PropTypes.array.isRequired,
    setCategories: PropTypes.func.isRequired,
    openRef:       PropTypes.func.isRequired,
    menuLanguage:  PropTypes.string.isRequired
  };

  render() {
      var content = [];
      var showHebrew = this.props.menuLanguage == "hebrew";
      var cats = this.props.categories || [];
      //remove commentary category
      let subcats = [ "Mishneh Torah", "Shulchan Arukh", "Midrash Rabbah", "Maharal", "Tosefta"];
      if (cats.length > 0 && (cats[cats.length - 1] === "Commentary" ||
        cats[cats.length - 1] === "Targum")) {
        subcats = subcats.concat(this.props.contents.map((item)=>item.category ? item.category : item.title));
      }

      for (var i = 0; i < this.props.contents.length; i++) {
        var item = this.props.contents[i];
        if (item.category) {

          if (item.category == "Commentary") {
            subcats.push(item)
          }
          var newCats = cats.concat(item.category);
          // Special Case categories which should nest

          if (Sefaria.util.inArray(item.category, subcats) > -1) {
            var openCat = function(newCats) {
              this.props.setCategories(newCats);
              Sefaria.track.event("Reader","Navigation Sub Category Click",newCats.join(" / "));
            }.bind(this,newCats);
            content.push((<TouchableOpacity onPress={openCat} style={[styles.textBlockLink,this.props.theme.textBlockLink]} key={i}>
                            { showHebrew ?
                              <Text style={[styles.hebrewText, styles.centerText, this.props.theme.text]}>{Sefaria.hebrewCategory(item.category)}</Text> :
                              <Text style={[styles.englishText, styles.centerText, this.props.theme.text]}>{item.category}</Text> }
                          </TouchableOpacity>));
            continue;
          }
          // Add a Category
          content.push((<View style={styles.category} key={"category-" + i}>
                          { showHebrew ?
                              <Text style={[styles.heInt, styles.categorySectionTitle, this.props.theme.categorySectionTitle]}>{item.heCategory}</Text> :
                              <Text style={[styles.enInt, styles.categorySectionTitle, this.props.theme.categorySectionTitle]}>{item.category.toUpperCase()}</Text> }
                          <ReaderNavigationCategoryMenuContents
                            theme={this.props.theme}
                            contents={item.contents}
                            categories={newCats}
                            setCategories={this.props.setCategories}
                            openRef={this.props.openRef}
                            menuLanguage={this.props.menuLanguage} />
                        </View>));
        } else {
          // Add a Text
          var title   = item.title.replace(/^(Mishneh Torah,|Shulchan Arukh,|Jerusalem Talmud|Mishnah(?! Berurah)|Tosefta) /, "");
          var heTitle = item.heTitle.replace(/^(משנה תורה,|תלמוד ירושלמי|משנה(?! ברורה)|תוספתא) /, "");

          var refToOpen = Sefaria.getHistoryRefForTitle(item.title);
          if (!refToOpen) {
            refToOpen = { ref: item.firstSection };
          }
          var openRef = this.props.openRef.bind(null, refToOpen.ref, refToOpen.versions);
          content.push((<TouchableOpacity  style={[styles.textBlockLink,this.props.theme.textBlockLink]}  onPress={openRef} key={i}>
                            { showHebrew ?
                              <Text style={[styles.hebrewText, styles.centerText, this.props.theme.text]}>{heTitle}</Text> :
                              <Text style={[styles.englishText, styles.centerText, this.props.theme.text]}>{title}</Text> }
                          </TouchableOpacity>));
        }
      }
      var boxedContent = [];
      var currentRun   = [];
      for (var i = 0; i < content.length; i++) {
        // Walk through content looking for runs of texts/subcats to group together into a table
        if (content[i].key.startsWith("category")) { // this is a subcategory
          if (currentRun.length) {
            boxedContent.push((<TwoBox content={currentRun} key={i} language={this.props.menuLanguage} />));
            currentRun = [];
          }
          boxedContent.push(content[i]);
        } else  { // this is a single text
          currentRun.push(content[i]);
        }
      }
      if (currentRun.length) {
        boxedContent.push((<TwoBox content={currentRun} key={i} language={this.props.menuLanguage} />));
      }
      return (<View>{boxedContent}</View>);
  }
}


export default ReaderNavigationCategoryMenu;
