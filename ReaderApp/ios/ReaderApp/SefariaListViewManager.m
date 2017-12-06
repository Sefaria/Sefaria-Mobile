#import "SefariaListViewManager.h"
#import "SefariaListView.h"

@implementation SefariaListViewManager

RCT_EXPORT_MODULE()

- (UIView *)view
{
  return [[SefariaListView alloc] initWithBridge:self.bridge];
}

RCT_EXPORT_VIEW_PROPERTY(rowHeight, float)
RCT_EXPORT_VIEW_PROPERTY(numRows, NSInteger)

@end
