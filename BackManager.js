class BackManager {

  static _backStack = [];

  static forward({ state, type = "main", calledFrom }) {
    //debugger;
    const stateClone = Sefaria.util.clone(state);
    BackManager._backStack.push({ type, state: stateClone, calledFrom });
  }

  static back({ type, calledFrom } = { }) {
    let oldStateObj = BackManager._backStack.pop();
    if (type === "main") {
      while (oldStateObj.type !== "main" && BackManager._backStack.length > 0) {
        oldStateObj = BackManager._backStack.pop();
      }
    }
    else if (calledFrom === "toc") {
      while (oldStateObj.calledFrom === "toc" && BackManager._backStack.length > 0 && BackManager._backStack[BackManager._backStack.length - 1].calledFrom === "toc") {
        oldStateObj = BackManager._backStack.pop();
      }
    }
    if (!oldStateObj) { return oldStateObj; }
    return oldStateObj.state;
  }

  static getStack({ type }) {
    return BackManager._backStack.filter( s => s.type === type );
  }
}

export default BackManager;
