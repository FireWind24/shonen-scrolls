@echo off
cd /d "%~dp0"
echo Adding your new posters to the website...
node tools\generate-manifest.js
echo.
echo Done! Refresh your browser (Ctrl+R) to see new designs.
pause
