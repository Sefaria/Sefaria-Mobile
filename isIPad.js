'use strict'
import {
  Dimensions,
} from 'react-native';


const iPadMinSize = 768*1024;
const {height, width} = Dimensions.get('window');
const iPad = height * width >= iPadMinSize;

export default iPad;
