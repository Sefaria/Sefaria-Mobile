//  Created by react-native-create-bridge

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { NativeModules, requireNativeComponent } from 'react-native';

class SelectableTextView extends Component {
  render () {
    return (<RCTSelectableTextView {...this.props} />);
  }
}

SelectableTextView.propTypes = {
  exampleProp: PropTypes.any
}
var RCTSelectableTextView = requireNativeComponent('RCTSelectableTextView', SelectableTextView);

export default SelectableTextView;
