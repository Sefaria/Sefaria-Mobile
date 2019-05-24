'use strict';
import PropTypes from 'prop-types';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Dimensions
} from 'react-native';

import HTMLView from 'react-native-htmlview'; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)
import {
  CloseButton,
  LanguageToggleButton,
  CategoryColorLine,
  CategoryAttribution,
  ToggleSet,
  TwoBox,
  LoadingView,
  CollapseIcon,
  SText,
} from './Misc.js';

import styles from './Styles';
import strings from './LocalizedStrings';
import iPad from './isIPad';
import VersionBlock from './VersionBlock';


class ReaderTextTableOfContents extends React.PureComponent {
  // The Table of Contents for a single Text
  static propTypes = {
    textToc:        PropTypes.object,
    theme:          PropTypes.object.isRequired,
    themeStr:       PropTypes.string.isRequired,
    title:          PropTypes.string.isRequired,
    currentRef:     PropTypes.string,
    currentHeRef:   PropTypes.string,
    openRef:        PropTypes.func.isRequired,
    close:          PropTypes.func.isRequired,
    textLang:       PropTypes.oneOf(["english","hebrew"]).isRequired,
    contentLang:    PropTypes.oneOf(["english","hebrew"]).isRequired,
    interfaceLang:  PropTypes.oneOf(["english","hebrew"]).isRequired,
    toggleLanguage: PropTypes.func.isRequired,
    openUri:        PropTypes.func.isRequired,
  };

  sectionString = () => {
    // Returns a string expressing just the section we're currently looking including section name when possible
    // e.g. "Genesis 1" -> "Chapter 1"
    if (!this.props.textToc) { return "";}
    const textToc = this.props.textToc;
    var sectionName = ("sectionNames" in textToc) ?
                        textToc.sectionNames[textToc.sectionNames.length > 1 ? textToc.sectionNames.length-2 : 0] :
                        null;

    if (this.props.contentLang == "hebrew") {
      if (!this.props.currentHeRef) { return "";}
      var trimmer = new RegExp("^(" + textToc.heTitle + "),? ");
      var sectionString = this.props.currentHeRef.replace(trimmer, '');
      if (sectionName) {
        sectionString = Sefaria.hebrewSectionName(sectionName) + " " + sectionString;
      }
    } else {
      if (!this.props.currentRef) { return "";}

      var trimmer = new RegExp("^(" + textToc.title + "),? ");
      var sectionString = this.props.currentRef.replace(trimmer, '');
      if (sectionName) {
        sectionString = sectionName + " " + sectionString;
      }
    }
    return sectionString;
  };

  render() {
    var enTitle = this.props.title;
    var heTitle = Sefaria.index(this.props.title).heTitle;
    const langStyle = this.props.interfaceLang === "hebrew" ? styles.heInt : styles.enInt;
    var categories  = Sefaria.index(this.props.title).categories;
    var enCatString = categories.join(", ");
    var heCatString = categories.map(Sefaria.hebrewCategory).join(", ");
    return (
      <View style={[styles.menu,this.props.theme.menu]}>
        <CategoryColorLine category={Sefaria.categoryForTitle(this.props.title)} />
        <View style={[styles.header, this.props.theme.header]}>
          <CloseButton onPress={this.props.close} theme={this.props.theme} themeStr={this.props.themeStr} />
          <Text style={[langStyle, styles.textTocHeaderTitle, styles.textCenter, this.props.theme.text]}>{strings.tableOfContents}</Text>
          <LanguageToggleButton theme={this.props.theme} toggleLanguage={this.props.toggleLanguage} interfaceLang={this.props.interfaceLang} language={this.props.contentLang} />
        </View>

        <ScrollView style={styles.menuContent} contentContainerStyle={{paddingTop: 20,paddingBottom: 40}}>
          <View style={[styles.textTocTopBox, this.props.theme.bordered]}>
            <View style={styles.textTocCategoryBox}>
            { this.props.contentLang == "hebrew" ?
              <Text style={[styles.he, styles.textTocCategory, this.props.theme.secondaryText]}>{heCatString}</Text> :
              <Text style={[styles.en, styles.textTocCategory, this.props.theme.secondaryText]}>{enCatString}</Text> }
            </View>

            <View>
              { this.props.contentLang == "hebrew" ?
                <Text style={[styles.he, styles.textTocTitle, this.props.theme.text]}>{heTitle}</Text> :
                <Text style={[styles.en, styles.textTocTitle, this.props.theme.text]}>{enTitle}</Text> }
            </View>

            <CategoryAttribution
              categories={categories}
              language={this.props.contentLang}
              context={"textToc"}
              openUri={this.props.openUri}
              theme={this.props.theme}/>

            {this.props.textToc && "dedication" in this.props.textToc ?
            (<View>
              { this.props.contentLang == "hebrew" ?
                <Text style={[styles.he, styles.textTocCategoryAttributionTextHe, this.props.theme.tertiaryText]}>{this.props.textToc.dedication.he}</Text> :
                <Text style={[styles.en, styles.textTocCategoryAttributionTextEn, this.props.theme.tertiaryText]}>{this.props.textToc.dedication.en}</Text> }
            </View>): null }

            { this.props.currentRef ?
              <View>
              { this.props.contentLang == "hebrew" ?
                <Text style={[styles.intHe, styles.textTocSectionString, this.props.theme.textTocSectionString]}>{this.sectionString()}</Text> :
                <Text style={[styles.intEn, styles.textTocSectionString, this.props.theme.textTocSectionString]}>{this.sectionString()}</Text> }
              </View> : null
            }
          </View>

          {this.props.textToc ?
            <TextTableOfContentsNavigation
              theme={this.props.theme}
              themeStr={this.props.themeStr}
              schema={this.props.textToc.schema}
              commentatorList={Sefaria.commentaryList(this.props.title)}
              alts={this.props.textToc.alts || null}
              defaultStruct={"default_struct" in this.props.textToc && this.props.textToc.default_struct in this.props.textToc.alts ? this.props.textToc.default_struct : "default"}
              contentLang={this.props.contentLang}
              title={this.props.title}
              openRef={this.props.openRef} /> : <LoadingView theme={this.props.theme} category={Sefaria.categoryForTitle(this.props.title)}/> }

        </ScrollView>

      </View>);
  }
}

