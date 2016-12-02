'use strict';
import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Dimensions
} from 'react-native';

var {
  CloseButton,
  LanguageToggleButton,
  CategoryColorLine,
  ToggleSet,
  TwoBox,
  LoadingView
} = require('./Misc.js');

var styles = require('./Styles.js');
const iPad = require('./isIPad');


var ReaderTextTableOfContents = React.createClass({
  // The Table of Contents for a single Text
  propTypes: {
    theme:          React.PropTypes.object.isRequired,
    title:          React.PropTypes.string.isRequired,
    currentRef:     React.PropTypes.string.isRequired,
    currentHeRef:   React.PropTypes.string.isRequired,
    openRef:        React.PropTypes.func.isRequired,
    close:          React.PropTypes.func.isRequired,
    contentLang:    React.PropTypes.string.isRequired,
    interfaceLang:  React.PropTypes.oneOf(["english","hebrew"]).isRequired,
    toggleLanguage: React.PropTypes.func.isRequired,
    Sefaria:        React.PropTypes.object.isRequired
  },
  getInitialState: function() {
    Sefaria = this.props.Sefaria;
    var toc = Sefaria.textToc(this.props.title, function(data) {
      this.setState({textToc: data});
    }.bind(this));

    return {
      textToc: toc
    };
  },
  sectionString: function() {
    // Returns a string expressing just the section we're currently looking including section name when possible
    // e.g. "Genesis 1" -> "Chapter 1"
    if (!this.state.textToc) { return "";}
    var textToc = this.state.textToc;
    var sectionName = ("sectionNames" in textToc) ?
                        textToc.sectionNames[textToc.sectionNames.length > 1 ? textToc.sectionNames.length-2 : 0] :
                        null;

    if (this.props.contentLang == "hebrew") {
      var trimmer = new RegExp("^(" + textToc.heTitle + "),? ");
      var sectionString = this.props.currentHeRef.replace(trimmer, '');
      if (sectionName) {
        sectionString = Sefaria.hebrewSectionName(sectionName) + " " + sectionString;
      }
    } else {
      var trimmer = new RegExp("^(" + textToc.title + "),? ");
      var sectionString = this.props.currentRef.replace(trimmer, '');
      if (sectionName) {
        sectionString = sectionName + " " + sectionString;
      }
    }
    return sectionString;
  },
  render: function() {
    var enTitle = this.props.title;
    var heTitle = Sefaria.index(this.props.title).heTitle;

    var categories  = Sefaria.index(this.props.title).categories;
    var enCatString   = categories.join(", ");
    var heCatString = categories.map(Sefaria.hebrewCategory).join(", ");

    return (
      <View style={[styles.menu,this.props.theme.menu]}>
        <CategoryColorLine category={Sefaria.categoryForTitle(this.props.title)} />
        <View style={[styles.header, this.props.theme.header]}>
          <CloseButton onPress={this.props.close} theme={this.props.theme} />
          <Text style={[styles.textTocHeaderTitle, styles.textCenter, this.props.theme.text]}>TABLE OF CONTENTS</Text>
                            <LanguageToggleButton theme={this.props.theme} toggleLanguage={this.props.toggleLanguage} language={this.props.contentLang} />
        </View>

        <ScrollView style={styles.menuContent}>
          <View style={[styles.textTocTopBox, this.props.theme.bordered]}>
            <View>
              { this.props.contentLang == "hebrew" ?
                <Text style={[styles.he, styles.textTocTitle, this.props.theme.text]}>{heTitle}</Text> :
                <Text style={[styles.en, styles.textTocTitle, this.props.theme.text]}>{enTitle}</Text> }
            </View>

            <View style={styles.textTocCategoryBox}>
            { this.props.contentLang == "hebrew" ?
              <Text style={[styles.he, styles.textTocCategory, this.props.theme.secondaryText]}>{heCatString}</Text> :
              <Text style={[styles.en, styles.textTocCategory, this.props.theme.secondaryText]}>{enCatString}</Text> }
            </View>


            <View>
            { this.props.contentLang == "hebrew" ?
              <Text style={[styles.intHe, styles.textTocSectionString, this.props.theme.textTocSectionString]}>{this.sectionString()}</Text> :
              <Text style={[styles.intEn, styles.textTocSectionString, this.props.theme.textTocSectionString]}>{this.sectionString()}</Text> }
            </View>

          </View>

          {this.state.textToc ?
            <TextTableOfContentsNavigation
              theme={this.props.theme}
              schema={this.state.textToc.schema}
              commentatorList={Sefaria.commentaryList(this.props.title)}
              alts={this.state.textToc.alts || null}
              defaultStruct={this.state.textToc.default_struct || "default"}
              contentLang={this.props.contentLang}
              title={this.props.title}
              openRef={this.props.openRef} /> : <LoadingView /> }

        </ScrollView>

      </View>);
  }
});


