# Sefaria-iOS
This repo contains the source code and export script to generate the content for Sefaria's unreleased iOS App. 

We're using React-Native, so much of the app is written in JavaScript. This is unlike our Android app which was built natively, but similar to our Web app which is built with React.

### Getting Started

```
brew install node
brew install watchman
git clone https://github.com/Sefaria/Sefaria-iOS/
cd Sefaria-iOS/ReaderApp                            
npm install
npm run setup
npm start
cp LocalSettingsExample.plist LocalSettings.plist
```

With these dependencies installed, you can open `/ReaderApp/ReadApp.xcodeprog` and hit run to start the simulator.
