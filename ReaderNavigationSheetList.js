'use strict';

import PropTypes from 'prop-types';

import React from 'react';
import {
  Text,
  View,
  FlatList,
  RefreshControl,
} from 'react-native';

import {
  CategoryColorLine,
} from './Misc.js';

import styles from './Styles.js';
import strings from "./LocalizedStrings";
import {DirectedButton} from "./Misc";
import SheetResult from "./SheetResult";
import MySheetResult from "./MySheetResult";


class ReaderNavigationSheetList extends React.Component {
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    themeStr:       PropTypes.string.isRequired,
    menuOpen:       PropTypes.oneOf(["mySheets"]),
  };

  constructor(props) {
    super(props);
    this.state = {
      sheets: [],
      refreshing: true,
    };
  }

  componentDidMount() { this.loadData(); }

  loadData = async () => {
    const { menuOpen } = this.props;
    try {
      let sheets;
      if (menuOpen === 'mySheets') {
        sheets = await Sefaria.api.mySheets();
      }
      this.setState({ sheets, refreshing: false });
    } catch (error) {
      this.setState({ refreshing: false });
      console.log(error);
    }
  }

  onRefresh = () => { this.setState({ refreshing: true }, this.loadData); }

  _keyExtractor = (sheet, pos) => {
    return sheet.id + "|" + pos;
  };


  renderItem = ({ item }) => {
    return (
      <View style={[this.props.theme.menu]}>
        {
          this.props.menuOpen === 'mySheets' ? (
            <MySheetResult
              title={item.title}
              heTitle={item.title}
              views={item.views}
              topics={item.topics}
              created={item.created}
              isPrivate={item.status === 'unlisted'}
              onPress={() => this.props.openRef(item.id,item)}
            />
          ) : (
            <SheetResult
              title={item.title}
              heTitle={item.title}
              ownerImageUrl={item.ownerImageUrl}
              ownerName={item.ownerName}
              views={item.views}
              onPress={() => this.props.openRef(item.id,item)}
            />
          )
        }
      </View>
    );
  }


    render() {
      const showHebrew = this.props.interfaceLanguage == "hebrew";
      const title = strings.mySheets;

      return(
            <View style={[styles.menu, this.props.theme.menu]}>
                <CategoryColorLine category="Sheets" />
              <View style={[styles.header, this.props.theme.header]}>
                <DirectedButton
                  onPress={this.props.onBack}
                  themeStr={this.props.themeStr}
                  imageStyle={[styles.menuButton, styles.directedButton]}
                  direction="back"
                  language="english"
                />
                {showHebrew ?
                  <Text style={[styles.he, styles.categoryTitle, this.props.theme.categoryTitle, {textTransform: "uppercase"}]}>{title}</Text> :
                  <Text style={[styles.en, styles.categoryTitle, this.props.theme.categoryTitle, {textTransform: "uppercase"}]}>{title}</Text>
                }
                <DirectedButton
                  onPress={this.props.onBack}
                  themeStr={this.props.themeStr}
                  imageStyle={[styles.menuButton, styles.directedButton, {opacity: 0}]}
                  direction="back"
                  language="english"
                />
              </View>
              <FlatList
                style={{}}
                data={this.state.sheets}
                keyExtractor={(item, index) => ''+item.id}
                renderItem={this.renderItem}
                refreshControl={
                  <RefreshControl
                    refreshing={this.state.refreshing}
                    onRefresh={this.onRefresh}
                    tintColor="#CCCCCC"
                    style={{ backgroundColor: 'transparent' }} />
                }
              />
            </View>
      )

    }
}





export default ReaderNavigationSheetList;
