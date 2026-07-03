#!/bin/bash
echo "==================================================="
echo "  J.A.R.V.I.S. AUTOMATED INSTALLATION (MAC)"
echo "==================================================="
echo ""

cd "$(dirname "$0")"

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

jarvis_error_joke() {
    case "$1" in
        python) echo "        JARVIS: I appear to be missing a brain, sir. Python would be a fine place to start." ;;
        node) echo "        Tony Stark: No Node? That's not a setup, that's a cry for an upgrade." ;;
        pip) echo "        Tony Stark: Dependency chaos. Classic. I usually fix this with a suit and questionable confidence." ;;
        ui) echo "        JARVIS: The HUD refuses to assemble. Even Stark tech needs its npm bolts tightened." ;;
        *) echo "        JARVIS: Something broke, sir. I recommend blaming physics until we find the log." ;;
    esac
}

run_with_spinner() {
    message="$1"
    shift
    log_file="$(mktemp)"

    "$@" > "$log_file" 2>&1 &
    pid=$!
    i=0

    while kill -0 "$pid" 2>/dev/null; do
        i=$(( (i + 1) % 4 ))
        case "$i" in
            0) spin='|' ;;
            1) spin='/' ;;
            2) spin='-' ;;
            *) spin='\' ;;
        esac
        printf "\r[*] %s %s" "$message" "$spin"
        sleep 0.12
    done

    wait "$pid"
    status=$?
    printf "\r"

    if [ "$status" -ne 0 ]; then
        saved_log="./jarvis-install-log.log"
        mv "$log_file" "$saved_log"
        echo "[ERROR] $message failed."
        if grep -qiE "Failed to resolve|NameResolutionError|Temporary failure|Could not resolve|unreachable network|Network is unreachable" "$saved_log"; then
            echo "        Network connection failed. Check your internet/DNS, then re-run this installer."
        else
            echo "        Full technical details were saved to $saved_log"
        fi
        return "$status"
    fi

    rm -f "$log_file"
    echo "[OK] $message complete."
    return 0
}

check_python() {
    echo "[*] Pre-flight: Checking Python..."

    if command_exists python3; then
        echo "[OK] Python detected: $(python3 --version 2>&1)"
        return 0
    fi

    echo "==================================================="
    echo "  J.A.R.V.I.S. SYSTEM ALERT"
    echo "==================================================="
    echo "[ERROR] Python 3 is not installed or not available on PATH."
    jarvis_error_joke python
    echo "        Arc reactor offline. Please install Python 3:"
    echo "        Option A: Download it from https://www.python.org/downloads/macos/"
    echo "        Option B: brew install python"
    echo "        Then re-run this script."
    echo "==================================================="
    exit 1
}

