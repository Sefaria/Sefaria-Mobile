'use strict';

export class PageHistory {

  constructor() {
    this._backStack = [];
    this._backStackMain = [];
  }

  forward({ state, type = "main", calledFrom }) {
    const stateClone = Sefaria.util.clone(state);
    this._backStack.push({ type, state: stateClone, calledFrom });
    this._updateMainBackStack();
  }

  back({ type, calledFrom } = { }) {
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

  _updateMainBackStack() {
    this._backStackMain = this._backStack.filter( s => s.type === 'main' );
  }

  getStack({ type }) {
    return this._backStackMain;
  }
}