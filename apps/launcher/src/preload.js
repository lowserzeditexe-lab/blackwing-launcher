const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("blackwing", {
  // Bootstrap
  bootstrap:         ()         => ipcRenderer.invoke("launcher:bootstrap"),

  // Locale & settings
  setLocale:         (locale)   => ipcRenderer.invoke("launcher:set-locale", locale),
  toggleAutoUpdate:  ()         => ipcRenderer.invoke("launcher:toggle-auto-update"),

  // Versions & profiles
  selectVersion:     (versionId)  => ipcRenderer.invoke("launcher:select-version", versionId),
  selectProfile:     (profileId)  => ipcRenderer.invoke("launcher:select-profile", profileId),

  // Mods
  toggleMod:         (modId)    => ipcRenderer.invoke("launcher:toggle-mod", modId),

  // Install
  attachOptiFine:    (versionId)  => ipcRenderer.invoke("launcher:attach-optifine", versionId),
  installVersion:    (versionId)  => ipcRenderer.invoke("launcher:install-version", versionId),
  removeRuntimeInput:(versionId)  => ipcRenderer.invoke("launcher:remove-runtime-input", versionId),

  // Auth
  startMicrosoftLogin: ()       => ipcRenderer.invoke("launcher:start-microsoft-login"),

  // Launch
  prepareLaunch:     ()         => ipcRenderer.invoke("launcher:prepare-launch"),

  // Window controls
  minimize:          ()         => ipcRenderer.invoke("window:minimize"),
  close:             ()         => ipcRenderer.invoke("window:close"),
});