install_node_dependencies() {
    echo "[*] Step 1: Checking Node.js and npm..."

    if command_exists node && command_exists npm; then
        echo "[OK] Node.js and npm are already installed."
        return 0
    fi

    if ! command_exists brew; then
        echo "[*] Homebrew is required to install Node.js/npm. Installing Homebrew..."
        run_with_spinner "Installing Homebrew" env NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || {
            echo "[ERROR] Homebrew installation failed."
            jarvis_error_joke node
            exit 1
        }

        if [ -x "/opt/homebrew/bin/brew" ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [ -x "/usr/local/bin/brew" ]; then
            eval "$(/usr/local/bin/brew shellenv)"
        fi
    fi

    if ! command_exists brew; then
        echo "[ERROR] Homebrew installation was not found on PATH."
        jarvis_error_joke node
        echo "        Install Node.js from https://nodejs.org/ and re-run this script."
        exit 1
    fi

    run_with_spinner "Installing Node.js and npm" brew install node || {
        echo "[ERROR] Node.js/npm installation failed."
        jarvis_error_joke node
        exit 1
    }
    echo "[OK] Node.js and npm installed."
}

check_python
echo ""

install_node_dependencies
echo ""

echo "[*] Step 2: Creating Python Virtual Environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "[OK] Virtual environment created."
else
    echo "[OK] Virtual environment already exists."
fi
echo ""

echo "[*] Step 3: Installing Python Core Dependencies..."
. venv/bin/activate
run_with_spinner "Upgrading pip" python3 -m pip install --upgrade pip || {
    echo "[ERROR] Failed to upgrade pip."
    jarvis_error_joke pip
    exit 1
}
run_with_spinner "Installing Python dependencies" pip install --progress-bar off -r requirements.txt || {
    echo "[ERROR] Python dependency installation failed."
    jarvis_error_joke pip
    exit 1
}
echo "[OK] Python dependencies installed."
echo ""

echo "[*] Step 4: Installing UI Components..."
cd ui
run_with_spinner "Installing UI components" npm install --silent || {
    echo "[ERROR] UI dependency installation failed."
    jarvis_error_joke ui
    exit 1
}
cd ..
echo "[OK] UI components installed."
echo ""

echo "[*] Step 5: Downloading Kokoro TTS Models..."
mkdir -p voice
if [ ! -f "voice/kokoro-v1.0.onnx" ]; then
    if command_exists curl; then
        run_with_spinner "Downloading kokoro-v1.0.onnx (this may take a moment)" curl -L -o "voice/kokoro-v1.0.onnx" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx" || {
            echo "[ERROR] Failed to download kokoro-v1.0.onnx"
            exit 1
        }
    elif command_exists wget; then
        run_with_spinner "Downloading kokoro-v1.0.onnx (this may take a moment)" wget -O "voice/kokoro-v1.0.onnx" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx" || {
            echo "[ERROR] Failed to download kokoro-v1.0.onnx"
            exit 1
        }
    else
        echo "[ERROR] Neither curl nor wget is installed. Please download the ONNX model manually to voice/kokoro-v1.0.onnx"
        exit 1
    fi
else
    echo "[OK] kokoro-v1.0.onnx already exists."
fi

if [ ! -f "voice/voices-v1.0.bin" ]; then
    if command_exists curl; then
        run_with_spinner "Downloading voices-v1.0.bin" curl -L -o "voice/voices-v1.0.bin" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin" || {
            echo "[ERROR] Failed to download voices-v1.0.bin"
            exit 1
        }
    elif command_exists wget; then
        run_with_spinner "Downloading voices-v1.0.bin" wget -O "voice/voices-v1.0.bin" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin" || {
            echo "[ERROR] Failed to download voices-v1.0.bin"
            exit 1
        }
    else
        echo "[ERROR] Neither curl nor wget is installed. Please download the voices binary manually to voice/voices-v1.0.bin"
        exit 1
    fi
else
    echo "[OK] voices-v1.0.bin already exists."
fi
echo ""

echo "[*] Step 6: Setting up environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "[OK] Auto-created .env configuration file from .env.example."
    else
        echo "[WARN] .env.example file not found. Could not auto-create .env file."
    fi
else
    echo "[OK] .env configuration file already exists."
fi
echo ""

