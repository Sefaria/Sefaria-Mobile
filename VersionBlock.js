import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';


class VersionBlock extends React.Component {
  static propTypes = {
    title:                PropTypes.string,
    version:              PropTypes.object.isRequired,
    currVersions:         PropTypes.object.isRequired,
    openVersionInSidebar: PropTypes.func,
    openVersionInReader:  PropTypes.func,
    getLicenseMap:        PropTypes.func.isRequired,
    isCurrent:            PropTypes.bool,
  };

  onVersionTitleClick = () => {
    const action = this.props.openVersionInSidebar ? this.props.openVersionInSidebar : this.props.openVersionInReader;
    if (action) {
      action(this.props.version.versionTitle, this.props.version.language);
    }
  }
  onSelectVersionClick = () => {
    if (this.props.openVersionInReader) {
      this.props.openVersionInReader(this.props.version.versionTitle, this.props.version.language);
    }
  }
  render() {
    const versionInfo = this.props.version;
    let versionTitle, versionSource, shortVersionSource, license, licenseURL, versionNotes;
    if (this.props.textLang == "hebrew") {
      versionTitle = versionInfo['heVersionTitle'];
      versionSource = versionInfo['heVersionSource'];
      shortVersionSource = Sefaria.util.parseURLhost(versionSource);
      license = versionInfo['heLicense'];
      licenseURL = Sefaria.util.getLicenseURL(license);
      versionNotes = versionInfo['heVersionNotes'];
    } else {
      versionTitle = versionInfo['versionTitle'];
      versionSource = versionInfo['versionSource'];
      shortVersionSource = Sefaria.util.parseURLhost(versionSource);
      license = versionInfo['license'];
      licenseURL = Sefaria.util.getLicenseURL(license);
      versionNotes = versionInfo['versionNotes'];
    }

    return (
      <View>
        {
          versionTitle ?
          <Text style={[styles.en, styles.textTocVersionTitle, this.props.theme.text]}>{versionTitle}</Text>
          : null
        }
        <View style={styles.textTocVersionInfo}>
          { versionSource ?
            <TouchableOpacity style={[styles.navBottomLink, styles.textTocVersionInfoItem]} onPress={() => {Linking.openURL(versionSource);}}>
              <Text style={[styles.textTocVersionInfoText, this.props.theme.tertiaryText]}>{shortVersionSource}</Text>
            </TouchableOpacity>
            : null
          }
          { license && license !== "unknown" ?
            <TouchableOpacity style={[styles.navBottomLink, styles.textTocVersionInfoItem]} onPress={() => licenseURL ? Linking.openURL(licenseURL) : null}>
              <Text style={[styles.textTocVersionInfoText, this.props.theme.tertiaryText]}>{license}</Text>
            </TouchableOpacity>
            : null
          }
        </View>
        { versionNotes ?
          <HTMLView
            value={"<div>"+versionInfo['versionNotes']+"</div>"}
            onLinkPress={(url) => Linking.openURL(url) }
            stylesheet={styles}
            textComponentProps={{style: [styles.textTocVersionNotes, this.props.theme.tertiaryText]}}
          />
          : null
        }
      </View>
    );
  }
}

module.exports = VersionBlock;
