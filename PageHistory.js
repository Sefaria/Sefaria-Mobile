'use strict';

export class PageHistory {

  static _backStack = [];
  static _backStackMain = [];

  static forward({ state, type = "main", calledFrom }) {
    //debugger;
    const stateClone = Sefaria.util.clone(state);
    PageHistory._backStack.push({ type, state: stateClone, calledFrom });
    PageHistory._updateMainBackStack();
  }

  static back({ type, calledFrom } = { }) {
    const bs = PageHistory._backStack;
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
    PageHistory._updateMainBackStack();
    if (!oldStateObj) { return oldStateObj; }
    return oldStateObj.state;
  }

  static _updateMainBackStack() {
    PageHistory._backStackMain = PageHistory._backStack.filter( s => s.type === 'main' );
  }

  static getStack({ type }) {
    return PageHistory._backStackMain;
  }
}