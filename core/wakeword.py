import os
import sys
import json
import queue
import sounddevice as sd
from vosk import Model, KaldiRecognizer

class WakeWordDetector:
    def __init__(self, model_path="model"):
        self.model_path = model_path
        if not os.path.exists(model_path):
            print("[*] Downloading small Vosk model for wake word detection...")
            # We'll expect the user to have the model or we can try to use vosk's auto-downloader
            # but for a script, it's better to guide them.
            # Actually, we can use the vosk model downloader.
            import vosk
            model = vosk.Model(lang="en-us")
            self.model = model
        else:
            self.model = Model(model_path)
            
        self.recognizer = KaldiRecognizer(self.model, 16000)
        self.audio_queue = queue.Queue()

    def _audio_callback(self, indata, frames, time, status):
        if status:
            print(status, file=sys.stderr)
        self.audio_queue.put(bytes(indata))

    def listen_for_keyword(self, keyword="jarvis"):
        """Continuous listener for the specific keyword."""
        print(f"[*] Wake word engine active. Listening for '{keyword}'...")
        with sd.RawInputStream(samplerate=16000, blocksize=8000, dtype='int16',
                               channels=1, callback=self._audio_callback):
            while True:
                data = self.audio_queue.get()
                if self.recognizer.AcceptWaveform(data):
                    result = json.loads(self.recognizer.Result())
                    text = result.get("text", "")
                    if keyword in text.lower():
                        return True
                else:
                    # Partial results can also be checked for faster response
                    partial = json.loads(self.recognizer.PartialResult())
                    if keyword in partial.get("partial", "").lower():
                        # We found it in partial speech, might be faster
                        # but we need to reset the recognizer to avoid double triggers
                        self.recognizer.Reset()
                        return True
        return False

if __name__ == "__main__":
    detector = WakeWordDetector()
    while detector.listen_for_keyword():
        print("YES SIR!")