class TextTableOfContentsNavigation extends React.PureComponent {
  static propTypes = {
    theme:           PropTypes.object.isRequired,
    themeStr:        PropTypes.string.isRequired,
    schema:          PropTypes.object.isRequired,
    commentatorList: PropTypes.array,
    alts:            PropTypes.object,
    defaultStruct:   PropTypes.string,
    contentLang:     PropTypes.string.isRequired,
    title:           PropTypes.string.isRequired,
    openRef:         PropTypes.func.isRequired
  };

  state = {
    tab: this.props.defaultStruct
  };

  setTab = tab => {
    this.setState({ tab });
  };

  setDefaultTab = () => {
    this.setTab("default");
  };

  setCommentaryTab = () => {
    this.setTab("commentary");
  };

  render() {
    let toggle = null;
    if (this.props.commentatorList.length || this.props.alts) {
      var options = [{
        name: "default",
        text: "sectionNames" in this.props.schema ? this.props.schema.sectionNames[0] : "Contents",
        heText: "sectionNames" in this.props.schema ? Sefaria.hebrewSectionName(this.props.schema.sectionNames[0]) : "תוכן",
        onPress: this.setDefaultTab,
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
          onPress: this.setCommentaryTab,
        });
      }
      options = options.sort((a, b) => (
        a.name == this.props.defaultStruct ? -1 :
          b.name == this.props.defaultStruct ? 1 : 0
      ));
      toggle = (
        <ToggleSet
          theme={this.props.theme}
          options={options}
          contentLang={this.props.contentLang}
          active={this.state.tab}
        />
      );
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
                          themeStr={this.props.themeStr}
                          schema={this.props.schema}
                          addressTypes={this.props.schema.addressTypes}
                          contentLang={this.props.contentLang}
                          refPath={this.props.title}
                          openRef={this.props.openRef}
                          categories={Sefaria.index(this.props.title).categories} />
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
                          themeStr={this.props.themeStr}
                          schema={this.props.alts[this.state.tab]}
                          addressTypes={this.props.schema.addressTypes}
                          contentLang={this.props.contentLang}
                          refPath={this.props.title}
                          openRef={this.props.openRef}
                          categories={Sefaria.index(this.props.title).categories} />
                      </View>;
        break;
    }

    return (
      <View style={{flex: 1}}>
        {toggle}
        {content}
      </View>
    );
  }
}


