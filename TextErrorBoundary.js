import React from 'react';
import PropTypes from 'prop-types';

class TextErrorBoundary extends React.Component {
  static propTypes = {
    textUnavailableAlert: PropTypes.func.isRequired,
    title:                PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    this.props.textUnavailableAlert(this.props.title)
  }

  render() {
    return this.state.hasError ? null : (
        this.props.children
    );
  }
}

export default TextErrorBoundary;
