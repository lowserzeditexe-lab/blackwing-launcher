/* ─────────────────────────────────────────────────────────────
   BLACKWING LAUNCHER  –  Renderer app.js
   Vanilla JS, no bundler needed. Communicates via window.blackwing
   ───────────────────────────────────────────────────────────── */

/* ═══ MOD CATALOG ═══ */
const MOD_CATALOG = [
  { id: 'fps',        name: 'FPS Boost',          category: 'performance', icon: 'gauge',          defaultEnabled: true,  desc: 'Maximizes FPS via rendering optimizations' },
  { id: 'visuals17',  name: '1.7 Visuals',         category: 'mechanic',    icon: 'sword',          defaultEnabled: true,  desc: 'Classic 1.7 sword & rod animations' },
  { id: 'sprint',     name: 'Toggle Sprint',       category: 'mechanic',    icon: 'zap',            defaultEnabled: true,  desc: 'Hold or toggle sprint with one key' },
  { id: 'zoom',       name: 'Zoom',                category: 'mechanic',    icon: 'search',         defaultEnabled: true,  desc: 'Zoom like OptiFine with a keybind' },
  { id: 'armor',      name: 'Armor Status',        category: 'hud',         icon: 'shield',         defaultEnabled: true,  desc: 'Shows armor durability on HUD' },
  { id: 'scoreboard', name: 'Custom Scoreboard',   category: 'hud',         icon: 'list',           defaultEnabled: true,  desc: 'Replaces vanilla scoreboard style' },
  { id: 'potions',    name: 'Potion Effects',       category: 'hud',         icon: 'flask-conical',  defaultEnabled: true,  desc: 'Active potions + remaining time' },
  { id: 'cps',        name: 'CPS Counter',         category: 'hud',         icon: 'mouse-pointer',  defaultEnabled: false, desc: 'Clicks per second display' },
  { id: 'keystrokes', name: 'Keystrokes',          category: 'hud',         icon: 'keyboard',       defaultEnabled: false, desc: 'WASD + click visualization on HUD' },
  { id: 'coords',     name: 'Coordinates',         category: 'hud',         icon: 'map-pin',        defaultEnabled: false, desc: 'Shows XYZ position on screen' },
  { id: 'direction',  name: 'Direction HUD',       category: 'hud',         icon: 'compass',        defaultEnabled: false, desc: 'Compass-style direction indicator' },
  { id: 'hitbox',     name: 'Hitbox Display',      category: 'mechanic',    icon: 'box',            defaultEnabled: false, desc: 'Renders entity hitboxes' }
];

/* ═══ STATE ═══ */
const S = {
  model:      null,     // full bootstrap model from main
  view:       'home',   // current view
  modFilter:  'all',    // mod filter tab
  modSearch:  '',       // mod search query
  locale:     'en',     // current language
  installing: false,    // install in progress
  loginBusy:  false,    // login in progress
};

/* ═══ $ helpers ═══ */
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ═══════════════════════════════════════════
   BOOT
═══════════════════════════════════════════ */
async function boot() {
  initWindowControls();
  initNavigation();
  initLoginButtons();
  initHomeButtons();
  initModsControls();
  initVersionsDelegate();
  initSettingsControls();

  lucide.createIcons();

  // Try to load model
  try {
    S.model = await window.blackwing.bootstrap();
    S.locale = S.model.state.locale || 'en';
    showApp();
  } catch (err) {
    // No API or first launch – still show app in offline mode
    console.warn('Bootstrap failed:', err.message);
    showApp();
  }
}

/* ═══════════════════════════════════════════
   SCREENS
═══════════════════════════════════════════ */
function showLogin() {
  $('screen-login').classList.remove('hidden');
  $('screen-app').classList.add('hidden');
}

function showApp() {
  $('screen-login').classList.add('hidden');
  $('screen-app').classList.remove('hidden');
  renderAll();
}

