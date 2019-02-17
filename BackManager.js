class BackManager {

  static _backStack = [];

  static forward({ state, type = "main", calledFrom }) {
    //debugger;
    const stateClone = Sefaria.util.clone(state);
    BackManager._backStack.push({ type, state: stateClone, calledFrom });
  }

  static back({ type, calledFrom } = { }) {
    const bs = BackManager._backStack;
    let oldStateObj = bs.pop();
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
    if (!oldStateObj) { return oldStateObj; }
    return oldStateObj.state;
  }

  static getStack({ type }) {
    return BackManager._backStack.filter( s => s.type === type );
  }
}

export default BackManager;
