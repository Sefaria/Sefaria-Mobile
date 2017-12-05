'use strict';
import PropTypes from 'prop-types';
import React from 'react';
import ReactNative, {
  requireNativeComponent,
} from 'react-native';

const styles =                require('./Styles.js');
const TextRange =            require('./TextRange');
const TextRangeContinuous = require('./TextRangeContinuous');
const TextHeightMeasurer = require('./TextHeightMeasurer');
const queryLayoutByID =   require('queryLayoutByID');
const SefariaListViewNative = requireNativeComponent('SefariaListView', TextColumn);

class TextColumn extends React.Component {
  render() {
    return (
      <SefariaListViewNative />
    );
  }
}

module.exports = TextColumn;
