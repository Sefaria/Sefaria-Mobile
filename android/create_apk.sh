#!/bin/bash
# before you run, up version in app/build.gradle

. ./keystore_pass.sh  # include KEYSTORE_PASS variable
KEYSTORE="kstore.jks"
APK_DIR="app/build/outputs/apk/release"
curl "http://localhost:8081/index.android.bundle?platform=android" -o "app/src/main/assets/index.android.bundle"
./gradlew assembleRelease

# arm64-v8a
jarsigner -tsa http://timestamp.comodoca.com/rfc3161 -sigalg SHA1withRSA -digestalg SHA1 -keystore $KEYSTORE -storepass $KEYSTORE_PASS $APK_DIR/app-arm64-v8a-release-unsigned.apk kstore
jarsigner -verify $APK_DIR/app-arm64-v8a-release-unsigned.apk
zipalign -f 4 $APK_DIR/app-arm64-v8a-release-unsigned.apk $APK_DIR/app-arm64-v8a-release-signed.apk

# armeabi-v7a
jarsigner -tsa http://timestamp.comodoca.com/rfc3161 -sigalg SHA1withRSA -digestalg SHA1 -keystore $KEYSTORE -storepass $KEYSTORE_PASS $APK_DIR/app-armeabi-v7a-release-unsigned.apk kstore
jarsigner -verify $APK_DIR/app-armeabi-v7a-release-unsigned.apk
zipalign -f 4 $APK_DIR/app-armeabi-v7a-release-unsigned.apk $APK_DIR/app-armeabi-v7a-release-signed.apk

# x86_64
jarsigner -tsa http://timestamp.comodoca.com/rfc3161 -sigalg SHA1withRSA -digestalg SHA1 -keystore $KEYSTORE -storepass $KEYSTORE_PASS $APK_DIR/app-x86_64-release-unsigned.apk kstore
jarsigner -verify $APK_DIR/app-x86_64-release-unsigned.apk
zipalign -f 4 $APK_DIR/app-x86_64-release-unsigned.apk $APK_DIR/app-x86_64-release-signed.apk

# x86
jarsigner -tsa http://timestamp.comodoca.com/rfc3161 -sigalg SHA1withRSA -digestalg SHA1 -keystore $KEYSTORE -storepass $KEYSTORE_PASS $APK_DIR/app-x86-release-unsigned.apk kstore
jarsigner -verify $APK_DIR/app-x86-release-unsigned.apk
zipalign -f 4 $APK_DIR/app-x86-release-unsigned.apk $APK_DIR/app-x86-release-signed.apk
# after its signed, go to https://play.google.com/apps/publish/?account=8012316618525581861#ManageReleasesPlace:p=org.sefaria.sefaria
