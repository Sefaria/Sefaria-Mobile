'use strict';
import PropTypes from 'prop-types';
import React, {useCallback, useState} from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Dimensions
} from 'react-native';

import {ErrorBoundaryFallbackComponent} from "./ErrorBoundaryFallbackComponent";
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
  ContentTextWithFallback,
} from './Misc.js';
import styles from './Styles';
import strings from './LocalizedStrings';
import iPad from './isIPad';
import { useGlobalState } from './Hooks.js';
import {ErrorBoundary} from "react-error-boundary";

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
  const { theme, interfaceLanguage, menuLanguage } = useGlobalState();
  const textErrorBoundaryAlert = useCallback(() => {
    textUnavailableAlert(title);
  }, [title]);
  var enTitle = title;
  var heTitle = Sefaria.index(title).heTitle;
  const isHeb = menuLanguage == "hebrew";
  const langStyle = interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt;
  var categories  = Sefaria.index(title).categories;
  var enCatString = categories.join(", ");
  var heCatString = categories.map(Sefaria.hebrewCategory).join(", ");
  return (
    <View style={[styles.menu, theme.menu]}>
      <CategoryColorLine category={Sefaria.primaryCategoryForTitle(title)} />
      <View style={[styles.header, theme.header]}>
        <CloseButton onPress={close} />
        <Text style={[langStyle, styles.textTocHeaderTitle, styles.textCenter, theme.text]}>{strings.tableOfContents}</Text>
        <View style={{marginRight: 10}}>
          <LanguageToggleButton />
        </View>
      </View>

      <ErrorBoundary FallbackComponent={ErrorBoundaryFallbackComponent} onError={textErrorBoundaryAlert}>
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
              exclude_structs={textToc?.exclude_structs || []}
              openRef={openRef} /> : <LoadingView category={Sefaria.primaryCategoryForTitle(title)}/> }

        </ScrollView>

      </ErrorBoundary>
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

const TextTableOfContentsNavigation = ({ schema, commentatorList, alts, defaultStruct, title, exclude_structs, openRef }) => {
  const [tab, setTab] = useState(defaultStruct);
  let toggle = null;
  let options = [];
  if (!exclude_structs.includes('schema')) {
    options = [{
      name: "default",
      text: "sectionNames" in schema ? schema.sectionNames[0] : "Contents",
      heText: "sectionNames" in schema ? Sefaria.hebrewSectionName(schema.sectionNames[0]) : "תוכן",
      onPress: () => {
        setTab('default');
      },
    }];
  }
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
  if (options.length > 1) {
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
  const { theme, menuLanguage } = useGlobalState();
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
    } else if (schema.nodeType === "DictionaryNode") {
      return (
        <DictionaryNode
          schema={schema}
          openRef={openRef}
        />
      );
    }

  } else {
    const showHebrew = menuLanguage == "hebrew";
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
            defaultInvisible={schema.nodes.length >= 20}
            node={node}
          >
            {innerContent}
          </CollapsibleNode>
        );
      } else if (node.nodeType == "ArrayMapNode") {
        // ArrayMapNode with only wholeRef
        return <ArrayMapNode
                  schema={node}
                  openRef={openRef}
                  key={i}
                  categories={categories} />;
      } else if (node.nodeType == "DictionaryNode") {
        return (
          <DictionaryNode
            key={i}
            schema={node}
            openRef={openRef}
          />
        );
      } else if (node.depth == 1) {
        const open = openRef.bind(null, refPath + ", " + node.title);
        return (
          <TouchableOpacity style={styles.textTocNamedSection} onPress={open} key={i}>
            <ContentTextWithFallback
              en={node.title} he={node.heTitle}
              extraStyles={[styles.textTocSectionTitle, theme.text]}
              lang={menuLanguage}
            />
          </TouchableOpacity>
        );
      } else {
        const innerContent = (<JaggedArrayNode
          schema={node}
          refPath={refPath + (node.default ? "" : ", " + node.title)}
          openRef={openRef} />);
        return (
          <CollapsibleNode
            key={i}
            defaultInvisible={!node.default && (schema.nodes.length >= 20 || (node.depth <= 2 && !!node.content_counts && node.content_counts.length >= 20))}
            node={node}
          >
            {innerContent}
          </CollapsibleNode>
        );
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

  const zoom = schema?.toc_zoom - 1 || 0;
  return (<JaggedArrayNodeSection
            depth={schema.depth - zoom}
            sectionNames={schema.sectionNames.slice(0, schema.sectionNames.length - zoom)}
            addressTypes={schema.addressTypes.slice(0, schema.addressTypes.length - zoom)}
            contentCounts={schema.content_counts}
            refPath={refPath}
            openRef={openRef}
            indexOffsetsByDepth={schema.index_offsets_by_depth || {}}
  />);}

