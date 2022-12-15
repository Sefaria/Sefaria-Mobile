package org.sefaria.sefaria;

import androidx.multidex.MultiDexApplication;
import android.content.Context;

import android.content.res.Configuration;
import expo.modules.ApplicationLifecycleDispatcher;
import expo.modules.ReactNativeHostWrapper;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.reactnativecommunity.webview.RNCWebViewPackage;
import org.devio.rn.splashscreen.SplashScreenReactPackage;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.config.ReactFeatureFlags;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import org.sefaria.sefaria.newarchitecture.MainApplicationReactNativeHost;
import com.facebook.react.modules.i18nmanager.I18nUtil;
import java.lang.reflect.InvocationTargetException;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends MultiDexApplication implements ReactApplication {

  private final ReactNativeHost mReactNativeHost =

  new ReactNativeHostWrapper(this, new ReactNativeHost(this) {
      @Override
      public boolean getUseDeveloperSupport() {
        return BuildConfig.DEBUG;
      }

      @Override
      protected List<ReactPackage> getPackages() {
        List<ReactPackage> packages = new PackageList(this).getPackages();
        packages.add(new SplashScreenReactPackage());
        return packages;
        // return Arrays.<ReactPackage>asList(
        //     new MainReactPackage(),
        //     new RNCWebViewPackage(),
        //     new RNBackgroundFetchPackage(),
        //     new RNFirebasePackage(),
        //     new RNFirebaseAnalyticsPackage(),
        //     new RNFetchBlobPackage(),
        //     new NetInfoPackage(),
        //     new ActionSheetPackage(),
        //     new ReactNativeLocalizationPackage(),
        //     ,
        //     new RNZipArchivePackage()
        // );
      }

      @Override
      protected String getJSMainModuleName() {
        return "index";
      }
    });

  private final ReactNativeHost mNewArchitectureNativeHost =
      new MainApplicationReactNativeHost(this);

  @Override
  public ReactNativeHost getReactNativeHost() {
    ApplicationLifecycleDispatcher.onApplicationCreate(this);
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      return mNewArchitectureNativeHost;
    } else {
      return mReactNativeHost;
    }
  }

  @Override
  public void onCreate() {
    super.onCreate();
    // If you opted-in for the New Architecture, we enable the TurboModule system
    ReactFeatureFlags.useTurboModules = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
    I18nUtil sharedI18nUtilInstance = I18nUtil.getInstance();
    //sharedI18nUtilInstance.forceRTL(this,false);
    sharedI18nUtilInstance.allowRTL(this, false);
    SoLoader.init(this, /* native exopackage */ false);
  }

  @Override
	public void onConfigurationChanged(Configuration newConfig) {
	  super.onConfigurationChanged(newConfig);
	  ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig);
	}
}
