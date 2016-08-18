'use strict';

import React, { Component } from 'react';
import { 	
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';

var {
  CategoryColorLine,
  TwoBox,
  LanguageToggleButton,
  MenuButton,
  DisplaySettingsButton,
  LoadingView
} = require('./Misc.js');

var styles = require('./Styles.js');


var ReaderNavigationCategoryMenu = React.createClass({
  // Navigation Menu for a single category of texts (e.g., "Tanakh", "Bavli")
  propTypes: {
    category:       React.PropTypes.string.isRequired,
    categories:     React.PropTypes.array.isRequired,
    closeNav:       React.PropTypes.func.isRequired,
    setCategories:  React.PropTypes.func.isRequired,
    openRef:        React.PropTypes.func.isRequired,
    navHome:        React.PropTypes.func.isRequired,
    toggleLanguage: React.PropTypes.func.isRequired,
    settings:       React.PropTypes.object.isRequired,
    Sefaria:        React.PropTypes.object.isRequired
  },
  getInitialState: function() {
    Sefaria = this.props.Sefaria;
    return {};
  },
  render: function() {
    var showHebrew = this.props.settings.language == "hebrew";

    // Show Talmud with Toggles
    var categories  = this.props.categories[0] === "Talmud" && this.props.categories.length == 1 ? 
                        ["Talmud", "Bavli"] : this.props.categories;


    if (categories[0] === "Talmud") {
      var setBavli = function() {
        this.props.setCategories(["Talmud", "Bavli"]);
      }.bind(this);
      var setYerushalmi = function() {
        this.props.setCategories(["Talmud", "Yerushalmi"]);
      }.bind(this);

      var bStyles = [styles.navToggle].concat(categories[1] === "Bavli" ? [styles.navToggleActive] : []);
      var yStyles = [styles.navToggle].concat(categories[1] === "Yerushalmi" ? [styles.navToggleActive] : []);
      
      var toggle = (<View style={styles.navToggles}>
                        <TouchableOpacity style={bStyles} onPress={setBavli}>
                          {showHebrew ? 
                            <Text style={styles.he}>בבלי</Text> :
                            <Text style={styles.en}>Bavli</Text> }
                        </TouchableOpacity>
                        <Text style={styles.navTogglesDivider}>|</Text>
                        <TouchableOpacity style={yStyles} onPress={setYerushalmi}>
                          {showHebrew ? 
                            <Text style={styles.he}>ירושלמי</Text> :
                            <Text style={styles.en}>Yerushalmi</Text> }
                        </TouchableOpacity>
                     </View>);
    } else {
      var toggle = null;
    }

    if (!Sefaria.toc) { return (<LoadingView />); }

    var catContents = Sefaria.tocItemsByCategories(categories);
    return (<View style={styles.menu}>
              <View style={styles.header}>
                <CategoryColorLine category={categories[0]} />
                <MenuButton onPress={this.props.navHome} />
                {showHebrew ? 
                  <Text style={styles.he, styles.categoryTitle}>{Sefaria.hebrewCategory(this.props.category)}</Text> :
                  <Text style={styles.en, styles.categoryTitle}>{this.props.category}</Text> }
                <DisplaySettingsButton onPress={this.props.openDisplaySettings} />
              </View>
              
              <ScrollView style={styles.menuContent}>
                  <ReaderNavigationCategoryMenuContents 
                    contents={catContents} 
                    categories={categories}
                    setCategories={this.props.setCategories}
                    openRef={this.props.openRef}
                    settings={this.props.settings} />
              </ScrollView>
            </View>);
  }
});


var ReaderNavigationCategoryMenuContents = React.createClass({
  // Inner content of Category menu (just category title and boxes)
  propTypes: {
    contents:      React.PropTypes.array.isRequired,
    categories:    React.PropTypes.array.isRequired,
    setCategories: React.PropTypes.func.isRequired,
    openRef:       React.PropTypes.func.isRequired,
    settings:      React.PropTypes.object.isRequired
  },
  render: function() {
      var content = [];
      var showHebrew = this.props.settings.language == "hebrew";
      var cats = this.props.categories || [];
      for (var i = 0; i < this.props.contents.length; i++) {
        var item = this.props.contents[i];
        if (item.category) {
          if (item.category == "Commentary") { continue; }
          var newCats = cats.concat(item.category);
          // Special Case categories which should nest
          var subcats = [ "Mishneh Torah", "Shulchan Arukh", "Midrash Rabbah", "Maharal" ];
          if (Sefaria.util.inArray(item.category, subcats) > -1) {
            var openCat = this.props.setCategories.bind(null, newCats);
            content.push((<TouchableOpacity onPress={openCat} style={styles.textBlockLink} key={i}>
                            { showHebrew ? 
                              <Text style={[styles.he, styles.centerText]}>{Sefaria.hebrewCategory(item.category)}</Text> :
                              <Text style={[styles.en, styles.centerText]}>{item.category}</Text> }
                          </TouchableOpacity>));
            continue;
          }
          // Add a Category
          content.push((<View style={styles.category} key={i}>
                          { showHebrew ? 
                              <Text style={[styles.he, styles.categorySectionTitle]}>{item.heCategory}</Text> :
                              <Text style={[styles.en, styles.categorySectionTitle]}>{item.category}</Text> }
                          <ReaderNavigationCategoryMenuContents 
                            contents={item.contents}
                            categories={newCats}
                            setCategories={this.props.setCategories}
                            openRef={this.props.openRef}
                            settings={this.props.settings} />
                        </View>));
        } else {
          // Add a Text
          var title   = item.title.replace(/(Mishneh Torah,|Shulchan Arukh,|Jerusalem Talmud) /, "");
          var heTitle = item.heTitle.replace(/(משנה תורה,|תלמוד ירושלמי) /, "");
          var openRef = this.props.openRef.bind(null, item.firstSection);
          content.push((<TouchableOpacity  style={styles.textBlockLink}  onPress={openRef} key={i}>
                            { showHebrew ? 
                              <Text style={[styles.he, styles.centerText]}>{heTitle}</Text> :
                              <Text style={[styles.en, styles.centerText]}>{title}</Text> }
                          </TouchableOpacity>));
        }
      }
      console.log(content);
      var boxedContent = [];
      var currentRun   = [];
      for (var i = 0; i < content.length; i++) {
        // Walk through content looking for runs of texts/subcats to group together into a table
        if (content[i].type.displayName == "View") { // this is a subcategory
          if (currentRun.length) {
            console.log("view")
            boxedContent.push((<TwoBox content={currentRun} key={i} />));
            currentRun = [];
          }
          boxedContent.push(content[i]);
        } else  { // this is a single text
          currentRun.push(content[i]);
        }
      }
      if (currentRun.length) {
        boxedContent.push((<TwoBox content={currentRun} key={i} />));
      }
      return (<View>{boxedContent}</View>);
  }
});


module.exports = ReaderNavigationCategoryMenu;