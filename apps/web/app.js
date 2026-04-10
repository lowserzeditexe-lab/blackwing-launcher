const DEFAULT_LOCALE = "fr";

const state = {
  locale: new URLSearchParams(window.location.search).get("lang") || DEFAULT_LOCALE,
  strings: {},
  launcher: null,
  channel: null,
  versions: []
};

async function getJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }

  return response.json();
}

function t(key) {
  return state.strings[key] || key;
}

function requirementLabel(code) {
  const labels = {
    "minecraft-account": "Minecraft account",
    "java-8": "Java 8",
    "optifine-jar": "OptiFine .jar"
  };
  return labels[code] || code;
}

function applyTranslations() {
  document.documentElement.lang = state.locale;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  document.getElementById("brand-name").textContent = t("app.name");
  document.getElementById("brand-tagline").textContent = t("tagline");
  document.getElementById("lang-switch").textContent = state.locale === "fr" ? "EN" : "FR";
}

function renderVersions() {
  const target = document.getElementById("version-list");
  target.innerHTML = state.versions.map((version) => `
    <article class="version-card">
      <p class="eyebrow">${version.minecraftVersion}</p>
      <h3>${version.displayName}</h3>
      <p class="version-meta">${t("versions.summary")}: ${version.summary || version.runtime}</p>
      <p class="version-meta">${t("versions.compat")}: ${version.runtime}</p>
      <p class="version-meta">${t("versions.recommendedOptiFine")}: ${version.bootstrap?.recommendedOptiFineBuild || "Any matching build"}</p>
      <span class="status-chip">${version.bootstrap?.requiresUserProvidedOptiFine ? t("website.requiresOptiFine") : t("website.installable")}</span>
      <div class="version-tags">
        ${(version.install?.requirements || []).map((requirement) => `<span class="tag">${requirementLabel(requirement)}</span>`).join("")}
      </div>
      <div class="version-tags">
        ${version.modules.map((module) => `<span class="tag">${module}</span>`).join("")}
      </div>
      <div class="version-tags">
        ${version.externalOptimizers.map((optimizer) => `<span class="tag">${optimizer.name}${optimizer.bundled ? "" : " external"}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

function renderDownloads() {
  const target = document.getElementById("download-grid");
  const downloads = state.launcher.downloads;

  target.innerHTML = Object.entries(downloads).map(([platform, data]) => `
    <article class="download-card">
      <h3>${platform === "windows" ? t("website.download.windows") : t("website.download.macos")}</h3>
      <p>${data.file}</p>
      <div class="download-actions">
        <a class="button primary" href="/downloads/${state.channel.latest}.zip">Client package</a>
        <a class="button secondary" href="#">${t("website.download.signing")}</a>
      </div>
    </article>
  `).join("");
}

function renderError(error) {
  console.error(error);
  document.getElementById("version-list").innerHTML = `
    <article class="version-card">
      <h3>Backend unavailable</h3>
      <p>${error.message}</p>
    </article>
  `;
}

async function load() {
  state.strings = await getJson(`/api/locales/${state.locale}`);
  state.launcher = await getJson("/api/launcher");
  state.channel = await getJson("/api/channels/stable");
  state.versions = await Promise.all(
    state.channel.versions.map((id) => getJson(`/api/versions/${id}`))
  );

  applyTranslations();
  renderVersions();
  renderDownloads();
}

document.getElementById("lang-switch").addEventListener("click", () => {
  state.locale = state.locale === "fr" ? "en" : "fr";
  const url = new URL(window.location.href);
  url.searchParams.set("lang", state.locale);
  window.history.replaceState({}, "", url);
  load().catch(renderError);
});

load().catch(renderError);
