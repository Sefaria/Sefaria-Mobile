'use strict';

import PropTypes from 'prop-types';
import React from 'react';

class ReboundRenderer extends React.Component {
  static propTypes = {
    boundTo: PropTypes.number.isRequired,
    render: PropTypes.func.isRequired,
  };

  shouldComponentUpdate(nextProps) {
    return nextProps.boundTo !== this.props.boundTo;
  }

  render() {
    console.log('ReboundRenderer render() boundTo=' + this.props.boundTo);
    return this.props.render(this.props.boundTo);
  }
}

module.exports = ReboundRenderer;
