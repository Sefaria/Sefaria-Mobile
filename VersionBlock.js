import PropTypes from 'prop-types';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
    openActionSheet,
    SimpleHTMLView,
    SText,
} from './Misc';
import styles from './Styles.js';
import {useGlobalState} from "./Hooks";
import {VersionFilter} from "./Filter";
import {useState} from "react";
import {iconData} from "./IconData";
import strings from './LocalizedStrings';


const useVersionTitle = (version) => {
  const { interfaceLanguage } = useGlobalState();
  if (version.merged) {
    return strings.mergedFrom + " " + Array.from(new Set(version.sources)).join(", ");
  } else if (interfaceLanguage === "english" || !version.versionTitleInHebrew) {
    return version.versionTitle;
  } else {
    return version.versionTitleInHebrew;
  }
}

const useTextAlign = () => {
  const {interfaceLanguage} = useGlobalState();
  return {textAlign: (interfaceLanguage === 'hebrew') ? 'right' : 'left'};
}

const VersionBlock = ({
  version,
  openUri,
  openFilter,
  segmentRef
}) => {
  const {theme} = useGlobalState();
  const textAlign = useTextAlign();
  const versionTitle = useVersionTitle(version);
  const innerText = (
    <SText lang={"english"} style={[styles.en, styles.textTocVersionTitle, textAlign, theme.text]}>
      {versionTitle}
    </SText>
  );

  return (
    <View>
      <VersionBlockHeader
          openFilter={openFilter}
          version={version}
          child={innerText}
          segmentRef={segmentRef}
      />
      <VersionMetadata showVersionTitle={false} openUri={openUri} version={version} />
    </View>
  );
}
VersionBlock.propTypes = {
  version:              PropTypes.object.isRequired,
  openFilter:           PropTypes.func,
  openUri:              PropTypes.func.isRequired,
  segmentRef:           PropTypes.string.isRequired,
};

export default VersionBlock;

export const VersionBlockWithPreview = ({version, openFilter, segmentRef, openUri, isCurrent, openRef, heVersionTitle}) => {
  const {theme, themeStr, interfaceLanguage, textLanguage} = useGlobalState();
  const textAlign = useTextAlign();
  const [showDetails, setShowDetails] = useState(false);
  const toggleShowDetails = () => {
    setShowDetails((prevState) => !prevState);
  };
  function makeShortVersionTitle() {
      let shortVersionTitle = version.shortVersionTitle || version.versionTitle;
      if (interfaceLanguage !== "english") {
          shortVersionTitle = version.shortVersionTitleInHebrew || version.versionTitleInHebrew || shortVersionTitle;
      }
      return shortVersionTitle;
  }
  const arrowDirection = (showDetails) ? 'up' : 'down';
  const icon = iconData.get(arrowDirection, themeStr);
  const language = version.language;
  const inner = (
    <SimpleHTMLView
        text={version.text}
        lang={(language==='en') ? 'english' : 'hebrew'}
        extraStyles={[styles[language]]}
    />
  );
  const currentlySelected = (isCurrent) ? strings.currentlySelected : '';
  const versionsToOpen = {['en']: version.versionTitle};
  if (textLanguage === 'hebrew') {
      versionsToOpen.he = heVersionTitle;
  }
  const openVersions = () => openActionSheet(segmentRef, versionsToOpen, openRef, interfaceLanguage, 'en');
  const openButton = (!isCurrent && <Text onPress={openVersions} style={[theme.openButton, {fontStyle: 'normal'}]}>{strings.open}</Text>)
  const padding = (showDetails) ? {paddingBottom: 7} : null;
  return (
    <View>
      <VersionBlockHeader
          openFilter={openFilter}
          version={version}
          child={inner}
          segmentRef={segmentRef}
      />
      <TouchableOpacity onPress={toggleShowDetails} style={padding} >
          <Text style={[textAlign, styles.versionTitle, theme.secondaryText]}>
              {interfaceLanguage === "hebrew" ? '‏' : '‎'}{/*neither textAlign nor writingDirection work*/}
              <Image source={icon} style={{height: 8, width: 8}} />
              {` ${makeShortVersionTitle()} • ${currentlySelected}`}
              {openButton}
          </Text>
      </TouchableOpacity>
      {showDetails && <VersionMetadata version={version} showVersionTitle={true} openUri={openUri} greyBackground={true}/>}
    </View>
  );
}
VersionBlockWithPreview.propTypes = {
  version: PropTypes.object.isRequired,
  openFilter: PropTypes.func.isRequired,
  segmentRef: PropTypes.string.isRequired,
  openUri: PropTypes.func.isRequired,
  isCurrent: PropTypes.bool.isRequired,
  openRef: PropTypes.func.isRequired,
  heVersionTitle: PropTypes.string
};

