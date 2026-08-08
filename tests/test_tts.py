import asyncio
from core.speech import NOVASpeech

async def main():
    print("Testing NOVASpeech with am_adam...")
    speech = NOVASpeech()
    speech.voice = "am_adam"
    print("Speaking...")
    await speech.speak("Hello, sir. The systems are functioning normally.")
    print("Done speaking.")

if __name__ == "__main__":
    asyncio.run(main())
