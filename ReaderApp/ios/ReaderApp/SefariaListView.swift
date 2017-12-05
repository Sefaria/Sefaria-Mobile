import Foundation

@objc(SefariaListView)
class SefariaListView: NSObject {
  @objc func getSystemVolume( _ error: RCTResponseSenderBlock,
                              blah success: RCTResponseSenderBlock) -> Void {
    var volume: Float = 8
    success([volume])
  }
}
