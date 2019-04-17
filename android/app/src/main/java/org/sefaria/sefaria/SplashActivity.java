package org.sefaria.sefaria;

import android.content.Intent;
import android.os.Bundle;
import android.net.Uri;
import android.support.v7.app.AppCompatActivity;

public class SplashActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // see https://github.com/facebook/react-native/issues/15992
        // for deep linking
        Uri data = null;
        String action = null;
        Intent currentIntent = getIntent();
        if (currentIntent != null) {
            Uri intentData = currentIntent.getData();
            if (intentData != null) {
                data = intentData;
            }
            // Get action as well.
            action = currentIntent.getAction();
        }

        Intent intent = new Intent(this, MainActivity.class);
        // Pass data and action (if available).
        if (data != null) {
            intent.setData(data);
        }
        if (action != null) {
            intent.setAction(action);
        }
        startActivity(intent);
        finish();
    }
}
