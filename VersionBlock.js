import React, { useContext, useCallback } from 'react';
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


const VersionBlock = ({
  version,
  openVersionInSidebar,
  openVersionInReader,
  openUri,
  handleOpenURL,
}) => {
  const { theme, textLanguage, interfaceLanguage } = useGlobalState();

  const onVersionTitleClick = useCallback(() => {
    const action = openVersionInSidebar ? openVersionInSidebar : openVersionInReader;
    if (action) {
      action(version.versionTitle, version.versionTitleInHebrew, version.language);
    }
  }, [version]);
  const onSelectVersionClick = useCallback(() => {
    if (openVersionInReader) {
      openVersionInReader(version.versionTitle, version.language);
    }
  }, [version]);

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

  return (
    <View>
      <VersionBlockTitle text={versionTitle}/>
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
  openVersionInSidebar: PropTypes.func,
  openVersionInReader:  PropTypes.func,
  openUri:              PropTypes.func.isRequired,
};

export default VersionBlock;

const VersionBlockTitle = ({text}) => {
  const {theme} = useGlobalState();
  return (
    <SText lang={"english"} style={[styles.en, styles.textTocVersionTitle, { textAlign: "left" }, theme.text]}>
      {text}
    </SText>
  );
}
