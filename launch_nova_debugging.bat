@echo off
title N.O.V.A. Debugging Launcher
echo ===================================================
echo   INITIALIZING N.O.V.A. DEBUG MODE
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
