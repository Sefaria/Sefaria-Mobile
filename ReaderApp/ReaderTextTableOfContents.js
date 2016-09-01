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
  CloseButton,
  LanguageToggleButton,
  ToggleSet,
  TwoBox,
  LoadingView
} = require('./Misc.js');

var styles = require('./Styles.js');


var ReaderTextTableOfContents = React.createClass({
  // The Table of Contents for a single Text
  propTypes: {
    title:          React.PropTypes.string.isRequired,
    openRef:        React.PropTypes.func.isRequired,
    close:          React.PropTypes.func.isRequired,
    contentLang:    React.PropTypes.string.isRequired,
    interfaceLang:  React.PropTypes.string.isRequired,
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
  componentDidMount: function() {

  },
  render: function() {
    var title = (<View style={styles.navigationMenuTitleBox}>
                  { this.props.contentLang == "hebrew" ?
                    <Text style={[styles.he, styles.navigationMenuTitle]}>{this.state.textToc ? this.state.textToc.heTitle : null}</Text> :
                    <Text style={[styles.en, styles.navigationMenuTitle]}>{this.props.title}</Text> }
                  <LanguageToggleButton toggleLanguage={this.props.toggleLanguage} language={this.props.contentLang} />
                </View>);

    return (
      <View style={[styles.menu]}>
            
        <View style={styles.header}>
          <CloseButton onPress={this.props.close} />
          <Text style={[styles.textTocHeaderTitle, styles.textCenter]}>TABLE OF CONTENTS</Text>
        </View>

        <ScrollView style={styles.menuContent}>
          
          {title}
          
          {this.state.textToc ? 
            <TextTableOfContentsNavigation
              schema={this.state.textToc.schema}
              commentatorList={Sefaria.commentaryList(this.props.title)}
              alts={this.state.textToc.alts || null}
              contentLang={this.props.contentLang}
              title={this.props.title}
              openRef={this.props.openRef} /> : <LoadingView /> }

        </ScrollView>

      </View>);
  }
});


var TextTableOfContentsNavigation = React.createClass({
  propTypes: {
    schema:          React.PropTypes.object.isRequired,
    commentatorList: React.PropTypes.array,
    alts:            React.PropTypes.object,
    contentLang:     React.PropTypes.string.isRequired,
    title:           React.PropTypes.string.isRequired,   
    openRef:         React.PropTypes.func.isRequired
  },
  getInitialState: function() {
    return {
      tab: "default"
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
      // add alt structs
      if (this.props.commentatorList.length) {
        options.push({
          name: "commentary",
          text: "Commentary",
          heText: "מפרשים",
          onPress: this.setTab.bind(null, "commentary")
        }); 
      }

      var toggle = <ToggleSet
                      options={options}
                      contentLang={this.props.contentLang}
                      active={this.state.tab} />;
    } else {
      var toggle = null;
    }

    switch(this.state.tab) {
      case "default":
        var content = <TextSchemaNode
                        schema={this.props.schema}
                        contentLang={this.props.contentLang}
                        refPath={this.props.title}
                        openRef={this.props.openRef} />;
        break;
      case "commentary":
        var content = <CommentatorList
                        commentatorList={this.props.commentatorList}
                        contentLang={this.props.contentLang}
                        openRef={this.props.openRef} />;
        break;
      default:
        var content = <Text>Alt structs coming soon...</Text>;
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


var TextSchemaNode = React.createClass({
  propTypes: {
    schema:      React.PropTypes.object.isRequired,
    contentLang: React.PropTypes.string.isRequired,
    refPath:     React.PropTypes.string.isRequired,   
    openRef:     React.PropTypes.func.isRequired
  },
  render: function() {
    if (!("nodes" in this.props.schema)) {
      return (
        <TextJaggedArrayNode
          schema={this.props.schema}
          contentLang={this.props.contentLang}
          refPath={this.props.refPath}
          openRef={this.props.openRef} />
      );
    } else { 
      var content = this.props.schema.nodes.map(function(node, i) {
        if ("nodes" in node) {
          return (
            <View style={styles.textTocNamedSection} key={i}>
              {this.props.contentLang == "english" ?
                <Text style={[styles.en, styles.textTocSectionTitle]}>{node.title}</Text> :
                <Text style={[styles.he, styles.textTocSectionTitle]}>{node.heTitle}</Text> }
              <TextSchemaNode
                schema={node}
                contentLang={this.props.contentLang}
                refPath={this.props.refPath + ", " + node.title}
                openRef={this.props.openRef} />
            </View>);
        } else if (node.depth == 1) {
          var open = this.props.openRef.bind(null, this.props.refPath + ", " + node.title);
          return (
            <TouchableOpacity style={styles.textTocNamedSection} onPress={open} key={i}>
              {this.props.contentLang == "english" ?
                <Text style={[styles.en, styles.textTocSectionTitle]}>{node.title + " >"}</Text> :
                <Text style={[styles.he, styles.textTocSectionTitle]}>{node.heTitle + " >"}</Text> }
            </TouchableOpacity>);
        } else {
          return (
            <View style={styles.textTocNamedSection} key={i}>
              {this.props.contentLang == "english" ?
                <Text style={[styles.en, styles.textTocSectionTitle]}>{node.title}</Text> :
                <Text style={[styles.he, styles.textTocSectionTitle]}>{node.heTitle}</Text> }
              <TextJaggedArrayNode
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


var TextJaggedArrayNode = React.createClass({
  propTypes: {
    schema:      React.PropTypes.object.isRequired,
    contentLang: React.PropTypes.string.isRequired,
    refPath:     React.PropTypes.string.isRequired,
    openRef:     React.PropTypes.func.isRequired,
  },
  render: function() {
    return (<TextJaggedArrayNodeSection
              depth={this.props.schema.depth}
              sectionNames={this.props.schema.sectionNames}
              addressTypes={this.props.schema.addressTypes}
              contentCounts={this.props.schema.content_counts}
              contentLang={this.props.contentLang}
              refPath={this.props.refPath}
              openRef={this.props.openRef} />);
  }
});


var TextJaggedArrayNodeSection = React.createClass({
  propTypes: {
    depth:           React.PropTypes.number.isRequired,
    sectionNames:    React.PropTypes.array.isRequired,
    addressTypes:    React.PropTypes.array.isRequired,
    contentCounts:   React.PropTypes.array.isRequired,
    contentLang:     React.PropTypes.string.isRequired,
    refPath:         React.PropTypes.string.isRequired,
    openRef:         React.PropTypes.func.isRequired,
  },
  render: function() {
    if (this.props.depth > 2) {
      var content = [];
      for (var i = 0; i < this.props.contentCounts.length; i++) {
        content.push(
          <View style={styles.textTocNumberedSectionBox} key={i}>
            {this.props.contentLang == "english" ?
              <Text style={[styles.en, styles.textTocNumberedSectionTitle]}>{this.props.sectionNames[0] + " " + (i+1)}</Text> :
              <Text style={[styles.he, styles.textTocNumberedSectionTitle]}>{this.props.sectionNames[0] + " " + (i+1)}</Text> }
            <TextJaggedArrayNodeSection
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
        <TouchableOpacity style={styles.sectionLink} onPress={open} key={i}>
          { this.props.contentLang == "english" ?
            <Text style={[styles.centerText]}>{section}</Text> :
            <Text style={[styles.he, styles.centerText]}>{heSection}</Text> }
        </TouchableOpacity>
      );
      sectionLinks.push(link);
    }
    // sectionLinks.push(<View style={styles.lineEnd}></View>);
    var langStyles = this.props.contentLang == "hebrew" ? styles.rtlRow : null;
    return (
      <View style={[styles.textTocNumberedSection, langStyles]}>{sectionLinks}</View>
    );
  }
});


var CommentatorList = React.createClass({
  propTypes: {
    commentatorList: React.PropTypes.array.isRequired,
    contentLang:     React.PropTypes.string.isRequired,
    openRef:         React.PropTypes.func.isRequired,
  },
  render: function() {
    var showHebrew = this.props.contentLang == "hebrew";
    var content = this.props.commentatorList.map(function(commentator, i) {
      var open = this.props.openRef.bind(null, commentator.firstSection);
      return (<TouchableOpacity onPress={open} style={styles.textBlockLink} key={i}>
              { showHebrew ? 
                <Text style={[styles.he, styles.centerText]}>{commentator.heCommentator}</Text> :
                <Text style={[styles.en, styles.centerText]}>{commentator.commentator}</Text> }
            </TouchableOpacity>);
    }.bind(this));

    return (
      <View>
        <TwoBox content={content} />
      </View>
    );
  }
})

module.exports = ReaderTextTableOfContents;
