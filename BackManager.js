class BackManager {

  static _backStack = [];

  static forward({ state, type = "main", calledFrom }) {
    //debugger;
    const stateClone = Sefaria.util.clone(state);
    BackManager._backStack.push({ type, state: stateClone, calledFrom });
  }

  static back({ type } = { }) {
    let oldStateObj = BackManager._backStack.pop();
    if (type === "main") {
      while (oldStateObj.type !== "main") {
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
