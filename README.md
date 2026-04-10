# Blackwing Launcher

> Custom Minecraft performance client launcher — Lunar Client-inspired, AMOLED Black & White design.

[![Build](https://github.com/lowserzeditexe-lab/blackwing-launcher/actions/workflows/build.yml/badge.svg)](https://github.com/lowserzeditexe-lab/blackwing-launcher/actions)

---

## Features

- **Lunar Client-style UI** — Home, Mods, Versions, Settings
- **12 configurable mods** — FPS Boost, Toggle Sprint, Zoom, Armor Status, CPS, Keystrokes, Coordinates, and more
- **3 Minecraft versions** — 1.7.10 (Legacy), 1.8.9 (Competitive), 1.9.4 (Arena)
- **Microsoft OAuth** — real login via Xbox Live → Minecraft Services
- **AMOLED design** — pure black background, Syne/Barlow fonts
- **Auto-install** — downloads package, extracts configs & resource packs
- **OptiFine integration** — attach your OptiFine .jar per version
- **Frameless window** — custom title bar with minimize/close
- **Bilingual** — English / Français

---

## Quick Start (Development)

### Prerequisites

- [Node.js 18+](https://nodejs.org)
- The **manifest API server** running locally (see below)

### 1. Clone the repo

```bash
git clone https://github.com/lowserzeditexe-lab/blackwing-launcher.git
cd blackwing-launcher
```

### 2. Start the API server

```bash
cd services/manifest-api
node src/server.js
# Listening on http://localhost:8787
```

### 3. Start the launcher (dev)

```bash
cd apps/launcher
npm install
npm start
```

---

## Build a Windows `.exe`

### Locally

```bash
cd apps/launcher
npm install
npm run build:win
# Output: apps/launcher/dist/
#   BlackwingLauncher Setup 1.0.0.exe   ← installer
#   BlackwingLauncher 1.0.0.exe         ← portable
```

### Via GitHub Actions (automatic)

Every push to `main` triggers a build. Download the `.exe` from the **Actions** tab → latest workflow run → **Artifacts**.

For a release build (with GitHub Release): push a tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Custom Icon (optional)

Replace `apps/launcher/build/icon.ico` with your own 256×256 `.ico` file before building.

---

## Microsoft OAuth Setup

To enable real Minecraft login:

1. Register an app at [Azure Portal](https://portal.azure.com) → App Registrations
   - Supported account types: **Personal MS accounts only**
   - Redirect URI: `http://localhost:8787/api/auth/microsoft/callback`

2. Add credentials to `services/manifest-api/.env`:
   ```env
   MICROSOFT_CLIENT_ID=your-client-id
   MICROSOFT_CLIENT_SECRET=your-client-secret
   PUBLIC_BASE_URL=http://localhost:8787
   ```

3. Restart the API server. The launcher login button will work.

---

## Project Structure

```
blackwing-launcher/
├── apps/
│   ├── launcher/          # Electron desktop app
│   │   ├── src/
│   │   │   ├── main/      # Node.js main process
│   │   │   ├── renderer/  # HTML + CSS + JS UI
│   │   │   └── preload.js # IPC bridge
│   │   └── package.json
│   └── web/               # Landing page (served by API)
├── services/
│   └── manifest-api/      # Node.js JSON API + OAuth
├── content/
│   ├── packages/          # Version overlays (configs, presets)
│   └── artifacts/         # .zip archives
├── manifests/             # Version JSON manifests
├── mods/core-legacy/      # Java mod source (Forge 1.8.9)
└── .github/workflows/     # CI/CD builds
```

---

## Legal

Not affiliated with Mojang AB or Microsoft.  
OptiFine is not redistributed — users must provide their own `.jar`.  
Minecraft assets are not included.
