'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  FlatList,
  Image,

} from 'react-native';

import {
  CategoryColorLine,
  TwoBox,
  LanguageToggleButton,
  MenuButton,
  LoadingView
} from './Misc.js';

import styles from './Styles.js';
import strings from "./LocalizedStrings";
import {DirectedButton} from "./Misc";


class ReaderNavigationSheetTagMenu extends React.Component {
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    themeStr:       PropTypes.string.isRequired,
    menuLanguage:   PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      sheets: [],

    };
  }

  getData() {
    Sefaria.api.sheetsByTag(this.props.tag)
      .then(results => {
          this.setState({sheets: results.sheets});
        })

      .catch(error => {
        console.log(error)
      })
  }
  componentDidMount() {
    this.getData();
   }

  _keyExtractor = (sheet, pos) => {
    return sheet.id + "|" + pos;
  };


  renderItem = ({ item, index }) => {
      return (
          <View key={index} style={[this.props.theme.menu]}>
              <TouchableOpacity style={[styles.textBlockLink, this.props.theme.textBlockLink, {margin:0, borderBottomWidth: 1, borderBottomColor: "#ccc", paddingTop: 13}]}
                                onPress={() => this.props.openRef(item.id,item)} >

              <View style={{ flexDirection: (this.props.interfaceLang == "hebrew" ? "row-reverse" : "row"),flex:1}}>

                <Image
                    style={styles.userAvatar}
                    source={{uri: item.ownerImageUrl}}
                />
                <View style={{ flexDirection: "column",flex:1, marginRight: 20, marginLeft: 20}}>
                  <View style={{flexDirection: (this.props.interfaceLang == "hebrew" ? "row-reverse" : "row"), flex: 0, justifyContent: "space-between"}}>
                     <Text style={[styles.enInt, {alignSelf: "flex-start", color:"#666"}]}>{item.ownerName}</Text>
                     <View style={{flexDirection: (this.props.interfaceLang == "hebrew" ? "row-reverse" : "row"), alignSelf: "flex-end"}}>
                        <Text style={[{color:"#999"}, styles.enInt]}>{item.views}</Text>
                        <Image style={{marginTop: 5, marginLeft: 0, width:15, height: 10}} source={require('./img/eye.png')}/>
                     </View>
                   </View>
                  <View>
                    <Text style={styles.sheetListTitle}>{item.title.replace(/\s\s+/g, ' ')}</Text>
                  </View>
                </View>
              </View>


              </TouchableOpacity>
          </View>
      )
  }


    render() {
      var showHebrew = this.props.interfaceLang == "hebrew";

      if (this.state.sheets.length == 0) { return (<LoadingView />); }


      return(
            <View style={[styles.menu, this.props.theme.menu]}>
                <CategoryColorLine category="Sheets" />
              <View style={[styles.header, this.props.theme.header]}>
              <DirectedButton
                onPress={this.props.onBack}
                themeStr={this.props.themeStr}
                imageStyle={[styles.menuButton, styles.directedButton]}
                direction="back"
                language="english"/>
                {showHebrew ?
                  <Text style={[styles.he, styles.categoryTitle, this.props.theme.categoryTitle, {textTransform: "uppercase"}]}>{this.props.tag}</Text> :
                  <Text style={[styles.en, styles.categoryTitle, this.props.theme.categoryTitle, {textTransform: "uppercase"}]}>{this.props.tag}</Text> }
                <LanguageToggleButton
                  theme={this.props.theme}
                  toggleLanguage={this.props.toggleLanguage}
                  language={this.props.menuLanguage} />
              </View>

                <FlatList
                  style={{}}
                  data={this.state.sheets}
                  keyExtractor={(item, index) => item.id}
                  renderItem={this.renderItem}
                />


            </View>
      )

    }
}





export default ReaderNavigationSheetTagMenu;
