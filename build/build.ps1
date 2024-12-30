$DIST_PATH = "./dist"
$PACKAGE_JSON = "./package.json"
$VERSION_FILE = ".last_build_version"
$GLOBAL_NPM_PATH = $(npm prefix -g)
$ELECTRON_BUILDER_PATH = Join-Path $GLOBAL_NPM_PATH "node_modules\electron-builder\cli.js"

function Show-Spinner {
    param (
        [Parameter(Mandatory=$true)]
        [System.Diagnostics.Process]$Process
    )

    $SPINNER_CHARS = @('|', '/', '-', '\')
    $SPINNER_INDEX = 0
    $SPINNER_LENGTH = $SPINNER_CHARS.Length
    $DELAY = 80 # milliseconds

    while (!$Process.HasExited) {
        $SPINNER_CHAR = $SPINNER_CHARS[$SPINNER_INDEX]
        $SPINNER_INDEX = ($SPINNER_INDEX + 1) % $SPINNER_LENGTH #  cycle through the spinner characters
        Write-Host -NoNewline -ForegroundColor Green "[$SPINNER_CHAR]"
        Start-Sleep -Milliseconds $DELAY
        Write-Host -NoNewline "`b`b`b"
    }
    Write-Host "`r[fbuild] - app built successfully!"
}

# Check if electron-builder is installed
if (-not (Get-Command electron-builder -ErrorAction SilentlyContinue)) {
    Write-Host "[fbuild] - electron-builder could not be found."
    Write-Host "[fbuild] - please run 'npm install -g electron-builder' on a Windows Terminal (cmd) to proceed."
    exit 1
}

# Check if jq is installed
if (-not (Get-Command jq -ErrorAction SilentlyContinue)) {
    Write-Host "[fbuild] - jq command could not be found."
    Write-Host "[fbuild] - please run 'winget install jqlang.jq' on Windows Terminal (cmd) to proceed."
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
$LAST_VERSION = if (Test-Path -Path $VERSION_FILE) { 
    $CONTENT = Get-Content -Path $VERSION_FILE -Raw
    if ([string]::IsNullOrEmpty($CONTENT)) {
        "N/A"
    }
    else {
        $CONTENT
    }
}
else { 
    "N/A" 
}

# Compare versions and delete dist folder if app versions differ
if ($CURRENT_VERSION -ne $LAST_VERSION -or $LAST_VERSION -eq "N/A") {
    Write-Host "[fbuild] - app version changed from $LAST_VERSION to $CURRENT_VERSION."
    if (Test-Path -Path $DIST_PATH) {
        Write-Host "[fbuild] - deleting dist folder..."
        Remove-Item -Recurse -Force -Path $DIST_PATH
        Write-Host "[fbuild] - dist folder has been deleted."
    }
    # Update the last build version file
    Set-Content -Path $VERSION_FILE -Value $CURRENT_VERSION
}
else {
    Write-Host "[fbuild] - app version has not been changed, skipping dist folder deletion."
}

# Create temporary files for output redirection
$TEMPOUTPUTFILE = [System.IO.Path]::GetTempFileName()
$TEMPERRORFILE = [System.IO.Path]::GetTempFileName()

# Build the app using electron-builder
Write-Host "[fbuild] - running electron-builder..."
$PROCESS = Start-Process "node" -ArgumentList $ELECTRON_BUILDER_PATH -NoNewWindow -PassThru -RedirectStandardOutput $TEMPOUTPUTFILE -RedirectStandardError $TEMPERRORFILE

# Start the spinner animation while the build process runs
# and wait for it to finish
Show-Spinner -Process $PROCESS
$PROCESS.WaitForExit()

# Clean up temporary files
Remove-Item -Force $TEMPOUTPUTFILE
Remove-Item -Force $TEMPERRORFILE