/* ═══════════════════════════════════════════
   RENDER
═══════════════════════════════════════════ */
function renderAll() {
  renderUser();
  renderHome();
  renderMods();
  renderVersions();
  renderSettings();
  lucide.createIcons();
}

function renderUser() {
  const account = S.model?.state?.account;
  const name = account?.gamertag || 'Guest';
  const initial = name.charAt(0).toUpperCase();
  $('user-name').textContent    = name;
  $('user-avatar').textContent  = initial;
  $('account-avatar-big').textContent = initial;
  $('account-name-big').textContent   = name;
  $('account-display').querySelector('.account-sub').textContent =
    account ? 'Microsoft account connected' : 'Not signed in';
}

/* ── Home ── */
function renderHome() {
  const versions = S.model?.catalog?.versions || [];
  const selId    = S.model?.state?.selectedVersionId || '1.8.9-blackwing';
  const version  = versions.find(v => v.id === selId) || versions[0];
  const state    = S.model?.state || {};
  const installed = state.installedVersions?.[selId];
  const ri        = state.runtimeInputs?.[selId];
  const profile   = (state.profiles || []).find(p => p.id === state.selectedProfileId) || state.profiles?.[0];

  if (version) {
    const label = version.displayName || version.id;
    $('hero-edition').textContent   = `BLACKWING ${version.minecraftVersion || '?'}`;
    $('launch-title').textContent   = `LAUNCH ${version.minecraftVersion || label}`;

    if (installed) {
      $('launch-sub').textContent   = 'Ready to launch';
      $('s-install').textContent    = 'Installed';
      $('s-install-dot').className  = 'sdot green';
      $('s-install').style.color    = 'var(--green)';
    } else {
      const needs = versionInstallState(version, ri);
      $('launch-sub').textContent   = needs.code === 'needs-input' ? 'OptiFine required' : 'Click to install';
      $('s-install').textContent    = needs.label;
      $('s-install-dot').className  = 'sdot';
      $('s-install').style.color    = '';
    }

    // OptiFine
    if (ri?.optiFineFileName) {
      $('s-optifine').textContent = ri.optiFineFileName;
      $('s-optifine-dot').className = 'sdot green';
    } else {
      $('s-optifine').textContent   = 'Not attached';
      $('s-optifine-dot').className = 'sdot';
    }
  }

  // Stats
  const mods = S.model?.state?.mods || getDefaultMods();
  const activeCount = Object.values(mods).filter(m => m.enabled).length;
  $('stat-mods').textContent = activeCount;
  $('stat-ram').textContent  = profile ? Math.round(profile.memoryMb / 1024) + ' GB' : '2 GB';

  // Version dropdown
  renderVersionDropdown(versions, selId);

  // Ping API
  pingApi();
}

async function pingApi() {
  const apiBase = window.blackwing?._apiBase || 'http://localhost:8787';
  try {
    const r = await fetch(apiBase + '/api/health');
    $('s-api').textContent      = r.ok ? 'Online' : 'Degraded';
    $('s-api').style.color      = r.ok ? 'var(--green)' : 'var(--red)';
    $$('.sdot.green')[0].style.background = r.ok ? '' : 'var(--red)';
  } catch {
    $('s-api').textContent = 'Offline';
    $('s-api').style.color = 'var(--red)';
  }
}

function renderVersionDropdown(versions, selId) {
  const dd = $('version-dropdown');
  dd.innerHTML = versions.map(v => `
    <button class="vdrop-item${v.id === selId ? ' active' : ''}" data-version-id="${v.id}">
      <span>${v.displayName || v.id}</span>
      <span class="vdrop-mc">${v.minecraftVersion || ''}</span>
    </button>
  `).join('');
}

/* ── Mods ── */
function getDefaultMods() {
  const out = {};
  MOD_CATALOG.forEach(m => { out[m.id] = { enabled: m.defaultEnabled }; });
  return out;
}

