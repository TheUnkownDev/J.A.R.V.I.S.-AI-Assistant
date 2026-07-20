import subprocess
import time
import os
import sys

def launch():
    print("--- J.A.R.V.I.S. Launcher ---")
    
    # 1. Start the backend
    print("[*] Starting Backend...")
    # Using the venv python to ensure dependencies are found
    python_exe = os.path.join(os.getcwd(), "venv", "Scripts", "python.exe")
    backend_proc = subprocess.Popen([python_exe, "backend.py"], 
                                   creationflags=subprocess.CREATE_NEW_CONSOLE)
    
    # 2. Wait for it to spin up
    print("[*] Waiting for systems to initialize...")
    time.sleep(3)
    
    # 3. Start the GUI
    print("[*] Launching GUI...")
    try:
        # Change to ui directory
        ui_dir = os.path.join(os.getcwd(), "ui")
        # Run npm start. Using shell=True for npm on Windows
        subprocess.run("npm start", shell=True, cwd=ui_dir)
    except KeyboardInterrupt:
        print("\n[*] Shutting down JARVIS...")
    finally:
        # Cleanup backend if GUI is closed
        backend_proc.terminate()
        print("[*] Systems offline.")

if __name__ == "__main__":
    launch()
