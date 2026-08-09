#!/bin/bash
echo "==================================================="
echo "      INITIALIZING N.O.V.A. (UNIX)"
echo "==================================================="

cd "$(dirname "$0")"



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
