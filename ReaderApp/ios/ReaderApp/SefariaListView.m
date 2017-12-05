#if __has_include(<React/RCTBridgeModule.h>)
#import <React/RCTBridgeModule.h>
#else
#import "RCTBridgeModule.h"
#endif
#import "RCTViewManager.h"
@interface RCT_EXTERN_MODULE(SefariaListViewManager, RCTViewManager)
@end
