Write-Host ""
Write-Host "  ========================================"
Write-Host "       GEMINI DESKTOP - LAUNCHER"
Write-Host "  ========================================"
Write-Host ""

$appDir = "$env:USERPROFILE\gemini-desktop-app"

# Clone repo if needed
if (-not (Test-Path $appDir)) {
    Write-Host "  Cloning the repo..."
    git clone https://github.com/thelordisfried-star/ralph.git "$env:USERPROFILE\ralph-temp"
    Copy-Item -Recurse "$env:USERPROFILE\ralph-temp\gemini-desktop-app" $appDir
    Remove-Item -Recurse -Force "$env:USERPROFILE\ralph-temp"
}

Set-Location $appDir

# Install deps if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing dependencies..."
    npm install
    Write-Host ""
}

# Run setup
Write-Host "  Running setup..."
node setup.js

# Launch
Write-Host "  Launching Gemini Desktop..."
npx electron .
