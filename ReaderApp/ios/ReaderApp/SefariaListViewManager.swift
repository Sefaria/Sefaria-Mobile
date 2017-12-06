import Foundation

extension UITableView {
  func setMessage(_ message: NSString) {
    print(message)
  }
  func setObject(_ object: NSDictionary) {
    print("YOOO \(object["yo"]!)")
    print("SUPP \(object["sup"]!)")
  }
}

@objc(SefariaListViewManager)
class SefariaListViewManager : RCTViewManager {
  override func view() -> UIView! {
    let uitvController = SefariaListViewController()
    let uitv = UITableView()
    uitv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    uitvController.addTableView(uitv)
    return uitv
  }
}
