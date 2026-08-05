@echo off
title N.O.V.A. Installer
echo ===================================================
echo   N.O.V.A. AUTOMATED INSTALLATION (WINDOWS)
echo ===================================================
echo.

:: Get the current directory
set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%"

goto after_jokes

:joke_python
echo         NOVA: I appear to be missing a brain, sir. Python would be a fine place to start.
exit /b 0

:joke_node
echo         We at AeteX: No Node? That's not a setup, that's a cry for an upgrade.
exit /b 0

:joke_pip
echo         We at AeteX: Dependency chaos. Classic. I usually fix this with VSCodium and questionable confidence.
exit /b 0

:joke_ui
echo         NOVA: The HUD refuses to assemble. Even AeteX tech needs its npm bolts tightened.
exit /b 0

:run_spinner
set "SPIN_MSG=%~1"
set "SPIN_CMD=%~2"
set "SPIN_LOG=%TEMP%\NOVA-install-%RANDOM%.log"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$msg=$env:SPIN_MSG; $cmd=$env:SPIN_CMD + ' > \"' + $env:SPIN_LOG + '\" 2>&1'; $log=$env:SPIN_LOG; $p=Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/s','/c',$cmd -WindowStyle Hidden -PassThru; $spin='|','/','-','\'; $i=0; while(-not $p.HasExited){ Write-Host -NoNewline (\"`r[*] {0} {1}\" -f $msg,$spin[$i%%4]); Start-Sleep -Milliseconds 120; $i++ }; $p.WaitForExit(); Write-Host -NoNewline \"`r\"; if($p.ExitCode -ne 0){ $saved=Join-Path (Get-Location) 'NOVA-install-log.log'; if(Test-Path $log){ Move-Item -Force $log $saved }; Write-Host \"[ERROR] $msg failed.\"; if((Test-Path $saved) -and (Select-String -Path $saved -Pattern 'Failed to resolve|NameResolutionError|Temporary failure|Could not resolve|unreachable network|WinError 10051' -Quiet)){ Write-Host '        Network connection failed. Check your internet/DNS, then re-run this installer.' } else { Write-Host \"        Full technical details were saved to $saved\" }; exit $p.ExitCode }; if(Test-Path $log){ Remove-Item $log -ErrorAction SilentlyContinue }; Write-Host \"[OK] $msg complete.\"; exit 0"
exit /b %errorlevel%

:after_jokes
echo [*] Pre-flight: Checking Python...
where python > nul 2>&1
if %errorlevel% neq 0 (
    echo ===================================================
    echo   N.O.V.A. SYSTEM ALERT
    echo ===================================================
    echo [ERROR] Python is not installed or not available on PATH.
    call :joke_python
    echo         Arc reactor offline. Please install Python from:
    echo         https://www.python.org/downloads/windows/
    echo.
    echo         During setup, enable "Add python.exe to PATH".
    echo         Then re-run this installer.
    echo ===================================================
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo [OK] Python detected: %%v
echo.

echo [*] Step 1: Checking Node.js and npm...
where node > nul 2>&1
if %errorlevel% neq 0 (
    goto install_node
)
where npm > nul 2>&1
if %errorlevel% neq 0 (
    goto install_node
)
echo [OK] Node.js and npm are already installed.
goto node_done

:install_node
echo [*] Installing Node.js LTS...
where winget > nul 2>&1
if %errorlevel% equ 0 (
    call :run_spinner "Installing Node.js LTS" "winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements"
    if %errorlevel% neq 0 goto node_install_failed
    goto refresh_node_path
)

where choco > nul 2>&1
if %errorlevel% equ 0 (
    call :run_spinner "Installing Node.js LTS" "choco install nodejs-lts -y"
    if %errorlevel% neq 0 goto node_install_failed
    goto refresh_node_path
)

echo [ERROR] Could not find winget or Chocolatey to install Node.js automatically.
call :joke_node
echo         Install Node.js LTS from https://nodejs.org/ and re-run this installer.
pause
exit /b 1

:node_install_failed
echo [ERROR] Node.js installation failed.
call :joke_node
echo         Install Node.js LTS from https://nodejs.org/ and re-run this installer.
pause
exit /b 1

:refresh_node_path
set "PATH=%ProgramFiles%\nodejs;%AppData%\npm;%PATH%"
where node > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was installed, but it is not available in this terminal yet.
    call :joke_node
    echo         Close this window, open a new terminal, and re-run this installer.
    pause
    exit /b 1
)
where npm > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm was installed, but it is not available in this terminal yet.
    call :joke_node
    echo         Close this window, open a new terminal, and re-run this installer.
    pause
    exit /b 1
)
echo [OK] Node.js and npm installed.

:node_done
echo.

echo [*] Step 2: Creating Python Virtual Environment...
if not exist "venv" (
    python -m venv venv
    echo [OK] Virtual environment created.
) else (
    echo [OK] Virtual environment already exists.
)
echo.

echo [*] Step 3: Installing Python Core Dependencies...
call "%BASE_DIR%venv\Scripts\activate.bat"
call :run_spinner "Upgrading pip" "python -m pip install --upgrade pip"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to upgrade pip.
    call :joke_pip
    pause
    exit /b 1
)
call :run_spinner "Installing Python dependencies" "pip install --progress-bar off -r requirements.txt"
if %errorlevel% neq 0 (
    echo [ERROR] Python dependency installation failed.
    call :joke_pip
    pause
    exit /b 1
)
echo [OK] Python dependencies installed.
echo.

