import asyncio
from core.speech import JARVISSpeech

async def main():
    print("Testing JARVISSpeech with am_adam...")
    speech = JARVISSpeech()
    speech.voice = "am_adam"
    print("Speaking...")
    await speech.speak("Hello, sir. The systems are functioning normally.")
    print("Done speaking.")

if __name__ == "__main__":
    asyncio.run(main())
