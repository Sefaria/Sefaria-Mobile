class BackManager {
  static _backStackObj = {
    main: [],
    secondary: [],  // for when there are two back buttons visible (e.g. with commentary)
  }

  static forward({ state, type="main" }) {
    const stateClone = Sefaria.util.clone(state);
    if (type === "main") {
      BackManager._backStackObj.secondary = [];  // poison secondary stack
    }
    BackManager._backStackObj[type].push(stateClone);
    console.log("Length", BackManager._backStackObj[type].length, "Type", type);
  }

  static back({ type } = {}) {
    // type is not required. in case it's not passed, choose appropriate stack with preference for the secondary stack
    if (!type) {
      type = !!BackManager._backStackObj.secondary.length ? "secondary" : "main";
    }
    return BackManager._backStackObj[type].pop();
  }

  static getStack({ type }) {
    return BackManager._backStackObj[type];
  }
}

export default BackManager;
