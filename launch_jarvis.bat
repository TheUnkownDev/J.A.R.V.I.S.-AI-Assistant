@echo off
title J.A.R.V.I.S. Launcher
echo ===================================================
echo           INITIALIZING J.A.R.V.I.S. 
echo ===================================================

:: Get the current directory to use absolute paths
set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%"

where cargo > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Rust/Cargo is required to launch the Tauri HUD from source.
    echo         Install it from https://rustup.rs/ and re-run this launcher.
    pause
    exit /b 1
)

:: Start the Python Backend silently using relative venv path
echo [*] Powering up neural processors (Silent Mode)...
start "" /b "venv\Scripts\pythonw.exe" backend.py

:: Wait for the backend to initialize
echo [*] Waiting for system handshake...
timeout /t 3 /nobreak > nul

:: Start the Tauri GUI
echo [*] Projecting holographic interface...
cd ui
start "" /b npm start

:: Close the launcher window
echo [*] Systems initialized. Terminal closing.
timeout /t 2 /nobreak > nul
exit
