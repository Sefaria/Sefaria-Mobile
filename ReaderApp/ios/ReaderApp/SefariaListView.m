//see link for why this if statement is needed https://github.com/yonahforst/react-native-permissions/issues/137
#if __has_include(<React/RCTBridgeModule.h>)
#import <React/RCTBridgeModule.h>
#else
#import "RCTBridgeModule.h"
#endif
#import "RCTViewManager.h"

@interface RCT_EXTERN_MODULE(SefariaListViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(message, NSString)
RCT_EXPORT_VIEW_PROPERTY(object, NSDictionary)

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

@end
