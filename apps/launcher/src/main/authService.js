const { apiUrl, getJson } = require("./manifestService");

async function startMicrosoftLogin(locale) {
  return getJson(apiUrl(`/api/auth/microsoft/start?locale=${encodeURIComponent(locale)}`));
}

async function pollAuthSession(statusUrl, timeoutMs = 120000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(statusUrl);
    if (!response.ok) {
      throw new Error(`Auth polling failed with ${response.status}.`);
    }

    const payload = await response.json();
    if (payload.status === "complete") {
      return payload;
    }
    if (payload.status === "error") {
      throw new Error(payload.error || "OAuth flow failed.");
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("OAuth timed out.");
}

module.exports = {
  pollAuthSession,
  startMicrosoftLogin
};