const SchemaNode = ({ theme, themeStr, schema, contentLang, refPath, openRef, categories }) => {
  if (!("nodes" in schema)) {
    if (schema.nodeType === "JaggedArrayNode") {
      return (
        <JaggedArrayNode
          theme={theme}
          schema={schema}
          contentLang={contentLang}
          refPath={refPath}
          openRef={openRef} />
      );
    } else if (schema.nodeType === "ArrayMapNode") {
      return (
        <ArrayMapNode
          theme={theme}
          schema={schema}
          contentLang={contentLang}
          openRef={openRef}
          categories={categories} />
      );
    }

  } else {
    const showHebrew = contentLang === "hebrew";
    const content = schema.nodes.map((node, i) => {
      if ("nodes" in node || "refs" in node && node.refs.length) {
        const innerContent = (<SchemaNode
                        theme={theme}
                        themeStr={themeStr}
                        schema={node}
                        contentLang={contentLang}
                        refPath={refPath + ", " + node.title}
                        openRef={openRef}
                        categories={categories} />);
        return (
            <CollapsibleNode
              key={i}
              theme={theme}
              themeStr={themeStr}
              showHebrew={showHebrew}
              defaultInvisible={schema.nodes.length >= 20}
              en={node.title}
              he={node.heTitle}
              children={innerContent}
              node={node}/>
            );
      } else if (node.nodeType == "ArrayMapNode") {
        // ArrayMapNode with only wholeRef
        return <ArrayMapNode
                  theme={theme}
                  schema={node}
                  contentLang={contentLang}
                  openRef={openRef}
                  key={i}
                  categories={categories} />;
      } else if (node.depth == 1) {
        const open = openRef.bind(null, refPath + ", " + node.title);
        return (
          <TouchableOpacity style={styles.textTocNamedSection} onPress={open} key={i}>
            {showHebrew ?
              <SText lang={"hebrew"} style={[styles.he, styles.textTocSectionTitle, theme.text]}>{node.heTitle}</SText> :
              <SText lang={"english"} style={[styles.en, styles.textTocSectionTitle, theme.text]}>{node.title}</SText> }
          </TouchableOpacity>);
      } else {
        const innerContent = (<JaggedArrayNode
          theme={theme}
          schema={node}
          contentLang={contentLang}
          refPath={refPath + (node.default ? "" : ", " + node.title)}
          openRef={openRef} />);
        return (
          <CollapsibleNode
            key={i}
            theme={theme}
            themeStr={themeStr}
            showHebrew={showHebrew}
            defaultInvisible={schema.nodes.length >= 20 || (node.depth <= 2 && !!node.content_counts && node.content_counts.length >= 20)}
            en={node.title}
            he={node.heTitle}
            children={innerContent}
            node={node}/>);
      }
    });
    return (
      <View style={{flex: 1}}>{content}</View>
    );
  }
}
SchemaNode.propTypes = {
  theme:       PropTypes.object.isRequired,
  themeStr:    PropTypes.string.isRequired,
  schema:      PropTypes.object.isRequired,
  contentLang: PropTypes.string.isRequired,
  refPath:     PropTypes.string.isRequired,
  openRef:     PropTypes.func.isRequired,
  categories:  PropTypes.array,
};

const JaggedArrayNode = ({ theme, schema, contentLang, refPath, openRef }) => {
  if (refPath.startsWith("Beit Yosef, ")) { schema.toc_zoom = 2; }

  if ("toc_zoom" in schema) {
    const zoom = schema.toc_zoom - 1;
    return (<JaggedArrayNodeSection
              theme={theme}
              depth={schema.depth - zoom}
              sectionNames={schema.sectionNames.slice(0, -zoom)}
              addressTypes={schema.addressTypes.slice(0, -zoom)}
              contentCounts={schema.content_counts}
              contentLang={contentLang}
              refPath={refPath}
              openRef={openRef} />);
  }
  return (<JaggedArrayNodeSection
            theme={theme}
            depth={schema.depth}
            sectionNames={schema.sectionNames}
            addressTypes={schema.addressTypes}
            contentCounts={schema.content_counts}
            contentLang={contentLang}
            refPath={refPath}
            openRef={openRef} />);
}

const contentCountIsEmpty = count => {
  // Returns true if count is zero or is an an array (of arrays) of zeros.
  if (typeof count == "number") { return count == 0; }
  var innerCounts = count.map(contentCountIsEmpty);
  return innerCounts.every((empty) => {empty});
};

