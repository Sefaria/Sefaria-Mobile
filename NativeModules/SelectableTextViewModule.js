//  Created by react-native-create-bridge

import { NativeModules } from 'react-native';

const { SelectableTextView } = NativeModules;
//export const exampleMethod = NativeModules.SelectableTextView.exampleMethod;

export const EXAMPLE_CONSTANT = SelectableTextView.EXAMPLE_CONSTANT;
