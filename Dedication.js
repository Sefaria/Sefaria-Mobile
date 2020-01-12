import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
} from 'react-native';

import {
  LoadingView,
} from './Misc.js';
import { GlobalStateContext, getTheme } from './StateManager';
import HTMLView from 'react-native-htmlview';
import strings from './LocalizedStrings';
import styles from './Styles';


const Dedication = () => (<Text>Donated by the Koschitzky family</Text>);

export default Dedication;