const refPathTerminal = count => {
  // Returns a string to be added to the end of a section link depending on a content count
  // Used in cases of "zoomed" JaggedArrays, where `contentCounts` is deeper than `depth` so that zoomed section
  // links still point to section level.
  if (typeof count == "number") { return ""; }
  var terminal = ":";
  for (var i = 0; i < count.length; i++) {
    if (count[i]) {
      terminal += (i+1) + refPathTerminal(count[i]);
      break;
    }
  }
  return terminal;
};

const JaggedArrayNodeSection = ({ theme, depth, sectionNames, addressTypes, contentCounts, contentLang, refPath, openRef }) => {
  const showHebrew = contentLang === "hebrew";
  if (depth > 2) {
    const content = [];
    for (let i = 0; i < contentCounts.length; i++) {
      if (contentCountIsEmpty(contentCounts[i])) { continue; }
      let enSection = i+1;
      let heSection = Sefaria.hebrew.encodeHebrewNumeral(i+1);
      if (addressTypes[0] === "Talmud") {
        enSection = Sefaria.hebrew.intToDaf(i);
        heSection = Sefaria.hebrew.encodeHebrewDaf(enSection);
      }
      content.push(
        <View style={styles.textTocNumberedSectionBox} key={i}>
          {showHebrew ?
            <Text style={[styles.he, styles.textTocNumberedSectionTitle, theme.text]}>{`${Sefaria.hebrewSectionName(sectionNames[0])} ${heSection}`}</Text> :
            <Text style={[styles.en, styles.textTocNumberedSectionTitle, theme.text]}>{sectionNames[0] + " " + enSection}</Text> }
          <JaggedArrayNodeSection
            theme={theme}
            depth={depth - 1}
            sectionNames={sectionNames.slice(1)}
            addressTypes={addressTypes.slice(1)}
            contentCounts={contentCounts[i]}
            contentLang={contentLang}
            refPath={refPath + ":" + (i+1)}
            openRef={openRef} />
        </View>);
    }
    return ( <View>{content}</View> );
  }

  contentCounts = depth == 1 ? new Array(contentCounts).fill(1) : contentCounts;
  const sectionLinks = contentCounts.map((contentCount, i) => {
    if (contentCountIsEmpty(contentCounts[i])) { return null; }
    let section = i+1;
    let heSection = Sefaria.hebrew.encodeHebrewNumeral(i+1);
    if (addressTypes[0] === "Talmud") {
      section = Sefaria.hebrew.intToDaf(i);
      heSection = Sefaria.hebrew.encodeHebrewDaf(section);
    }
    const ref  = (refPath + ":" + section).replace(":", " ") + refPathTerminal(contentCounts[i]);
    return (
      <JaggedArrayNodeSectionBox
        key={i}
        showHebrew={showHebrew}
        title={section}
        heTitle={heSection}
        theme={theme}
        openRef={openRef}
        tref={ref}
      />
    );
  });

  const langStyles = showHebrew ? styles.rtlRow : null;
  return (
    <View style={[styles.textTocNumberedSection, langStyles]}>{sectionLinks}</View>
  );
}
JaggedArrayNodeSection.propTypes = {
  theme:           PropTypes.object.isRequired,
  depth:           PropTypes.number.isRequired,
  sectionNames:    PropTypes.array.isRequired,
  addressTypes:    PropTypes.array.isRequired,
  contentCounts:   PropTypes.oneOfType([
                      PropTypes.array,
                      PropTypes.number
                    ]),
  contentLang:     PropTypes.string.isRequired,
  refPath:         PropTypes.string.isRequired,
  openRef:         PropTypes.func.isRequired,
};

class JaggedArrayNodeSectionBox extends React.PureComponent {
  openRef = () => {
    this.props.openRef(this.props.tref, this.props.enableAliyot);
  };
  render() {
    return (
      <TouchableOpacity style={[styles.sectionLink, this.props.theme.sectionLink]} onPress={this.openRef}>
        { this.props.showHebrew ?
          <Text style={[styles.he, styles.centerText, this.props.theme.text]}>{this.props.heTitle}</Text> :
          <Text style={[styles.centerText, this.props.theme.text]}>{this.props.title}</Text> }
      </TouchableOpacity>
    );
  }
}

class JaggedArrayNodeSectionTitle extends React.PureComponent {
  openRef = () => {
    this.props.openRef(this.props.tref);
  };
  render() {
    return (
      <TouchableOpacity onPress={this.openRef}>
        { this.props.showHebrew ?
          <SText lang={"hebrew"} style={[styles.he, styles.textTocSectionTitle, this.props.theme.text]}>{this.props.heTitle}</SText> :
          <SText lang={"english"} style={[styles.en, styles.textTocSectionTitle, this.props.theme.text]}>{this.props.title}</SText> }
      </TouchableOpacity>
    );
  }
}


