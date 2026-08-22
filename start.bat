@echo off
cd /d "%~dp0"
if exist "dist\WatermarkStudio.exe" (
  start "" "dist\WatermarkStudio.exe"
  exit /b 0
)
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Install failed.
    pause
    exit /b 1
  )
)
echo Starting Watermark Studio...
call npm start
