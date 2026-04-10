const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { apiUrl } = require("./manifestService");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}.`));
    });
    child.on("error", reject);
  });
}

async function downloadFile(url, destination) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed for ${url}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  await fsp.writeFile(destination, Buffer.from(arrayBuffer));
}

async function extractArchive(zipPath, destination) {
  await fsp.mkdir(destination, { recursive: true });

  if (process.platform === "win32") {
    await run("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Expand-Archive -Force -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}'`
    ]);
    return;
  }

  await run("unzip", ["-o", zipPath, "-d", destination]);
}

async function postStat(apiBaseUrl, type, payload) {
  await fetch(new URL("/api/stats/events", apiBaseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ type, payload })
  }).catch(() => undefined);
}

async function copyRuntimeInputs(installRoot, runtimeInputs) {
  if (!runtimeInputs?.optiFineJarPath) {
    return null;
  }

  const optiFineRoot = path.join(installRoot, "runtime", "optifine");
  const fileName = path.basename(runtimeInputs.optiFineJarPath);
  const destination = path.join(optiFineRoot, fileName);
  await fsp.mkdir(optiFineRoot, { recursive: true });
  await fsp.copyFile(runtimeInputs.optiFineJarPath, destination);

  return {
    optiFineJarPath: destination,
    optiFineFileName: fileName,
    importedAt: runtimeInputs.importedAt || new Date().toISOString()
  };
}

async function installVersion({ versionManifest, documentsPath, apiBaseUrl, runtimeInputs }) {
  const installRoot = path.join(documentsPath, "BlackwingClient", "versions", versionManifest.id);
  const cacheRoot = path.join(documentsPath, "BlackwingClient", "cache");
  const zipPath = path.join(cacheRoot, versionManifest.artifact.fileName);
  const downloadUrl = versionManifest.artifact.url.startsWith("http")
    ? versionManifest.artifact.url
    : new URL(versionManifest.artifact.url, apiBaseUrl).toString();

  await fsp.rm(installRoot, { recursive: true, force: true });
  await downloadFile(downloadUrl, zipPath);
  await extractArchive(zipPath, installRoot);
  const installedRuntimeInputs = await copyRuntimeInputs(installRoot, runtimeInputs);

  const metadata = {
    versionId: versionManifest.id,
    installPath: installRoot,
    installedAt: new Date().toISOString(),
    artifact: versionManifest.artifact.fileName,
    runtimeInputs: installedRuntimeInputs
  };

  await fsp.writeFile(path.join(installRoot, ".blackwing-install.json"), JSON.stringify(metadata, null, 2));
  await postStat(apiBaseUrl, "install", { versionId: versionManifest.id });
  return metadata;
}

module.exports = {
  installVersion,
  postStat
};
