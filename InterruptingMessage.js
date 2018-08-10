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


var styles = StyleSheet.create({
  interruptingMessageClose: {
    width: 26,
    height: 26,
    marginBottom: 8,
  },
  interruptingMessageTitle: {
    fontFamily: "Amiri",
    fontSize: 32,
    textAlign: 'center',
    letterSpacing: 1,
    marginVertical: 20,
  },
  interruptingMessageText: {
    fontFamily: "Amiri",
    marginVertical: 10,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
  },
});

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

    const testUrl = "file:///Users/blocks-mini/Desktop/test.json"

    const component = this;
    const showModal = function(data) {
      component.data = data;
      component.showTimeout = setTimeout(() => {component.setModalVisible(true);}, 1000);
    };

    fetch(testUrl)
      .then(result=>result.json())
      .then(data=> {
        console.log("int mess data");
        console.log(data);
        if (data) {
          showModal(data);
        }
      })
      .catch(error=>{
        console.log("Interrupting Message fetch error:");
        console.log(error);
      });

  }
  
  setModalVisible(visible) {
    this.setState({modalVisible: visible});
  }

  afterClose() {
    /*
    AsyncStorage.setItem(data.name+data.repitition, 1).catch(function(error) {
      console.error("AsyncStorage failed to save: " + error);
    });
    */
  }

  render() {
    if (!this.data) { return null; }
    var textContent = this.data.text.map(text=>(<Text style={styles.enInt}>{text}</Text>));
    return (
      <View >
        <Modal
          animationType="slide"
          transparent={false}
          visible={this.state.modalVisible}
          onRequestClose={this.afterClose}>
          <RainbowBar />
          <View style={{paddingVertical: 20, paddingHorizontal: 30}}>
            <View>
                <View style={{flex: 1, alignItems: "flex-end"}}>
                  <TouchableHighlight
                    onPress={()=>{this.setModalVisible(false);}}>
                    <Image source={require("./img/circle-close.png")}
                      resizeMode={'contain'}
                      style={styles.interruptingMessageClose} />
                  </TouchableHighlight>
                </View>
              <Text style={styles.interruptingMessageTitle}>{this.data.title}</Text>
              {textContent}
            </View>
          </View>
        </Modal>

      </View>
    );
  }
}

export default InterruptingMessage;
