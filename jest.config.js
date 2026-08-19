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
        // The app imports the `expo-file-system/legacy` subpath, which the
        // existing __mocks__/expo-file-system.js never intercepted -- so the
        // real native module was loaded in tests and blew up on import.
        "^expo-file-system/legacy$": "<rootDir>/__mocks__/expo-file-system.js",
        // Must come before the generic asset rule below: react-native-svg-transformer
        // turns an .svg import into a component, not a file id, so it needs a
        // component mock rather than mockFile.js.
        "\\.svg$": "<rootDir>/__mocks__/svgMock.js",
        "\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/mockFile.js",
        "\\.(css|less)$": "<rootDir>/__mocks__/mockFile.js",
        // npm nests react-localization under react-native-localization rather than
        // hoisting it (it peer-depends on an older React), so Jest cannot resolve it
        // from the repo root. __mocks__/react-native-localization.js no longer imports
        // it -- it extends localized-strings directly -- but the mapping is kept so
        // anything else reaching for it still resolves.
        "^react-localization$": "<rootDir>/node_modules/react-native-localization/node_modules/react-localization"
    }
};
