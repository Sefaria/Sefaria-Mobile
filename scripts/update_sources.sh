#!/usr/bin/env bash

curr_dir=`pwd`
cd "${0%/*}"  # cd to dir of this script. see https://stackoverflow.com/questions/3349105/how-to-set-current-working-directory-to-the-directory-of-the-script

echo "Updating IOS and Android source files from readonly environment on old dev server"
IOS_SOURCES="../ios/sources/"
ANDROID_SOURCES="../android/app/src/main/assets/sources/"
EXPORT_VERSION="7"

ENVFILE=envvars.sh
if test -f "$ENVFILE"; then
    echo "$ENVFILE exists"
    source $ENVFILE
    echo $SOURCE_SERVER
    echo $SOURCE_UNIX_PATH
else
    echo "$ENVFILE does not exist"
    read -p "Enter ssh alias for ios files server:" SOURCE_SERVER
    SOURCE_SERVER_VAR=(${!SOURCE_SERVER@})
    read -p "Enter the path for files such as toc.json on the server:" SOURCE_UNIX_PATH
    SOURCE_UNIX_PATH_VAR=(${!SOURCEy c_UNIX_PATH@})
    #echo "#!/usr/bin/env bash" >> envvars.sh
    #echo "" >> envvars.sh
    echo "export "$SOURCE_SERVER_VAR"="$SOURCE_SERVER >> envvars.sh
    echo "export "$SOURCE_UNIX_PATH_VAR"="$SOURCE_UNIX_PATH >> envvars.sh
fi

declare -a filesarr=(packages.json people.json toc.json search_toc.json topic_toc.json hebrew_categories.json calendar.json)
for filename in "${filesarr[@]}"
do
    # scp $SOURCE_SERVER:$SOURCE_UNIX_PATH$EXPORT_VERSION/$filename $IOS_SOURCES;
    curl $SOURCE_SERVER$SOURCE_UNIX_PATH$EXPORT_VERSION/$filename > $IOS_SOURCES$filename;
    cp $IOS_SOURCES$filename $ANDROID_SOURCES$filename
done

cd $curr_dir
