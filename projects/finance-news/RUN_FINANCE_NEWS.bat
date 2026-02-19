@echo off
REM Finance News Fetcher - One-Click Setup
REM This script automatically runs the finance news aggregator

echo ========================================
echo   Swedish Finance News Aggregator
echo ========================================
echo.
echo Fetching latest finance news...
echo.

REM Change to script directory
cd /d "%~dp0"

REM Check if Git Bash is installed
if exist "%PROGRAMFILES%\Git\bin\bash.exe" (
    echo Using Git Bash...
    "%PROGRAMFILES%\Git\bin\bash.exe" --login -c "cd '%CD%' && ./finance-news-windows.sh"
    goto :end
)

REM Check if Git Bash is in Program Files (x86)
if exist "%PROGRAMFILES(X86)%\Git\bin\bash.exe" (
    echo Using Git Bash...
    "%PROGRAMFILES(X86)%\Git\bin\bash.exe" --login -c "cd '%CD%' && ./finance-news-windows.sh"
    goto :end
)

REM If Git Bash is not found, show error
echo.
echo ERROR: Git Bash not found!
echo.
echo Please install Git for Windows:
echo   Download from: https://git-scm.com/download/win
echo.
echo After installation, run this script again.
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