function renderMods() {
  // Profile list
  const profiles = S.model?.state?.profiles || [];
  const selProfileId = S.model?.state?.selectedProfileId || 'ranked';
  $('profile-list').innerHTML = profiles.map(p => `
    <div class="profile-item${p.id === selProfileId ? ' active' : ''}" data-profile-id="${p.id}">
      <span>${p.name}</span>
      <button class="profile-edit-btn" data-profile-id="${p.id}"><i data-lucide="pencil"></i></button>
    </div>
  `).join('');

  // Mods grid
  renderModsGrid();
}

function renderModsGrid() {
  const mods = S.model?.state?.mods || getDefaultMods();
  const filter = S.modFilter;
  const search = S.modSearch.toLowerCase();

  const filtered = MOD_CATALOG.filter(m => {
    if (filter !== 'all' && m.category !== filter) return false;
    if (search && !m.name.toLowerCase().includes(search) && !m.desc.toLowerCase().includes(search)) return false;
    return true;
  });

  $('mods-grid').innerHTML = filtered.map((m, i) => {
    const enabled = mods[m.id]?.enabled ?? m.defaultEnabled;
    return `
      <div class="mod-card" style="animation-delay:${i * 0.03}s">
        <div class="mod-card-top">
          <div class="mod-icon"><i data-lucide="${m.icon}"></i></div>
          <div class="mod-name">${m.name}</div>
        </div>
        <div class="mod-actions">
          <button class="mod-opts-btn" data-mod-id="${m.id}">OPTIONS</button>
          <button class="mod-gear-btn" data-mod-id="${m.id}"><i data-lucide="settings"></i></button>
        </div>
        <button class="mod-toggle-btn ${enabled ? 'enabled' : 'disabled'}" data-mod-id="${m.id}">
          ${enabled ? 'ENABLED' : 'DISABLED'}
        </button>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

/* ── Versions ── */
function renderVersions() {
  const versions = S.model?.catalog?.versions || [];
  const selId    = S.model?.state?.selectedVersionId || '1.8.9-blackwing';
  const stateObj = S.model?.state || {};

  if (versions.length === 0) {
    $('versions-grid').innerHTML = `<div style="color:var(--dim);font-size:0.85rem;padding:20px 0;">No versions loaded. Check API server.</div>`;
    return;
  }

  $('versions-grid').innerHTML = versions.map((v, i) => {
    const ri        = stateObj.runtimeInputs?.[v.id];
    const installed = stateObj.installedVersions?.[v.id];
    const is        = versionInstallState(v, ri, installed);
    const reqs      = (v.install?.requirements || []);
    const mods      = (v.modules || []);
    return `
      <div class="version-card${v.id === selId ? ' active' : ''}" style="animation-delay:${i * 0.05}s">
        <div class="vc-top">
          <div>
            <div class="vc-mc">${v.minecraftVersion || 'MC ?'}</div>
            <div class="vc-name">${v.displayName || v.id}</div>
          </div>
          <span class="vc-badge ${is.code}">${is.label}</span>
        </div>
        <div class="vc-desc">${v.summary || v.runtime || ''}</div>
        <div class="vc-optifine">OptiFine: ${v.bootstrap?.recommendedOptiFineBuild || 'Any matching build'}</div>
        <div class="vc-tags">
          ${mods.map(m => `<span class="vc-tag">${m}</span>`).join('')}
          ${reqs.map(r => `<span class="vc-tag">${requirementLabel(r)}</span>`).join('')}
        </div>
        <div class="vc-actions">
          <button class="vc-btn-select" data-action="select" data-version-id="${v.id}">SELECT</button>
          <button class="vc-btn-install" data-action="install" data-version-id="${v.id}">INSTALL</button>
        </div>
      </div>
    `;
  }).join('');
}

/* ── Settings ── */
function renderSettings() {
  const state = S.model?.state || {};
  const profile = (state.profiles || []).find(p => p.id === state.selectedProfileId) || {};
  const autoUpdate = state.settings?.autoUpdate !== false;
  const locale = state.locale || 'en';

  // RAM slider
  const ramSlider = $('ram-slider');
  const ramVal    = profile.memoryMb || 2048;
  ramSlider.value = ramVal;
  $('ram-display').textContent = ramVal + ' MB';

  // Auto update toggle
  const btn = $('btn-auto-update');
  btn.textContent = autoUpdate ? 'ON' : 'OFF';
  btn.className   = `toggle-pill ${autoUpdate ? 'on' : 'off'}`;

  // Language pills
  $$('.lang-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === locale);
  });
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function versionInstallState(version, ri, installed) {
  if (installed) return { code: 'installed', label: 'INSTALLED' };
  if (version.bootstrap?.requiresUserProvidedOptiFine) {
    return ri?.optiFineJarPath
      ? { code: 'ready', label: 'READY' }
      : { code: 'needs-input', label: 'NEEDS OPTIFINE' };
  }
  return { code: 'ready', label: 'READY' };
}

function requirementLabel(code) {
  const map = { 'minecraft-account': 'Minecraft Account', 'java-8': 'Java 8', 'optifine-jar': 'OptiFine .jar' };
  return map[code] || code;
}

/* ═══════════════════════════════════════════
   ACTIONS (with IPC)
═══════════════════════════════════════════ */
async function perform(action, onSuccess) {
  try {
    const result = await action();
    if (result) S.model = result;
    if (onSuccess) onSuccess(result);
    renderAll();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

function setInstalling(active, text = 'Working...', pct = null) {
  const bar = $('install-bar');
  S.installing = active;
  if (active) {
    bar.classList.remove('hidden');
    $('install-bar-text').textContent = text;
    if (pct !== null) $('install-bar-fill').style.width = pct + '%';
    $('btn-launch').disabled = true;
  } else {
    bar.classList.add('hidden');
    $('install-bar-fill').style.width = '0%';
    $('btn-launch').disabled = false;
  }
}

/* ═══════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════ */
function initNavigation() {
  $$('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

function switchView(viewId) {
  S.view = viewId;
  // Nav buttons
  $$('.nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
  // Views
  $$('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${viewId}`);
    v.classList.toggle('hidden', v.id !== `view-${viewId}`);
  });
}

