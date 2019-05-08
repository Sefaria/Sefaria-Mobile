#!/usr/bin/env bash
curr_dir=`pwd`
cd "${0%/*}"  # cd to dir of this script. see https://stackoverflow.com/questions/3349105/how-to-set-current-working-directory-to-the-directory-of-the-script

echo "Updating IOS and Android source files from readonly environment on old dev server"
IOS_SOURCES="../ios/sources/"
ANDROID_SOURCES="../android/app/src/main/assets/sources/"
EXPORT_VERSION="5"
scp sefaria-dev:/var/www/readonly/static/ios-export/$EXPORT_VERSION/packages.json $IOS_SOURCES
scp sefaria-dev:/var/www/readonly/static/ios-export/$EXPORT_VERSION/people.json $IOS_SOURCES
scp sefaria-dev:/var/www/readonly/static/ios-export/$EXPORT_VERSION/toc.json $IOS_SOURCES
scp sefaria-dev:/var/www/readonly/static/ios-export/$EXPORT_VERSION/search_toc.json $IOS_SOURCES
scp sefaria-dev:/var/www/readonly/static/ios-export/$EXPORT_VERSION/hebrew_categories.json $IOS_SOURCES
scp sefaria-dev:/var/www/readonly/static/ios-export/$EXPORT_VERSION/calendar.json $IOS_SOURCES
cp $IOS_SOURCES/packages.json $ANDROID_SOURCES
cp $IOS_SOURCES/people.json $ANDROID_SOURCES
cp $IOS_SOURCES/toc.json $ANDROID_SOURCES
cp $IOS_SOURCES/search_toc.json $ANDROID_SOURCES
cp $IOS_SOURCES/hebrew_categories.json $ANDROID_SOURCES
cp $IOS_SOURCES/calendar.json $ANDROID_SOURCES

cd $curr_dir
