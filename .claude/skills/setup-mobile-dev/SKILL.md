---
name: setup-mobile-dev
description: Set up (or verify/repair) a local development environment for the Sefaria-Mobile React Native app on macOS. Use when a developer is onboarding to Sefaria-Mobile, says "set up the mobile env", "get the app running locally", "why won't the app build", or is missing tooling (Ruby/CocoaPods/JDK/Xcode/Android Studio/Firebase). Audits what's installed, installs what can be automated, and produces a precise list of manual steps (Xcode, Android SDK/AVD, Firebase config files).
---

# Setup Sefaria-Mobile Dev Environment

Goal: take a macOS machine from clean → able to run the app on iOS Simulator and/or Android emulator. React Native **0.81.6**, React 19, Expo modules ~54, Node ≥18.

Full reference: Sefaria wiki (internal) `runbooks/sefaria-mobile-local-setup.md` and `repos/sefaria-mobile/_index.md`.

## Method

Always **audit first, then install only what's missing, then report manual steps.** Do not blindly run installers.

### Step 1 — Audit the environment

Run these read-only checks and report a table of PASS/MISSING:

```sh
node -v            # need >=18 (20 recommended)
watchman -v
ruby -v            # need ~3.2 (system 2.6 will NOT work)
which rbenv
pod --version      # ~1.16
java -version      # need JDK 17–20
xcodebuild -version    # needs FULL Xcode, not just Command Line Tools
xcode-select -p        # /Applications/Xcode.app/... good; /Library/Developer/CommandLineTools = incomplete
echo "$ANDROID_HOME"; which adb emulator
ls node_modules >/dev/null 2>&1 && echo "node_modules OK" || echo "run npm install"
ls ios/GoogleService-Info.plist android/app/google-services.json 2>&1   # Firebase files
```

### Step 2 — Install the automatable pieces (only if missing)

Never pipe untrusted output into a shell. Install in this order:

1. **Node + Watchman**: `brew install node watchman` (watchman's cmake build is slow — normal).
2. **Ruby 3.2 (iOS toolchain — Gemfile pins `ruby "~> 3.2"`)**:
   ```sh
   brew install rbenv ruby-build
   grep -q 'rbenv init' ~/.zshrc || echo 'eval "$(rbenv init - zsh)"' >> ~/.zshrc
   exec zsh
   rbenv install 3.2.2 && rbenv local 3.2.2   # in the repo dir; writes .ruby-version
   gem install bundler && bundle install       # installs cocoapods, fastlane
   ```
3. **JDK 17 (Android)**: `brew install openjdk@17`, then either the sudo symlink into `/Library/Java/JavaVirtualMachines/` OR set `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home` in `~/.zshrc`.
4. **Android SDK (headless — no GUI wizard)**: Android Studio the IDE is optional. Install the SDK via `sdkmanager` matching `android/build.gradle` (compileSdk 36, build-tools 36.0.0, NDK 27.1.12297006). Confirm free disk > ~10 GB first (SDK is ~8.3 GB).
   ```sh
   brew install --cask android-commandlinetools
   export ANDROID_HOME=$HOME/Library/Android/sdk; mkdir -p "$ANDROID_HOME"
   sdkmanager --sdk_root="$ANDROID_HOME" --licenses
   sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "platforms;android-36" \
     "build-tools;36.0.0" "emulator" "ndk;27.1.12297006" \
     "system-images;android-36;google_apis;arm64-v8a"
   # avdmanager infers SDK root from its own path — COPY (not symlink) cmdline-tools in:
   mkdir -p "$ANDROID_HOME/cmdline-tools/latest"
   cp -R /opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/. "$ANDROID_HOME/cmdline-tools/latest/"
   echo "no" | "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd -n Pixel_7_API_36 \
     -k "system-images;android-36;google_apis;arm64-v8a" -d pixel_7
   ```
5. **JS deps**: `npm install` (runs `patch-package` automatically).

### Step 3 — Manual steps (cannot be automated — hand these to the developer)

Only **two** things need a human:

1. **iOS only — Xcode** — install the full IDE from the App Store, launch once to accept the license, then `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` and `sudo xcodebuild -license accept`. Install an iOS Simulator runtime (Xcode → Settings → Components). Then **CocoaPods**: `cd ios && bundle exec pod install`. Skip entirely if only doing Android.
2. **Firebase config files** (private, required to run) — from Firebase project `sefaria-mobile-analytics` (ask a teammate if no access): `GoogleService-Info.plist` (bundle id `org.sefaria.sefariaApp`) → `ios/`, `google-services.json` (package `org.sefaria.sefaria`) → `android/app/`. Both are `.gitignore`d.

### Step 4 — Build & run

```sh
npx react-native start                          # terminal 1
npx react-native run-ios   # or run-android      # terminal 2
```

To point at a local Sefaria-Project backend, set `Api._baseHost`: Android emulator → `10.0.2.2:8000` (add `10.0.2.2` to `ALLOWED_HOSTS` in Sefaria-Project `local_settings.py`); iOS → `localhost:8000`.

## Notes / gotchas

- The old README's `git clone .../Sefaria-iOS` and `npm run setup` (global `react-native-cli`) are **stale** — ignore them. RN 0.81 uses `npx react-native`.
- Nothing iOS-related works until the **full Xcode** is installed (`pod install` and `run-ios` both fail on Command Line Tools alone). After installing Xcode, run `sudo xcodebuild -license accept` or **all git/clang on the machine break** with a license error.
- The app will not run without the Firebase files even if it compiles.
- **Disk**: the full toolchain + a cold build needs ~20 GB free (Android SDK 8.3 GB, iOS platform 7 GB, DerivedData/gradle caches several GB). Reclaim safely with `npm cache clean --force`, `brew cleanup -s` before asking the user to free personal data.

### iOS build troubleshooting (Apple Silicon + Xcode 26 — both hit and fixed here)

- **`GoogleUtilities/.../Public/GoogleUtilities/GULxxx.h file not found`** → the Pods install was incomplete. `cd ios && bundle exec pod deintegrate && bundle exec pod install` (rbenv Ruby active) → should end at ~121 pods. Then rebuild.
- **Build compiles x86_64 on an M-series Mac** → `ios/Podfile` sets `EXCLUDED_ARCHS[sdk=iphonesimulator*]=arm64` (harmless in CI since CI only builds signed device archives, which don't use the `iphonesimulator*` SDK; wrong locally). Build native arm64: `xcodebuild -workspace ios/ReaderApp.xcworkspace -scheme ReaderApp -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' ARCHS=arm64 'EXCLUDED_ARCHS=' ONLY_ACTIVE_ARCH=YES`. Then `xcrun simctl install booted <ReaderApp.app>` + `xcrun simctl launch booted org.sefaria.sefariaApp` (Metro must be running for the Debug JS bundle).
- **iOS platform runtime missing** → `xcodebuild -downloadPlatform iOS` (no sudo, ~7 GB).
