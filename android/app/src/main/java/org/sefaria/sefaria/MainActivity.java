package org.sefaria.sefaria;

import com.facebook.react.ReactActivity;
import org.devio.rn.splashscreen.SplashScreen;
import android.os.Bundle;
import android.support.annotation.Nullable;

public class MainActivity extends ReactActivity {

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "ReaderApp";
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        SplashScreen.show(this);
    }

    @Override
    public void invokeDefaultOnBackPressed() {
        moveTaskToBack(true);
    }
}
