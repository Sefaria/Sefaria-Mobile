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
  interruptingMessageContainer: {

  },
  interruptingMessageBox: {
    paddingVertical: 20,
    paddingHorizontal: 30,
    maxWidth: 420,
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


// Example JSON below
const EN_URL = "file:///Users/blocks-mini/Desktop/test.json";
const HE_URL = "file://does/not/exist";

class InterruptingMessage extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      modalVisible: false,
    };
    this.checkForMessage();
  }
  
  checkForMessage() {
    if (this.data) { return; }

    const URL = this.props.interfaceLang == "hebrew" ? HE_URL : EN_URL; 

    const component = this;
    const showModal = function(data) {
      component.data = data;
      component.showTimeout = setTimeout(() => {
        component.setModalVisible(true);
      }, 1000);
    };

    fetch(URL)
      .then(result=>result.json())
      .then(data=> {
        if (data) { showModal(data); }
      })
      .catch(error=>{
        console.log("Interrupting Message fetch error:");
        console.log(error);
      });
  }
  
  hasMessageShown(data) {

  }

  setModalVisible(visible) {
    this.setState({modalVisible: visible});
  }

  afterClose() {
    AsyncStorage.setItem(this.data.name+this.data.repetition, 1)
      .catch(function(error) {
        console.error("AsyncStorage failed to save: " + error);
      });
  }

  openLink(url) {
    this.setModalVisible(false);
    this.props.openWebViewPage(this.data.buttonLink);
    this.afterClose();
  }

  render() {
    if (!this.data) { return null; }
    var textContent = this.data.text.map(text=>(
      <Text style={styles.interruptingMessageText}>{text}</Text>
    ));
    return (
      <View >
        <Modal
          animationType="slide"
          transparent={false}
          visible={this.state.modalVisible}
          onRequestClose={this.afterClose}>
          <RainbowBar />
          <View style={styles.interruptingMessageContainer}>
            <View style={styles.interruptingMessageBox}>
                <View style={{flex: 1, alignItems: "flex-end", height: 26}}>
                  <TouchableHighlight
                    onPress={()=>{this.setModalVisible(false);}}>
                    <Image source={require("./img/circle-close.png")}
                      resizeMode={'contain'}
                      style={styles.interruptingMessageClose} />
                  </TouchableHighlight>
                </View>
              <Text style={styles.interruptingMessageTitle}>{this.data.title}</Text>
              
              {textContent}

              <View style={bstyles.centeringBox}>
              <View style={[bstyles.blueButton, {marginTop: 12}]}>
                <TouchableHighlight onPress={()=>{this.openLink(this.data.buttonLink)}}>
                  <Text style={bstyles.blueButtonText}>{this.data.buttonText}</Text>
                </TouchableHighlight>
              </View>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    );
  }
}

export default InterruptingMessage;


/*
Example JSON 
- text is an array of strings treated as paragraphs
- name & repetition together determine if a message has already been shown
{
  "title": "Support Sefaria",
  "text": [
    "Sefaria’s library is free for everyone and it’s more accessible than ever with a growing body of translations. But, we can only continue to foster Torah learning with your support.", 
    "Thank you, you're the best."
  ],
  "buttonLink": "https://sefaria.nationbuilder.com",
  "buttonText": "Make a Donation",
  "name": "holidayDonation-2018",
  "repetition": 1
}




*/
