class FilterNode {
  //FilterTree object - for category filters
  constructor() {
    this.children = [];
    this.parent = null;
    this.selected = 0; //0 - not selected, 1 - selected, 2 - partially selected
  }
  append = (child) => {
      this.children.push(child);
      child.parent = this;
  }
  hasChildren = () => {
      return (this.children.length > 0);
  }
  getLeafNodes = () => {
      //Return ordered array of leaf (book) level filters
      if (!this.hasChildren()) {
          return this;
      }
      var results = [];
      for (var i = 0; i < this.children.length; i++) {
          results = results.concat(this.children[i].getLeafNodes());
      }
      return results;
  }
  getId = () => {
      return this.path.replace(new RegExp("[/',()]", 'g'),"-").replace(new RegExp(" ", 'g'),"_");
  }
  isSelected = () => {
      return (this.selected == 1);
  }
  isPartial = () => {
      return (this.selected == 2);
  }
  isUnselected = () => {
      return (this.selected == 0);
  }
  setSelected = (propogateParent, noPropogateChild) => {
      //default is to propogate children and not parents.
      //Calls from front end should use (true, false), or just (true)
      this.selected = 1;
      if (!(noPropogateChild)) {
          for (var i = 0; i < this.children.length; i++) {
              this.children[i].setSelected(false);
          }
      }
      if(propogateParent) {
          if(this.parent) this.parent._deriveState();
      }
  }
  setUnselected = (propogateParent, noPropogateChild) => {
      //default is to propogate children and not parents.
      //Calls from front end should use (true, false), or just (true)
      this.selected = 0;
      if (!(noPropogateChild)) {
          for (var i = 0; i < this.children.length; i++) {
              this.children[i].setUnselected(false);
          }
      }
      if(propogateParent) {
          if(this.parent) this.parent._deriveState();
      }

  }
  setPartial = () => {
      //Never propogate to children.  Always propogate to parents
      this.selected = 2;
      if(this.parent) this.parent._deriveState();
  }
  _deriveState = () => {
      //Always called from children, so we can assume at least one
      var potentialState = this.children[0].selected;
      if (potentialState == 2) {
          this.setPartial();
          return
      }
      for (var i = 1; i < this.children.length; i++) {
          if (this.children[i].selected != potentialState) {
              this.setPartial();
              return
          }
      }
      //Don't use setters, so as to avoid looping back through children.
      if(potentialState == 1) {
          this.setSelected(true, true);
      } else {
          this.setUnselected(true, true);
      }
  }
  hasAppliedFilters = () => {
      return (this.getAppliedFilters().length > 0)
  }
  getAppliedFilters = () => {
      if (this.isUnselected()) {
          return [];
      }
      if (this.isSelected()) {
          return[this.path];
      }
      var results = [];
      for (var i = 0; i < this.children.length; i++) {
          results = results.concat(this.children[i].getAppliedFilters());
      }
      return results;
  }
  getSelectedTitles = (lang) => {
      if (this.isUnselected()) {
          return [];
      }
      if (this.isSelected()) {
          return[(lang == "en")?this.title:this.heTitle];
      }
      var results = [];
      for (var i = 0; i < this.children.length; i++) {
          results = results.concat(this.children[i].getSelectedTitles(lang));
      }
      return results;
  }

  static checkPropType = function(props, propName, componentName) {
    if (typeof props[propName] == 'undefined' || props[propName] === null) {
      return new Error(`${props[propName]} cannot be null or undefined`);
    }
    if (!(props[propName] instanceof FilterNode)) {
      return new Error(`${props[propName]} is of type ${typeof props[propName]} instead of 'FilterNode'`)
    }
  };
}

module.exports = FilterNode;
