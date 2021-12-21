# Sefaria-iOS
This repo contains the source code and export script to generate the content for Sefaria's [iOS App](https://itunes.apple.com/us/app/sefaria/id1163273965?mt=8) **AND** Sefaria's [Android App](https://play.google.com/store/apps/details?id=org.sefaria.sefaria&hl=en&gl=US). 

We're using React-Native, so much of the app is written in JavaScript and we deploy almost the same code to both Android and iOS. There are minor differences in native packages that we use and a small amount of native code we've written ourselves.

If you haven't already done so, install React Native for your development environment using the _React Native CLI Quickstart_ as outlined here: https://reactnative.dev/docs/environment-setup

### Getting Started

```
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
Put `GoogleService-Info.plist` in the `ios` directory.  It's available from the Firebase console (or your friendly co-worker.)
_<sub><sup>This step can be skipped if just running for android. Skipping it for ios can get you in trouble though.</sup></sub>_


To build and start the simulator:

From the root of the repo, run `react-native start`.  
From another terminal, run `react-native run-ios`

Alternatively, you can open `/ios/ReaderApp.xcworkspace` and hit run.


## Local Development
It's quite natural to want to test the app against a local instance of Sefaria-Project. This can be done in 2 simple steps:

1. Set `Api._baseHost` to the ip address that your local server is serving from (this has to be the actual ip address displayed by django, not `localhost`).
2. From your home directory, navigate to `Android/Sdk/platform-tools` (or add to `PATH`). Then execute `./adb reverse tcp:8000 tcp:8000`


## License
[GPL](http://www.gnu.org/copyleft/gpl.html)
