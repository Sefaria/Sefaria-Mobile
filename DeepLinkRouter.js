'use strict';

import PropTypes from 'prop-types';
import URL from 'url-parse';
import React from 'react';

class DeepLinkRouter extends React.PureComponent {
  static propTypes = {
    openNav:          PropTypes.func.isRequired,
  };
  constructor(props) {
    super(props);
    const routes = [
      ['^texts$', props.openNav],
    ];
    this._routes = routes.map(r => new Route(r[0], r[1]));
  }
  route = url => {
    const u = new URL(url);

    console.log(u.pathname);
    const { pathname } = u;
    for (let r of this._routes) {
      if (r.apply(pathname)) { break; }
    }
  };
  render() { return null; }
}

class Route {
  constructor(regex, func) {
    this.regex = regex;
    this.func = func;
  }
  apply = pathname => {

    pathname = pathname.replace(/[\/\?]$/, '');  // remove trailing ? or /
    pathname = pathname.replace(/^[\/]/, '');  // remove initial /

    const m = pathname.match(this.regex);
    if (m) {
      console.log('routed', pathname);
      this.func();
      return true;
    }
    return false;
  };
}

export default DeepLinkRouter;
