#!/bin/bash

DIST_PATH="./dist"
PACKAGE_JSON="./package.json"
APP_PATH="./dist/mac/FCapture Preview.app" # adjust path if needed
VERSION_FILE=".last_build_version"
OS=$(uname) # OS platform/name

# get the current version from package.json
CURRENT_VERSION=$(jq -r '.version' < "$PACKAGE_JSON")

# get the last build version from .last_build_version file
# to compare with the current version
if [ -f "$VERSION_FILE" ]; then
    LAST_VERSION=$(cat "$VERSION_FILE")
else
    LAST_VERSION="N/A"
fi

# cmpare versions and delete dist folder in case
# app versions differs
if [ "$CURRENT_VERSION" != "$LAST_VERSION" ]; then
    echo "[fbuild] - app version changed from $LAST_VERSION to $CURRENT_VERSION."
    if [ -d "$DIST_PATH" ]; then
        echo "[fbuild] - deleting dist folder.."
        rm -rf "$DIST_PATH"
        echo "[fbuild] - dist folder has been deleted."
    fi
    # update the last build version file
    echo "$CURRENT_VERSION" > "$VERSION_FILE"
else
    echo "[fbuild] - app version has not been changed, skipping dist folder deletion."
fi

# build the app using electron-builder
echo "[fbuild] - running electron-builder."
electron-builder


# check the operating system
# and proceed with signing if on macOS
if [ "$OS" == "Darwin" ]; then
    # check if the app was finished "compiling"
    if [ -d "$APP_PATH" ]; then
        echo "[fbuild] - app found @ $APP_PATH"
        
        # ad-hoc sign the app
        echo "[fbuild] - ad-hoc signing the app..."
        codesign --deep --force --verify --verbose --sign - "$APP_PATH"
        
        # check if signing was successful
        if [ $? -eq 0 ]; then
            echo "[fbuild] - app signed successfully."
        else
            echo "[fbuild] - signing failed, please try again."
        fi
    else
        echo "[fbuild] - app not found. please check if the build process succeeded."
    fi
else
    echo "[fbuild] - not on macOS (Darwin), skipping app signing."
fi