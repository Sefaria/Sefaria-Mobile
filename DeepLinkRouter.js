'use strict';

import PropTypes from 'prop-types';
import URL from 'url-parse';
import React from 'react';

class DeepLinkRouter extends React.PureComponent {
  static propTypes = {
    openNav:                 PropTypes.func.isRequired,
    openMenu:                PropTypes.func.isRequired,
    openRef:                 PropTypes.func.isRequired,
    openUri:                 PropTypes.func.isRequired,
    openRefSheet:            PropTypes.func.isRequired,
    openTextTocDirectly:     PropTypes.func.isRequired,
    openSearch:              PropTypes.func.isRequired,
    openTopic:               PropTypes.func.isRequired,
    setSearchOptions:        PropTypes.func.isRequired,
    setTextLanguage:         PropTypes.func.isRequired,
    setNavigationCategories: PropTypes.func.isRequired,
  };
  constructor(props) {
    super(props);
    const routes = [
      ['^$', props.openNav],
      ['^texts$', props.openNav],
      ['^texts/(saved)$', this.openMenu, ['saved']],
      ['^texts/(history)$', this.openMenu, ['menu']],
      ['^texts/(.+)?$', this.openCats, ['cats']],
      ['^search$', this.openSearch],
      ['^(sheets)$', this.openMenu, ['menu']],
      ['^(sheets)/tags$', this.openMenu, ['menu']],
      ['^sheets/tags/(.+)$', this.openTopicFromTag, ['tag']],
      ['^topics/(category)/(.+)$', this.openTopic, ['categoryString','slug']],
      ['^topics/(.+)$', this.openTopic, ['slug']],
      ['^sheets/([0-9.]+)$', this.openRefSheet, ['sheetid']],
      ['^([^/]+)$', this.openRef, ['tref']],  // NOTE: if any static page matches a title, it will try to be opened in the app. In this case, we'll need to explicitly list the route above this route.
      ['^.*$', this.catchAll],
    ];
    this._routes = routes.map(([ regex, func, namedCaptureGroups ]) => new Route({regex, func, namedCaptureGroups}));
  }
  openMenu = ({ menu }) => {
    this.props.openMenu(menu);
  };
  openRefSheet = ({ sheetid }) => {
    sheetid = sheetid.split(".")[0];  // throw away node number
    this.props.openRefSheet(sheetid);
  };
  openTopicFromTag = ({ tag }) => {
    const slug = tag.toLowerCase().replace(/ /g, '-');  // approximation at what the slug should be
    this.openTopic({ slug });
  };
  openCats = ({ cats }) => {
    cats = cats.split('/');
    this.props.openNav();
    this.props.setNavigationCategories(cats);
  };
  openTopic = ({ slug, categoryString }) => {
    const isCategory = !!categoryString;
    this.props.openTopic({slug}, isCategory);
  };
  openRef = ({ tref, ven, vhe, aliyot, lang, url }) => {
    // wrapper for openRef to convert url params to function params
    // TODO handle sheet ref case
    let { ref, title } = Sefaria.urlToRef(tref);
    if (!title) {
      Sefaria.api.name(ref, true).then(results => {   // look for alt title in ref
          const matches = results.completion_objects.filter(obj => obj.type === 'ref' && ref.includes(obj.title));
          if (matches.length > 0) {
            ref = ref.replace(matches[0].title, matches[0].key);
            this.openStandardRef(ref, aliyot, ven, vhe, lang);
          }
          else {
            this.catchAll({ url }); /* can't find an alt title, so just open site */
          }
      }).catch(err => {
        this.catchAll({url});
      });
    }
    else if (ref === title) {
      // book table of contents
      this.props.openTextTocDirectly(title);
    } else {
      // standard ref
      this.openStandardRef(ref, aliyot, ven, vhe, lang);
    }
  };
  openStandardRef = (ref, aliyot, ven, vhe, lang) => {
    const enableAliyot = !!aliyot && aliyot.length > 0 && aliyot !== '0';
    const versions = { en: ven, he: vhe };
    const langMapper = {
      'en': 'english',
      'he': 'hebrew',
      'bi': 'bilingual',
    };
    if (langMapper[lang]) {
      this.props.setTextLanguage(langMapper[lang], null, true);
    }
    this.props.openRef(ref, 'deep link', versions, true, enableAliyot);
  }
  openSearch = ({ q, tab, tvar, tsort, svar, ssort }) => {
    // TODO: implement tab, svar and ssort
    const isExact = !!tvar && tvar.length > 0 && tvar === '0';
    tsort = tsort || 'relevance';
    tab = tab || 'text';
    this.props.setSearchOptions(tab, tsort, isExact, () => { this.props.openSearch(tab, q); });
  };
  catchAll = ({ url }) => {
    // runs in case no route can handle this url
    this.props.openUri(url);
  };
  route = url => {
    const u = new URL(url, Sefaria.api._baseHost, true);
    let { pathname, query, host, hostname } = u;
    if (!hostname.match('(?:www\.)?sefaria\.org')) {
      // this is not a sefaria URL. Route to browser
      this.catchAll({ url });
      return;
    }
    pathname = pathname.replace(/[\/\?]$/, '');  // remove trailing ? or /
    pathname = pathname.replace(/^[\/]/, '');  // remove initial /
    pathname = decodeURIComponent(pathname);
    // es6 dict comprehension to decode query values
    query = Object.entries(query).reduce((obj, [k, v]) => { obj[k] = decodeURIComponent(v); return obj; }, {});
    for (let r of this._routes) {
      if (r.apply({ pathname, query, url })) { break; }
    }
  };
  render() { return null; }
}

class Route {
  constructor({ regex, func, namedCaptureGroups }) {
    this.regex = regex;
    this.func = func;
    this.namedCaptureGroups = namedCaptureGroups || [];
  }
  getNamedCaptureGroups = match => {
    const groups = {};
    for (let groupNum = 0; groupNum < this.namedCaptureGroups.length; groupNum++) {
      if (!!match[groupNum+1]) {
        const groupName = this.namedCaptureGroups[groupNum];
        groups[groupName] = match[groupNum+1];
      }
    }
    return groups;
  };
  apply = ({ pathname, query, url }) => {
    const m = pathname.match(this.regex);
    if (m) {
      const groups = this.getNamedCaptureGroups(m);
      this.func({ ...groups, ...query, url });
      return true;
    }
    return false;
  };
}

export default DeepLinkRouter;
