'use strict';

import PropTypes from 'prop-types';
import React from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';

const ReaderDisplayOptionsMenu  = require('./ReaderDisplayOptionsMenu');
const styles                    = require('./Styles.js');
const {
  MenuButton,
  DirectedButton,
  DisplaySettingsButton,
  CategoryAttribution
} = require('./Misc.js');

class ReaderControls extends React.Component {
  static propTypes = {
    theme:                           PropTypes.object,
    title:                           PropTypes.string,
    language:                        PropTypes.string,
    categories:                      PropTypes.array,
    openNav:                         PropTypes.func,
    openTextToc:                     PropTypes.func,
    goBack:                          PropTypes.func,
    themeStr:                        PropTypes.oneOf(["white", "black"]),
    toggleReaderDisplayOptionsMenu:  PropTypes.func,
    backStack:                       PropTypes.array,
  };

  render() {
    var langStyle = this.props.language === "hebrew" ? [styles.he, {marginTop: 4}] : [styles.en];
    var titleTextStyle = [langStyle, styles.headerTextTitleText, this.props.theme.text];
    if (this.props.backStack.length == 0) {
      var leftMenuButton = <MenuButton onPress={this.props.openNav} theme={this.props.theme} themeStr={this.props.themeStr}/>
    } else {
      var leftMenuButton =
        <DirectedButton
          onPress={this.props.goBack}
          themeStr={this.props.themeStr}
          imageStyle={[styles.menuButton, styles.directedButton]}
          language="english"
          direction="back"/>
    }
    return (
        <View style={[styles.header, this.props.theme.header]}>
          {leftMenuButton}
          <TouchableOpacity style={styles.headerTextTitle} onPress={this.props.openTextToc}>
            <View style={styles.headerTextTitleInner}>
              <Image source={this.props.themeStr == "white" ? require('./img/caret.png'): require('./img/caret-light.png') }
                       style={[styles.downCaret, this.props.language === "hebrew" ? null: {opacity: 0}]}
                       resizeMode={Image.resizeMode.contain} />
              <Text style={titleTextStyle} numberOfLines={1} ellipsizeMode={"tail"}>
                {this.props.title}
              </Text>
              <Image source={this.props.themeStr == "white" ? require('./img/caret.png'): require('./img/caret-light.png') }
                       style={[styles.downCaret, this.props.language === "hebrew" ? {opacity: 0} : null]}
                       resizeMode={Image.resizeMode.contain} />
            </View>
            <CategoryAttribution
              categories={this.props.categories}
              language={this.props.language === "hebrew" ? "hebrew" : "english"}
              context={"header"}
              linked={false} />
          </TouchableOpacity>
          <DisplaySettingsButton onPress={this.props.toggleReaderDisplayOptionsMenu} themeStr={this.props.themeStr}/>
        </View>
    );
  }
}

export default ReaderControls;
