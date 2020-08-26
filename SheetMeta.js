import PropTypes from 'prop-types';

import React, {Component} from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    FlatList,
    Image,
    Platform,
    AppState,
    Dimensions,

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
import {CategoryAttribution, CloseButton, DirectedButton, HebrewInEnglishText} from "./Misc";
import HTMLView from 'react-native-htmlview';
const ViewPort = Dimensions.get('window');
var moment = require("moment");


class SheetMeta extends React.Component {
    static propTypes = {};

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        //console.log(this.props.sheetMeta)
    }


    render() {
        const { interfaceLanguage, textLanguage, theme } = this.props;
        const langStyle = interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt;
        var showHebrew = false;
        const tags = this.props.sheet.tags || [];
        var sheetTags = tags.map(function(tag, i) {
            return (

                    <TouchableOpacity  style={[styles.textBlockLink,theme.textBlockLink]}  onPress={()=> this.props.openSheetTagMenu(tag)} key={i}>
                        { showHebrew ?
                          <Text style={[styles.hebrewText, styles.centerText, theme.text]}>{tag}</Text> :
                          <Text style={[styles.englishText, styles.centerText, theme.text]}>{tag}</Text> }
                    </TouchableOpacity>
            )

          }.bind(this));


        return (
            <View style={[styles.menu, theme.menu]}>
                <CategoryColorLine category="Sheets"/>
                <View style={[styles.header, theme.header]}>
                    <CloseButton onPress={this.props.close} />
                    <Text
                        style={[langStyle, styles.textTocHeaderTitle, styles.textCenter, theme.text]}>{strings.tableOfContents}</Text>
                      <LanguageToggleButton />
                </View>

                <ScrollView style={styles.menuContent} contentContainerStyle={{paddingTop: 20, paddingBottom: 40}}>
                    <View style={[styles.textTocTopBox, theme.bordered]}>
                        <View>
                            <Text
                                style={[styles.en, styles.textTocTitle, theme.text]}><HebrewInEnglishText text={this.props.sheet.title} stylesHe={[styles.heInEn]} stylesEn={[]}/></Text>
                        </View>
                        <View style={styles.textTocCategoryBox}>
                            {interfaceLanguage == "hebrew" ?
                                <Text
                                    style={[styles.he, styles.textTocCategory, theme.secondaryText]}>דף</Text> :
                                <Text
                                    style={[styles.en, styles.textTocCategory, theme.secondaryText]}>Sheet</Text>}
                        </View>

                        <View style={{flexDirection: "row", flex: 1}}>

                            <Image
                                style={[styles.userAvatarMini]}
                                source={{uri: this.props.sheet.ownerImageUrl}}
                            />
                            <Text style={[{
                                alignSelf: "flex-start",
                                color: "#999"
                            }, styles.enInt]}>by {this.props.sheet.ownerName}</Text>
                        </View>

                        <View style={{flexDirection: "row", flex: 1}}>



                            <Text style={[{
                                alignSelf: "flex-end",
                                color: "#999",
                                margin: 5,
                            }, styles.enInt]}>{this.props.sheet.views} Views</Text>


                            <Text style={[{
                                alignSelf: "flex-end",
                                color: "#999",
                                margin: 5,
                            }, styles.enInt]}>Created {moment(this.props.sheet.dateCreated, "YYYY-MM-DDTHH:mm:ss.SSS").fromNow()}</Text>

                        </View>

                        <Text style={[{
                                alignSelf: "flex-end",
                                color: "#999"
                            }, styles.en]}>{this.props.sheet.summary}</Text>



                    </View>

                    <TwoBox language={textLanguage}>
                      { sheetTags }
                    </TwoBox>
                </ScrollView>
            </View>


        )
    }
}


export default SheetMeta;
