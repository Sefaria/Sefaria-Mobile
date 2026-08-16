module.exports = {
    "preset": "react-native",
        "setupFiles": [
        "<rootDir>/jest.setup.js"
    ],
        "transformIgnorePatterns": [
        "node_modules/(?!static-container)/"
    ],
        // `automatic-e2e-tests` holds Appium/webdriverio specs with their own runner
        // (`npm run test:android:browserstack`). Jest cannot resolve `webdriverio` and
        // reports them as failing suites, so keep them out of the unit-test run.
        "testPathIgnorePatterns": [
        "/node_modules/",
            "/automatic-e2e-tests/"
    ],
        "moduleNameMapper": {
        // App code imports the `expo-file-system/legacy` subpath. Jest only auto-applies a
        // manual mock to the exact package name, so without this line every module that
        // reaches FileSystem (sefaria.js, offline.js, DownloadControl.js, SettingsPage.js)
        // loads expo's real native module and the whole suite fails at import time.
        "^expo-file-system/legacy$": "<rootDir>/__mocks__/expo-file-system.js",
            // Must come before the generic asset rule below: an .svg is a component, not a file id.
            "\\.svg$": "<rootDir>/__mocks__/svgMock.js",
            "\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/mockFile.js",
            "\\.(css|less)$": "<rootDir>/__mocks__/mockFile.js"
    }
};
