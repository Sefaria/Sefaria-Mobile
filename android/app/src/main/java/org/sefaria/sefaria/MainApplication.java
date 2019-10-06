package org.sefaria.sefaria;

import android.app.Application;
import android.content.Context;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import io.invertase.firebase.RNFirebasePackage;
import io.invertase.firebase.analytics.RNFirebaseAnalyticsPackage;
import io.invertase.firebase.config.RNFirebaseRemoteConfigPackage;
import org.devio.rn.splashscreen.SplashScreenReactPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.facebook.react.modules.i18nmanager.I18nUtil;
import java.lang.reflect.InvocationTargetException;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost =

    new ReactNativeHost(this) {
      @Override
      public boolean getUseDeveloperSupport() {
        return BuildConfig.DEBUG;
      }

      @Override
      protected List<ReactPackage> getPackages() {
        List<ReactPackage> packages = new PackageList(this).getPackages();
        packages.add(new RNFirebaseAnalyticsPackage());
        packages.add(new RNFirebaseRemoteConfigPackage());
        packages.add(new SplashScreenReactPackage());
        return packages;
        // return Arrays.<ReactPackage>asList(
        //     new MainReactPackage(),
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
    initializeFlipper(this); // Remove this line if you don't want Flipper enabled
  }

  /**
  * Loads Flipper in React Native templates.
  *
  * @param context
  */
  private static void initializeFlipper(Context context) {
   if (BuildConfig.DEBUG) {
     try {
       /*
        We use reflection here to pick up the class that initializes Flipper,
       since Flipper library is not available in release mode
       */
       Class<?> aClass = Class.forName("com.facebook.flipper.ReactNativeFlipper");
       aClass.getMethod("initializeFlipper", Context.class).invoke(null, context);
     } catch (ClassNotFoundException e) {
       e.printStackTrace();
     } catch (NoSuchMethodException e) {
       e.printStackTrace();
     } catch (IllegalAccessException e) {
       e.printStackTrace();
     } catch (InvocationTargetException e) {
       e.printStackTrace();
     }
   }
  }
}
