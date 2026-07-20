import asyncio
import os
import tempfile
import pygame

try:
    import soundfile as sf
    from kokoro_onnx import Kokoro as KokoroOnnx
    KOKORO_AVAILABLE = True
except ImportError as _kokoro_err:
    print(f"[WARN] Kokoro TTS not available ({_kokoro_err}). Speech output will be disabled.")
    KOKORO_AVAILABLE = False

class JARVISSpeech:
    def __init__(self):
        pygame.mixer.init()
        # Locate the voice directory in the project root
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.model_path = os.path.join(self.base_dir, "voice", "kokoro-v1.0.onnx")
        self.voices_path = os.path.join(self.base_dir, "voice", "voices-v1.0.bin")
        self.kokoro = None
        self.voice = "am_adam"

    def init_kokoro(self):
        """Lazy initialization of Kokoro ONNX model."""
        if not KOKORO_AVAILABLE:
            return
        if self.kokoro is None:
            if os.path.exists(self.model_path) and os.path.exists(self.voices_path):
                try:
                    print(f"[*] Initializing Kokoro TTS Core ({self.model_path})...")
                    self.kokoro = KokoroOnnx(self.model_path, self.voices_path)
                    print("[OK] Kokoro TTS Core loaded.")
                except Exception as e:
                    print(f"[ERROR] Failed to initialize Kokoro ONNX model: {e}")
            else:
                print(f"[WARN] Kokoro model or voices bin not found at: {self.model_path} / {self.voices_path}")

    def stop(self):
        """Stops the current playback."""
        if pygame.mixer.music.get_busy():
            pygame.mixer.music.stop()
            pygame.mixer.music.unload()
            return True
        return False

    async def speak(self, text: str):
        """Generates speech using Kokoro ONNX and plays it."""
        # Remove TOOL_CALL lines from speech
        clean_text = "\n".join([line for line in text.split("\n") if not line.startswith("TOOL_CALL:")])
        if not clean_text.strip():
            return

        if not KOKORO_AVAILABLE:
            print(f"[WARN] Kokoro TTS unavailable — skipping speech for: {clean_text[:60]}...")
            return

        self.init_kokoro()
        if self.kokoro is None:
            print("[WARN] Kokoro TTS not ready. Model files may be missing — skipping speech.")
            return

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            tmp_path = tmp_file.name

        try:
            # Run Kokoro synthesis in a background thread executor to prevent event loop blocking
            loop = asyncio.get_running_loop()
            samples, sample_rate = await loop.run_in_executor(
                None,
                lambda: self.kokoro.create(clean_text, voice=self.voice, speed=1.0, lang="en-us")
            )

            # Write raw samples to temporary wav file
            sf.write(tmp_path, samples, sample_rate)

            pygame.mixer.music.load(tmp_path)
            pygame.mixer.music.play()
            
            while pygame.mixer.music.get_busy():
                await asyncio.sleep(0.1)
                
            pygame.mixer.music.unload()
        except Exception as e:
            print(f"[ERROR] Speak failed: {e}")
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except:
                    pass

def speak_sync(text: str):
    """Wrapper to run async speak in a synchronous way if needed."""
    speech = JARVISSpeech()
    asyncio.run(speech.speak(text))

if __name__ == "__main__":
    pass
