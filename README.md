# J.A.R.V.I.S. | The Holographic AI Assistant By AeteX

> [!IMPORTANT]
> **Original project by AeteX.** Forks and modifications are welcome. Please keep original credit when sharing or modifying this project.

> [!WARNING]
> **macOS support is untested.** I don't personally own a Mac, so while the macOS install path *should* work, I haven't been able to verify it myself on real hardware. If you're on macOS and want to help — or want to contribute in any other way — see [Contributing](#5-contributing-macos-help-especially-wanted) below. Everyone who helps gets listed as a contributor, Mac or not.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Electron](https://img.shields.io/badge/platform-Electron-blueviolet.svg)](https://www.electronjs.org/)

**Current version:** v0.5

> **Development warning:** JARVIS v0.5 is still under active development. Expect some rough edges and possible bugs while the systems are being upgraded.

> *"I am Iron Man."*

A sophisticated, holographic AI assistant inspired by Iron Man's J.A.R.V.I.S. This project combines a high-performance Python backend (powered by Groq or Google Gemini) with a stunning Electron-based glassmorphism HUD.

---

## 1. Get Your Free API Key

> *"Give me a few hours. I'll have something better figured out." — Tony Stark*

This project supports cloud and local AI engines. You can use Groq, Gemini, or run completely offline with local models.

