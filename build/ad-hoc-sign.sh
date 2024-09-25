#!/bin/bash

APP_PATH="./dist/mac/FCapture Preview.app" # adjust path if needed

if [ -d "$APP_PATH" ]; then
    echo "[fbuild] - ad-hoc signing the app..."
    codesign --deep --force --verify --verbose --sign - "$APP_PATH"
    echo "[fbuild] - app signed successfully."
else
    echo "[fbuild] - app not found. please build the app first."
fi
