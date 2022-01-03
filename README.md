# Sefaria-Mobile
This repo contains the source code and export script to generate the content for Sefaria's [iOS App](https://itunes.apple.com/us/app/sefaria/id1163273965?mt=8) **AND** Sefaria's [Android App](https://play.google.com/store/apps/details?id=org.sefaria.sefaria&hl=en&gl=US). 

We're using React-Native, so much of the app is written in JavaScript and we deploy almost the same code to both Android and iOS. There are minor differences in native packages that we use and a small amount of native code we've written ourselves.

If you haven't already done so, install React Native for your development environment using the [React Native CLI Quickstart](https://reactnative.dev/docs/environment-setup). Follow the instructions on the "React Native CLI Quickstart" tab (not "Expo CLI Quickstart") for your operating system. You should follow the instructions for both iOS and Android. Skip the "Creating a new application" section since you'll be using this repo as the project. 

### Getting Started

```sh
brew install node
brew install watchman
git clone https://github.com/Sefaria/Sefaria-iOS/
cd Sefaria-iOS                          
npm install
npm run setup
brew install cocoapods
cd ios
pod install
```

### Google service file from Firebase

Firebase requires that you download the Google service files for Android and iOS to make Firebase work. These aren't included in the repo since they are private. For Sefaria employees, you can access these files from the Firebase [Project Settings](https://console.firebase.google.com/u/0/project/sefaria-mobile-analytics/settings/general/android:org.sefaria.sefaria). If you don't have access to Firebase, please reach out to your friendly coworker :).

Put `GoogleService-Info.plist` in the `ios` directory.
Put `google-services.json` in the `android/app` directory.

### Build and run

To build and start the simulator:

From the root of the repo, run `react-native start`.  
From another terminal, run `react-native run-ios` or `react-native run-android`

Alternatively for iOS, you can open `/ios/ReaderApp.xcworkspace` and hit run.


## Local Development
It's quite natural to want to test the app against a local instance of Sefaria-Project. This can be done in 2 simple steps:

1. Set `Api._baseHost` to the ip address that your local server is serving from (this has to be the actual ip address displayed by django, not `localhost`).
2. From your home directory, navigate to `Android/Sdk/platform-tools` (or add to `PATH`). Then execute `./adb reverse tcp:8000 tcp:8000`


## License
[GPL](http://www.gnu.org/copyleft/gpl.html)