var TextTableOfContentsNavigation = React.createClass({
  propTypes: {
    theme:           React.PropTypes.object.isRequired,
    schema:          React.PropTypes.object.isRequired,
    commentatorList: React.PropTypes.array,
    alts:            React.PropTypes.object,
    defaultStruct:   React.PropTypes.string,
    contentLang:     React.PropTypes.string.isRequired,
    title:           React.PropTypes.string.isRequired,
    openRef:         React.PropTypes.func.isRequired
  },
  getInitialState: function() {
    return {
      tab: this.props.defaultStruct
    }
  },
  setTab: function(tab) {
    this.setState({tab: tab});
  },
  render: function() {
    if (this.props.commentatorList.length || this.props.alts) {
      var options = [{
        name: "default",
        text: "sectionNames" in this.props.schema ? this.props.schema.sectionNames[0] : "Contents",
        heText: "sectionNames" in this.props.schema ? Sefaria.hebrewSectionName(this.props.schema.sectionNames[0]) : "תוכן",
        onPress: this.setTab.bind(null, "default")
      }];
      if (this.props.alts) {
        for (var alt in this.props.alts) {
          if (this.props.alts.hasOwnProperty(alt)) {
            options.push({
              name: alt,
              text: alt,
              heText: Sefaria.hebrewSectionName(alt),
              onPress: this.setTab.bind(null, alt)
            });
          }
        }
      }
      if (this.props.commentatorList.length) {
        options.push({
          name: "commentary",
          text: "Commentary",
          heText: "מפרשים",
          onPress: this.setTab.bind(null, "commentary")
        });
      }
      options = options.sort(function(a, b) {
        return a.name == this.props.defaultStruct ? -1 :
                b.name == this.props.defaultStruct ? 1 : 0;
      }.bind(this));
      var toggle = <ToggleSet
                      theme={this.props.theme}
                      options={options}
                      contentLang={this.props.contentLang}
                      active={this.state.tab} />;
    } else {
      var toggle = null;
    }

    // Set margins around nav sections dependent on screen width so grid centered no mater how many sections fit per line
    var {height, width}   = Dimensions.get('window');
    var menuContentMargin = iPad ? 20 : 10; // matching values in Styles.js
    var availableWidth    = width - (2 * menuContentMargin);
    var itemWidth         = 40 + 2*2; // width of `sectionLink` plus two times margin
    var gridWidth         = parseInt(availableWidth / itemWidth) * itemWidth;
    var gridMargins       = (availableWidth - gridWidth) / 2;
    var gridBoxStyle      = {marginHorizontal: gridMargins};

    switch(this.state.tab) {
      case "default":
        var content = <View style={gridBoxStyle}>
                        <SchemaNode
                          theme={this.props.theme}
                          schema={this.props.schema}
                          addressTypes={this.props.schema.addressTypes}
                          contentLang={this.props.contentLang}
                          refPath={this.props.title}
                          openRef={this.props.openRef} />
                      </View>;
        break;
      case "commentary":
        var content = <CommentatorList
                        theme={this.props.theme}
                        commentatorList={this.props.commentatorList}
                        contentLang={this.props.contentLang}
                        openRef={this.props.openRef} />;
        break;
      default:
        var content = <View style={gridBoxStyle}>
                        <SchemaNode
                          theme={this.props.theme}
                          schema={this.props.alts[this.state.tab]}
                          addressTypes={this.props.schema.addressTypes}
                          contentLang={this.props.contentLang}
                          refPath={this.props.title}
                          openRef={this.props.openRef} />
                      </View>;
        break;
    }

    return (
      <View>
        {toggle}
        {content}
      </View>
    );
  }
})


