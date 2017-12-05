import Foundation
@objc(SefariaListViewManager)
class SefariaListViewManager : RCTViewManager {
  override func view() -> UIView! {
    return SefariaListView();
  }
}
