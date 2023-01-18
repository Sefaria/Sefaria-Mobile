'use strict';

import Sefaria from './sefaria';

export class PageHistory {

  constructor() {
    this._backStack = [];
    this._backStackMain = [];
  }

  forward = ({ state, type = "main", calledFrom }) => {
    const stateClone = Sefaria.util.clone(state);
    this._backStack.push({ type, state: stateClone, calledFrom });
    this._updateMainBackStack();
  }

  back = ({ type, calledFrom } = { }) => {
    const bs = this._backStack;
    let oldStateObj = bs.pop();
    if (!oldStateObj) { return oldStateObj; }

    if (type === "main") {
      while (oldStateObj.type !== "main" && bs.length > 0) {
        oldStateObj = bs.pop();
      }
    }
    else if (calledFrom === "toc") {
      // look ahead one
      while (oldStateObj.calledFrom === "toc" && bs.length > 0 && bs[bs.length - 1].calledFrom === "toc") {
        oldStateObj = bs.pop();
      }
    }
    this._updateMainBackStack();
    if (!oldStateObj) { return oldStateObj; }
    return oldStateObj.state;
  }

  _updateMainBackStack = () => {
    this._backStackMain = this._backStack.filter( s => s.type === 'main' );
  }
}

export class TabHistory {
  /**
   * Composes PageHistory and exposes functionality to control history by tab
   */

  constructor() {
    this._historyByTab = TabHistory._initializeHistoryByTab();
  }

  forward = ({ tab, ...args }) => {
    this._historyByTab[tab].forward({ ...args });
  };

  back = ({ tab, ...args } = { }) => {
    return this._historyByTab[tab].back({ ...args });
  }

  static _initializeHistoryByTab() {
    return TabMetadata.names().reduce((historyByTab, curr) => {
      historyByTab[curr] = new PageHistory();
      return historyByTab;
    }, {});
  }
}

export class TabMetadata {
  static _names = ["Texts", "Topics", "Search", "Saved", "Account"];
  static _icons = ["book", "hashtag", "search", "N/A", "N/A"];

  static names() {
    return TabMetadata._names;
  }

  static namesWithIcons() {
    return Sefaria.util.zip(TabMetadata._names, TabMetadata._icons);
  }

  static initialTabName() {
    return TabMetadata._names[0];
  }

  static iconByName(name) {
    const nameIndex = TabMetadata._names.indexOf(name);
    if (nameIndex === -1) {
      throw Error(`No tab name matching '${name}'`);
    }
    return TabMetadata._icons[nameIndex];
  }
}
