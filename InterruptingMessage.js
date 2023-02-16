'use strict';

import React from 'react';
import {
  Image,
  Modal,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RainbowBar,
} from './Misc.js';
import bstyles from './Styles';
import { getTheme, GlobalStateContext } from './StateManager.js';
import {iconData} from "./IconData";

var styles = StyleSheet.create({
  interruptingMessageBox: {
    paddingVertical: 20,
    paddingHorizontal: 30,
    maxWidth: 520,
  },
  interruptingMessageCloseBox: {
    flex: 0,
    alignItems: "flex-end",
    height: 26
  },
  interruptingMessageClose: {
    width: 26,
    height: 26,
    marginBottom: 32,
  },
  interruptingMessageTitle: {
    fontSize: 36,
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 30,
    marginBottom: 14,
  },
  interruptingMessageTitleEn: {
    fontFamily: "Amiri"
  },
  interruptingMessageTitleHe: {
    fontFamily: "Open Sans"
  },
  interruptingMessageText: {
    fontSize: 20,
    lineHeight: 26,
    marginTop: -10,
    paddingTop: 15,
    paddingBottom: 16,
  },
});

// Updates when JSON structure changes
const SCHEMA_VERSION = 1;
const MESSAGE_PREFIX = "IntMessage:";
const NUM_TIMES_OPENED_APP_THRESHOLD = 0;
// Example JSON below
//const EN_URL = "https://www.sefaria.org/static/mobile/message-en.json";
//const HE_URL = "https://www.sefaria.org/static/mobile/message-he.json";

const EN_URL = "https://www.sefaria.org/static/mobile/message-en.json";
const HE_URL = "https://www.sefaria.org/static/mobile/message-he.json";

const EN_DEBUG_URL = "https://www.sefaria.org/static/mobile/test/message-en.json";
const HE_DEBUG_URL = "https://www.sefaria.org/static/mobile/test/message-he.json";

class InterruptingMessage extends React.Component {
  static contextType = GlobalStateContext;
  constructor(props) {
    super(props);
    this.state = {
      modalVisible: false,
      data: null
    };
  }
  componentDidMount() {
    this._isMounted = true;
  }
  componentWillUnmount() {
    this._isMounted = false;
  }

  checkForMessage = () => {
    if (this.data) { return; }
    const isHeb = this.props.interfaceLanguage == "hebrew";
    const URL = this.props.debugInterruptingMessage ? (isHeb ? HE_DEBUG_URL : EN_DEBUG_URL) : (isHeb ? HE_URL : EN_URL);
    const showModal = data => {
      this.setState({data: data});
      this.showTimeout = setTimeout(() => {
        if (this._isMounted) {
          this.setModalVisible(true);
        }
      }, 20 * 1000);
    };

    fetch(URL)
      .then(result=>result.json())
      //.then(this.clearFlag) // Debug
      .then(this.hasMessageShown)
      .then(data=> {
        //console.log("intmess data:", data);
        if (data && data.shouldShow && data.schemaVersion == SCHEMA_VERSION) {
          showModal(data);
        }
      })
      .catch(error=>{
        console.log(error)
      });
  }

  hasMessageShown = data => {
    return new Promise((resolve, reject) => {
      if (!data) { resolve(null); }
      const flagName = `${MESSAGE_PREFIX}${this.props.debugInterruptingMessage ? 'DEBUG:' : ''}${data.name}`;
      AsyncStorage.getItem(flagName).then(value => {
        //console.log("message has show:", JSON.parse(value));
        value = JSON.parse(value);
        data.shouldShow = !value;
        if (!value || data.shouldShow) {
          value = {numTimesOpenedApp: Sefaria.numTimesOpenedApp, hasShown: data.shouldShow};
          AsyncStorage.setItem(flagName,JSON.stringify(value));
        }
        resolve(data);
      });
    });
  }

  clearFlag = data => {
    // for Debug
    if (!data) { return new Promise((resolve, reject)=>{resolve(data);}) }
    const flagName = `${MESSAGE_PREFIX}${this.props.debugInterruptingMessage ? 'DEBUG:' : ''}${data.name}`;
    return new Promise((resolve, reject) => {
      AsyncStorage.removeItem(flagName).then(value => {
        resolve(data);
      });
    });
  }

  setModalVisible = visible => {
    this.setState({modalVisible: visible});
  }

  close = () => {
    this.setModalVisible(false);
  }

  openLink = url => {
    this.props.openInDefaultBrowser(this.state.data.buttonLink);
    this.close();
  }

  render() {
    if (!this.state.data) { return null; }
    const theme = getTheme(this.context.themeStr);
    const data = this.state.data;
    const titleStyle = this.props.interfaceLanguage == "hebrew" ? styles.interruptingMessageTitleHe : styles.interruptingMessageTitleEn;
    const textStyle = this.props.interfaceLanguage == "hebrew" ? bstyles.intHe : bstyles.en;
    const textContent = data.text.map((text, i)=>(
      <Text style={[styles.interruptingMessageText, textStyle, theme.secondaryText]} key={i}>{text}</Text>
    ));
    return (
      <Modal
        animationType="slide"
        transparent={false}
        style={{margin: 0, alignItems: undefined, justifyContent: undefined,}}
        visible={this.state.modalVisible}
        onRequestClose={this.close}>
        <SafeAreaView style={[bstyles.safeArea, theme.mainTextPanel]}>
          <RainbowBar />
          <ScrollView>
            <View style={bstyles.centeringBox}>
              <View style={styles.interruptingMessageBox}>
                  <View style={styles.interruptingMessageCloseBox}>
                    <TouchableOpacity
                      onPress={this.close}
                      accessibilityLabel="Close pop up"
                    >
                      <Image source={iconData.get('circle-close', this.context.themeStr)}
                        resizeMode={'contain'}
                        style={styles.interruptingMessageClose} />
                    </TouchableOpacity>
                  </View>

                <Text style={[styles.interruptingMessageTitle, titleStyle, theme.text]}>{data.title}</Text>

                {textContent}

                <View style={bstyles.centeringBox}>
                  <View style={[bstyles.blueButton, {marginVertical: 12}]}>
                    <TouchableOpacity onPress={()=>{
                        this.openLink(data.buttonLink);
                      }}>
                      <Text style={bstyles.blueButtonText}>{data.buttonText}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }
}

export default InterruptingMessage;


/*
Example JSON
- text is an array of strings treated as paragraphs
- name determines the flag to check if a message has already been shown. Updating name will case message to show again.
{
  "title": "Support Sefaria",
  "text": [
    "Sefaria’s library is free for everyone and it’s more accessible than ever with a growing body of translations. But, we can only continue to foster Torah learning with your support.",
    "Thank you, you're the best."
  ],
  "buttonLink": "https://sefaria.nationbuilder.com",
  "buttonText": "Make a Donation",
  "name": "holidayDonation-2018",
  "schemaVersion": 1,
}




*/