const contentCountIsEmpty = count => {
  // Returns true if count is zero or is an an array (of arrays) of zeros.
  if (typeof count == "number") { return count == 0; }
  var innerCounts = count.map(contentCountIsEmpty);
  return innerCounts.every((empty) => {empty});
};

const reduceIndexOffsetsByDepth = indexOffsetsByDepth => {
  return Object.fromEntries(Object.entries(indexOffsetsByDepth)
      .filter(([k]) => k !== '1')
      .map(([k, v]) => [(k-1), v[i]]));
}

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

const JaggedArrayNodeSection = ({ depth, sectionNames, addressTypes, contentCounts, refPath, openRef, indexOffsetsByDepth }) => {
  const offset = indexOffsetsByDepth?.[1] || 0;
  const { menuLanguage, theme } = useGlobalState();
  const showHebrew = menuLanguage == "hebrew";
  if (depth > 2) {
    const content = [];
    for (let i = 0; i < contentCounts.length; i++) {
      if (contentCountIsEmpty(contentCounts[i])) { continue; }
      let enSection = i+1+offset;
      let heSection = Sefaria.hebrew.encodeHebrewNumeral(i+1+offset);
      if (["Talmud", "Folio"].includes(addressTypes[0])) {
        [enSection, heSection] = Sefaria.hebrew.setDafOrFolio(addressTypes[0], i+offset);
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
            refPath={`${refPath}:${enSection}`}
            openRef={openRef}
            indexOffsetsByDepth={reduceIndexOffsetsByDepth(indexOffsetsByDepth)}
          />
        </View>);
    }
    return ( <View>{content}</View> );
  }

  contentCounts = depth == 1 ? new Array(contentCounts).fill(1) : contentCounts;
  const sectionLinks = contentCounts.map((contentCount, i) => {
    if (contentCountIsEmpty(contentCounts[i])) { return null; }
    let section = i+1+offset;
    let heSection = Sefaria.hebrew.encodeHebrewNumeral(i+1+offset);
    if (["Talmud", "Folio"].includes(addressTypes[0])) {
      [section, heSection] = Sefaria.hebrew.setDafOrFolio(addressTypes[0], i+offset);
    }
    const ref  = (refPath + ":" + section).replace(":", " ") + refPathTerminal(contentCounts[i]);
    return (
      <JaggedArrayNodeSectionBox
        key={i}
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

const JaggedArrayNodeSectionBox = ({ tref, enableAliyot, openRef, title, heTitle }) => {
  const { theme, menuLanguage } = useGlobalState();
  const showHebrew = menuLanguage === 'hebrew';
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

const JaggedArrayNodeSectionTitle = ({ openRef, tref, title, heTitle }) => {
  const { theme, menuLanguage } = useGlobalState();
  const showHebrew = menuLanguage === 'hebrew';
  return (
    <TouchableOpacity onPress={() => { openRef(tref); }}>
      <ContentTextWithFallback
        en={title} he={heTitle}
        extraStyles={[styles.textTocSectionTitle, theme.text]}
        lang={menuLanguage}
      />
    </TouchableOpacity>
  );
}


const ArrayMapNode = ({ schema, openRef, categories }) => {
  const { menuLanguage } = useGlobalState();
  let offset = schema.offset || 0;
  if ("refs" in schema && schema.refs.length) {
    var sectionLinks = schema.refs.map((ref, i) => {
      if (schema.addresses) {
        i = schema.addresses[i];
      } else {
        i += offset;
      }
      if (schema.skipped_addresses) {
        while (schema.skipped_addresses.includes(i+1)) {
          i += 1;
          offset += 1;
        }
      }
      const enableAliyot = !!categories && categories[0] === "Tanakh" && categories[1] === "Torah";  // enable aliyot in reader when you click on an aliya
      let section = i+1;
      let heSection = Sefaria.hebrew.encodeHebrewNumeral(i+1);
      if (["Talmud", "Folio"].includes(schema.addressTypes[0])) {
        [section, heSection] = Sefaria.hebrew.setDafOrFolio(schema.addressTypes[0], i);
      }
      return (
        <JaggedArrayNodeSectionBox
          key={i}
          title={section}
          heTitle={heSection}
          openRef={openRef}
          tref={ref}
          enableAliyot={enableAliyot}
        />
      );
    });

    const langStyles = menuLanguage === 'hebrew' ? styles.rtlRow : null;
    return (
      <View style={[styles.textTocNumberedSection, langStyles]}>{sectionLinks}</View>
    );
  } else {
    return (
      <JaggedArrayNodeSectionTitle
        tref={schema.wholeRef.replace(/\./g, " ")}
        openRef={openRef}
        title={schema.title}
        heTitle={schema.heTitle}
      />
    );
  }
}


const DictionaryNode = ({ schema, openRef }) => {
  const { menuLanguage } = useGlobalState();
  const langStyles = menuLanguage === 'hebrew' ? styles.rtlRow : null;
  return (
    <View style={[styles.textTocNumberedSection, langStyles, {marginBottom: 30}]}>
      { schema.headwordMap.map(([letter, ref], i) => (
        <JaggedArrayNodeSectionBox
          key={i}
          title={letter}
          heTitle={letter}
          openRef={openRef}
          tref={ref}
        />
      ))}
    </View>
  );
}
DictionaryNode.propTypes = {
  schema:   PropTypes.object.isRequired,
  openRef:  PropTypes.func.isRequired,
};


const CommentatorList = ({ commentatorList, openRef }) => {
  const { theme, menuLanguage } = useGlobalState();
  const showHebrew = menuLanguage == "hebrew";
  const content = commentatorList.map((commentator, i) => {
    const open = openRef.bind(null, commentator.firstSection);
    return (
      <TouchableOpacity onPress={open} style={[styles.textBlockLink, theme.textBlockLink]} key={i}>
        { showHebrew ?
          <Text style={[styles.he, styles.centerText, theme.text]}>
            {commentator.heCollectiveTitle ? commentator.heCollectiveTitle : commentator.heTitle}
          </Text> :
          <Text style={[styles.en, styles.centerText, theme.text]}>
            {commentator.collectiveTitle ? commentator.collectiveTitle : commentator.title}
          </Text> }
      </TouchableOpacity>
    );
  });

  return (
    <TwoBox>
      { content }
    </TwoBox>
  );
}


const CollapsibleNode = ({
  defaultInvisible,
  node,
  children,
}) => {
  const { theme, menuLanguage } = useGlobalState();
  const [isVisible, setIsVisible] = useState((node.includeSections || node.default) && !defaultInvisible);
  const showHebrew = menuLanguage === 'hebrew';
  const toggleVisibility = () => { setIsVisible(!isVisible); };
  let icon = !node.default ?
    (<CollapseIcon isVisible={isVisible} showHebrew={showHebrew} />)
    : null;
  const titleEmpty = node[showHebrew ? 'heTitle' : 'title'].length === 0;
  return (
    <View style={styles.textTocNamedSection}>
      {titleEmpty ? null : (
        <TouchableOpacity onPress={toggleVisibility} style={{flex: 1, flexDirection: showHebrew ? "row-reverse" : "row"}}>
          <ContentTextWithFallback
            en={node.title} he={node.heTitle}
            extraStyles={[styles.textTocSectionTitle, theme.text]}
            lang={menuLanguage}
          />
          {icon}
        </TouchableOpacity>
      )}
      { isVisible ? children : null }
    </View>
  );
}
CollapsibleNode.propTypes = {
  language:          PropTypes.oneOf(["hebrew", "english"]),
  defaultInvisible:  PropTypes.bool,
  node:              PropTypes.object
};


export default ReaderTextTableOfContents;
