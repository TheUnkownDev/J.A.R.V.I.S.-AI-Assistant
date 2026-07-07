import asyncio
from core.speech import VERNONSpeech

async def main():
    print("Testing VERNONSpeech with am_adam...")
    speech = VERNONSpeech()
    speech.voice = "am_adam"
    print("Speaking...")
    await speech.speak("Hello, sir. The systems are functioning normally.")
    print("Done speaking.")

if __name__ == "__main__":
    asyncio.run(main())
