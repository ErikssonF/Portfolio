@echo off
REM Finance News Fetcher - Automatic Setup and Run
REM This script automatically installs Git Bash if needed, then runs the news fetcher

echo ========================================
echo   Swedish Finance News Aggregator
echo   Automatic Setup
echo ========================================
echo.

REM Check if Git Bash is already installed
if exist "%PROGRAMFILES%\Git\bin\bash.exe" (
    echo Git Bash found! Running news fetcher...
    echo.
    goto :run_script
)

if exist "%PROGRAMFILES(X86)%\Git\bin\bash.exe" (
    echo Git Bash found! Running news fetcher...
    echo.
    goto :run_script
)

REM Git Bash not found - install it automatically
echo Git Bash is not installed.
echo.
echo Installing Git Bash automatically...
echo (This is free, safe, and takes about 2-3 minutes)
echo.
echo ========================================
echo   Downloading Git for Windows...
echo ========================================
echo.

REM Create temp directory
set TEMP_DIR=%TEMP%\git-installer
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

REM Download Git installer (using latest 64-bit version)
set GIT_INSTALLER=%TEMP_DIR%\Git-Installer.exe
echo Downloading installer (this may take a minute)...

powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe' -OutFile '%GIT_INSTALLER%'}"

if not exist "%GIT_INSTALLER%" (
    echo.
    echo ERROR: Download failed. Please check your internet connection.
    echo You can manually download Git from: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Installing Git Bash...
echo ========================================
echo.
echo Installing with default settings...
echo This will take a minute or two.
echo.

REM Run installer with silent/default options
start /wait "" "%GIT_INSTALLER%" /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS

echo.
echo Installation complete!
echo.

REM Clean up
del "%GIT_INSTALLER%" 2>nul
rmdir "%TEMP_DIR%" 2>nul

echo Now running the news fetcher...
echo.
timeout /t 2 /nobreak >nul

:run_script
REM Run the finance news script
cd /d "%~dp0"

if exist "%PROGRAMFILES%\Git\bin\bash.exe" (
    "%PROGRAMFILES%\Git\bin\bash.exe" --login -i -c "./finance-news-windows.sh"
    goto :end
)

if exist "%PROGRAMFILES(X86)%\Git\bin\bash.exe" (
    "%PROGRAMFILES(X86)%\Git\bin\bash.exe" --login -i -c "./finance-news-windows.sh"
    goto :end
)

echo.
echo ERROR: Could not find Git Bash.
echo Please restart this script or install Git manually.
echo.
pause
exit /b 1

:end
echo.
echo ========================================
echo   Done! Check finance-news.html
echo ========================================
echo.
pause
