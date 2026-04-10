# Architecture

## Goals

- Keep the codebase modular and easy to evolve
- Separate the launcher shell, public website, backend manifests and in-game core logic
- Drive client behavior from JSON manifests so updates can ship without recompiling everything

## Layers

### Desktop launcher

The Electron launcher stays thin:

- `src/main`: filesystem, install, auth and manifest services
- `src/renderer`: UI, profile selection, updates and settings
- `preload`: safe IPC bridge

### Website

The website is a static bilingual experience served directly by the backend. It reuses the same locale files and version manifests as the launcher.

### Backend

The backend is a simple Node HTTP server with no framework dependency. It serves:

- update manifests
- version metadata
- locale files
- downloadable packages
- lightweight stats
- Microsoft OAuth session bootstrap and callback handling

### Legacy core module

The Java 8 module contains shared concepts for old Minecraft integrations:

- client profile presets
- HUD modules
- UI theme defaults
- FPS-oriented settings toggles
- version adapter contracts for patched vanilla plus OptiFine runtimes

## Data flow

1. Website and launcher load locale and channel data from the backend.
2. Launcher selects a target Minecraft package from `manifests/versions`.
3. Installer downloads a zip from `content/artifacts`.
4. State is stored locally in the launcher user data directory.
5. Optional OAuth login starts on the backend and is polled by the launcher until completed.
6. Your release pipeline merges Blackwing core patches against the target vanilla plus OptiFine runtime for each supported version.

## Why Electron here

Electron is used in this starter because:

- it works well with Node filesystem APIs for installs and patching
- it is easy to package on Windows/macOS
- auto-update and OAuth bridge patterns are straightforward to extend

If you later want a lighter binary, the frontend and manifest contracts are simple enough to migrate to Tauri.
