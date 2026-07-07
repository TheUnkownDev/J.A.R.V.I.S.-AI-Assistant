@echo off
title V.E.R.N.O.N. Debugging Launcher
echo ===================================================
echo   INITIALIZING V.E.R.N.O.N. DEBUG MODE
echo ===================================================

:: Start the Python Backend in a VISIBLE window
echo [*] Powering up neural processors (Visible Mode)...
start "VERNON Backend" cmd /k ".\venv\Scripts\activate && python backend.py"

:: Wait for the backend to initialize
echo [*] Waiting for system handshake...
timeout /t 3 /nobreak > nul

:: Start the Electron GUI
echo [*] Projecting holographic interface...
cd ui
npm start
