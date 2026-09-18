<div align="center">
  <img src="desktop/public/logo.svg" width="80" height="80" alt="NSX Monitor Logo" />
  <h1>NSX Monitor</h1>
  <p><strong>Professional-grade network telemetry suite for high-precision bandwidth monitoring and analytics.</strong></p>

  <p>
    <a href="https://github.com/ichshakib/nsx-monitor/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/ichshakib/nsx-monitor/ci.yml?branch=main&label=CI&logo=github" alt="CI Status" /></a>
    <a href="https://github.com/ichshakib/nsx-monitor/releases"><img src="https://img.shields.io/github/v/release/ichshakib/nsx-monitor?include_prereleases&label=Release&logo=electron" alt="Latest Release" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/github/license/ichshakib/nsx-monitor?color=blue" alt="License" /></a>
  </p>
</div>

---

## ⚡ Overview

**NSX Monitor** is a powerful desktop application built to provide real-time insights into your network bandwidth, interface metrics, and historical telemetry data. Designed with a sleek modern UI and built on top of Electron, React, and TypeScript, it allows developers, network engineers, and power users to keep an eye on network health with minimal system overhead.

### ✨ Key Features

- 📊 **Real-time Telemetry:** Instant upload/download transfer rates, active connections, and latency tracking.
- 📈 **Historical Telemetry & Analytics:** Interactive data charts powered by Recharts with time filtering (1h, 24h, 7d, 30d).
- 🪟 **Compact Overlay Widget:** Switch effortlessly to a lightweight, always-on-top desktop widget mode.
- ⚠️ **Smart Bandwidth Alerts:** Configurable download/upload warning thresholds with system alert triggers.
- 🎛️ **Interface Management:** Automatic detection and switching between network interfaces (Ethernet, Wi-Fi, VPNs).
- 💾 **Local Data Persistence:** Lightweight embedded JSON database for secure, local telemetry persistence.

---

## 🏗️ Architecture

```mermaid
graph TD
    subgraph Electron_Main_Process ["Electron Main Process (Node.js)"]
        SysInfo["System Information Engine<br/>(systeminformation)"]
        DB["Local Telemetry Database<br/>(database.ts)"]
        Tray["System Tray & Window Manager"]
        IPC_Main["IPC Main Handlers"]
    end

    subgraph Electron_Preload ["Electron Preload Layer"]
        Bridge["Context Bridge API (electron-env.d.ts)"]
    end

    subgraph React_Renderer ["React Renderer Process (UI)"]
        Dashboard["Network Dashboard View"]
        Widget["Compact Widget View"]
        History["History & Telemetry Charts"]
        Settings["Network & Alert Settings"]
        Warning["Threshold Warning Alerts"]
    end

    SysInfo -->|Poll Telemetry| IPC_Main
    IPC_Main -->|Persist Metrics| DB
    IPC_Main <-->|Secure IPC| Bridge
    Bridge <-->|Expose APIs| React_Renderer
    React_Renderer --> Dashboard
    React_Renderer --> Widget
    React_Renderer --> History
    React_Renderer --> Settings
    React_Renderer --> Warning
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 20 or higher)
- [pnpm](https://pnpm.io/) (version 9 or higher)

### Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ichshakib/nsx-monitor.git
   cd nsx-monitor
   ```

2. **Install dependencies:**
   ```bash
   cd desktop
   pnpm install
   ```

3. **Launch in development mode:**
   ```bash
   pnpm run dev
   ```

4. **Run TypeScript check & Linting:**
   ```bash
   pnpm run typecheck
   pnpm run lint
   ```

5. **Build distributable installer:**
   ```bash
   pnpm run build
   ```
   *Packaged binaries will be generated inside `desktop/release/`.*

---

## 📁 Project Structure

```text
nsx-monitor/
├── .github/                  # GitHub Actions CI/CD workflows & issue/PR templates
│   ├── ISSUE_TEMPLATE/       # Bug report & feature request templates
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/            # Automated CI & Release pipelines
├── .vscode/                  # Workspace settings and extension recommendations
├── desktop/                  # Electron + React application
│   ├── electron/             # Electron main process, IPC handlers & telemetry database
│   ├── public/               # Application assets, logos & multi-platform icons
│   ├── src/
│   │   ├── components/       # Dashboard, Widget, History, Warning & Settings UI
│   │   ├── App.tsx           # Application root & view switcher
│   │   ├── main.tsx          # React application entry point
│   │   └── index.css         # TailwindCSS v4 styles & theme design system
│   ├── electron-builder.json5 # Electron packaging & installer configuration
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── CONTRIBUTING.md           # Contribution guidelines & branching rules
├── CODE_OF_CONDUCT.md        # Community guidelines
├── LICENSE                   # MIT License
└── README.md
```

---

## 📬 Contact & Support

If you have questions, need assistance, or want to report an issue:

- 🐛 **Issue Tracker:** [Open an Issue](https://github.com/ichshakib/nsx-monitor/issues) for bug reports and feature requests.
- 💬 **Discussions & Feedback:** Start a thread in [GitHub Discussions](https://github.com/ichshakib/nsx-monitor/discussions).
- 👨‍💻 **Maintainer:** Shakib Khan ([@ichshakib](https://github.com/ichshakib))

---

## 🤝 Contributing

Contributions are warmly welcome! Please read through our [CONTRIBUTING.md](./CONTRIBUTING.md) to learn how to get started, make changes, and submit a pull request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.