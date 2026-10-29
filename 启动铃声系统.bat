@echo off
rem Campus Bell System launcher - double click to start
cd /d "%~dp0"
if not exist "%~dp0node_modules\electron\dist\electron.exe" (
  echo [Error] electron not found. Please run: npm install
  pause
  exit /b 1
)
start "" "%~dp0node_modules\electron\dist\electron.exe" .
