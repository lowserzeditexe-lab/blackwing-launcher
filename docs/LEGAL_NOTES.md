# Legal notes

## Minecraft distribution

- Do not redistribute official Minecraft client jars, assets or authentication material outside the rules of Mojang/Microsoft.
- The launcher should install and patch around legitimate user-owned game files and authenticated sessions.

## Third-party optimization mods

- OptiFine is license-restricted and should be treated as an external user-supplied dependency.
- FastCraft is also not safe to redistribute blindly in a public starter pack.
- This repository therefore models those optimizations as manifest entries and compatibility notes instead of bundling the binaries.

## Code signing

- Windows Authenticode signing requires your certificate and secret handling.
- macOS notarization requires an Apple Developer identity and CI credentials.
- The manifests include placeholders, but real signing must be completed in your own release pipeline.
