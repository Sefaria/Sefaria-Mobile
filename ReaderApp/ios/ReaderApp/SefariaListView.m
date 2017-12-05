#import "RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(SefariaListView, NSObject)

RCT_EXTERN_METHOD(getSystemVolume:(RCTResponseSenderBlock *)error blah:(RCTResponseSenderBlock *)success)

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

@end
