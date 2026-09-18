# NSX Monitor - Desktop Application

The desktop agent for the NSX Monitor ecosystem. It provides high-precision network telemetry and real-time visualization directly on your workstation.

---

## ✨ Features

- **Real-time Monitoring**: Tracks download and upload speeds with millisecond precision.
- **Historical Reporting**: View data consumption trends across days, weeks, months, and years.
- **Floating Widget**: A minimal, always-on-top HUD to keep your speeds in sight without cluttering your workspace.
- **Hardware Integration**: Automatically detects and monitors multiple network interfaces (Ethernet, Wi-Fi).
- **Local Persistence**: Stores everything locally in a JSON database; your data never leaves your machine.

---

## 🛠️ Technology Stack

- **Framework**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React 18](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **Telemetry**: [systeminformation](https://systeminformation.io/)

---

## 🚀 Getting Started

### Development
```bash
# From the root of the monorepo
pnpm --filter desktop dev
```

### Building for Production
```bash
# Builds the application for your current platform
pnpm --filter desktop build
```

---

## 📦 Distribution & Storage

### Database Location
The historical network data is stored in the user's data directory as `network_data.json`.
- **Windows**: `%APPDATA%/NSX Monitor/network_data.json`
- **macOS**: `~/Library/Application Support/NSX Monitor/network_data.json`
- **Linux**: `~/.config/NSX Monitor/network_data.json`

### Supported Platforms
- Windows 10/11 (x64/ARM64)
- macOS (Intel/Apple Silicon)
- Linux (AppImage)
