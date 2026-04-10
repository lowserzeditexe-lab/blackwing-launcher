const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const WEB_DIR = path.join(ROOT, "apps", "web");
const LOCALES_DIR = path.join(ROOT, "packages", "shared", "locales");
const MANIFEST_DIR = path.join(ROOT, "manifests");
const ARTIFACT_DIR = path.join(ROOT, "content", "artifacts");
const DATA_DIR = path.join(ROOT, "services", "manifest-api", "data");
const PORT = Number(process.env.PORT || 8787);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
const oauthSessions = new Map();

async function ensureDataDir() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
}

async function readJson(filePath) {
  const source = await fsp.readFile(filePath, "utf8");
  return JSON.parse(source);
}

async function writeJson(filePath, data) {
  await ensureDataDir();
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2));
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data, null, 2));
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(html);
}

function sendFile(response, filePath, contentType) {
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    sendJson(response, 404, { error: "File not found" });
  });

  response.writeHead(200, {
    "Content-Type": contentType
  });
  stream.pipe(response);
}

function notFound(response) {
  sendJson(response, 404, { error: "Not found" });
}

function badRequest(response, error) {
  sendJson(response, 400, { error });
}

function jsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function getLocaleFile(locale) {
  const normalized = locale === "en" ? "en" : "fr";
  return path.join(LOCALES_DIR, `${normalized}.json`);
}

function getVersionFile(versionId) {
  return path.join(MANIFEST_DIR, "versions", `${versionId}.json`);
}

async function recordStat(event) {
  const filePath = path.join(DATA_DIR, "stats.json");
  const stats = await readJson(filePath).catch(() => ({
    installs: 0,
    preparedLaunches: 0,
    authSuccess: 0,
    lastEvents: []
  }));

  if (event.type === "install") {
    stats.installs += 1;
  }
  if (event.type === "launch") {
    stats.preparedLaunches += 1;
  }
  if (event.type === "auth_success") {
    stats.authSuccess += 1;
  }

  stats.lastEvents = [event, ...stats.lastEvents].slice(0, 25);
  await writeJson(filePath, stats);
  return stats;
}

