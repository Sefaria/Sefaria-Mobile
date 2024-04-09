#!/bin/bash
# before you run, up version in app/build.gradle

. ./keystore_pass.sh  # include KEYSTORE_PASS variable
KEYSTORE="upload-kstore.jks"
APK_DIR="app/build/outputs/apk/release"
curl "http://localhost:8081/index.android.bundle?platform=android" -o "app/src/main/assets/index.android.bundle"
./gradlew assembleRelease

# arm64-v8a
zipalign -f 4 $APK_DIR/app-arm64-v8a-release-unsigned.apk $APK_DIR/app-arm64-v8a-release-signed.apk
apksigner sign --ks $KEYSTORE --ks-pass pass:$KEYSTORE_PASS --v1-signing-enabled true --v2-signing-enabled true $APK_DIR/app-arm64-v8a-release-signed.apk


# armeabi-v7a
zipalign -f 4 $APK_DIR/app-armeabi-v7a-release-unsigned.apk $APK_DIR/app-armeabi-v7a-release-signed.apk
apksigner sign --ks $KEYSTORE --ks-pass pass:$KEYSTORE_PASS --v1-signing-enabled true --v2-signing-enabled true $APK_DIR/app-armeabi-v7a-release-signed.apk



# x86_64
zipalign -f 4 $APK_DIR/app-x86_64-release-unsigned.apk $APK_DIR/app-x86_64-release-signed.apk
apksigner sign --ks $KEYSTORE --ks-pass pass:$KEYSTORE_PASS --v1-signing-enabled true --v2-signing-enabled true $APK_DIR/app-x86_64-release-signed.apk


# x86
zipalign -f 4 $APK_DIR/app-x86-release-unsigned.apk $APK_DIR/app-x86-release-signed.apk
apksigner sign --ks $KEYSTORE --ks-pass pass:$KEYSTORE_PASS --v1-signing-enabled true --v2-signing-enabled true $APK_DIR/app-x86-release-signed.apk


# after its signed, go to https://play.google.com/apps/publish/?account=8012316618525581861#ManageReleasesPlace:p=org.sefaria.sefaria