const ArrayMapNode = ({ theme, schema, contentLang, openRef, categories }) => {
  const showHebrew = contentLang == "hebrew";
  if ("refs" in schema && schema.refs.length) {
    var sectionLinks = schema.refs.map((ref, i) => {
      i += schema.offset || 0;
      const enableAliyot = !!categories && categories[0] === "Tanakh" && categories[1] === "Torah";  // enable aliyot in reader when you click on an aliya
      let section = i+1;
      let heSection = Sefaria.hebrew.encodeHebrewNumeral(i+1);
      if (schema.addressTypes[0] === "Talmud") {
        section = Sefaria.hebrew.intToDaf(i);
        heSection = Sefaria.hebrew.encodeHebrewDaf(section);
      }
      return (
        <JaggedArrayNodeSectionBox
          key={i}
          showHebrew={showHebrew}
          title={section}
          heTitle={heSection}
          theme={theme}
          openRef={openRef}
          tref={ref}
          enableAliyot={enableAliyot}
        />
      );
    });

    var langStyles = showHebrew ? styles.rtlRow : null;
    return (
      <View style={[styles.textTocNumberedSection, langStyles]}>{sectionLinks}</View>
    );
  } else {
    return (
      <JaggedArrayNodeSectionTitle
        tref={schema.wholeRef.replace(/\./g, " ")}
        openRef={openRef}
        theme={theme}
        showHebrew={showHebrew}
        title={schema.title}
        heTitle={schema.heTitle}
      />
    );
  }
}


const CommentatorList = ({ theme, commentatorList, contentLang, openRef }) => {
  const showHebrew = contentLang == "hebrew";
  const content = commentatorList.map((commentator, i) => {
    const open = openRef.bind(null, commentator.firstSection);
    return (<TouchableOpacity onPress={open} style={[styles.textBlockLink, theme.textBlockLink]} key={i}>
            { showHebrew ?
              <Text style={[styles.he, styles.centerText, theme.text]}>
                {commentator.heCollectiveTitle ? commentator.heCollectiveTitle : commentator.heTitle}
              </Text> :
              <Text style={[styles.en, styles.centerText, theme.text]}>
                {commentator.collectiveTitle ? commentator.collectiveTitle : commentator.title}
              </Text> }
          </TouchableOpacity>);
  });

  return (
    <TwoBox>
      { content }
    </TwoBox>
  );
}


class CollapsibleNode extends React.PureComponent {
  static propTypes = {
    theme:             PropTypes.object,
    themeStr:          PropTypes.string,
    language:          PropTypes.oneOf(["hebrew", "english"]),
    defaultInvisible:  PropTypes.bool,
    showHebrew:        PropTypes.bool,
    en:                PropTypes.string,
    he:                PropTypes.string,
    children:          PropTypes.object,
    node:              PropTypes.object
  };
  constructor(props) {
    super(props);
    this.state = {
      isVisible: (props.node.includeSections || props.node.default) && !props.defaultInvisible,
    };
  }

  toggleVisibility = () => {
    this.setState({isVisible: !this.state.isVisible});
  };

  render() {
    let icon = !this.props.node.default ?
                (<CollapseIcon themeStr={this.props.themeStr} isVisible={this.state.isVisible} showHebrew={this.props.showHebrew} />)
                : null;
    return (
      <View style={styles.textTocNamedSection}>
        {this.props.showHebrew ?
          (this.props.node.heTitle.length > 0 ? <TouchableOpacity onPress={this.toggleVisibility} style={{flex: 1, flexDirection: "row", justifyContent:"flex-end"}}>
            {icon}
            <SText lang={"hebrew"} style={[styles.he, styles.textTocSectionTitle, this.props.theme.text]}>{this.props.node.heTitle}</SText>
          </TouchableOpacity> : null) :
          ( this.props.node.title.length > 0 ? <TouchableOpacity onPress={this.toggleVisibility} style={{flex: 1, flexDirection: "row", justifyContent:"flex-start"}}>
            <SText lang={"english"} style={[styles.en, styles.textTocSectionTitle, this.props.theme.text]}>{this.props.node.title}</SText>
            {icon}
          </TouchableOpacity> : null)}
        { this.state.isVisible ? this.props.children : null }
      </View>

    );
  }
}


export default ReaderTextTableOfContents;