const VersionBlockHeader = ({openFilter, version, child, segmentRef}) => {
  const {theme} = useGlobalState();
  const openVersionInSidebar = () => {
    const filter = new VersionFilter(version.versionTitle, version.versionTitleInHebrew, version.language, segmentRef);
    openFilter(filter, "version");
  };
  return (
      <TouchableOpacity
        style={[theme.bordered, {marginTop: 17, marginBottom: 4}]}
        onPress={()=>{ openFilter &&
          openVersionInSidebar();
        }}
      >
        {child}
      </TouchableOpacity>
  );
}
VersionBlockHeader.propTypes = {
  version: PropTypes.object.isRequired,
  openFilter: PropTypes.func,
  segmentRef: PropTypes.string.isRequired,
  child: PropTypes.element.isRequired,
};


const VersionMetadata = ({version, showVersionTitle, openUri, greyBackground}) => {
    const {theme} = useGlobalState();
    const textAlign = useTextAlign();
    const shortVersionSource = Sefaria.util.parseURLhost(version.versionSource).replace("www.", "");
    const textStyle = [styles.textTocVersionInfoText];
    const backgroundStyle = (greyBackground) ? [theme.lighterGreyBackground, {padding: 5, borderRadius: 5}] : null;
    return (
        <View style={backgroundStyle}>
            {showVersionTitle && <Text style={[textStyle, theme.primaryText, textAlign]}>{useVersionTitle(version)}</Text>}
            <LinkWithKey elementKey={"source"} value={shortVersionSource} url={version.versionSource} openUri={openUri} />
            {version.digitizedBySefaria &&
                <LinkWithKey elementKey={'digitization'} value={strings.sefaria} url={'https://www.sefaria.org.il/digitized-by-sefaria'} openUri={openUri} />
            }
            {version.license &&
                <LinkWithKey
                    elementKey={'license'}
                    value={strings[version.license.replace(' ', '')] || version.license}
                    url={Sefaria.util.getLicenseURL(version.license) || ''}
                    openUri={openUri}
                />
            }
            {version.purchaseInformationURL &&
                <TouchableOpacity onPress={() => { openUri(version.purchaseInformationURL); }}>
                    <Text style={[textStyle, textAlign, theme.sefariaColorText]}>{strings.buyInPrint}</Text>
                </TouchableOpacity>
            }
        </View>
    );
}
VersionMetadata.propTypes = {
  version: PropTypes.object.isRequired,
  showVersionTitle: PropTypes.bool.isRequired,
  openUri: PropTypes.func.isRequired,
  greyBackground: PropTypes.bool,
};

const LinkWithKey = ({elementKey, value, url, openUri}) => {
    const {theme} = useGlobalState();
    const textAlign = useTextAlign();
    const textStyle = [styles.textTocVersionInfoText, theme.tertiaryText];
    return (
        <Text style={[textStyle, textAlign]}>
          {strings[elementKey]}:
          <Text style={textStyle} onPress={() => { openUri(url); }}> {value}</Text>
        </Text>
    );
}
LinkWithKey.propTypes = {
  elementKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  openUri: PropTypes.func.isRequired,
};
