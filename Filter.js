class Filter {
  constructor(name, heName, refList, heRefList) {
    this.name = name;
    this.heName = heName;
    this.refList = refList;
    this.heRefList = heRefList;
  }

  toString(lang) {
    return lang === "hebrew" && this.heName ? this.heName : this.name;
  }

  displayRef() {
    // return true if should display ref for results of this filter in TextList
    return true;
  }

  listKey(i) {
    // returns key that uniquely identifies this a ref from filter.refList in a list
    return this.refList[i];
  }

  equals(filter) {
    return this.name === filter.name;
  }

  clone() {
    return new Filter(this.name, this.heName, Sefaria.util.clone(this.refList), Sefaria.util.clone(this.heRefList));
  }

}

class LinkFilter extends Filter {
  constructor(title, heTitle, collectiveTitle, heCollectiveTitle, refList, heRefList, category) {
    super(title, heTitle, refList, heRefList);
    this.collectiveTitle = collectiveTitle;
    this.heCollectiveTitle = heCollectiveTitle;
    this.category = category;
  }

  toString(lang) {
    // make sure that you only display Hebrew is there is Hebrew
    return lang === "hebrew" && (this.heCollectiveTitle || this.heName) ?
      (this.heCollectiveTitle ? this.heCollectiveTitle : this.heName) : //NOTE backwards compatibility
      (this.collectiveTitle ? this.collectiveTitle : this.name);
  }

  displayRef() {
    return this.category === "Commentary" && this.name !== "Commentary";
  }

  listKey(i) {
    return `${(typeof i !== 'undefined') ? this.refList[i] : ''}|${this.name}`;
  }

  clone() {
    return new LinkFilter(
      this.name,
      this.heName,
      this.collectiveTitle,
      this.heCollectiveTitle,
      Sefaria.util.clone(this.refList),
      Sefaria.util.clone(this.heRefList),
      this.category
    );
  }
}

class VersionFilter extends Filter {
  constructor(versionTitle, versionTitleInHebrew, versionLanguage, ref) {
    super(versionTitle, versionTitleInHebrew, [ref], [null]);  // heRefList is not necessary because it will never be displayed
    this.versionTitle = versionTitle;
    this.versionTitleInHebrew = versionTitleInHebrew;
    this.versionLanguage = versionLanguage;
  }

  listKey(i) {
    return `${(typeof i !== 'undefined') ? this.refList[i] : ''}|${this.versionTitle}|${this.versionLanguage}`;
  }

  equals(filter) {
    return this.versionTitle === filter.versionTitle && this.versionLanguage === filter.versionLanguage;
  }

  toString(lang) {
    return lang === "hebrew" && this.heName ? this.heName : this.name;
  }

  clone() {
    return new VersionFilter(
      this.name,
      this.heName,
      this.versionLanguage,
      this.refList[0]
    );
  }
}

export { Filter, LinkFilter, VersionFilter };