var SchemaNode = React.createClass({
  propTypes: {
    theme:       React.PropTypes.object.isRequired,
    schema:      React.PropTypes.object.isRequired,
    contentLang: React.PropTypes.string.isRequired,
    refPath:     React.PropTypes.string.isRequired,
    openRef:     React.PropTypes.func.isRequired
  },
  render: function() {
    if (!("nodes" in this.props.schema)) {
      if (this.props.schema.nodeType === "JaggedArrayNode") {
        return (
          <JaggedArrayNode
            theme={this.props.theme}
            schema={this.props.schema}
            contentLang={this.props.contentLang}
            refPath={this.props.refPath}
            openRef={this.props.openRef} />
        );
      } else if (this.props.schema.nodeType === "ArrayMapNode") {
        return (
          <ArrayMapNode
            theme={this.props.theme}
            schema={this.props.schema}
            contentLang={this.props.contentLang}
            openRef={this.props.openRef} />
        );
      }

    } else {
      var showHebrew = this.props.contentLang === "hebrew";
      var content = this.props.schema.nodes.map(function(node, i) {
        if ("nodes" in node || "refs" in node) {
          return (
            <View style={styles.textTocNamedSection} key={i}>
              {showHebrew ?
                <Text style={[styles.he, styles.textTocSectionTitle, this.props.theme.text]}>{node.heTitle}</Text> :
                <Text style={[styles.en, styles.textTocSectionTitle, this.props.theme.text]}>{node.title}</Text> }
              <SchemaNode
                theme={this.props.theme}
                schema={node}
                contentLang={this.props.contentLang}
                refPath={this.props.refPath + ", " + node.title}
                openRef={this.props.openRef} />
            </View>);
        } else if (node.depth == 1) {
          var open = this.props.openRef.bind(null, this.props.refPath + ", " + node.title);
          return (
            <TouchableOpacity style={styles.textTocNamedSection} onPress={open} key={i}>
              {showHebrew ?
                <Text style={[styles.he, styles.textTocSectionTitle, this.props.theme.text]}>{node.heTitle + " >"}</Text> :
                <Text style={[styles.en, styles.textTocSectionTitle, this.props.theme.text]}>{node.title + " >"}</Text> }
            </TouchableOpacity>);
        } else {
          return (
            <View style={styles.textTocNamedSection} key={i}>
              {showHebrew ?
                <Text style={[styles.he, styles.textTocSectionTitle, this.props.theme.text]}>{node.heTitle}</Text> :
                <Text style={[styles.en, styles.textTocSectionTitle, this.props.theme.text]}>{node.title}</Text> }
              <JaggedArrayNode
                theme={this.props.theme}
                schema={node}
                contentLang={this.props.contentLang}
                refPath={this.props.refPath + ", " + node.title}
                openRef={this.props.openRef} />
            </View>);
        }
      }.bind(this));
      return (
        <View>{content}</View>
      );
    }
  }
});


var JaggedArrayNode = React.createClass({
  propTypes: {
    theme:       React.PropTypes.object.isRequired,
    schema:      React.PropTypes.object.isRequired,
    contentLang: React.PropTypes.string.isRequired,
    refPath:     React.PropTypes.string.isRequired,
    openRef:     React.PropTypes.func.isRequired,
  },
  render: function() {
    return (<JaggedArrayNodeSection
              theme={this.props.theme}
              depth={this.props.schema.depth}
              sectionNames={this.props.schema.sectionNames}
              addressTypes={this.props.schema.addressTypes}
              contentCounts={this.props.schema.content_counts}
              contentLang={this.props.contentLang}
              refPath={this.props.refPath}
              openRef={this.props.openRef} />);
  }
});