echo "==================================================="
echo "  LOCAL MODEL SETUP (llama.cpp) [EXPERIMENTAL]"
echo "==================================================="
echo ""
echo "JARVIS can run AI models locally on your machine for"
echo "complete privacy and offline capability."
echo ""
echo "[WARNING] Local models require significant system resources:"
echo "  - Recommended: 16GB+ RAM for good performance"
echo "  - Minimum: 8GB RAM (may experience slower responses)"
echo "  - GPU acceleration highly recommended for best performance"
echo ""
echo "[EXPERIMENTAL] llama.cpp is not stable and may have issues."
echo "  This feature is experimental and under active development."
echo "  Use at your own risk. Cloud APIs (Groq/Gemini) are recommended."
echo ""
read -p "Install llama.cpp for local model support? (y/N): " install_llama
if [[ "$install_llama" =~ ^[Yy]$ ]]; then
    echo ""
    echo "[*] Installing llama.cpp..."
    mkdir -p llama.cpp
    
    # Detect architecture
    arch=$(uname -m)
    if [ "$arch" = "arm64" ]; then
        llama_url="https://github.com/ggerganov/llama.cpp/releases/download/b3593/llama-b3593-bin-macos-arm64.zip"
    else
        llama_url="https://github.com/ggerganov/llama.cpp/releases/download/b3593/llama-b3593-bin-macos-x64.zip"
    fi
    
    echo "Downloading llama.cpp for macOS..."
    if command_exists curl; then
        curl -L -o "llama_cpp.zip" "$llama_url" || {
            echo "[ERROR] Failed to download llama.cpp."
            exit 1
        }
    elif command_exists wget; then
        wget -O "llama_cpp.zip" "$llama_url" || {
            echo "[ERROR] Failed to download llama.cpp."
            exit 1
        }
    else
        echo "[ERROR] Neither curl nor wget is installed."
        exit 1
    fi
    
    echo "Extracting llama.cpp..."
    unzip -q "llama_cpp.zip" -d llama.cpp || {
        echo "[ERROR] Failed to extract llama.cpp."
        exit 1
    }
    
    echo "Cleaning up..."
    rm "llama_cpp.zip"
    
    # Find and move executables to root
    find llama.cpp -type f -name "llama-cli" -exec mv {} llama.cpp/ \; 2>/dev/null
    
    echo "[OK] llama.cpp installed successfully."
    
    echo ""
    echo "Creating models directory..."
    mkdir -p models
    echo "[OK] Models directory created."
    
    echo ""
    echo "[*] Step 7: Downloading recommended model..."
    echo ""
    echo "Based on typical system specifications, we recommend:"
    echo "  Phi-3-mini-4k-instruct-Q4_K_M (~1.2GB)"
    echo "  This is a lightweight model that balances performance and quality."
    echo ""
    read -p "Download recommended model now? (y/N): " download_model
    if [[ "$download_model" =~ ^[Yy]$ ]]; then
        echo "Downloading Phi-3-mini-4k-instruct-Q4_K_M..."
        echo "This may take several minutes depending on your connection..."
        if command_exists curl; then
            curl -L -o "models/Phi-3-mini-4k-instruct-Q4_K_M.gguf" "https://huggingface.co/bartowski/Phi-3-mini-4k-instruct-GGUF/resolve/main/Phi-3-mini-4k-instruct-Q4_K_M.gguf" || {
                echo "[ERROR] Failed to download model."
                echo "You can download models later from the settings menu."
            }
        elif command_exists wget; then
            wget -O "models/Phi-3-mini-4k-instruct-Q4_K_M.gguf" "https://huggingface.co/bartowski/Phi-3-mini-4k-instruct-GGUF/resolve/main/Phi-3-mini-4k-instruct-Q4_K_M.gguf" || {
                echo "[ERROR] Failed to download model."
                echo "You can download models later from the settings menu."
            }
        fi
        
        if [ -f "models/Phi-3-mini-4k-instruct-Q4_K_M.gguf" ]; then
            echo "[OK] Model downloaded successfully."
            echo "Updating .env configuration..."
            sed -i '' 's/LLAMA_CPP_ENABLED="false"/LLAMA_CPP_ENABLED="true"/' .env
            sed -i '' 's|LLAMA_CPP_MODEL_PATH="models/your-model.gguf"|LLAMA_CPP_MODEL_PATH="models/Phi-3-mini-4k-instruct-Q4_K_M.gguf"|' .env
            echo "[OK] Configuration updated. Local model enabled."
        fi
    else
        echo "You can download models later from the settings menu."
    fi
else
    echo "[*] Skipping llama.cpp installation."
    echo "You can install it later by running this installer again."
fi
echo ""

echo "==================================================="
echo "  INSTALLATION COMPLETE!"
echo "==================================================="
echo ""
echo "You can launch the system using:"
echo "./launch_jarvis.sh"
echo ""
echo "Once the UI opens, you can:"
echo "  - Configure API keys from the settings menu (for cloud AI)"
echo "  - Manage local models from the Models settings (for offline AI)"
echo ""
