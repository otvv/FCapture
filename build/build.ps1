$DIST_PATH = "./dist"
$PACKAGE_JSON = "./package.json"
$VERSION_FILE = ".last_build_version"
$GLOBAL_NPM_PATH = $(npm prefix -g)
$ELECTRON_BUILDER_PATH = Join-Path $GLOBAL_NPM_PATH "node_modules\electron-builder\cli.js"

# Check if electron-builder is installed
if (-not (Get-Command electron-builder -ErrorAction SilentlyContinue)) {
    Write-Host "[fbuild] - electron-builder could not be found."
    Write-Host "[fbuild] - please run 'npm install -g electron-builder' to proceed."
    exit 1
}

# Check if jq is installed
if (-not (Get-Command jq -ErrorAction SilentlyContinue)) {
    Write-Host "[fbuild] - jq command could not be found. Please install jq to proceed."
    exit 1
}

# Ensure package.json exists
if (-not (Test-Path -Path $PACKAGE_JSON)) {
    Write-Host "[fbuild] - package.json not found. Please check the project files."
    exit 1
}

# Get the current version from package.json
$CURRENT_VERSION = & jq -r '.version' $PACKAGE_JSON

# Get the last build version from .last_build_version file to compare with the current version
$LAST_VERSION = if (Test-Path -Path $VERSION_FILE) { Get-Content -Path $VERSION_FILE -Raw } else { "N/A" }

# Compare versions and delete dist folder if app versions differ
if ($CURRENT_VERSION -ne $LAST_VERSION) {
    Write-Host "[fbuild] - app version changed from $LAST_VERSION to $CURRENT_VERSION."
    if (Test-Path -Path $DIST_PATH) {
        Write-Host "[fbuild] - deleting dist folder..."
        Remove-Item -Recurse -Force -Path $DIST_PATH
        Write-Host "[fbuild] - dist folder has been deleted."
    }
    # Update the last build version file
    Set-Content -Path $VERSION_FILE -Value $CURRENT_VERSION
} else {
    Write-Host "[fbuild] - app version has not been changed, skipping dist folder deletion."
}

# Build the app using electron-builder
Write-Host "[fbuild] - running electron-builder:"
$process = Start-Process "node" -ArgumentList $ELECTRON_BUILDER_PATH -NoNewWindow -PassThru

# Wait til the build process finishes
$process.WaitForExit()
Write-Host "`n[fbuild] - app built successfully!"