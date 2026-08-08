<div align="center">

# 𝗡.𝗢.𝗩.𝗔.

### 𝗡𝗲𝘂𝗿𝗮𝗹 𝗢𝗽𝗲𝗿𝗮𝘁𝗶𝗼𝗻𝘀 & 𝗩𝗶𝗿𝘁𝘂𝗮𝗹 𝗔𝘀𝘀𝗶𝘀𝘁𝗮𝗻𝘁

*A cross-platform AI assistant with a futuristic, holographic-inspired interface — cloud-powered or fully offline by AeteX.*

<p align="center">
  <a href="https://aetex.is-a.dev/nova">
    <img src="https://img.shields.io/badge/Documentation-Visit%20Website-00d4ff?style=for-the-badge" alt="Documentation">
  </a>
</p>

[![GitHub Stars](https://img.shields.io/github/stars/AeteX/nova?style=flat-square&color=00d4ff)](https://github.com/AeteX/nova/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/AeteX/nova?style=flat-square&color=00d4ff)](https://github.com/AeteX/nova/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/AeteX/nova?style=flat-square&color=00d4ff)](https://github.com/AeteX/nova/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Windows](https://img.shields.io/badge/Windows-supported-0078D6?style=flat-square&logo=windows&logoColor=white)](#)
[![Linux](https://img.shields.io/badge/Linux-supported-FCC624?style=flat-square&logo=linux&logoColor=black)](#)
[![macOS](https://img.shields.io/badge/macOS-untested-lightgrey?style=flat-square&logo=apple&logoColor=white)](#)

</div>

> N.O.V.A. is currently in active development. Features, APIs, and configuration may change between releases as the project evolves. Feedback and contributions are welcome.

---

## 𝗪𝗵𝘆 𝗡.𝗢.𝗩.𝗔.?

N.O.V.A. combines cloud AI providers like Gemini and Groq with fully offline local models powered by llama.cpp, giving you the flexibility to choose between maximum performance and complete privacy — all through a unified desktop interface.

---

## 𝗤𝘂𝗶𝗰𝗸 𝗦𝘁𝗮𝗿𝘁

```bash
git clone https://github.com/AeteX/nova.git
cd nova
```

Then run the installer for your platform:

```bash
# Windows
install_windows.bat

# Linux
./install_linux.sh

# macOS
./install_mac.sh
```

> Full installation instructions, dependencies, and additional platform notes live on the **[official website](https://aetex.is-a.dev/nova)**.

---

## 𝗙𝗲𝗮𝘁𝘂𝗿𝗲𝘀

| | |
|---|---|
| **Google Gemini** | Cloud inference via Google's Gemini models |
| **Groq** | Ultra-fast inference through Groq's LPU-backed API |
| **llama.cpp** | Local model inference, no internet required |
| **Local AI** | Fully offline operation for privacy-first usage |
| **Desktop GUI** | Native cross-platform desktop application |
| **CLI** | Full-featured command line interface |
| **Automatic Updates** | Stay current without manual reinstalls |
| **Wake Word** | Hands-free activation |
| **Optional TTS** | Text-to-speech output |
| **Optional STT** | Speech-to-text input |
| **Plugin Support** | *(coming soon)* Extend N.O.V.A. with custom modules |
| **Emergency Protocol** | *(coming soon)* Priority-response safety mode |
| **Cross Platform** | Windows, Linux, and macOS *(untested)* |

### High-Level Architecture

```
N.O.V.A.
├── Desktop GUI
├── CLI
├── AI Providers
│   ├── Gemini
│   ├── Groq
│   └── llama.cpp
├── Voice (Wake Word / STT / TTS)
└── Updater
```

---

## 𝗗𝗲𝗺𝗼

<p align="center">
  <img src="docs/demo.gif" width="850" alt="N.O.V.A. demo">
</p>

More screenshots and an interactive UI showcase are on the [official website →](https://aetex.is-a.dev/nova)

The showcase lets you explore the interface directly in your browser — no installation required. Note that it's a visual demonstration only and does not run or connect to the actual AI assistant.

---

## 𝗗𝗼𝗰𝘂𝗺𝗲𝗻𝘁𝗮𝘁𝗶𝗼𝗻

Full documentation, setup guides, FAQs, and troubleshooting are available on the official website.

<p align="center">
  <a href="https://aetex.is-a.dev/nova">
    <img src="https://img.shields.io/badge/Documentation-Visit%20Website-00d4ff?style=for-the-badge" alt="Documentation">
  </a>
</p>

---

## 𝗟𝗼𝗰𝗮𝗹 𝗔𝗜

N.O.V.A. can run entirely offline using [llama.cpp](https://github.com/ggerganov/llama.cpp) for local model inference — no cloud, no API keys, no data leaving your machine.

Setup instructions for local models are available on the [official website](https://aetex.is-a.dev/nova).

---

## 𝗥𝗼𝗮𝗱𝗺𝗮𝗽

**Completed**
- [x] Splash Screen

**In Progress**
- [ ] Complete project rebranding (internal modules/executable → N.O.V.A.)
- [ ] Multi Personality
- [ ] Graphical NSIS Installer
- [ ] Wake Word Improvements
- [ ] Simpler Updater
- [ ] CLI Voice Support
- [ ] Plugin System
- [ ] Emergency Protocol
- [ ] Website Redesign
- [ ] Automated Testing
- [ ] Linux Compatibility Testing

**Future**
- [ ] Android Version
- [ ] Browser Extension
- [ ] More Plugins

---

## 𝗖𝗼𝗻𝘁𝗿𝗶𝗯𝘂𝘁𝗶𝗻𝗴

Contributions are what make open-source great — all forms are welcome:

- Bug Reports
- Pull Requests
- Documentation
- UI Improvements
- Plugin Ideas
- Feature Requests

Check the [issues page](https://github.com/AeteX/nova/issues) to get started.

### Bug Reports

When filing an issue, please include:

- **OS** (and version)
- **N.O.V.A. version**
- **Logs** (if available)
- **Steps to reproduce**

---

## 𝗖𝗿𝗲𝗱𝗶𝘁𝘀

N.O.V.A. is designed and developed by **AeteX**.

Built with the support of the open-source community and the projects that make local and cloud AI accessible to everyone.

---

## 𝗟𝗶𝗰𝗲𝗻𝘀𝗲

Released under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 𝗗𝗶𝘀𝗰𝗹𝗮𝗶𝗺𝗲𝗿

N.O.V.A. is an independent open-source project created by **AeteX**. It is inspired by futuristic science-fiction interfaces, but it is **not affiliated with, endorsed by, or associated with Marvel, Disney, DC, Warner Bros., or any of their intellectual property.**

<div align="center">

<sub>Made by AeteX</sub>

</div>
