'use strict';
import PropTypes from 'prop-types';
import React from 'react';
import ReactNative, {
  requireNativeComponent,
  TouchableOpacity,
  Text,
  View,
} from 'react-native';

const styles =                require('./Styles.js');
const TextRange =            require('./TextRange');
const TextRangeContinuous = require('./TextRangeContinuous');
const TextHeightMeasurer = require('./TextHeightMeasurer');
const queryLayoutByID =   require('queryLayoutByID');
const SefariaListView = requireNativeComponent('SefariaListView', TextColumn);

class TextColumn extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      clicked: 0,
    }
  }
  onClick = (e) => {
    this.setState({clicked: this.state.clicked + 1});
  }
  render() {
    return (
      <View style={{flex: 1}}>
        <TouchableOpacity onPress={this.onClick}>
          <Text>{"BUTTON"}</Text>
        </TouchableOpacity>
        <SefariaListView
          style={{flex: 1}}
          message={"Clicked" + this.state.clicked}
          object={{yo: "yoyo", sup: "supsup"}} 
        />
      </View>
    );
  }
}

module.exports = TextColumn;
