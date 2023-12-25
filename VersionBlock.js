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
import { GlobalStateContext, getTheme } from './StateManager';
import styles from './Styles.js';


const VersionBlock = ({
  version,
  openVersionInSidebar,
  openVersionInReader,
  openUri,
}) => {
  const { themeStr, textLanguage, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);

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

  const textAlign = { textAlign: "left" };
  return (
    <View>
      {
        versionTitle ?
          (openVersionInSidebar ?
            <TouchableOpacity onPress={onVersionTitleClick}>
              <Text style={[styles.en, styles.textTocVersionTitle, textAlign, theme.text]}>
                {versionTitle}
              </Text>
            </TouchableOpacity> :
            <SText lang={"english"} style={[styles.en, styles.textTocVersionTitle, textAlign, theme.text]}>
              {versionTitle}
            </SText>)
        : null
      }
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
