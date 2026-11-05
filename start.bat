@echo off
REM 
REM 

cd /d "%~dp0"

echo === Innovexa Booking Backend Setup ===

REM 
where node >nul 2>nul
IF ERRORLEVEL 1 (
  echo Node.js is not installed. Download it from https://nodejs.org and try again.
  pause
  exit /b 1
)
echo Node.js found.
node -v

REM 
IF NOT EXIST .env (
  copy .env.example .env >nul
  echo Created .env from .env.example. Open it and set your ADMIN_KEY before going live.
) ELSE (
  echo .env already exists, leaving it as is.
)

REM 
IF NOT EXIST node_modules (
  echo Installing dependencies... this may take a minute.
  call npm install
) ELSE (
  echo Dependencies already installed.
)

REM 
echo.
echo Starting server...
echo.
call npm start

pause
