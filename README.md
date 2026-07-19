# Sefaria-Mobile
This repo contains the source code and export script to generate the content for Sefaria's [iOS App](https://itunes.apple.com/us/app/sefaria/id1163273965?mt=8) **AND** Sefaria's [Android App](https://play.google.com/store/apps/details?id=org.sefaria.sefaria&hl=en&gl=US).

We're using React-Native, so much of the app is written in JavaScript and we deploy almost the same code to both Android and iOS. There are minor differences in native packages that we use and a small amount of native code we've written ourselves.

If you haven't already done so, install React Native for your development environment using the [React Native "Set Up Your Environment"](https://reactnative.dev/docs/set-up-your-environment) guide. Follow the instructions for your operating system; if a tutorial asks you to install Expo/EAS to create a new app, skip that — you'll use this repo as the project. Set up **both** iOS and Android.

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Node | ≥ 18 (20 recommended) | via [nvm](https://github.com/nvm-sh/nvm) or `brew install node` |
| Watchman | latest | `brew install watchman` (the `cmake` step can be slow — this is normal) |
| Ruby | ~3.2 | **Not** macOS system Ruby (2.6). Use [rbenv](https://github.com/rbenv/rbenv). Required by the `Gemfile` (CocoaPods + Fastlane) |
| JDK | 17–20 | Android/Gradle. `brew install openjdk@17` |
| Xcode | latest stable | Full IDE (not just Command Line Tools). Required for iOS + `pod install` |
| Android Studio / SDK | latest | For the Android SDK, emulator, and an AVD |
| CocoaPods | ~1.16 | Installed via Bundler (`bundle exec pod …`) |

## Getting Started

### 1. Node + Watchman
```sh
brew install node        # or: nvm install 20
brew install watchman
```

### 2. Clone + JS dependencies
```sh
git clone https://github.com/Sefaria/Sefaria-Mobile
cd Sefaria-Mobile
npm install              # runs patch-package automatically
```

### 3. Ruby (for CocoaPods / Fastlane)
The `Gemfile` pins Ruby `~> 3.2`; macOS system Ruby (2.6) will fail `bundle install`.
```sh
brew install rbenv ruby-build
echo 'eval "$(rbenv init - zsh)"' >> ~/.zshrc && exec zsh
rbenv install 3.2.2 && rbenv local 3.2.2
gem install bundler && bundle install
```

### 4. iOS — Xcode + Pods
Install **Xcode** from the App Store (or [Apple Developer downloads](https://developer.apple.com/download/all/?q=xcode)), launch it once, then:
```sh
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept        # until you do this, git/clang fail machine-wide
xcodebuild -downloadPlatform iOS       # if the iOS Simulator runtime isn't installed
cd ios && bundle exec pod install && cd ..
```

### 5. Android — JDK + SDK
```sh
brew install openjdk@17
# JAVA_HOME (add to ~/.zshrc):
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
```
Install the Android SDK + an AVD via Android Studio's setup wizard, **or** headlessly:
```sh
brew install --cask android-commandlinetools
export ANDROID_HOME=$HOME/Library/Android/sdk       # add to ~/.zshrc, plus:
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
sdkmanager --sdk_root="$ANDROID_HOME" --licenses
sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "platforms;android-36" \
  "build-tools;36.0.0" "emulator" "ndk;27.1.12297006" \
  "system-images;android-36;google_apis;arm64-v8a"
```

## Google service file from Firebase

Firebase requires the Google service files for Android and iOS. These aren't in the repo since they're private. Sefaria employees can download them from the Firebase [Project Settings](https://console.firebase.google.com/u/0/project/sefaria-mobile-analytics/settings/general/) (project `sefaria-mobile-analytics`). If you don't have access, ask a coworker :).

- `GoogleService-Info.plist` → `ios/` (iOS bundle id `org.sefaria.sefariaApp`)
- `google-services.json` → `android/app/` (package `org.sefaria.sefaria`)

The app will not build (Android) or launch (iOS) without these.

## Build and run

```sh
npx react-native start                          # terminal 1 (Metro)
npx react-native run-ios                        # terminal 2
# or
npx react-native run-android
```
Alternatively for iOS, open `ios/ReaderApp.xcworkspace` in Xcode and hit Run.

> **Apple Silicon note:** `ios/Podfile` sets `EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64` (a legacy workaround; fine on Intel CI). If a local Simulator build fails on an M-series Mac (e.g. GoogleUtilities header errors under an x86_64/Rosetta build), build native arm64:
> ```sh
> xcodebuild -workspace ios/ReaderApp.xcworkspace -scheme ReaderApp -configuration Debug \
>   -destination 'platform=iOS Simulator,name=iPhone 16' ARCHS=arm64 'EXCLUDED_ARCHS=' ONLY_ACTIVE_ARCH=YES
> ```
> If you hit `GoogleUtilities/.../Public/GoogleUtilities/GULxxx.h file not found`, your Pods install is incomplete — run `cd ios && bundle exec pod deintegrate && bundle exec pod install`.

## Local Development

### Connect Simulator to Local Django Server

Test the app against a local instance of Sefaria-Project by setting `Api._baseHost`:

#### On Android
1. Set `Api._baseHost` to `10.0.2.2:8000` (a special alias that maps to localhost on your dev machine).
2. Ensure `10.0.2.2` is in `ALLOWED_HOSTS` in `local_settings.py` in your Sefaria-Project repo.

#### On iOS
1. Set `Api._baseHost` to `localhost:8000`.

### Simulate Deep Linking

For Android:
```bash
adb shell am start -W -a android.intent.action.VIEW -d "<INSERT_URL_HERE>" org.sefaria.sefaria
```

For iOS:
```bash
xcrun simctl openurl booted <INSERT_URL_HERE>
```

### Debug tools
- **whyDidYouRender** (unnecessary-render logging): in `index.js`, remove the `&& false` from `if (process.env.NODE_ENV !== "production" && false)`. Logs appear in the Chrome/JS console.
- **Tests**: `npm run test` (watch) or `npm run test-ci`.

### Support
This project is tested with BrowserStack.

## License
[GPL](http://www.gnu.org/copyleft/gpl.html)
