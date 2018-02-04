function VersionFilter(versionTitle, versionTitleInHebrew, versionLanguage, ref) {
  this.versionTitle = versionTitle;
  this.versionTitleInHebrew = versionTitleInHebrew;
  this.versionLanguage = versionLanguage;
  this.refList = [ref];
}

module.exports = VersionFilter;
