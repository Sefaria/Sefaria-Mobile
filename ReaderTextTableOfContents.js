'use strict';
import PropTypes from 'prop-types';
import React, { useContext, useState } from 'react';
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
import { GlobalStateContext, getTheme } from './StateManager';
import styles from './Styles';
import strings from './LocalizedStrings';
import iPad from './isIPad';
import VersionBlock from './VersionBlock';
import TextErrorBoundary from './TextErrorBoundary';

const sectionString = (isHeb, textToc, currentRef, currentHeRef) => {
  // Returns a string expressing just the section we're currently looking including section name when possible
  // e.g. "Genesis 1" -> "Chapter 1"
  if (!textToc) { return "";}
  var sectionName = ("sectionNames" in textToc) ?
                      textToc.sectionNames[textToc.sectionNames.length > 1 ? textToc.sectionNames.length-2 : 0] :
                      null;

  if (isHeb) {
    if (!currentHeRef) { return "";}
    var trimmer = new RegExp("^(" + textToc.heTitle + "),? ");
    var sectionString = currentHeRef.replace(trimmer, '');
    if (sectionName) {
      sectionString = Sefaria.hebrewSectionName(sectionName) + " " + sectionString;
    }
  } else {
    if (!currentRef) { return "";}

    var trimmer = new RegExp("^(" + textToc.title + "),? ");
    var sectionString = currentRef.replace(trimmer, '');
    if (sectionName) {
      sectionString = sectionName + " " + sectionString;
    }
  }
  return sectionString;
};

