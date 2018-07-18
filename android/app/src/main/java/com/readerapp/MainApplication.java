package com.readerapp;

import android.app.Application;

import com.facebook.react.ReactApplication;
import com.actionsheet.ActionSheetPackage;
import com.rnziparchive.RNZipArchivePackage;
import com.apsl.versionnumber.RNVersionNumberPackage;
import com.babisoft.ReactNativeLocalization.ReactNativeLocalizationPackage;
import com.idehub.GoogleAnalyticsBridge.GoogleAnalyticsBridgePackage;
import com.rnfs.RNFSPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
            new ActionSheetPackage(),
            new RNZipArchivePackage(),
            new RNVersionNumberPackage(),
            new ReactNativeLocalizationPackage(),
            new GoogleAnalyticsBridgePackage(),
            new RNFSPackage()
      );
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
    SoLoader.init(this, /* native exopackage */ false);
  }
}
