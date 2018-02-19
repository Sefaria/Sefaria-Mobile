class Filter {
  constructor(name, heName, refList) {
    this.name = name;
    this.heName = heName;
    this.refList = refList;
  }

  toString(lang) {
    return lang === "hebrew" ? this.heName : this.name;
  }

  displayRef() {
    // return true if should display ref for results of this filter in TextList
    return true;
  }

  listKey(i) {
    // returns key that uniquely identifies this a ref from filter.refList in a list
    return this.refList[i];
  }

}

class LinkFilter extends Filter {
  constructor(title, heTitle, collectiveTitle, heCollectiveTitle, refList, category) {
    super(title, heTitle, refList);
    this.collectiveTitle = collectiveTitle;
    this.heCollectiveTitle = heCollectiveTitle;
    this.category = category;
  }

  toString(lang) {
    return lang === "hebrew" ?
      (this.heCollectiveTitle ? this.heCollectiveTitle : this.heName) : //NOTE backwards compatibility
      (this.collectiveTitle ? this.collectiveTitle : this.name);
  }

  displayRef() {
    return this.category === "Commentary" && this.name !== "Commentary";
  }

  listKey(i) {
    return `${this.refList[i]}|${this.name}`;
  }
}

class VersionFilter extends Filter {
  constructor(versionTitle, versionTitleInHebrew, versionLanguage, ref) {
    super(versionTitle, versionTitleInHebrew, [ref]);
    this.versionTitle = versionTitle;
    this.versionTitleInHebrew = versionTitleInHebrew;
    this.versionLanguage = versionLanguage;
  }

  listKey(i) {
    return `${this.refList[i]}|${this.versionTitle}|${this.versionLanguage}`;
  }
}

export { LinkFilter, VersionFilter };
