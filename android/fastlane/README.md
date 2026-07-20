fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android release

```sh
[bundle exec] fastlane android release
```

Builds a production AAB and uploads to the Play Store internal testing track.
        Promotes from there to production via the Play Console as usual.

        Usage:
          bundle exec fastlane android release storepass:YOUR_PASSWORD

### android testrelease

```sh
[bundle exec] fastlane android testrelease
```

Builds a QA APK for the current branch and distributes via Firebase App Distribution.
        The app gets a unique package name derived from the branch name, so it installs
        alongside the production app (and any other QA branch builds) without overwriting them.

        Usage:
          bundle exec fastlane android testrelease storepass:YOUR_PASSWORD

        The package name is derived automatically from the current git branch.

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
