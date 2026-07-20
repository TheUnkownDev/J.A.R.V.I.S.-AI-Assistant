import os
import speech_recognition as sr
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class JARVISSTT:
    def __init__(self):
        self.groq_key = os.getenv("GROQ_API_KEY")
        if self.groq_key and self.groq_key != "your_groq_api_key_here":
            self.client = Groq(api_key=self.groq_key)
            print("[*] STT Engine: Groq Whisper (High Precision)")
        else:
            self.client = None
            print("[*] STT Engine: Google Free (No Key Mode)")

    def listen_and_transcribe(self):
        r = sr.Recognizer()
        with sr.Microphone() as source:
            print("[*] Listening...")
            r.pause_threshold = 1
            audio = r.listen(source)

        try:
            print("[*] Transcribing...")
            if self.client:
                # Use Groq Whisper if key is available
                with open("temp_audio.wav", "wb") as f:
                    f.write(audio.get_wav_data())
                
                with open("temp_audio.wav", "rb") as file:
                    transcription = self.client.audio.transcriptions.create(
                        file=("temp_audio.wav", file.read()),
                        model="whisper-large-v3",
                    )
                
                if os.path.exists("temp_audio.wav"):
                    os.remove("temp_audio.wav")
                
                return transcription.text
            else:
                # Fallback to Google Free STT (requires no API key)
                return r.recognize_google(audio)
        except sr.UnknownValueError:
            print("[!] Could not understand audio")
            return ""
        except Exception as e:
            print(f"[!] STT Error: {str(e)}")
            return ""

if __name__ == "__main__":
    stt = JARVISSTT()
    # print(stt.listen_and_transcribe())
