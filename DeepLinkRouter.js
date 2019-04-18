'use strict';

import PropTypes from 'prop-types';
import URL from 'url-parse';
import React from 'react';

class DeepLinkRouter extends React.PureComponent {
  static propTypes = {
    openNav:          PropTypes.func.isRequired,
    openRef:          PropTypes.func.isRequired,
    setTextLanguage:  PropTypes.func.isRequired,
  };
  constructor(props) {
    super(props);
    const routes = [
      ['^texts$', props.openNav],
      ['^texts/saved$', null],
      ['^texts/history$', null],
      ['^texts/(?<cats>.+)?$', null],
      ['^search$', null],
      ['^sheets$', null],
      ['^sheets/tags$', null],
      ['^sheets/tags/(?<tag>.+)$', null],
      ['^sheets/(?<tref>[\d.]+)$', null],
      ['^(?<tref>[^/]+)$', this.openRef],
    ];
    this._routes = routes.map(r => new Route(r[0], r[1]));
  }
  openRef = ({ tref, ven, vhe, aliyot, lang }) => {
    // wrapper for openRef to convert url params to function params
    // TODO handle text toc case
    // TODO handle sheet ref case
    const ref = Sefaria.urlToRef(tref);
    if (!ref) { return; /* open site */}
    const enableAliyot = !!aliyot && aliyot.length > 0 && aliyot !== '0';
    const versions = { en: ven, he: vhe };
    const langMapper = {
      'en': 'english',
      'he': 'hebrew',
      'bi': 'bilingual',
    };
    console.log("LANG", lang);
    if (langMapper[lang]) {
      this.props.setTextLanguage(langMapper[lang], null, null, true);
    }
    this.props.openRef(ref, 'deep link', versions, true, enableAliyot);
  };
  route = url => {
    const u = new URL(decodeURIComponent(url), true);  // true means parse query string
    console.log('query', url, u.query);
    for (let r of this._routes) {
      if (r.apply(u)) { break; }
    }
  };
  render() { return null; }
}

class Route {
  constructor(regex, func) {
    this.regex = regex;
    this.func = func;
  }
  apply = ({ pathname, query }) => {
    pathname = pathname.replace(/[\/\?]$/, '');  // remove trailing ? or /
    pathname = pathname.replace(/^[\/]/, '');  // remove initial /
    const m = pathname.match(this.regex);
    if (m) {
      console.log('routed', pathname);
      const groups = m.groups || {};
      this.func({...groups, ...query});
      return true;
    }
    return false;
  };
}

export default DeepLinkRouter;
