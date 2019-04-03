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
    WebView,
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
import Sheet from "./Sheet"; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)
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
        const langStyle = this.props.interfaceLang === "hebrew" ? styles.heInt : styles.enInt;
        var showHebrew = false;
        var sheetTags = this.props.sheet.tags.map(function(tag, i) {
            return (

                    <TouchableOpacity  style={[styles.textBlockLink,this.props.theme.textBlockLink]}  onPress={()=> this.props.openSheetTagMenu(tag)} key={i}>
                        { showHebrew ?
                          <Text style={[styles.hebrewText, styles.centerText, this.props.theme.text]}>{tag}</Text> :
                          <Text style={[styles.englishText, styles.centerText, this.props.theme.text]}>{tag}</Text> }
                    </TouchableOpacity>
            )

          }.bind(this));


        return (
            <View style={[styles.menu, this.props.theme.menu]}>
                <CategoryColorLine category="Sheets"/>
                <View style={[styles.header, this.props.theme.header]}>
                    <CloseButton onPress={this.props.close} theme={this.props.theme} themeStr={this.props.themeStr}/>
                    <Text
                        style={[langStyle, styles.textTocHeaderTitle, styles.textCenter, this.props.theme.text]}>{strings.tableOfContents}</Text>
                    <LanguageToggleButton theme={this.props.theme} toggleLanguage={this.props.toggleLanguage} interfaceLang={this.props.interfaceLang} language={this.props.contentLang}/>
                </View>

                <ScrollView style={styles.menuContent} contentContainerStyle={{paddingTop: 20, paddingBottom: 40}}>
                    <View style={[styles.textTocTopBox, this.props.theme.bordered]}>
                        <View>
                            <Text
                                style={[styles.en, styles.textTocTitle, this.props.theme.text]}><HebrewInEnglishText text={this.props.sheet.title} stylesHe={[styles.heInEn]} stylesEn={[]}/></Text>
                        </View>
                        <View style={styles.textTocCategoryBox}>
                            {this.props.contentLang == "hebrew" ?
                                <Text
                                    style={[styles.he, styles.textTocCategory, this.props.theme.secondaryText]}>דף</Text> :
                                <Text
                                    style={[styles.en, styles.textTocCategory, this.props.theme.secondaryText]}>Sheet</Text>}
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

                    <TwoBox content={sheetTags} language={this.props.menuLanguage} />



                </ScrollView>
            </View>


        )
    }
}


export default SheetMeta;
