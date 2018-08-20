import React, {Component} from 'react';
import {
  AsyncStorage,
  Image,
  Modal,
  Text,
  TouchableHighlight,
  SafeAreaView,
  StyleSheet,
  View
} from 'react-native';
import HTMLView from 'react-native-htmlview';
import {
  RainbowBar,
} from './Misc.js';
import bstyles from './Styles';


var styles = StyleSheet.create({
  interruptingMessageBox: {
    paddingVertical: 20,
    paddingHorizontal: 30,
    maxWidth: 520,
    backgroundColor: "white",
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
    fontFamily: "Amiri",
    fontSize: 36,
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 30,
    marginBottom: 14,
  },
  interruptingMessageText: {
    fontFamily: "Amiri",
    textAlign: "justify",
    fontSize: 22,
    lineHeight: 26, 
    marginTop: -10,
    paddingTop: 15,
    paddingBottom: 16,
    color: "#666",
  },
});

// Updates when JSON structure changes
const SCHEMA_VERSION = 1;

// Example JSON below
const EN_URL = "https://www.sefaria.org/static/mobile/message-en.json";
const HE_URL = "https://www.sefaria.org/static/mobile/message-he.json";

//const EN_URL = "file:///Users/blocks-mini/dev/Sefaria-Project/static/mobile/message-en.json";
//const HE_URL = "file:///Users/blocks-mini/dev/Sefaria-Project/static/mobile/message-he.json";

class InterruptingMessage extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      modalVisible: false,
      data: null
    };
    this.checkForMessage();
  }
  
  checkForMessage() {
    if (this.data) { return; }

    const URL = this.props.interfaceLang == "hebrew" ? HE_URL : EN_URL; 

    const component = this;
    const showModal = function(data) {
      component.setState({data: data});
      component.showTimeout = setTimeout(() => {
        component.setModalVisible(true);
      }, 1000);
    };

    fetch(URL)
      .then(result=>result.json())
      //.then(this.clearFlag) // Debug
      .then(this.hasMessageShown)
      .then(data=> {
        console.log("intmess data:", data);
        if (data && !data.hasShown && data.schemaVersion == SCHEMA_VERSION) { 
          showModal(data); 
        }
      })
      .catch(error=>{
        console.log(error)
      });
  }
  
  hasMessageShown(data) {
    return new Promise((resolve, reject) => {
      if (!data) { resolve(null); }
      const flagName = "IntMess:" + data.name;
      AsyncStorage.getItem(flagName).then(value => {
        console.log("message has show:", JSON.parse(value));
        data.hasShown = !!value;        
        resolve(data);
      });
    });
  }

  clearFlag(data) {
    // for Debug
    if (!data) { return new Promise((resolve, reject)=>{resolve(data);}) }
    const flagName = "IntMess:" + data.name;
    return new Promise((resolve, reject) => {
      AsyncStorage.removeItem(flagName).then(value => {    
        resolve(data);
      });
    });  
  }

  setModalVisible(visible) {
    this.setState({modalVisible: visible});
  }

  close() {
    const flagName = "IntMess:" + this.state.data.name;
    console.log("close")
    AsyncStorage.setItem(flagName, "1")
      .catch(function(error) {
        console.error("AsyncStorage failed to save: " + error);
      });
    this.setModalVisible(false);
  }

  openLink(url) {
    this.props.openWebViewPage(this.state.data.buttonLink);
    this.close();
  }

  render() {
    if (!this.state.data) { return null; }
    const data = this.state.data;
    const textContent = data.text.map((text, i)=>(
      <Text style={styles.interruptingMessageText} key={i}>{text}</Text>
    ));
    return (
      <View >
        <Modal
          animationType="slide"
          transparent={false}
          visible={this.state.modalVisible}>
          
          <SafeAreaView style={bstyles.safeArea}>
          <RainbowBar />
          <View style={bstyles.centeringBox}>
            <View style={styles.interruptingMessageBox}>
                <View style={styles.interruptingMessageCloseBox}>
                  <TouchableHighlight
                    onPress={()=>{this.close();}}>
                    <Image source={require("./img/circle-close.png")}
                      resizeMode={'contain'}
                      style={styles.interruptingMessageClose} />
                  </TouchableHighlight>
                </View>

              <Text style={styles.interruptingMessageTitle}>{data.title}</Text>
              
              {textContent}

              <View style={bstyles.centeringBox}>
              <View style={[bstyles.blueButton, {marginTop: 12}]}>
                <TouchableHighlight onPress={()=>{this.openLink(data.buttonLink)}}>
                  <Text style={bstyles.blueButtonText}>{data.buttonText}</Text>
                </TouchableHighlight>
              </View>
              </View>
            </View>
          </View>
          </SafeAreaView>
        </Modal>

      </View>
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