/* ═══════════════════════════════════════════
   WINDOW CONTROLS
═══════════════════════════════════════════ */
function initWindowControls() {
  $('btn-minimize')?.addEventListener('click', () => window.blackwing?.minimize());
  $('btn-close')?.addEventListener('click',    () => window.blackwing?.close());
}

/* ═══════════════════════════════════════════
   LOGIN BUTTONS
═══════════════════════════════════════════ */
function initLoginButtons() {
  $('btn-ms-login').addEventListener('click', async () => {
    if (S.loginBusy) return;
    S.loginBusy = true;
    const btn = $('btn-ms-login');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spinning"></i> Connecting...';
    lucide.createIcons();
    $('login-status-text').textContent = 'Opening Microsoft login...';
    try {
      const result = await window.blackwing.startMicrosoftLogin();
      S.model = result;
      showApp();
    } catch (err) {
      $('login-status-text').textContent = err.message;
      btn.disabled = false;
      btn.innerHTML = orig;
      lucide.createIcons();
    }
    S.loginBusy = false;
  });

  $('btn-guest-login').addEventListener('click', () => {
    showApp();
  });
}

/* ═══════════════════════════════════════════
   HOME BUTTONS
═══════════════════════════════════════════ */
function initHomeButtons() {
  // Launch button
  $('btn-launch').addEventListener('click', async () => {
    const versions = S.model?.catalog?.versions || [];
    const selId    = S.model?.state?.selectedVersionId || '1.8.9-blackwing';
    const version  = versions.find(v => v.id === selId);
    const installed = S.model?.state?.installedVersions?.[selId];

    if (!installed) {
      // Auto-install first
      await doInstall(selId);
      return;
    }

    setInstalling(true, 'Preparing launch plan...', 80);
    try {
      const result = await window.blackwing.prepareLaunch();
      S.model = result;
      setInstalling(false);
      $('launch-sub').textContent = 'Launch plan saved!';
      setTimeout(() => renderHome(), 2000);
    } catch (err) {
      setInstalling(false);
      alert(err.message);
    }
  });

  // Version arrow
  $('btn-version-arrow').addEventListener('click', (e) => {
    e.stopPropagation();
    const dd = $('version-dropdown');
    dd.classList.toggle('hidden');
  });

  // Version dropdown items (event delegation)
  $('version-dropdown').addEventListener('click', (e) => {
    const item = e.target.closest('[data-version-id]');
    if (!item) return;
    $('version-dropdown').classList.add('hidden');
    perform(() => window.blackwing.selectVersion(item.dataset.versionId), null);
  });

  // Close dropdown on outside click
  document.addEventListener('click', () => $('version-dropdown').classList.add('hidden'));

  // Install button
  $('btn-install').addEventListener('click', async () => {
    const selId = S.model?.state?.selectedVersionId || '1.8.9-blackwing';
    await doInstall(selId);
  });

  // Attach OptiFine
  $('btn-attach-optifine').addEventListener('click', async () => {
    const selId = S.model?.state?.selectedVersionId || '1.8.9-blackwing';
    setInstalling(true, 'Select OptiFine .jar...', 10);
    try {
      const result = await window.blackwing.attachOptiFine(selId);
      S.model = result;
      setInstalling(false);
      renderAll();
    } catch (err) {
      setInstalling(false);
      if (err.message !== 'OptiFine is required to install this edition.') alert(err.message);
    }
  });

  // Server buttons
  $$('.srv-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.srv-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

async function doInstall(versionId) {
  setInstalling(true, 'Downloading package...', 20);
  try {
    // Simulate progress steps since we don't have real callbacks
    const steps = [
      { pct: 30, text: 'Downloading archive...' },
      { pct: 60, text: 'Extracting files...' },
      { pct: 80, text: 'Copying configs...' },
      { pct: 95, text: 'Finalizing install...' }
    ];
    let stepIndex = 0;
    const ticker = setInterval(() => {
      if (stepIndex < steps.length) {
        const s = steps[stepIndex++];
        setInstalling(true, s.text, s.pct);
      }
    }, 800);
    const result = await window.blackwing.installVersion(versionId);
    clearInterval(ticker);
    S.model = result;
    setInstalling(false);
    renderAll();
  } catch (err) {
    setInstalling(false);
    alert(err.message);
  }
}

/* ═══════════════════════════════════════════
   MODS CONTROLS
═══════════════════════════════════════════ */
function initModsControls() {
  // Filter tabs
  $('filter-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.ftab');
    if (!tab) return;
    S.modFilter = tab.dataset.filter;
    $$('.ftab').forEach(t => t.classList.toggle('active', t.dataset.filter === S.modFilter));
    renderModsGrid();
    lucide.createIcons();
  });

  // Search
  $('mod-search').addEventListener('input', e => {
    S.modSearch = e.target.value;
    renderModsGrid();
    lucide.createIcons();
  });

  // Mods grid clicks (delegation)
  $('mods-grid').addEventListener('click', async e => {
    const toggleBtn = e.target.closest('.mod-toggle-btn');
    if (toggleBtn) {
      const modId = toggleBtn.dataset.modId;
      await toggleMod(modId);
      return;
    }

    const profileItem = e.target.closest('.profile-item');
    if (profileItem) {
      const profileId = profileItem.dataset.profileId;
      perform(() => window.blackwing.selectProfile(profileId), null);
    }
  });

  // Profile list clicks
  $('profile-list').addEventListener('click', async e => {
    const item = e.target.closest('.profile-item[data-profile-id]');
    if (!item) return;
    if (e.target.closest('.profile-edit-btn')) return; // edit btn
    perform(() => window.blackwing.selectProfile(item.dataset.profileId), null);
  });
}