echo [*] Step 4: Installing UI Components...
cd ui
call :run_spinner "Installing UI components" "npm install --silent"
if %errorlevel% neq 0 (
    echo [ERROR] UI dependency installation failed.
    call :joke_ui
    pause
    exit /b 1
)
cd ..
echo [OK] UI components installed.
echo.

echo [*] Step 5: Downloading Kokoro TTS Models...
if not exist "voice" mkdir voice

if not exist "voice\kokoro-v1.0.onnx" (
    echo Downloading kokoro-v1.0.onnx - approx 300MB, this may take a moment...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx' -OutFile 'voice\kokoro-v1.0.onnx'"
    if errorlevel 1 (
        echo [ERROR] Failed to download kokoro-v1.0.onnx.
        pause
        exit /b 1
    )
    echo [OK] Downloaded kokoro-v1.0.onnx.
) else (
    echo [OK] kokoro-v1.0.onnx already exists.
)

if not exist "voice\voices-v1.0.bin" (
    echo Downloading voices-v1.0.bin - approx 20MB...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin' -OutFile 'voice\voices-v1.0.bin'"
    if errorlevel 1 (
        echo [ERROR] Failed to download voices-v1.0.bin.
        pause
        exit /b 1
    )
    echo [OK] Downloaded voices-v1.0.bin.
) else (
    echo [OK] voices-v1.0.bin already exists.
)
echo.

echo [*] Step 6: Setting up environment configuration...
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env > nul
        echo [OK] Auto-created .env configuration file from .env.example.
    ) else (
        echo [WARN] .env.example file not found. Could not auto-create .env file.
    )
) else (
    echo [OK] .env configuration file already exists.
)
echo.

echo ===================================================
echo   LOCAL MODEL SETUP (llama.cpp) [EXPERIMENTAL]
echo ===================================================
echo.
echo NOVA can run AI models locally on your machine for
echo complete privacy and offline capability.
echo.
echo [WARNING] Local models require significant system resources:
echo   - Recommended: 16GB+ RAM for good performance
echo   - Minimum: 8GB RAM (may experience slower responses)
echo   - GPU acceleration highly recommended for best performance
echo.
echo [EXPERIMENTAL] llama.cpp is not stable and may have issues.
echo   This feature is experimental and under active development.
echo   Use at your own risk. Cloud APIs (Groq/Gemini) are recommended.
echo.
echo Would you like to install llama.cpp for local model support?
echo This will download approximately 100MB of files.
echo.
set /p INSTALL_LLAMA="Install llama.cpp? (Y/N): "
if /i "%INSTALL_LLAMA%"=="Y" (
    echo.
    echo [*] Installing llama.cpp...
    if not exist "llama.cpp" mkdir llama.cpp
    
    echo Downloading llama.cpp for Windows...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/ggerganov/llama.cpp/releases/download/b3593/llama-b3593-bin-win-avx2-x64.zip' -OutFile 'llama_cpp.zip'"
    if errorlevel 1 (
        echo [ERROR] Failed to download llama.cpp.
        pause
        exit /b 1
    )
    
    echo Extracting llama.cpp...
    powershell -Command "Expand-Archive -Path 'llama_cpp.zip' -DestinationPath 'llama.cpp' -Force"
    if errorlevel 1 (
        echo [ERROR] Failed to extract llama.cpp.
        pause
        exit /b 1
    )
    
    echo Cleaning up...
    del llama_cpp.zip
    
    echo [OK] llama.cpp installed successfully.
    
    echo.
    echo Creating models directory...
    if not exist "models" mkdir models
    echo [OK] Models directory created.
    
    echo.
    echo [*] Step 7: Downloading recommended model...
    echo.
    echo Based on typical system specifications, we recommend:
    echo   Phi-3-mini-4k-instruct-Q4_K_M (~1.2GB)
    echo   This is a lightweight model that balances performance and quality.
    echo.
    set /p DOWNLOAD_MODEL="Download recommended model now? (Y/N): "
    if /i "%DOWNLOAD_MODEL%"=="Y" (
        echo Downloading Phi-3-mini-4k-instruct-Q4_K_M...
        echo This may take several minutes depending on your connection...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://huggingface.co/bartowski/Phi-3-mini-4k-instruct-GGUF/resolve/main/Phi-3-mini-4k-instruct-Q4_K_M.gguf' -OutFile 'models\Phi-3-mini-4k-instruct-Q4_K_M.gguf'"
        if errorlevel 1 (
            echo [ERROR] Failed to download model.
            echo You can download models later from the settings menu.
        ) else (
            echo [OK] Model downloaded successfully.
            echo Updating .env configuration...
            powershell -Command "(Get-Content .env) -replace 'LLAMA_CPP_ENABLED=\"false\"', 'LLAMA_CPP_ENABLED=\"true\"' | Set-Content .env"
            powershell -Command "(Get-Content .env) -replace 'LLAMA_CPP_MODEL_PATH=\"models/your-model.gguf\"', 'LLAMA_CPP_MODEL_PATH=\"models/Phi-3-mini-4k-instruct-Q4_K_M.gguf\"' | Set-Content .env"
            echo [OK] Configuration updated. Local model enabled.
        )
    ) else (
        echo You can download models later from the settings menu.
    )
) else (
    echo [*] Skipping llama.cpp installation.
    echo You can install it later by running this installer again.
)
echo.

echo ===================================================
echo   INSTALLATION COMPLETE!
echo ===================================================
echo.
echo You can launch the system using:
echo launch_NOVA.bat
echo.
echo Once the UI opens, you can:
echo   - Configure API keys from the settings menu (for cloud AI)
echo   - Manage local models from the Models settings (for offline AI)
echo.
pause