function requireMicrosoftEnv() {
  const env = {
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${PUBLIC_BASE_URL}/api/auth/microsoft/callback`
  };

  if (!env.clientId || !env.clientSecret) {
    return null;
  }

  return env;
}

function buildMicrosoftAuthUrl(locale, state) {
  const env = requireMicrosoftEnv();
  if (!env) {
    return null;
  }

  const url = new URL("https://login.live.com/oauth20_authorize.srf");
  url.searchParams.set("client_id", env.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", env.redirectUri);
  url.searchParams.set("scope", "XboxLive.signin offline_access");
  url.searchParams.set("state", state);
  url.searchParams.set("locale", locale);
  return url.toString();
}

async function exchangeMicrosoftCode(code) {
  const env = requireMicrosoftEnv();
  if (!env) {
    throw new Error("Missing Microsoft OAuth environment variables.");
  }

  const tokenResponse = await fetch("https://login.live.com/oauth20_token.srf", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: env.redirectUri
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`Microsoft token exchange failed with ${tokenResponse.status}.`);
  }

  return tokenResponse.json();
}

async function exchangeXbox(accessToken) {
  const xboxResponse = await fetch("https://user.auth.xboxlive.com/user/authenticate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      Properties: {
        AuthMethod: "RPS",
        SiteName: "user.auth.xboxlive.com",
        RpsTicket: `d=${accessToken}`
      },
      RelyingParty: "http://auth.xboxlive.com",
      TokenType: "JWT"
    })
  });

  if (!xboxResponse.ok) {
    throw new Error(`Xbox auth failed with ${xboxResponse.status}.`);
  }

  const xboxData = await xboxResponse.json();
  const userHash = xboxData.DisplayClaims.xui[0].uhs;

  const xstsResponse = await fetch("https://xsts.auth.xboxlive.com/xsts/authorize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      Properties: {
        SandboxId: "RETAIL",
        UserTokens: [xboxData.Token]
      },
      RelyingParty: "rp://api.minecraftservices.com/",
      TokenType: "JWT"
    })
  });

  if (!xstsResponse.ok) {
    throw new Error(`XSTS auth failed with ${xstsResponse.status}.`);
  }

  const xstsData = await xstsResponse.json();
  return {
    userHash,
    xstsToken: xstsData.Token
  };
}

async function exchangeMinecraft(userHash, xstsToken) {
  const mcAuthResponse = await fetch("https://api.minecraftservices.com/authentication/login_with_xbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      identityToken: `XBL3.0 x=${userHash};${xstsToken}`
    })
  });

  if (!mcAuthResponse.ok) {
    throw new Error(`Minecraft auth failed with ${mcAuthResponse.status}.`);
  }

  const mcAuth = await mcAuthResponse.json();

  const entitlementsResponse = await fetch("https://api.minecraftservices.com/entitlements/mcstore", {
    headers: {
      Authorization: `Bearer ${mcAuth.access_token}`
    }
  });

  if (!entitlementsResponse.ok) {
    throw new Error(`Minecraft entitlements check failed with ${entitlementsResponse.status}.`);
  }

  const profileResponse = await fetch("https://api.minecraftservices.com/minecraft/profile", {
    headers: {
      Authorization: `Bearer ${mcAuth.access_token}`
    }
  });

  if (!profileResponse.ok) {
    throw new Error(`Minecraft profile lookup failed with ${profileResponse.status}.`);
  }

  return {
    accessToken: mcAuth.access_token,
    entitlements: await entitlementsResponse.json(),
    profile: await profileResponse.json()
  };
}

async function handleMicrosoftStart(response, requestUrl) {
  const locale = requestUrl.searchParams.get("locale") === "en" ? "en" : "fr";
  const state = crypto.randomBytes(16).toString("hex");
  const authorizeUrl = buildMicrosoftAuthUrl(locale, state);

  if (!authorizeUrl) {
    sendJson(response, 503, {
      error: "OAuthUnavailable",
      message: "Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET on the backend."
    });
    return;
  }

  oauthSessions.set(state, {
    id: state,
    status: "pending",
    locale,
    createdAt: new Date().toISOString()
  });

  sendJson(response, 200, {
    state,
    authorizeUrl,
    statusUrl: `${PUBLIC_BASE_URL}/api/auth/session/${state}`
  });
}

async function handleMicrosoftCallback(response, requestUrl) {
  const state = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");

  if (!state || !oauthSessions.has(state)) {
    badRequest(response, "Unknown OAuth state.");
    return;
  }

  const session = oauthSessions.get(state);

  if (error) {
    session.status = "error";
    session.error = error;
    sendHtml(response, 400, "<h1>Blackwing OAuth failed</h1><p>You can close this window and retry from the launcher.</p>");
    return;
  }

  if (!code) {
    badRequest(response, "Missing authorization code.");
    return;
  }

  try {
    const microsoft = await exchangeMicrosoftCode(code);
    const xbox = await exchangeXbox(microsoft.access_token);
    const minecraft = await exchangeMinecraft(xbox.userHash, xbox.xstsToken);

    session.status = "complete";
    session.account = {
      gamertag: minecraft.profile.name,
      profileId: minecraft.profile.id,
      skins: minecraft.profile.skins ? minecraft.profile.skins.length : 0,
      acquiredAt: new Date().toISOString()
    };
    session.tokens = {
      microsoftAccessToken: microsoft.access_token,
      minecraftAccessToken: minecraft.accessToken
    };

    await recordStat({
      type: "auth_success",
      state,
      at: new Date().toISOString()
    });

    sendHtml(
      response,
      200,
      "<h1>Blackwing OAuth complete</h1><p>You can now return to the launcher.</p>"
    );
  } catch (callbackError) {
    session.status = "error";
    session.error = callbackError.message;
    sendHtml(
      response,
      500,
      `<h1>Blackwing OAuth failed</h1><p>${callbackError.message}</p><p>You can close this window and retry from the launcher.</p>`
    );
  }
}

async function routeApi(request, response, requestUrl) {
  if (request.method === "GET" && requestUrl.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, time: new Date().toISOString() });
    return true;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/launcher") {
    sendJson(response, 200, await readJson(path.join(MANIFEST_DIR, "launcher.json")));
    return true;
  }

  if (request.method === "GET" && requestUrl.pathname.startsWith("/api/channels/")) {
    const channel = requestUrl.pathname.split("/").pop();
    sendJson(response, 200, await readJson(path.join(MANIFEST_DIR, "channels", `${channel}.json`)));
    return true;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/versions") {
    const stable = await readJson(path.join(MANIFEST_DIR, "channels", "stable.json"));
    const versions = await Promise.all(stable.versions.map((versionId) => readJson(getVersionFile(versionId))));
    sendJson(response, 200, versions);
    return true;
  }

  if (request.method === "GET" && requestUrl.pathname.startsWith("/api/versions/")) {
    const versionId = requestUrl.pathname.split("/").pop();
    sendJson(response, 200, await readJson(getVersionFile(versionId)));
    return true;
  }

  if (request.method === "GET" && requestUrl.pathname.startsWith("/api/locales/")) {
    const locale = requestUrl.pathname.split("/").pop();
    sendJson(response, 200, await readJson(getLocaleFile(locale)));
    return true;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/auth/microsoft/start") {
    await handleMicrosoftStart(response, requestUrl);
    return true;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/auth/microsoft/callback") {
    await handleMicrosoftCallback(response, requestUrl);
    return true;
  }

  if (request.method === "GET" && requestUrl.pathname.startsWith("/api/auth/session/")) {
    const state = requestUrl.pathname.split("/").pop();
    const session = oauthSessions.get(state);
    if (!session) {
      notFound(response);
      return true;
    }

    sendJson(response, 200, {
      status: session.status,
      account: session.account || null,
      error: session.error || null
    });
    return true;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/stats") {
    const stats = await readJson(path.join(DATA_DIR, "stats.json")).catch(() => ({
      installs: 0,
      preparedLaunches: 0,
      authSuccess: 0,
      lastEvents: []
    }));
    sendJson(response, 200, stats);
    return true;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/stats/events") {
    const body = await jsonBody(request);
    const stats = await recordStat({
      type: body.type || "unknown",
      payload: body.payload || {},
      at: new Date().toISOString()
    });
    sendJson(response, 201, stats);
    return true;
  }

  return false;
}

function routeStatic(request, response, requestUrl) {
  if (request.method === "GET" && requestUrl.pathname.startsWith("/downloads/")) {
    const fileName = path.basename(requestUrl.pathname);
    const filePath = path.join(ARTIFACT_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      notFound(response);
      return true;
    }

    sendFile(response, filePath, "application/zip");
    return true;
  }

  if (request.method !== "GET") {
    return false;
  }

  let filePath = requestUrl.pathname === "/" ? path.join(WEB_DIR, "index.html") : path.join(WEB_DIR, requestUrl.pathname);
  if (!path.extname(filePath)) {
    filePath = path.join(WEB_DIR, "index.html");
  }

  if (!filePath.startsWith(WEB_DIR) || !fs.existsSync(filePath)) {
    return false;
  }

  const extension = path.extname(filePath);
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8"
  };

  sendFile(response, filePath, contentTypes[extension] || "application/octet-stream");
  return true;
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, PUBLIC_BASE_URL);

  try {
    if (await routeApi(request, response, requestUrl)) {
      return;
    }

    if (routeStatic(request, response, requestUrl)) {
      return;
    }

    notFound(response);
  } catch (error) {
    sendJson(response, 500, {
      error: "InternalServerError",
      message: error.message
    });
  }
});

server.listen(PORT, () => {
  console.log(`Blackwing manifest API listening on ${PUBLIC_BASE_URL}`);
});
