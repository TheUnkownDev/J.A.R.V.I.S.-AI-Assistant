@echo off
title JARVIS Windows Compiler
echo ===================================================
echo   COMPILING J.A.R.V.I.S. EXECUTABLE (WINDOWS)
echo ===================================================
echo.

echo [*] Activating virtual environment...
call venv\Scripts\activate.bat

echo [*] Installing PyInstaller and Pillow (for icon conversion)...
pip install pyinstaller pillow > nul

echo [*] Generating .ico file for the backend...
python -c "from PIL import Image; Image.open('ui/icon.png').save('icon.ico', format='ICO', sizes=[(256, 256)])"

echo [*] Compiling Python Backend...
:: Note: uvicorn and fastapi require specific hidden imports to bundle correctly
pyinstaller --noconfirm --onedir --console --icon="icon.ico" ^
  --name "backend" ^
  --hidden-import="uvicorn.logging" ^
  --hidden-import="uvicorn.loops" ^
  --hidden-import="uvicorn.loops.auto" ^
  --hidden-import="uvicorn.protocols" ^
  --hidden-import="uvicorn.protocols.http" ^
  --hidden-import="uvicorn.protocols.http.auto" ^
  --hidden-import="uvicorn.protocols.websockets" ^
  --hidden-import="uvicorn.protocols.websockets.auto" ^
  --hidden-import="uvicorn.lifespan" ^
  --hidden-import="uvicorn.lifespan.on" ^
  --hidden-import="uvicorn.lifespan.off" ^
  --hidden-import="speech_recognition" ^
  --hidden-import="sounddevice" ^
  --hidden-import="google.genai" ^
  --hidden-import="groq" ^
  --hidden-import="pyttsx3" ^
  --collect-all "vosk" ^
  backend.py

if errorlevel 1 (
    echo [!] PyInstaller failed.
    pause
    exit /b %errorlevel%
)
echo [OK] Backend compiled successfully.
echo.

echo [*] Packaging UI and Bundling Backend...
cd ui

:: Create assets directory if it doesn't exist
if not exist "assets" mkdir assets

:: We use the --onedir output of pyinstaller because a single giant .exe for Python is notoriously slow to start.
:: We will copy the entire dist\backend folder into ui\assets\backend
echo [*] Copying compiled backend to UI assets...
if exist "assets\backend" rmdir /s /q "assets\backend"
xcopy /E /I /Y "..\dist\backend" "assets\backend"

echo [*] Installing UI dependencies...
call npm install

echo [*] Running Electron Builder...
call npx electron-builder --win

echo.
echo ===================================================
echo   PACKAGING COMPLETE!
echo ===================================================
echo IMPORTANT: Your final installer and portable ZIP are NOT in the 'dist' folder.
echo They have been created inside the UI's output folder!
echo.
echo Please look here for your final files:
echo --^> JARVIS\ui\dist\
echo.
echo Inside, you will find 'JARVIS Setup.exe' and the portable '.zip'.
echo ===================================================
pause
