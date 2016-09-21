module.exports = LinkFilter;

/**
* ref - the ref which these links are connected to
**/
function LinkFilter(title,heTitle,refList,category,ref) {
  this.title = title;
  this.heTitle = heTitle;
  this.refList = refList;
  this.category = category;
}
