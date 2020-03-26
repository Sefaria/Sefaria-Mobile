//  Created by react-native-create-bridge

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { NativeModules, requireNativeComponent } from 'react-native';

class SelectableTextView extends Component {

  render () {
    const { onSelection } = this.props;
    const onSelectionNative = ({
     nativeEvent: { content, eventType, selectionStart, selectionEnd },
    }) => {
     onSelection && onSelection({ content, eventType, selectionStart, selectionEnd })
    };
    return (<RCTSelectableTextView {...this.props} onSelection={onSelectionNative}/>);
  }
}

SelectableTextView.propTypes = {
  exampleProp: PropTypes.any
}
var RCTSelectableTextView = requireNativeComponent('RCTSelectableTextView', SelectableTextView);

export default SelectableTextView;
