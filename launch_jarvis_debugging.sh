#!/bin/bash
echo "==================================================="
echo "  INITIALIZING J.A.R.V.I.S. DEBUG MODE (UNIX)"
echo "==================================================="

cd "$(dirname "$0")"

# Start the Python Backend in the background but show logs in current terminal
echo "[*] Powering up neural processors..."
. ./venv/bin/activate
python3 backend.py &

# Wait for it to spin up
sleep 3

# Start Electron
echo "[*] Projecting holographic interface..."
cd ui
npm start
