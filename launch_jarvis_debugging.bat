@echo off
title J.A.R.V.I.S. Debugging Launcher
echo ===================================================
echo   INITIALIZING J.A.R.V.I.S. DEBUG MODE
echo ===================================================

:: Start the Python Backend in a VISIBLE window
echo [*] Powering up neural processors (Visible Mode)...
start "JARVIS Backend" cmd /k ".\venv\Scripts\activate && python backend.py"

:: Wait for the backend to initialize
echo [*] Waiting for system handshake...
timeout /t 3 /nobreak > nul

:: Start the Electron GUI
echo [*] Projecting holographic interface...
cd ui
npm start