async function toggleMod(modId) {
  // Update local state optimistically
  const mods = S.model?.state?.mods || getDefaultMods();
  const current = mods[modId]?.enabled ?? (MOD_CATALOG.find(m => m.id === modId)?.defaultEnabled ?? false);
  if (!mods[modId]) mods[modId] = {};
  mods[modId].enabled = !current;
  if (S.model?.state) S.model.state.mods = mods;

  renderModsGrid();
  lucide.createIcons();

  // Persist via IPC
  try {
    const result = await window.blackwing.toggleMod(modId);
    if (result) S.model = result;
  } catch (err) {
    console.warn('toggleMod IPC failed:', err.message);
  }

  // Update active mods count
  const activeCount = Object.values(S.model?.state?.mods || mods).filter(m => m.enabled).length;
  $('stat-mods').textContent = activeCount;
}

/* ═══════════════════════════════════════════
   VERSIONS DELEGATE
═══════════════════════════════════════════ */
function initVersionsDelegate() {
  $('versions-grid').addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const vId    = btn.dataset.versionId;
    const action = btn.dataset.action;

    if (action === 'select') {
      perform(() => window.blackwing.selectVersion(vId), () => switchView('home'));
    }
    if (action === 'install') {
      switchView('home');
      await doInstall(vId);
    }
  });
}

