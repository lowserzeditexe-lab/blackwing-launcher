const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fsp = require("fs/promises");
const path = require("path");
const { pollAuthSession, startMicrosoftLogin } = require("./authService");
const { installVersion, postStat } = require("./installerService");
const { bootstrapCatalog, DEFAULT_API_BASE_URL } = require("./manifestService");
const { loadState, updateState } = require("./stateStore");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#070707",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.on("closed", () => { mainWindow = null; });
}

async function getModel() {
  const state   = await loadState(app.getPath("userData"));
  const catalog = await bootstrapCatalog(state.locale || "en", state.channel || "stable");
  return { state, catalog };
}

function findVersion(model, versionId) {
  const v = model.catalog.versions.find(v => v.id === versionId);
  if (!v) throw new Error(`Unknown version: ${versionId}`);
  return v;
}

function findProfile(state, profileId) {
  const p = state.profiles.find(p => p.id === profileId);
  if (!p) throw new Error(`Unknown profile: ${profileId}`);
  return p;
}

function getRuntimeInput(state, versionId) {
  return state.runtimeInputs?.[versionId] || null;
}

async function validateOptiFineJar(version, filePath) {
  if (!filePath.toLowerCase().endsWith(".jar"))
    throw new Error("Select a valid OptiFine .jar file.");
  const fileName = path.basename(filePath);
  if (!fileName.toLowerCase().includes(version.minecraftVersion.toLowerCase()))
    throw new Error(`This file does not look like OptiFine for Minecraft ${version.minecraftVersion}.`);
  await fsp.access(filePath);
  return { optiFineJarPath: filePath, optiFineFileName: fileName, importedAt: new Date().toISOString() };
}

async function promptForOptiFineJar(version) {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: `Select OptiFine .jar for Minecraft ${version.minecraftVersion}`,
    properties: ["openFile"],
    filters: [{ name: "Java archives", extensions: ["jar"] }]
  });
  if (result.canceled || result.filePaths.length === 0)
    throw new Error("OptiFine is required to install this edition.");
  return validateOptiFineJar(version, result.filePaths[0]);
}

async function resolveRuntimeInputs(userDataPath, version, existing) {
  if (!version.bootstrap?.requiresUserProvidedOptiFine) return null;
  if (existing?.optiFineJarPath) {
    try { return await validateOptiFineJar(version, existing.optiFineJarPath); } catch {}
  }
  const ri = await promptForOptiFineJar(version);
  await updateState(userDataPath, async s => ({ ...s, runtimeInputs: { ...s.runtimeInputs, [version.id]: ri } }));
  return ri;
}

async function prepareLaunchPlan(userDataPath, documentsPath) {
  const model   = await getModel();
  const version = findVersion(model, model.state.selectedVersionId);
  const profile = findProfile(model.state, model.state.selectedProfileId);
  const entry   = model.state.installedVersions[version.id];
  if (!entry) throw new Error("Install this version before launching.");

  const plan = {
    createdAt: new Date().toISOString(),
    apiBaseUrl: DEFAULT_API_BASE_URL,
    versionId: version.id,
    minecraftVersion: version.minecraftVersion,
    runtime: version.runtime,
    profileId: profile.id,
    installPath: entry.installPath,
    javaExecutable: process.platform === "win32" ? "javaw.exe" : "java",
    maxMemoryMb: profile.memoryMb,
    jvmArgs: profile.jvmArgs,
    bootstrap: version.bootstrap || null,
    runtimeInputs: entry.runtimeInputs || null,
    mods: model.state.mods || {},
    notes: ["Blackwing launch plan – connect OptiFine bootstrap pipeline here."]
  };

  const targetDir = path.join(documentsPath, "BlackwingClient", "launch-plans");
  await fsp.mkdir(targetDir, { recursive: true });
  const planPath = path.join(targetDir, `${version.id}-${profile.id}.json`);
  await fsp.writeFile(planPath, JSON.stringify(plan, null, 2));
  await postStat(DEFAULT_API_BASE_URL, "launch", { versionId: version.id });
  await updateState(userDataPath, async s => ({ ...s, lastLaunchPlan: planPath }));
  return plan;
}

