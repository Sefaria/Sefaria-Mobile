import PropTypes from 'prop-types';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import {
  SimpleHTMLView,
  SText,
} from './Misc';
import styles from './Styles.js';
import {useGlobalState} from "./Hooks";
import {VersionFilter} from "./Filter";


const VersionBlock = ({
  version,
  openUri,
  openFilter,
  handleOpenURL,
  segmentRef
}) => {
  const { theme, textLanguage, interfaceLanguage } = useGlobalState();


  let versionTitle, versionSource, shortVersionSource, license, licenseURL, versionNotes;
  if (Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == "hebrew") {
    versionTitle = version['versionTitleInHebrew'] || version['versionTitle'];
    versionSource = version['versionSource'];
    shortVersionSource = Sefaria.util.parseURLhost(versionSource);
    license = version['license'];
    licenseURL = Sefaria.util.getLicenseURL(license);
    versionNotes = version['versionNotesInHebrew'] || version['versionNotes'];
  } else {
    versionTitle = version['versionTitle'];
    versionSource = version['versionSource'];
    shortVersionSource = Sefaria.util.parseURLhost(versionSource);
    license = version['license'];
    licenseURL = Sefaria.util.getLicenseURL(license);
    versionNotes = version['versionNotes'];
  }

  const innerText = (
    <SText lang={"english"} style={[styles.en, styles.textTocVersionTitle, { textAlign: "left" }, theme.text]}>
      {versionTitle}
    </SText>
  );

  return (
    <View>
      <OpenVersionButton
          openFilter={openFilter}
          version={version}
          child={innerText}
          segmentRef={segmentRef}
      />
      <View style={styles.textTocVersionInfo}>
        { versionSource ?
          <TouchableOpacity onPress={() => { openUri(versionSource); }}>
            <Text style={[styles.textTocVersionInfoText, theme.tertiaryText]}>{shortVersionSource || versionSource}</Text>
          </TouchableOpacity>
          : null
        }
        { versionSource && (license && license !== "unknown") ?
          <Text style={[styles.dot, theme.tertiaryText]}>•</Text>
          : null
        }
        { license && license !== "unknown" ?
          <TouchableOpacity onPress={() => licenseURL ? openUri(licenseURL) : null}>
            <Text style={[styles.textTocVersionInfoText, theme.tertiaryText]}>{license}</Text>
          </TouchableOpacity>
          : null
        }
      </View>
      { versionNotes ?
        <SimpleHTMLView
          text={version['versionNotes']}
          lang={"english"}
          rendererProps={{a: {onPress: (event, url) => openUri(url)}}}
          extraStyles={[theme.tertiaryText]}
          onPressATag={handleOpenURL}
        /> : null
      }
    </View>
  );
}
VersionBlock.propTypes = {
  version:              PropTypes.object.isRequired,
  openFilter:           PropTypes.func,
  openUri:              PropTypes.func.isRequired,
  handleOpenURL:        PropTypes.func,
  segmentRef:           PropTypes.string.isRequired,
};

export default VersionBlock;

export const VersionBlockWithPreview = ({version, openFilter, segmentRef}) => {
  const {theme} = useGlobalState();
  const language = version.language;
  const inner = (
    <SimpleHTMLView
        text={version.text}
        lang={(language==='en') ? 'english' : 'hebrew'}
        extraStyles={[styles[language]]}
    />
  );
  return (
      <OpenVersionButton
          openFilter={openFilter}
          version={version}
          child={inner}
          segmentRef={segmentRef}
      />
  );
}
VersionBlockWithPreview.propTypes = {
  version: PropTypes.object.isRequired,
  openFilter: PropTypes.func.isRequired,
  segmentRef: PropTypes.string.isRequired,
};

const OpenVersionButton = ({openFilter, version, child, segmentRef}) => {
  const openVersionInSidebar = (versionTitle, heVersionTitle, versionLanguage) => {
    const filter = new VersionFilter(versionTitle, heVersionTitle, versionLanguage, segmentRef);
    openFilter(filter, "version");
  };
  const {theme} = useGlobalState();
  return (
      <TouchableOpacity
        style={[styles.versionsBoxVersionBlockWrapper, theme.bordered]}
        onPress={()=>{ openFilter &&
          openVersionInSidebar(version.versionTitle, version.versionTitleInHebrew, version.language);
        }}
      >
        {child}
      </TouchableOpacity>
  );
}
OpenVersionButton .propTypes = {
  version: PropTypes.object.isRequired,
  openFilter: PropTypes.func,
  segmentRef: PropTypes.string.isRequired,
  child: PropTypes.element.isRequired,
}
