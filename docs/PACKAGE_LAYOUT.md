# Package layout

Each installable Blackwing edition under `content/packages/<edition-id>` now contains:

- `manifest.json`: package metadata and install strategy
- `blackwing/install-plan.json`: ordered install and activation steps
- `blackwing/profiles/*.json`: launcher/runtime profile metadata
- `blackwing/presets/*.json`: FPS-oriented edition preset
- `instance/.minecraft/options.txt`: vanilla graphics and gameplay defaults
- `instance/.minecraft/optionsof.txt`: OptiFine performance defaults
- `instance/.minecraft/optionsshaders.txt`: shaders disabled by default
- `instance/.minecraft/config/blackwing/*.json`: Blackwing client, HUD and module config
- `instance/.minecraft/resourcepacks/Blackwing AMOLED/*`: Blackwing AMOLED resource pack metadata and assets

This is still an overlay package, not a full Minecraft redistribution. The launcher installs these files next to a user-provided OptiFine runtime input and your future patched runtime bootstrap.
