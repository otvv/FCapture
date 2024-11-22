#!/bin/bash

DIST_PATH="./dist"
PACKAGE_JSON="./package.json"
APP_PATH="./dist/mac/FCapture.app" # adjust path if needed
VERSION_FILE=".last_build_version"
OS=$(uname) # OS platform/name

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
    local index=0
    local length=${#spinstr[@]}

    while kill -0 "$pid" 2>/dev/null; do
        printf "[%s]" "${spinstr[$index]}"
        index=$(((index + 1) % length)) # cycle through the spinner characters

        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "\r[fbuild] - app built successfully\n"
}

# check if electron builder is installed
if ! command -v electron-builder &>/dev/null; then
    echo "[fbuild] - electron-builder could not be found."
    echo "[fbuild] - please run 'npm install -g electron-builder' to proceed."
    exit 1
fi


# check if jq is installed
if ! command -v jq &>/dev/null; then
    echo "[fbuild] - jq command could not be found."
    echo "[fbuild] - please run 'brew install jq' for macOS or the Linux equivalent package to proceed."
    exit 1
fi

# ensure package.json exists
if [ ! -f "$PACKAGE_JSON" ]; then
    echo "[fbuild] - package.json not found. please check the project files."
    exit 1
fi

# get the current version from package.json
CURRENT_VERSION=$(jq -r '.version' <"$PACKAGE_JSON")

# get the last build version from .last_build_version file
# to compare with the current version
if [ -f "$VERSION_FILE" ]; then
    LAST_VERSION=$(cat "$VERSION_FILE")
else
    LAST_VERSION="N/A"
fi

# compare versions and delete dist folder in case
# app versions differs
if [ "$CURRENT_VERSION" != "$LAST_VERSION" ]; then
    echo "[fbuild] - app version changed from $LAST_VERSION to $CURRENT_VERSION."
    if [ -d "$DIST_PATH" ]; then
        echo "[fbuild] - deleting dist folder.."
        rm -rf "$DIST_PATH"
        echo "[fbuild] - dist folder has been deleted."
    fi
    # update the last build version file
    echo "$CURRENT_VERSION" >"$VERSION_FILE"
else
    echo "[fbuild] - app version has not been changed, skipping dist folder deletion."
fi

# build the app using electron-builder
echo "[fbuild] - running electron-builder:"
electron-builder >/dev/null 2>&1 &
build_pid=$!

# start the spinner animation while the build process runs
# and wait for it to finish
spinner "$build_pid"
wait "$build_pid"

if [ $? -ne 0 ]; then
    echo "[fbuild] - electron-builder failed."
    exit 1
fi

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
        exit 1
    fi
else
    echo "[fbuild] - not on macOS (Darwin), skipping app signing."
fi
