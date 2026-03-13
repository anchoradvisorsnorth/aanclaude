@echo off
REM ═══════════════════════════════════════════════════
REM  AAN Deploy — pushes changes to GitHub / Vercel
REM  Run from: C:\Users\kmplu\Cowork\AAN\
REM ═══════════════════════════════════════════════════

cd /d "%~dp0"

echo.
echo ══════════════════════════════════════════
echo   AAN Deploy
echo ══════════════════════════════════════════
echo.

REM ── Check if git repo exists ──
if not exist ".git" (
    echo No git repo found. Initializing and connecting to GitHub...
    echo.
    git init
    git remote add origin https://github.com/anchoradvisorsnorth/aanclaude.git
    git fetch origin
    git checkout main 2>nul || git checkout -b main
    echo.
)

REM ── Pull latest to avoid conflicts ──
echo Pulling latest from remote...
git pull origin main --rebase 2>nul
echo.

REM ── Stage all changes ──
echo Staging changes...
git add -A
echo.

REM ── Show what changed ──
echo Changes to deploy:
echo ──────────────────
git status --short
echo.

REM ── Commit ──
set TIMESTAMP=%date:~-4%-%date:~4,2%-%date:~7,2% %time:~0,5%
set /p MSG="Commit message (or press Enter for default): "
if "%MSG%"=="" set MSG=Update %TIMESTAMP%

git commit -m "%MSG%"
echo.

REM ── Push to GitHub (triggers Vercel deploy) ──
echo Pushing to GitHub...
git push origin main
echo.

echo ══════════════════════════════════════════
echo   Done! Vercel will auto-deploy shortly.
echo   Tracker: aanclaude.vercel.app/tracker
echo ══════════════════════════════════════════
echo.
pause
