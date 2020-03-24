//  Created by react-native-create-bridge

import { NativeModules } from 'react-native'

const { SelectableTextView } = NativeModules

export default {
  exampleMethod () {
    return SelectableTextView.exampleMethod()
  },

  EXAMPLE_CONSTANT: SelectableTextView.EXAMPLE_CONSTANT
}
