module.exports = {
    "preset": "react-native",
        "setupFiles": [
        "<rootDir>/jest.setup.js"
    ],
        // automatic-e2e-tests/ is a WebdriverIO/BrowserStack E2E suite with its
        // own package.json and mocha-based runner (see automatic-e2e-tests/package.json).
        // It is not a jest suite and must not be collected by the root unit-test run.
        "testPathIgnorePatterns": [
        "/node_modules/",
        "<rootDir>/automatic-e2e-tests/"
    ],
        // Expo and React Native packages ship untranspiled ESM/TS, so they must
        // not be excluded from Babel transformation or importing them throws
        // (e.g. expo-modules-core's EventEmitter reads as undefined).
        "transformIgnorePatterns": [
        "node_modules/(?!(?:static-container|(?:jest-)?react-native|@react-native(?:-community)?|expo|@expo|@unimodules|unimodules|react-navigation|@react-navigation))"
    ],
        "moduleNameMapper": {
        "\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/mockFile.js",
            "\\.(css|less)$": "<rootDir>/__mocks__/mockFile.js",
            // The app imports the `expo-file-system/legacy` subpath, which the
            // existing __mocks__/expo-file-system.js never intercepted -- so the
            // real native module was loaded in tests and blew up on import.
            "^expo-file-system/legacy$": "<rootDir>/__mocks__/expo-file-system.js",
            // __mocks__/react-native-localization.js imports react-localization
            // directly, but npm nests it under react-native-localization rather
            // than hoisting it (it peer-depends on an older React, so it can't
            // be installed at the top level). Point Jest at the nested copy.
            "^react-localization$": "<rootDir>/node_modules/react-native-localization/node_modules/react-localization"
    }
};
