import React from 'react';
import PropTypes from 'prop-types';

class ErrorBoundaryWithAlert extends React.Component {
  static propTypes = {
    alert: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    this.props.alert();
  }

  render() {
    return this.state.hasError ? null : (
        this.props.children
    );
  }
}

export default ErrorBoundaryWithAlert;
