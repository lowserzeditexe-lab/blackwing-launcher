# OptiFine-first runtime

## Decision

Blackwing is configured here for a `vanilla + OptiFine` runtime, not Forge.

## What this changes

- OptiFine is treated as an external optimization dependency, not as a redistributable bundled binary.
- The shared `core-legacy` Java code should be wired into the final client through your own patch pipeline.
- Each supported Minecraft version still needs a thin version-specific adapter because class names and hooks differ between 1.7.10, 1.8.9 and 1.9.4.

## Practical integration strategy

1. Keep gameplay/UI logic inside `mods/core-legacy`.
2. Maintain small version adapters for each target Minecraft version.
3. During packaging, patch the target runtime around a user-supplied OptiFine build.
4. Let the launcher present installable editions, import the matching OptiFine jar and install the matching patched package.

## Important note

OptiFine is an optimization/runtime patch, not a general mod loader. That means the `core` module cannot be dropped in like a normal Forge mod. The honest approach is to keep the code modular here and connect it through a custom patch/build step later.
