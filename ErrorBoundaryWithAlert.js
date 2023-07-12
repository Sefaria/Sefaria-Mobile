import React from 'react';
import PropTypes from 'prop-types';

class ErrorBoundaryWithAlert extends React.Component {
  static propTypes = {
    alert: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = { hasError: false };
    // instance variable because hard to ensure componentDidCatch has access to the current state
    this._hasAlertDisplayed = false;
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    if (this._hasAlertDisplayed) { return; }
    this.props.alert();
    this._hasAlertDisplayed = true;
  }

  render() {
    return this.state.hasError ? null : (
        this.props.children
    );
  }
}

export default ErrorBoundaryWithAlert;
