/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import "AppDelegate.h"


#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import "Orientation.h"


@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [NSThread sleepForTimeInterval:1.4];

  NSURL *jsCodeLocation;

  //jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index.ios" fallbackResource:nil];

  
 #if DEBUG
  NSLog(@"AppDelegate:DEBUG");

#if TARGET_IPHONE_SIMULATOR
  NSLog(@"AppDelegate:DEBUG:TARGET_IPHONE_SIMULATOR");
  jsCodeLocation = [NSURL URLWithString:@"http://localhost:8081/index.ios.bundle"];
#else
  NSLog(@"AppDelegate:DEBUG:!TARGET_IPHONE_SIMULATOR");
  NSLog(@"To device debug, open RCTWebSocketExecutor.m & replace localhost with MacBook IP.");
  // Get dev host IP Address:
  //    ifconfig | grep inet\ | tail -1 | cut -d " " -f 2
  jsCodeLocation = [NSURL URLWithString:@"http://192.16.29.213:8081/index.ios.bundle"];
#endif

#else
  NSLog(@"AppDelegate:RELEASE jsbundle");
  jsCodeLocation = [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif

  NSLog(@"jsCodeLocation = %@",jsCodeLocation); 

  RCTRootView *rootView = [[RCTRootView alloc] initWithBundleURL:jsCodeLocation
                                                      moduleName:@"ReaderApp"
                                               initialProperties:nil
                                                   launchOptions:launchOptions];
  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  return YES;
}

- (UIInterfaceOrientationMask)application:(UIApplication *)application supportedInterfaceOrientationsForWindow:(UIWindow *)window {
  return [Orientation getOrientation];
}
@end