/* ═══════════════════════════════════════════
   SETTINGS CONTROLS
═══════════════════════════════════════════ */
function initSettingsControls() {
  // Language pills
  document.addEventListener('click', e => {
    const pill = e.target.closest('.lang-pill');
    if (!pill) return;
    const lang = pill.dataset.lang;
    $$('.lang-pill').forEach(p => p.classList.toggle('active', p.dataset.lang === lang));
    $('lang-label').textContent = lang.toUpperCase();
    S.locale = lang;
    perform(() => window.blackwing.setLocale(lang), null);
  });

  // Language nav button
  $('btn-lang').addEventListener('click', () => {
    const next = S.locale === 'en' ? 'fr' : 'en';
    S.locale = next;
    $('lang-label').textContent = next.toUpperCase();
    $$('.lang-pill').forEach(p => p.classList.toggle('active', p.dataset.lang === next));
    perform(() => window.blackwing.setLocale(next), null);
  });

  // RAM slider
  $('ram-slider').addEventListener('input', e => {
    $('ram-display').textContent = e.target.value + ' MB';
  });

  // Auto update toggle
  $('btn-auto-update').addEventListener('click', () => {
    perform(() => window.blackwing.toggleAutoUpdate(), null);
  });

  // Change account button (in settings)
  $('btn-settings-login').addEventListener('click', async () => {
    try {
      const result = await window.blackwing.startMicrosoftLogin();
      S.model = result;
      renderAll();
    } catch (err) {
      alert(err.message);
    }
  });

  // Logout
  $('btn-logout').addEventListener('click', async () => {
    // Clear account in state
    if (S.model?.state) {
      S.model.state.account = null;
    }
    renderAll();
  });

  // Save API URL
  $('btn-save-api').addEventListener('click', () => {
    const newUrl = $('api-url').value.trim();
    if (newUrl) {
      localStorage.setItem('bw_api_url', newUrl);
      alert('API URL saved. Restart to apply.');
    }
  });

  // Save profile button (simple alert)
  $('btn-save-profile').addEventListener('click', () => alert('Save Profile feature coming soon.'));
  $('btn-edit-hud').addEventListener('click',     () => alert('HUD Editor feature coming soon.'));
}

/* ═══════════════════════════════════════════
   START
═══════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', boot);
