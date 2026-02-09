@echo off
echo.
echo   ========================================
echo        GEMINI DESKTOP — LAUNCHER
echo   ========================================
echo.

:: Clone the repo if not already done
if not exist "%USERPROFILE%\gemini-desktop-app" (
    echo   Cloning the repo...
    git clone https://github.com/thelordisfried-star/ralph.git "%USERPROFILE%\ralph-temp"
    xcopy "%USERPROFILE%\ralph-temp\gemini-desktop-app" "%USERPROFILE%\gemini-desktop-app" /E /I /Y
    rmdir /S /Q "%USERPROFILE%\ralph-temp"
)

cd /d "%USERPROFILE%\gemini-desktop-app"

:: Install deps if needed
if not exist "node_modules" (
    echo   Installing dependencies...
    call npm install
    echo.
)

:: Run setup
echo   Running setup...
call node setup.js

:: Launch
echo   Launching Gemini Desktop...
call npx electron .
