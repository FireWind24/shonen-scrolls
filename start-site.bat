@echo off
cd /d "%~dp0"
echo ============================================
echo   Shonen Scrolls - local server
echo   Open this address in your browser:
echo       http://localhost:3000
echo   Close this window to stop the site.
echo ============================================
echo.
node serve.js
pause