var JaggedArrayNodeSection = React.createClass({
  propTypes: {
    theme:           React.PropTypes.object.isRequired,
    depth:           React.PropTypes.number.isRequired,
    sectionNames:    React.PropTypes.array.isRequired,
    addressTypes:    React.PropTypes.array.isRequired,
    contentCounts:   React.PropTypes.oneOfType([
                        React.PropTypes.array,
                        React.PropTypes.number
                      ]),
    contentLang:     React.PropTypes.string.isRequired,
    refPath:         React.PropTypes.string.isRequired,
    openRef:         React.PropTypes.func.isRequired,
  },
  render: function() {
    var showHebrew = this.props.contentLang === "hebrew";
    if (this.props.depth > 2) {
      var content = [];
      for (var i = 0; i < this.props.contentCounts.length; i++) {
        var enSection = this.props.sectionNames[0] + " " + (i+1);
        var heSection = Sefaria.hebrewSectionName(this.props.sectionNames[0]) + " " + Sefaria.hebrew.encodeHebrewNumeral(i+1);
        content.push(
          <View style={styles.textTocNumberedSectionBox} key={i}>
            {showHebrew ?
              <Text style={[styles.he, styles.textTocNumberedSectionTitle, this.props.theme.text]}>{heSection}</Text> :
              <Text style={[styles.en, styles.textTocNumberedSectionTitle, this.props.theme.text]}>{enSection}</Text> }
            <JaggedArrayNodeSection
              theme={this.props.theme}
              depth={this.props.depth - 1}
              sectionNames={this.props.sectionNames.slice(1)}
              addressTypes={this.props.addressTypes.slice(1)}
              contentCounts={this.props.contentCounts[i]}
              contentLang={this.props.contentLang}
              refPath={this.props.refPath + ":" + (i+1)}
              openRef={this.props.openRef} />
          </View>);
      }
      return ( <View>{content}</View> );
    }

    var contentCounts = this.props.depth == 1 ? new Array(this.props.contentCounts).fill(1) : this.props.contentCounts;
    var sectionLinks = [];
    for (var i = 0; i < contentCounts.length; i++) {
      if (contentCounts[i] == 0) { continue; }
      if (this.props.addressTypes[0] === "Talmud") {
        var section = Sefaria.hebrew.intToDaf(i);
        var heSection = Sefaria.hebrew.encodeHebrewDaf(section);
      } else {
        var section = i+1;
        var heSection = Sefaria.hebrew.encodeHebrewNumeral(i+1);
      }
      var ref  = (this.props.refPath + ":" + section).replace(":", " ");
      var open = this.props.openRef.bind(null, ref);
      var link = (
        <TouchableOpacity style={[styles.sectionLink,this.props.theme.sectionLink]} onPress={open} key={i}>
          { showHebrew ?
            <Text style={[styles.he, styles.centerText, this.props.theme.text]}>{heSection}</Text> :
            <Text style={[styles.centerText, this.props.theme.text]}>{section}</Text> }
        </TouchableOpacity>
      );
      sectionLinks.push(link);
    }
    // sectionLinks.push(<View style={styles.lineEnd}></View>);
    var langStyles = showHebrew ? styles.rtlRow : null;
    return (
      <View style={[styles.textTocNumberedSection, langStyles]}>{sectionLinks}</View>
    );
  }
});


var ArrayMapNode = React.createClass({
  propTypes: {
    theme:       React.PropTypes.object.isRequired,
    schema:      React.PropTypes.object.isRequired,
    contentLang: React.PropTypes.string.isRequired,
    openRef:     React.PropTypes.func.isRequired,
  },
  render: function() {
    var showHebrew = this.props.contentLang == "hebrew";
    var sectionLinks = this.props.schema.refs.map(function(ref, i) {
      i += this.props.schema.offset || 0;
      var open = this.props.openRef.bind(null, ref);
      if (this.props.schema.addressTypes[0] === "Talmud") {
        var section = Sefaria.hebrew.intToDaf(i);
        var heSection = Sefaria.hebrew.encodeHebrewDaf(section);
      } else {
        var section = i+1;
        var heSection = Sefaria.hebrew.encodeHebrewNumeral(i+1);
      }
      return (
        <TouchableOpacity style={[styles.sectionLink,this.props.theme.sectionLink]} onPress={open} key={i}>
          { showHebrew ?
            <Text style={[styles.he, styles.centerText, this.props.theme.text]}>{heSection}</Text> :
            <Text style={[styles.centerText, this.props.theme.text]}>{section}</Text> }
        </TouchableOpacity>
      );
    }.bind(this));

    var langStyles = showHebrew ? styles.rtlRow : null;
    return (
      <View style={[styles.textTocNumberedSection, langStyles]}>{sectionLinks}</View>
    );
  }
});


var CommentatorList = React.createClass({
  propTypes: {
    theme:           React.PropTypes.object.isRequired,
    commentatorList: React.PropTypes.array.isRequired,
    contentLang:     React.PropTypes.string.isRequired,
    openRef:         React.PropTypes.func.isRequired,
  },
  render: function() {
    var showHebrew = this.props.contentLang == "hebrew";
    var content = this.props.commentatorList.map(function(commentator, i) {
      var open = this.props.openRef.bind(null, commentator.firstSection);
      return (<TouchableOpacity onPress={open} style={[styles.textBlockLink, this.props.theme.textBlockLink]} key={i}>
              { showHebrew ?
                <Text style={[styles.he, styles.centerText, this.props.theme.text]}>{commentator.heCommentator}</Text> :
                <Text style={[styles.en, styles.centerText, this.props.theme.text]}>{commentator.commentator}</Text> }
            </TouchableOpacity>);
    }.bind(this));

    return (<TwoBox content={content} />);

  }
})

module.exports = ReaderTextTableOfContents;