// ─── App startup ───────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ─── Window controls ───────────────────────────────────────────
ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:close",    () => { mainWindow?.close(); });

// ─── Launcher IPC handlers ─────────────────────────────────────
ipcMain.handle("launcher:bootstrap", () => getModel());

ipcMain.handle("launcher:set-locale", async (_, locale) => {
  await updateState(app.getPath("userData"), async s => ({ ...s, locale }));
  return getModel();
});

ipcMain.handle("launcher:select-version", async (_, versionId) => {
  const model = await getModel();
  const v = findVersion(model, versionId);
  await updateState(app.getPath("userData"), async s => ({
    ...s,
    selectedVersionId: versionId,
    selectedProfileId: v.recommendedProfile || s.selectedProfileId
  }));
  return getModel();
});

ipcMain.handle("launcher:select-profile", async (_, profileId) => {
  await updateState(app.getPath("userData"), async s => ({ ...s, selectedProfileId: profileId }));
  return getModel();
});

ipcMain.handle("launcher:toggle-auto-update", async () => {
  await updateState(app.getPath("userData"), async s => ({
    ...s,
    settings: { ...s.settings, autoUpdate: !s.settings.autoUpdate }
  }));
  return getModel();
});

ipcMain.handle("launcher:toggle-mod", async (_, modId) => {
  await updateState(app.getPath("userData"), async s => {
    const mods = s.mods || {};
    const cur  = mods[modId]?.enabled ?? false;
    return { ...s, mods: { ...mods, [modId]: { ...(mods[modId] || {}), enabled: !cur } } };
  });
  return getModel();
});

ipcMain.handle("launcher:attach-optifine", async (_, requestedVersionId) => {
  const model   = await getModel();
  const version = findVersion(model, requestedVersionId || model.state.selectedVersionId);
  const ri      = await promptForOptiFineJar(version);
  await updateState(app.getPath("userData"), async s => ({
    ...s,
    selectedVersionId: version.id,
    runtimeInputs: { ...s.runtimeInputs, [version.id]: ri }
  }));
  return { ...(await getModel()), message: "optifine-attached" };
});

ipcMain.handle("launcher:install-version", async (_, requestedVersionId) => {
  const userDataPath = app.getPath("userData");
  const model        = await getModel();
  const version      = findVersion(model, requestedVersionId || model.state.selectedVersionId);
  const ri           = await resolveRuntimeInputs(userDataPath, version, getRuntimeInput(model.state, version.id));
  const metadata     = await installVersion({
    versionManifest: version,
    documentsPath: app.getPath("documents"),
    apiBaseUrl: DEFAULT_API_BASE_URL,
    runtimeInputs: ri
  });
  await updateState(userDataPath, async s => ({
    ...s,
    selectedVersionId: version.id,
    installedVersions: { ...s.installedVersions, [version.id]: metadata },
    ...(ri ? { runtimeInputs: { ...s.runtimeInputs, [version.id]: ri } } : {})
  }));
  return { ...(await getModel()), message: "install-complete" };
});

ipcMain.handle("launcher:remove-runtime-input", async (_, requestedVersionId) => {
  const model   = await getModel();
  const version = findVersion(model, requestedVersionId || model.state.selectedVersionId);
  await updateState(app.getPath("userData"), async s => {
    const next = { ...s.runtimeInputs };
    delete next[version.id];
    return { ...s, runtimeInputs: next };
  });
  return { ...(await getModel()), message: "runtime-input-removed" };
});

ipcMain.handle("launcher:start-microsoft-login", async () => {
  const model      = await getModel();
  const bootstrap  = await startMicrosoftLogin(model.state.locale || "en");
  await shell.openExternal(bootstrap.authorizeUrl);
  const authResult = await pollAuthSession(bootstrap.statusUrl);
  await updateState(app.getPath("userData"), async s => ({ ...s, account: authResult.account }));
  return { ...(await getModel()), message: "oauth-complete" };
});

ipcMain.handle("launcher:prepare-launch", async () => {
  const plan = await prepareLaunchPlan(app.getPath("userData"), app.getPath("documents"));
  return { ...(await getModel()), message: "launch-planned", launchPlan: plan };
});
