'use strict';

import Sefaria from './sefaria';

export class PageHistory {

  constructor() {
    this._initStacks();
  }

  forward = ({ state, type = "main", calledFrom }) => {
    const stateClone = Sefaria.util.clone(state);
    this._backStack.push({ type, state: stateClone, calledFrom });
    this._updateMainBackStack();
  }

  _initStacks = () => {
    this._backStack = [];
    this._backStackMain = [];
  }

  clear = () => {
    this._initStacks();
  };

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
    // need to keep track of current state for each tab so you can switch back to it
    // this is not the same as the back stack because current state never should be popped
    this._currentStateByTab = {};
  }

  forward = ({ tab, ...args }) => {
    this._historyByTab[tab].forward({ ...args });
  };

  back = ({ tab, ...args }) => {
    return this._historyByTab[tab].back({ ...args });
  };

  clear = ({ tab }) => {
    this._historyByTab[tab].clear();
  };

  getCurrentState = ({ tab }) => {
    return this._currentStateByTab[tab];
  };

  saveCurrentState = ({ tab, state }) => {
    this._currentStateByTab[tab] = Sefaria.util.clone(state);
  };

  static _initializeHistoryByTab() {
    return TabMetadata.names().reduce((historyByTab, curr) => {
      historyByTab[curr] = new PageHistory();
      return historyByTab;
    }, {});
  }
}

export class TabMetadata {
  static _tabData = [
    {name: "Texts", stringKey: "texts", icon: "book", menu: "navigation" },
    {name: "Topics", stringKey: "topics", icon: "hashtag", menu: "topic toc"},
    {name: "Search", stringKey: "search", icon: "search", menu: "autocomplete"},
    {name: "Saved", stringKey: "saved", icon: "bookmark-double", menu: "history"},
    {name: "Account", stringKey: "accountFooter", icon: "profile", menu: "account-menu"},
  ];

  static names() {
    return TabMetadata._tabData.map(tabDatum => tabDatum.name);
  }

  static namesWithIcons() {
    return TabMetadata._tabData;
  }

  static initialTabName() {
    return TabMetadata._tabData[0].name;
  }

  static menuByName(name) {
    const tabDatum = TabMetadata._tabData.find(tabDatum => tabDatum.name === name);
    if (!tabDatum) {
      throw Error(`No tab name matching '${name}'`);
    }
    return tabDatum.menu;
  }
}
