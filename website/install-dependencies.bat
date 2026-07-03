@echo off
setlocal EnableExtensions EnableDelayedExpansion
title SnapGrab - yt-dlp and FFmpeg Installer

set "INSTALL_DIR=%APPDATA%\snapgrab\bin"
set "WORK_DIR=%TEMP%\snapgrab-dependencies-%RANDOM%"
set "YTDLP_URL=https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
set "FFMPEG_URL=https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"

echo ============================================================
echo   SnapGrab Dependency Installer
echo   Installs the latest yt-dlp, FFmpeg and FFprobe
echo ============================================================
echo.
echo Install folder: %INSTALL_DIR%
echo No administrator permission is required.
echo.

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if errorlevel 1 goto :error
mkdir "%WORK_DIR%"
if errorlevel 1 goto :error

echo [1/4] Downloading latest yt-dlp...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri $env:YTDLP_URL -OutFile (Join-Path $env:WORK_DIR 'yt-dlp.exe')"
if errorlevel 1 goto :error
if not exist "%WORK_DIR%\yt-dlp.exe" goto :error

echo [2/4] Downloading latest FFmpeg package...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri $env:FFMPEG_URL -OutFile (Join-Path $env:WORK_DIR 'ffmpeg.zip')"
if errorlevel 1 goto :error
if not exist "%WORK_DIR%\ffmpeg.zip" goto :error

echo [3/4] Extracting and validating binaries...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$extract=Join-Path $env:WORK_DIR 'ffmpeg'; Expand-Archive -LiteralPath (Join-Path $env:WORK_DIR 'ffmpeg.zip') -DestinationPath $extract -Force; $ffmpeg=Get-ChildItem -LiteralPath $extract -Filter ffmpeg.exe -Recurse | Select-Object -First 1; $ffprobe=Get-ChildItem -LiteralPath $extract -Filter ffprobe.exe -Recurse | Select-Object -First 1; if(-not $ffmpeg -or -not $ffprobe){ throw 'FFmpeg package did not contain the required files' }; Copy-Item -LiteralPath $ffmpeg.FullName -Destination (Join-Path $env:INSTALL_DIR 'ffmpeg.exe') -Force; Copy-Item -LiteralPath $ffprobe.FullName -Destination (Join-Path $env:INSTALL_DIR 'ffprobe.exe') -Force; Copy-Item -LiteralPath (Join-Path $env:WORK_DIR 'yt-dlp.exe') -Destination (Join-Path $env:INSTALL_DIR 'yt-dlp.exe') -Force"
if errorlevel 1 goto :error

if not exist "%INSTALL_DIR%\yt-dlp.exe" goto :error
if not exist "%INSTALL_DIR%\ffmpeg.exe" goto :error
if not exist "%INSTALL_DIR%\ffprobe.exe" goto :error

echo [4/4] Adding SnapGrab tools to your user PATH...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$dir=$env:INSTALL_DIR; $entries=@([Environment]::GetEnvironmentVariable('Path','User') -split ';' | Where-Object { $_ }); if($entries -notcontains $dir){ [Environment]::SetEnvironmentVariable('Path', (($entries + $dir) -join ';'), 'User') }"
if errorlevel 1 goto :error

rmdir /s /q "%WORK_DIR%" >nul 2>&1
echo.
echo ============================================================
echo   Installation completed successfully.
echo ============================================================
echo.
echo SnapGrab will use these tools automatically.
echo You can also update them later from SnapGrab Settings.
echo.
pause
exit /b 0

:error
echo.
echo Installation failed. Please check your internet connection
echo and try the script again.
if exist "%WORK_DIR%" rmdir /s /q "%WORK_DIR%" >nul 2>&1
echo.
pause
exit /b 1
