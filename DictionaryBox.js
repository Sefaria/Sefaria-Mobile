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
import strings from './LocalizedStrings';
import styles from './Styles';


const DictionaryBox = ({ lookup }) => {
    return (
    <Text>{`Looking up: ${lookup}`}</Text>
    );
};

export default DictionaryBox;