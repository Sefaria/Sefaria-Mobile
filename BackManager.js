class BackManager {

  static _backStack = [];
  static checkSearchFilters(state) {
    if (state.availableSearchFilters && state.availableSearchFilters.length) {
      let counter = 0;
      let bad = 0;
      let stack = [...state.availableSearchFilters];
      while (stack.length) {
        let node = stack.pop();
        if (node.children && node.children.length) {
          for (let child of node.children) {
            if (child.parent !== node) {
              bad += 1;
            }
            counter += 1;
          }
        }
        stack = stack.concat(node.children);
      }
      console.log("Percent bad: " + (bad/counter))
    }
  }
  static forward({ state, type = "main", calledFrom }) {
    //debugger;
    console.log("BEFORE");
    BackManager.checkSearchFilters(state);
    const stateClone = Sefaria.util.clone(state);
    console.log("After");
    BackManager.checkSearchFilters(state);
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
