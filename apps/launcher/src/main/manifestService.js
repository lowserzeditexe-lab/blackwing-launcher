const DEFAULT_API_BASE_URL = process.env.BLACKWING_API_BASE_URL || "http://localhost:8787";

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return response.json();
}

function apiUrl(pathname) {
  return new URL(pathname, DEFAULT_API_BASE_URL).toString();
}

async function bootstrapCatalog(locale, channel) {
  const launcher = await getJson(apiUrl("/api/launcher"));
  const resolvedLocale = launcher.supportedLocales.includes(locale) ? locale : launcher.defaultLocale;
  const strings = await getJson(apiUrl(`/api/locales/${resolvedLocale}`));
  const channelData = await getJson(apiUrl(`/api/channels/${channel}`));
  const versions = await Promise.all(
    channelData.versions.map((versionId) => getJson(apiUrl(`/api/versions/${versionId}`)))
  );
  const stats = await getJson(apiUrl("/api/stats")).catch(() => ({
    installs: 0,
    preparedLaunches: 0,
    authSuccess: 0,
    lastEvents: []
  }));

  return {
    apiBaseUrl: DEFAULT_API_BASE_URL,
    launcher,
    strings,
    channel: channelData,
    versions,
    stats
  };
}

module.exports = {
  DEFAULT_API_BASE_URL,
  apiUrl,
  bootstrapCatalog,
  getJson
};