### Option A: Groq API
1. Visit the [Groq Cloud Console](https://console.groq.com/keys).
2. Create an API Key. This provides lightning-fast responses using Groq's high-speed inference.

### Option B: Google Gemini API
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create a free API Key. This provides a massive context window and is optimized for the free tier.

### Option C: Local Models (llama.cpp) — 100% Offline & Private

> **Recommended for:** Privacy-conscious users, offline usage, and those with capable hardware.

The installer will automatically offer to install llama.cpp during setup. Local models provide:

- **Complete Privacy**: All processing happens on your machine
- **Offline Capability**: No internet connection required after initial download
- **Hardware Detection**: Automatically scans your system and recommends the best model
- **Easy Management**: Download, delete, and switch models directly from the settings menu

**Requirements:**
- **Recommended**: 16GB+ RAM for good performance
- **Minimum**: 8GB RAM (may experience slower responses)
- **GPU**: NVIDIA GPU with CUDA support for best performance (optional)

**During Installation:**
1. The installer will ask if you want to install llama.cpp
2. If you accept, it will download the necessary files (~100MB)
3. You can choose to download a recommended model immediately (e.g., Phi-3-mini, ~1.2GB)
4. Models are downloaded to the `models/` folder in the project directory

**Managing Models:**
- Open JARVIS and go to Settings → Local Models
- View your hardware capabilities and recommended models
- Download new models directly from Hugging Face
- Load or delete downloaded models
- Switch between cloud and local AI anytime

*Note: Local models are enabled by setting `LLAMA_CPP_ENABLED=true` in `.env`. The installer can configure this automatically.*

---

## 2. Installation & Setup

> *"Sometimes you gotta run before you can walk." — Tony Stark*

We offer two installation paths depending on your technical comfort level.

### Path A: Regular Users (Installer / Portable)

> **Under Maintenance** — The pre-built `.exe` installer and `.zip` portable are currently being fixed and will be available again in a future update. In the meantime, please use the script installation below — it is easier than it sounds and takes less than 5 minutes!

---

### Path B: Power Users / Developers

> *"Let's face it, this is not the worst thing you've caught me doing." — Tony Stark*

If you want to edit the code, tweak the UI, or run the system natively across Windows, macOS, or Linux, follow the source-code installation below:

<details>
<summary><b>Windows Setup (Click to expand)</b></summary>

1. **Option A: Clone with Git** (Recommended):
   ```powershell
   git clone https://github.com/aetex/J.A.R.V.I.S.-AI-Assistant.git
   cd J.A.R.V.I.S.-AI-Assistant
   ```
   **Option B: Download ZIP**:
   - Click the green **"Code"** button at the top of this page.
   - Select **"Download ZIP"**.
   - Extract the folder and open it.
2. **Run the Installer**:
   - Double-click the `install_windows.bat` file.
   - Wait for it to say "INSTALLATION COMPLETE!"
3. **Run & Configure**:
   - Double-click `launch_jarvis.bat`.
   - Once the HUD opens, configure your API keys (Groq or Gemini) directly from the settings menu.
</details>

<details>
<summary><b>macOS Setup (Click to expand)</b></summary>

> ⚠️ **Untested on macOS.** These steps are written to the best of my knowledge, but I don't own a Mac to confirm them myself. If something breaks, please [open an issue](https://github.com/aetex/J.A.R.V.I.S.-AI-Assistant/issues) — or better yet, help fix it (or contribute in any other way)! See [Contributing](#5-contributing-macos-help-especially-wanted).

1. **Option A: Clone with Git** (Recommended):
   ```bash
   git clone https://github.com/aetex/J.A.R.V.I.S.-AI-Assistant.git
   cd J.A.R.V.I.S.-AI-Assistant
   ```
   **Option B: Download ZIP**:
   - Click the green **"Code"** button at the top of this page.
   - Select **"Download ZIP"**.
   - Extract the folder and open it in your terminal.
2. **Run the Installer**:
   ```bash
   sh install_mac.sh
   ```
3. **Run & Configure**:
   ```bash
   sh launch_jarvis.sh
   ```
   - Once the HUD opens, configure your API keys (Groq or Gemini) directly from the settings menu.
</details>

<details>
<summary><b>Linux Setup (Click to expand)</b></summary>

1. **Clone the Repo**:
   ```bash
   git clone https://github.com/aetex/J.A.R.V.I.S.-AI-Assistant.git
   cd J.A.R.V.I.S.-AI-Assistant
   ```
2. **Run the Installer**:
   ```bash
   sh install_linux.sh
   ```
3. **Run & Configure**:
   ```bash
   sh launch_jarvis.sh
   ```
   - Once the HUD opens, configure your API keys (Groq or Gemini) directly from the settings menu.
</details>

---

## 3. How to Use

> *"JARVIS, it's time for a little upgrades." — Tony Stark*

- **Activation**: Say "Jarvis" followed by your command.
- **Modes**: Use the **[MINI]** button for a compact hologram or **[EXIT]** to shut down.
- **Debugging**: Say "Jarvis, enter debugging mode" to see live system logs.
- **Interruption**: Click the central JARVIS core at any time to silence him or stop a long response.

---

## 4. Troubleshooting

> *"I'm going to need a little time to work on that." — Tony Stark*

- **Microphone not detected**: Ensure your default input device is set correctly in OS settings.
- **Backend Error**: Verify that you have configured your API keys inside the HUD's settings panel.
- **UI not loading**: Ensure you ran `npm install` inside the `ui` folder.
- **Local model performance**: For better performance with local models, ensure you have sufficient RAM (16GB+ recommended) and consider using a system with GPU acceleration.
- **macOS-specific issues**: Since macOS is untested on my end, please report any bugs via [GitHub Issues](https://github.com/aetex/J.A.R.V.I.S.-AI-Assistant/issues) — see the section below if you'd like to help fix them.

---

## 5. Contributing (macOS Help Especially Wanted)

> *"Sometimes the best solutions are the simplest ones." — Tony Stark*

I built and tested JARVIS entirely on Windows and Linux. **I don't own a Mac**, so the macOS install path (`install_mac.sh` / `launch_jarvis.sh`) is untested on real hardware — it's written based on how it *should* behave, but there's a good chance a few macOS-specific bugs (permissions, mic access, Electron packaging quirks, Apple Silicon vs Intel differences, etc.) are hiding in there. That's the biggest gap right now, so Mac testers/fixers are especially appreciated.

**But this isn't only about macOS.** Whether or not you have a Mac, there are plenty of ways to pitch in:

- 🍎 **Test or fix macOS.** Run the install script and report what breaks, or fix a Mac-specific bug — the highest-priority gap right now.
- 🐛 **Fix a bug on any platform.** Windows and Linux bugs, edge cases, crashes — all welcome.
- ✨ **Add a feature.** New wake-word tweaks, UI polish, a local model you got working well — if it's useful, it's welcome.
- 📝 **Improve the docs.** Clearer install steps, typo fixes, better troubleshooting entries — small stuff still counts.
- 🎨 **Design/UI contributions.** Tweaks to the HUD, new themes, accessibility improvements.
- 🔊 **Mic/audio work.** Especially valuable on macOS, where audio permissions work differently than Windows/Linux.
- 📦 **Packaging/build help.** Getting installers signed, notarized, or just more reliable across platforms.

Really — if you fix, test, document, or improve *anything* in this repo, you're a contributor.

**What you get in return:**

This is a free, MIT-licensed passion project, so I can't pay contributors — but I *can* give you real, permanent credit:

- ✅ Your name/handle added to the **Contributors** table below, no matter how big or small the contribution
- ✅ macOS contributors specifically get called out as **macOS maintainer**, both here and inside the app's in-HUD "About" credits
- ✅ Your fix, your name, forever in the commit history and changelog of an active open-source project

If that sounds fun, fork the repo, open a PR (macOS fixes, other bugs, docs, features — anything genuinely helpful), and tag me — I'll review, merge, and add you below.

### Contributors

| Contributor | Contribution | Platform |
|---|---|---|
| — | *waiting for our first contributor* | — |

---

## 6. Changelog

### v0.5 — Latest (2026-06-30)
**🚀 Major Update: Local Model Support**
- Replaced LM Studio with llama.cpp for more efficient, portable local model support
- Added hardware detection to automatically scan system capabilities and recommend optimal models
- Implemented model management UI to download, delete, and switch models directly from settings
- Added Hugging Face integration for browsing and downloading models with one click
- Smart model recommendations based on RAM and GPU configuration
- Fully portable installation — everything stays in the project folder
- Low-end PC support with lightweight models for systems with 8GB RAM
- Complete offline capability with local models

### v0.4 — Previous
- Added Google Gemini API support with massive context window
- Implemented automatic update system
- Added voice activity detection for wake word
- Improved error handling and fail-safe mechanisms

---

*Inspired by the MCU. Developed for the future.*
