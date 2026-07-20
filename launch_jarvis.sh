#!/bin/bash
echo "==================================================="
echo "      INITIALIZING J.A.R.V.I.S. (UNIX)"
echo "==================================================="

cd "$(dirname "$0")"

if ! command -v cargo >/dev/null 2>&1; then
    echo "[ERROR] Rust/Cargo is required to launch the Tauri HUD from source."
    echo "        Install it from https://rustup.rs/ and re-run this launcher."
    exit 1
fi

# Start the Python Backend in the background (silent)
echo "[*] Powering up neural processors..."
. ./venv/bin/activate
python3 backend.py > /dev/null 2>&1 &

# Wait for it to spin up
sleep 3

# Start the Tauri GUI
echo "[*] Projecting holographic interface..."
cd ui
npm start &

echo "==================================================="
echo "  SYSTEMS INITIALIZED. SHELL CLOSING."
echo "==================================================="
exit
