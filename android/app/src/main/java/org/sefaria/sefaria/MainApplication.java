package org.sefaria.sefaria;

import androidx.multidex.MultiDexApplication;
import android.content.Context;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.reactnativecommunity.webview.RNCWebViewPackage;
import org.devio.rn.splashscreen.SplashScreenReactPackage;
import com.astrocoders.selectabletext.RNSelectableTextPackage;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.facebook.react.modules.i18nmanager.I18nUtil;
import java.lang.reflect.InvocationTargetException;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends MultiDexApplication implements ReactApplication {

  private final ReactNativeHost mReactNativeHost =

    new ReactNativeHost(this) {
      @Override
      public boolean getUseDeveloperSupport() {
        return BuildConfig.DEBUG;
      }

      @Override
      protected List<ReactPackage> getPackages() {
        List<ReactPackage> packages = new PackageList(this).getPackages();
        packages.add(new SplashScreenReactPackage());
        packages.add(new RNSelectableTextPackage());
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
    };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    I18nUtil sharedI18nUtilInstance = I18nUtil.getInstance();
    //sharedI18nUtilInstance.forceRTL(this,false);
    sharedI18nUtilInstance.allowRTL(this, false);
    SoLoader.init(this, /* native exopackage */ false);
  }
}