const ReaderTextTableOfContents = ({
  textToc,
  title,
  currentRef,
  currentHeRef,
  openRef,
  close,
  openUri,
  textUnavailableAlert,
}) => {
  // The Table of Contents for a single Text
  const { themeStr, interfaceLanguage, textLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  var enTitle = title;
  var heTitle = Sefaria.index(title).heTitle;
  const isHeb = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == "hebrew";
  const langStyle = interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt;
  var categories  = Sefaria.index(title).categories;
  var enCatString = categories.join(", ");
  var heCatString = categories.map(Sefaria.hebrewCategory).join(", ");
  return (
    <View style={[styles.menu, theme.menu]}>
      <CategoryColorLine category={Sefaria.categoryForTitle(title)} />
      <View style={[styles.header, theme.header]}>
        <CloseButton onPress={close} />
        <Text style={[langStyle, styles.textTocHeaderTitle, styles.textCenter, theme.text]}>{strings.tableOfContents}</Text>
        <LanguageToggleButton />
      </View>

      <TextErrorBoundary textUnavailableAlert={textUnavailableAlert} title={title}>
        <ScrollView style={styles.menuContent} contentContainerStyle={{paddingTop: 20,paddingBottom: 40}}>
          <View style={[styles.textTocTopBox, theme.bordered]}>
            <View style={styles.textTocCategoryBox}>
            { isHeb ?
              <Text style={[styles.he, styles.textTocCategory, theme.secondaryText]}>{heCatString}</Text> :
              <Text style={[styles.en, styles.textTocCategory, theme.secondaryText]}>{enCatString}</Text> }
            </View>

            <View>
              { isHeb ?
                <Text style={[styles.he, styles.textTocTitle, theme.text]}>{heTitle}</Text> :
                <Text style={[styles.en, styles.textTocTitle, theme.text]}>{enTitle}</Text> }
            </View>

            <CategoryAttribution
              categories={categories}
              context={"textToc"}
              openUri={openUri}
            />

            { textToc && "dedication" in textToc ?
            (<View>
              { isHeb ?
                <Text style={[styles.he, styles.textTocCategoryAttributionTextHe, theme.tertiaryText]}>{textToc.dedication.he}</Text> :
                <Text style={[styles.en, styles.textTocCategoryAttributionTextEn, theme.tertiaryText]}>{textToc.dedication.en}</Text> }
            </View>): null }

            { currentRef ?
              <View>
              { isHeb ?
                <Text style={[styles.intHe, styles.textTocSectionString, theme.textTocSectionString]}>{sectionString(isHeb, textToc, currentRef, currentHeRef)}</Text> :
                <Text style={[styles.intEn, styles.textTocSectionString, theme.textTocSectionString]}>{sectionString(isHeb, textToc, currentRef, currentHeRef)}</Text> }
              </View> : null
            }
          </View>

          {textToc ?
            <TextTableOfContentsNavigation
              schema={textToc.schema}
              commentatorList={Sefaria.commentaryList(title)}
              alts={textToc.alts || null}
              defaultStruct={"default_struct" in textToc && textToc.default_struct in textToc.alts ? textToc.default_struct : "default"}
              title={title}
              openRef={openRef} /> : <LoadingView category={Sefaria.categoryForTitle(title)}/> }

        </ScrollView>

      </TextErrorBoundary>
    </View>
  );
}
ReaderTextTableOfContents.propTypes = {
  textToc:        PropTypes.object,
  title:          PropTypes.string.isRequired,
  currentRef:     PropTypes.string,
  currentHeRef:   PropTypes.string,
  openRef:        PropTypes.func.isRequired,
  close:          PropTypes.func.isRequired,
  openUri:        PropTypes.func.isRequired,
  textUnavailableAlert: PropTypes.func.isRequired,
};

const TextTableOfContentsNavigation = ({ schema, commentatorList, alts, defaultStruct, title, openRef }) => {
  const [tab, setTab] = useState(defaultStruct);
  let toggle = null;
  if (commentatorList.length || alts) {
    var options = [{
      name: "default",
      text: "sectionNames" in schema ? schema.sectionNames[0] : "Contents",
      heText: "sectionNames" in schema ? Sefaria.hebrewSectionName(schema.sectionNames[0]) : "תוכן",
      onPress: () => { setTab('default'); },
    }];
    if (alts) {
      for (var alt in alts) {
        if (alts.hasOwnProperty(alt)) {
          options.push({
            name: alt,
            text: alt,
            heText: Sefaria.hebrewSectionName(alt),
            onPress: setTab.bind(null, alt)
          });
        }
      }
    }
    if (commentatorList.length) {
      options.push({
        name: "commentary",
        text: "Commentary",
        heText: "מפרשים",
        onPress: () => { setTab('commentary'); },
      });
    }
    options = options.sort((a, b) => (
      a.name == defaultStruct ? -1 :
        b.name == defaultStruct ? 1 : 0
    ));
    toggle = (
      <ToggleSet
        options={options}
        active={tab}
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

  switch (tab) {
    case "default":
      var content = <View style={gridBoxStyle}>
                      <SchemaNode
                        schema={schema}
                        addressTypes={schema.addressTypes}
                        refPath={title}
                        openRef={openRef}
                        categories={Sefaria.index(title).categories} />
                    </View>;
      break;
    case "commentary":
      var content = <CommentatorList
                      commentatorList={commentatorList}
                      openRef={openRef} />;
      break;
    default:
      var content = <View style={gridBoxStyle}>
                      <SchemaNode
                        schema={alts[tab]}
                        addressTypes={schema.addressTypes}
                        refPath={title}
                        openRef={openRef}
                        categories={Sefaria.index(title).categories} />
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
TextTableOfContentsNavigation.propTypes = {
  schema:          PropTypes.object.isRequired,
  commentatorList: PropTypes.array,
  alts:            PropTypes.object,
  defaultStruct:   PropTypes.string,
  title:           PropTypes.string.isRequired,
  openRef:         PropTypes.func.isRequired
};


const SchemaNode = ({ schema, refPath, openRef, categories }) => {
  const { textLanguage, interfaceLanguage, themeStr } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  if (!("nodes" in schema)) {
    if (schema.nodeType === "JaggedArrayNode") {
      return (
        <JaggedArrayNode
          schema={schema}
          refPath={refPath}
          openRef={openRef} />
      );
    } else if (schema.nodeType === "ArrayMapNode") {
      return (
        <ArrayMapNode
          schema={schema}
          openRef={openRef}
          categories={categories} />
      );
    }

  } else {
    const showHebrew = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == "hebrew";
    const content = schema.nodes.map((node, i) => {
      if ("nodes" in node || "refs" in node && node.refs.length) {
        const innerContent = (<SchemaNode
                        schema={node}
                        refPath={refPath + ", " + node.title}
                        openRef={openRef}
                        categories={categories} />);
        return (
            <CollapsibleNode
              key={i}
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
                  schema={node}
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
          schema={node}
          refPath={refPath + (node.default ? "" : ", " + node.title)}
          openRef={openRef} />);
        return (
          <CollapsibleNode
            key={i}
            showHebrew={showHebrew}
            defaultInvisible={!node.default && (schema.nodes.length >= 20 || (node.depth <= 2 && !!node.content_counts && node.content_counts.length >= 20))}
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
  schema:      PropTypes.object.isRequired,
  refPath:     PropTypes.string.isRequired,
  openRef:     PropTypes.func.isRequired,
  categories:  PropTypes.array,
};

const JaggedArrayNode = ({ schema, refPath, openRef }) => {
  if (refPath.startsWith("Beit Yosef, ")) { schema.toc_zoom = 2; }

  if ("toc_zoom" in schema) {
    const zoom = schema.toc_zoom - 1;
    return (<JaggedArrayNodeSection
              depth={schema.depth - zoom}
              sectionNames={schema.sectionNames.slice(0, -zoom)}
              addressTypes={schema.addressTypes.slice(0, -zoom)}
              contentCounts={schema.content_counts}
              refPath={refPath}
              openRef={openRef} />);
  }
  return (<JaggedArrayNodeSection
            depth={schema.depth}
            sectionNames={schema.sectionNames}
            addressTypes={schema.addressTypes}
            contentCounts={schema.content_counts}
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

const JaggedArrayNodeSection = ({ depth, sectionNames, addressTypes, contentCounts, refPath, openRef }) => {
  const { textLanguage, interfaceLanguage, themeStr } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const showHebrew = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == "hebrew";
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
            depth={depth - 1}
            sectionNames={sectionNames.slice(1)}
            addressTypes={addressTypes.slice(1)}
            contentCounts={contentCounts[i]}
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
  depth:           PropTypes.number.isRequired,
  sectionNames:    PropTypes.array.isRequired,
  addressTypes:    PropTypes.array.isRequired,
  contentCounts:   PropTypes.oneOfType([
                      PropTypes.array,
                      PropTypes.number
                    ]),
  refPath:         PropTypes.string.isRequired,
  openRef:         PropTypes.func.isRequired,
};

const JaggedArrayNodeSectionBox = ({ tref, enableAliyot, openRef, title, heTitle, showHebrew }) => {
  const { themeStr } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  return (
    <TouchableOpacity
      style={[styles.sectionLink, theme.sectionLink]}
      onPress={() => { openRef(tref, enableAliyot); }}
    >
      { showHebrew ?
        <Text style={[styles.he, styles.centerText, theme.text]}>{heTitle}</Text> :
        <Text style={[styles.centerText, theme.text]}>{title}</Text> }
    </TouchableOpacity>
  );
}

const JaggedArrayNodeSectionTitle = ({ openRef, tref, title, heTitle, showHebrew }) => {
  const { themeStr } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  return (
    <TouchableOpacity onPress={() => { openRef(tref); }}>
      { showHebrew ?
        <SText lang={"hebrew"} style={[styles.he, styles.textTocSectionTitle, theme.text]}>{heTitle}</SText> :
        <SText lang={"english"} style={[styles.en, styles.textTocSectionTitle, theme.text]}>{title}</SText> }
    </TouchableOpacity>
  );
}


const ArrayMapNode = ({ schema, openRef, categories }) => {
  const { textLanguage, interfaceLanguage } = useContext(GlobalStateContext);
  const showHebrew = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == "hebrew";
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
        showHebrew={showHebrew}
        title={schema.title}
        heTitle={schema.heTitle}
      />
    );
  }
}


const CommentatorList = ({ commentatorList, openRef }) => {
  const { themeStr, textLanguage, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const showHebrew = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == "hebrew";
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


const CollapsibleNode = ({
  language,
  defaultInvisible,
  showHebrew,
  en,
  he,
  children,
  node,
}) => {
  const { themeStr } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const [isVisible, setIsVisible] = useState((node.includeSections || node.default) && !defaultInvisible);
  const toggleVisibility = () => { setIsVisible(!isVisible); };
  let icon = !node.default ?
    (<CollapseIcon isVisible={isVisible} showHebrew={showHebrew} />)
    : null;
  return (
    <View style={styles.textTocNamedSection}>
      {showHebrew ?
        (node.heTitle.length > 0 ? <TouchableOpacity onPress={toggleVisibility} style={{flex: 1, flexDirection: "row", justifyContent:"flex-end"}}>
          {icon}
          <SText lang={"hebrew"} style={[styles.he, styles.textTocSectionTitle, theme.text]}>{node.heTitle}</SText>
        </TouchableOpacity> : null) :
        ( node.title.length > 0 ? <TouchableOpacity onPress={toggleVisibility} style={{flex: 1, flexDirection: "row", justifyContent:"flex-start"}}>
          <SText lang={"english"} style={[styles.en, styles.textTocSectionTitle, theme.text]}>{node.title}</SText>
          {icon}
        </TouchableOpacity> : null)}
      { isVisible ? children : null }
    </View>
  );
}
CollapsibleNode.propTypes = {
  language:          PropTypes.oneOf(["hebrew", "english"]),
  defaultInvisible:  PropTypes.bool,
  showHebrew:        PropTypes.bool,
  en:                PropTypes.string,
  he:                PropTypes.string,
  children:          PropTypes.object,
  node:              PropTypes.object
};


export default ReaderTextTableOfContents;
