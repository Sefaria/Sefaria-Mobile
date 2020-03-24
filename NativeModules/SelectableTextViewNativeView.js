//  Created by react-native-create-bridge

import React, { Component } from 'react'
import { requireNativeComponent } from 'react-native'

const SelectableTextView = requireNativeComponent('SelectableTextView', SelectableTextViewView)

export default class SelectableTextViewView extends Component {
  render () {
    return <SelectableTextView {...this.props} />
  }
}

SelectableTextViewView.propTypes = {
  exampleProp: React.PropTypes.any
}
