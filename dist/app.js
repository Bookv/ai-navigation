const defaultConfig = window.__NAV_CONFIG__ ?? {};

const isLocalhost = () => ["localhost", "127.0.0.1"].includes(window.location.hostname);
const shouldTryRemote = () => {
  if (!isLocalhost()) return true;
  const params = new URLSearchParams(window.location.search);
  return params.get("remote") === "1";
};

const defaultSearchEngines = [
  { name: "Google", url: "https://www.google.com/search?q={query}" },
  { name: "Bing", url: "https://www.bing.com/search?q={query}" },
  { name: "DuckDuckGo", url: "https://duckduckgo.com/?q={query}" },
  { name: "百度", url: "https://www.baidu.com/s?wd={query}" }
];

const storageKey = "nav_config";

const state = {
  site: {
    title: "个人导航",
    description: "简约现代导航站",
    theme: "auto",
    backgroundImage: "",
    glassOpacity: 0.62
  },
  searchEngines: defaultSearchEngines,
  groups: [],
  generatedAt: ""
};

const $ = (id) => document.getElementById(id);

const searchInput = $("search-input");
const engineSelect = $("engine-select");
const searchBtn = $("search-btn");
const themeToggle = $("theme-toggle");
const groupsEl = $("groups");
const bgLayer = document.querySelector(".bg");

const fetchWithTimeout = (url, options = {}, timeoutMs = 1200) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
};

const loadRemoteConfig = async () => {
  if (!shouldTryRemote()) return null;
  try {
    const response = await fetchWithTimeout("/api/nav", { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const loadLocalConfig = () => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const persistLocalConfig = (config) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(config));
  } catch {
    return null;
  }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeOpacity = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0.62;
  return clamp(num, 0.01, 1);
};

const normalizeConfig = (config) => {
  const safe = config ?? {};
  const site = safe.site ?? {};

  return {
    site: {
      title: site.title ?? "个人导航",
      description: site.description ?? "简约现代导航站",
      theme: site.theme ?? "auto",
      backgroundImage: site.backgroundImage ?? "",
      glassOpacity: normalizeOpacity(site.glassOpacity ?? 0.62)
    },
    searchEngines:
      Array.isArray(safe.searchEngines) && safe.searchEngines.length
        ? safe.searchEngines
        : defaultSearchEngines,
    groups: Array.isArray(safe.groups) ? safe.groups : [],
    generatedAt: safe.generatedAt ?? ""
  };
};

const isUsefulConfig = (config) => {
  if (!config || typeof config !== "object") return false;
  const groups = Array.isArray(config.groups) ? config.groups : [];
  const engines = Array.isArray(config.searchEngines) ? config.searchEngines : [];
  const title = config.site?.title ?? "";
  return groups.length > 0 || engines.length > 0 || Boolean(title);
};

const resolveConfig = async () => {
  const remote = await loadRemoteConfig();
  if (remote) {
    persistLocalConfig(remote);
    return normalizeConfig(remote);
  }

  const local = loadLocalConfig();
  if (isUsefulConfig(local)) {
    return normalizeConfig(local);
  }

  return normalizeConfig(defaultConfig);
};

const applyConfig = (config) => {
  state.site = config.site;
  state.searchEngines = config.searchEngines;
  state.groups = config.groups;
  state.generatedAt = config.generatedAt;
};

const buildThemeLabel = (theme) => {
  if (theme === "auto") return "主题：自动";
  if (theme === "dark") return "主题：深色";
  return "主题：浅色";
};

const getStoredTheme = () => localStorage.getItem("nav-theme");

const getPreferredTheme = () => getStoredTheme() ?? state.site.theme;

const applyTheme = (theme) => {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = theme === "auto" ? (prefersDark ? "dark" : "light") : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  themeToggle.textContent = buildThemeLabel(theme);
};

const setTheme = (theme) => {
  if (theme === "auto") {
    localStorage.removeItem("nav-theme");
  } else {
    localStorage.setItem("nav-theme", theme);
  }
  applyTheme(theme);
};

const initTheme = () => {
  applyTheme(getPreferredTheme());
};

const applyBackgroundImage = () => {
  if (!bgLayer) return;
  const url = state.site.backgroundImage?.trim();
  if (url) {
    document.documentElement.style.setProperty("--bg-image", `url("${url}")`);
    bgLayer.classList.add("has-image");
  } else {
    document.documentElement.style.setProperty("--bg-image", "none");
    bgLayer.classList.remove("has-image");
  }
};

const applyGlassOpacity = () => {
  const opacity = normalizeOpacity(state.site.glassOpacity ?? 0.62);
  document.documentElement.style.setProperty("--glass-opacity", String(opacity));
};

const initSiteInfo = () => {
  $("site-title").textContent = state.site.title;
  $("site-desc").textContent = state.site.description;
  document.title = state.site.title;
  applyBackgroundImage();
  applyGlassOpacity();
};

const renderEngines = () => {
  engineSelect.innerHTML = "";
  state.searchEngines.forEach((engine, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = engine.name;
    engineSelect.appendChild(opt);
  });
};

const matchText = (text, query) => text.toLowerCase().includes(query);

const hasMatches = (query) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  let matched = false;

  state.groups.forEach((group) => {
    if (matchText(group.name ?? "", q)) matched = true;
    const items = (group.items ?? []).filter((item) => {
      const fields = [item.name, item.description, item.url, ...(item.tags ?? []), group.name];
      return fields.some((field) => field && matchText(String(field), q));
    });
    if (items.length) matched = true;
  });

  return matched;
};

