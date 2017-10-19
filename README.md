# Sefaria-iOS
This repo contains the source code and export script to generate the content for Sefaria's [iOS App](https://itunes.apple.com/us/app/sefaria/id1163273965?mt=8). 

We're using React-Native, so much of the app is written in JavaScript. This is unlike our Android app which was built natively, but similar to our Web app which is built with React.

### Getting Started

```
brew install node
brew install watchman
git clone https://github.com/Sefaria/Sefaria-iOS/
cd Sefaria-iOS/ReaderApp                            
npm install
npm run setup
```

With these dependencies installed, you can open `/ReaderApp/ReadApp.xcodeprog` and hit run to start the simulator.


### Working with Android


1. Get [Android Studio](https://facebook.github.io/react-native/releases/0.23/docs/android-setup.html).
1. Install lots of required stuff.
1. Open new project.
1. Create emulator.
1. In `Sefaria-iOS/ReaderApp` run `react-native run-android`
   - This should open the emulator with the project.
1. Edit code
2. Click r r (R twice to refresh the app).
