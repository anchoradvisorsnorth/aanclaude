@echo off
cd /d "%~dp0"
PowerShell -ExecutionPolicy Bypass -File "%~dp0PUSH_AAN.ps1"
pause