const createIcon = (item) => {
  const iconWrap = document.createElement("div");
  iconWrap.className = "card-icon";
  if (item.icon) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.src = item.icon;
    img.alt = item.name;
    img.onerror = () => {
      img.remove();
      iconWrap.textContent = item.name?.slice(0, 1)?.toUpperCase() ?? "?";
    };
    iconWrap.appendChild(img);
  } else {
    iconWrap.textContent = item.name?.slice(0, 1)?.toUpperCase() ?? "?";
  }
  return iconWrap;
};

const createCard = (item) => {
  const card = document.createElement("a");
  card.className = "card";
  card.href = item.url;
  card.target = "_blank";
  card.rel = "noopener";

  const header = document.createElement("div");
  header.className = "card-header";
  header.appendChild(createIcon(item));

  const titleWrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = item.name;
  const desc = document.createElement("div");
  desc.className = "card-desc";
  desc.textContent = item.description ?? "";
  titleWrap.appendChild(title);
  titleWrap.appendChild(desc);

  header.appendChild(titleWrap);
  card.appendChild(header);

  const tagWrap = document.createElement("div");
  tagWrap.className = "tag";
  if (item.tags?.length) {
    item.tags.forEach((tag) => {
      const span = document.createElement("span");
      span.textContent = tag;
      tagWrap.appendChild(span);
    });
  } else {
    tagWrap.classList.add("empty");
  }
  card.appendChild(tagWrap);

  return card;
};

const renderGroups = (query) => {
  const q = query.trim().toLowerCase();
  groupsEl.innerHTML = "";

  state.groups.forEach((group) => {
    const groupMatches = !q || matchText(group.name ?? "", q);
    const groupEl = document.createElement("section");
    groupEl.className = "group";

    const header = document.createElement("div");
    header.className = "group-header";

    const title = document.createElement("h2");
    title.className = "group-title";
    title.textContent = group.name ?? "未命名分组";

    header.appendChild(title);
    groupEl.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "card-grid";

    const items = (group.items ?? []).filter((item) => {
      if (!q) return true;
      const fields = [item.name, item.description, item.url, ...(item.tags ?? []), group.name];
      return fields.some((field) => field && matchText(String(field), q));
    });

    if (items.length || groupMatches) {
      items.forEach((item) => grid.appendChild(createCard(item)));
      groupEl.appendChild(grid);
      groupsEl.appendChild(groupEl);
    }
  });
};

const doExternalSearch = () => {
  const q = searchInput.value.trim();
  if (!q) return;
  const engine = state.searchEngines[Number(engineSelect.value) ?? 0];
  const url = engine?.url?.replace("{query}", encodeURIComponent(q));
  if (url) window.open(url, "_blank");
};

const initEvents = () => {
  searchInput.addEventListener("input", (e) => {
    const next = e.target.value;
    if (!next.trim()) {
      renderGroups("");
      return;
    }

    if (hasMatches(next)) {
      renderGroups(next);
    } else {
      renderGroups("");
    }
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      doExternalSearch();
    }
  });
  searchBtn.addEventListener("click", doExternalSearch);
  themeToggle.addEventListener("click", () => {
    const current = getPreferredTheme();
    const next = current === "auto" ? "light" : current === "light" ? "dark" : "auto";
    setTheme(next);
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getPreferredTheme() === "auto") applyTheme("auto");
  });
};

const initServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;
  if (isLocalhost()) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
    return;
  }
  navigator.serviceWorker.register("/sw.js").catch(() => undefined);
};

const init = async () => {
  const config = await resolveConfig();
  applyConfig(config);
  initSiteInfo();
  renderEngines();
  initTheme();
  renderGroups("");
  initEvents();
  initServiceWorker();
};

init();