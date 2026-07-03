@echo off
setlocal enabledelayedexpansion
title SnapGrab Dependency Installer

echo ===================================================
echo   SnapGrab - yt-dlp & FFmpeg Dependency Installer
echo ===================================================
echo.

:: Define install directory
set "INSTALL_DIR=%USERPROFILE%\SnapGrab"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo [*] Creating installation folder at: %INSTALL_DIR%

:: Download yt-dlp.exe using curl
echo [*] Downloading yt-dlp...
curl -L -o "%INSTALL_DIR%\yt-dlp.exe" "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
if %errorlevel% neq 0 (
    echo [!] Failed to download yt-dlp.
    goto error
)
echo [✓] yt-dlp downloaded successfully.
echo.

:: Download FFmpeg zip using curl
echo [*] Downloading FFmpeg (GPL Shared Build)...
curl -L -o "%INSTALL_DIR%\ffmpeg.zip" "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
if %errorlevel% neq 0 (
    echo [!] Failed to download FFmpeg zip.
    goto error
)
echo [✓] FFmpeg zip downloaded.
echo.

:: Extract FFmpeg zip using powershell
echo [*] Extracting FFmpeg...
powershell -Command "Expand-Archive -Path '%INSTALL_DIR%\ffmpeg.zip' -DestinationPath '%INSTALL_DIR%' -Force"
if %errorlevel% neq 0 (
    echo [!] Failed to extract FFmpeg.
    goto error
)

:: Move ffmpeg.exe and ffprobe.exe
echo [*] Copying binaries...
powershell -Command "$ffDir = Get-ChildItem '%INSTALL_DIR%' -Directory -Filter 'ffmpeg-*' | Select-Object -First 1; if ($ffDir) { Copy-Item (Join-Path $ffDir.FullName 'bin\ffmpeg.exe') '%INSTALL_DIR%\ffmpeg.exe' -Force; Copy-Item (Join-Path $ffDir.FullName 'bin\ffprobe.exe') '%INSTALL_DIR%\ffprobe.exe' -Force; Remove-Item $ffDir.FullName -Recurse -Force }"

:: Clean up zip
if exist "%INSTALL_DIR%\ffmpeg.zip" del "%INSTALL_DIR%\ffmpeg.zip"
echo [✓] FFmpeg extracted and cleaned up.
echo.

:: Add to PATH (User PATH environment variable)
echo [*] Adding %INSTALL_DIR% to User PATH...
powershell -Command "$oldPath = [Environment]::GetEnvironmentVariable('Path', 'User'); if ($oldPath -notlike '*%INSTALL_DIR%*') { [Environment]::SetEnvironmentVariable('Path', $oldPath + ';%INSTALL_DIR%', 'User') }"
set "PATH=%PATH%;%INSTALL_DIR%"

echo.
echo ===================================================
echo   [✓] INSTALLATION COMPLETED SUCCESSFULLY!
echo ===================================================
echo.
echo Binaries installed at: %INSTALL_DIR%
echo Added to your PATH environment variable.
echo.
echo Press any key to exit...
pause >nul
exit /b 0

:error
echo.
echo [!] An error occurred during installation.
echo.
pause
exit /b 1
