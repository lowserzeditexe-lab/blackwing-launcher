const fsp  = require("fs/promises");
const path = require("path");

const DEFAULT_MODS = {
  fps:        { enabled: true  },
  visuals17:  { enabled: true  },
  sprint:     { enabled: true  },
  zoom:       { enabled: true  },
  armor:      { enabled: true  },
  scoreboard: { enabled: true  },
  potions:    { enabled: true  },
  cps:        { enabled: false },
  keystrokes: { enabled: false },
  coords:     { enabled: false },
  direction:  { enabled: false },
  hitbox:     { enabled: false }
};

const DEFAULT_STATE = {
  locale:            "en",
  channel:           "stable",
  selectedVersionId: "1.8.9-blackwing",
  selectedProfileId: "ranked",
  settings:          { autoUpdate: true },
  installedVersions: {},
  runtimeInputs:     {},
  mods:              { ...DEFAULT_MODS },
  account:           null,
  profiles: [
    { id: "ranked", name: "Ranked",  memoryMb: 2048, jvmArgs: ["-XX:+UseG1GC", "-XX:+UseStringDeduplication"], notes: "Competitive PvP – 1.8.9" },
    { id: "legacy", name: "Legacy",  memoryMb: 1536, jvmArgs: ["-XX:+UseG1GC"],                                 notes: "Low memory – 1.7.10" },
    { id: "arena",  name: "Arena",   memoryMb: 2048, jvmArgs: ["-XX:+UseG1GC", "-XX:MaxGCPauseMillis=50"],     notes: "Balanced – 1.9.4" },
    { id: "max",    name: "Max FPS", memoryMb: 3072, jvmArgs: ["-XX:+UseG1GC", "-XX:+AggressiveOpts", "-XX:+UseCompressedOops"], notes: "High-end machine" }
  ]
};

function getStateFile(userDataPath) {
  return path.join(userDataPath, "blackwing-state.json");
}

async function ensureStateFile(userDataPath) {
  await fsp.mkdir(userDataPath, { recursive: true });
  const filePath = getStateFile(userDataPath);
  try {
    await fsp.access(filePath);
  } catch {
    await fsp.writeFile(filePath, JSON.stringify(DEFAULT_STATE, null, 2));
  }
  return filePath;
}

async function loadState(userDataPath) {
  const filePath = await ensureStateFile(userDataPath);
  const raw = await fsp.readFile(filePath, "utf8");
  const saved = JSON.parse(raw);
  // Deep merge so new fields (like mods) are always present
  return {
    ...DEFAULT_STATE,
    ...saved,
    settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
    mods:     { ...DEFAULT_MODS, ...(saved.mods || {}) }
  };
}

async function saveState(userDataPath, state) {
  const filePath = await ensureStateFile(userDataPath);
  await fsp.writeFile(filePath, JSON.stringify(state, null, 2));
  return state;
}

async function updateState(userDataPath, updater) {
  const current = await loadState(userDataPath);
  const next    = await updater(current);
  await saveState(userDataPath, next);
  return next;
}

module.exports = { loadState, saveState, updateState };
