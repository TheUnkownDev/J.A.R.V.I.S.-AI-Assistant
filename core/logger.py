import sys
import os

LOG_FILE = "jarvis.log"

class JARVISLogger:
    def __init__(self):
        self.terminal = sys.stdout
        self.log = open(LOG_FILE, "a", encoding="utf-8")

    def write(self, message):
        if self.terminal:
            self.terminal.write(message)
        self.log.write(message)
        self.log.flush()

    def flush(self):
        if self.terminal:
            self.terminal.flush()
        self.log.flush()

    def isatty(self):
        return False

def setup_logger():
    # Ensure log file exists and is clear for new session
    try:
        if os.path.exists(LOG_FILE):
            os.remove(LOG_FILE)
    except PermissionError:
        print("[!] Warning: jarvis.log is locked. Appending to existing log.")
    
    sys.stdout = JARVISLogger()
    sys.stderr = sys.stdout
    print("[*] Logging system initialized.")
